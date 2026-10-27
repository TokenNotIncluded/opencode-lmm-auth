import type { Credential, Model, Plugin, Provider } from '@opencode/plugin';
import type { Model as LegacyModel, Provider as LegacyProvider } from '@opencode-ai/sdk';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { admitCatalog, logCatalogDiagnostics, prepareRelay, type Route } from './catalog.ts';
import { LmmHttp } from './http.ts';
import { builtinProfiles } from './metadata.ts';
import { deprecatedProfiles } from './model-status.ts';
import { OAuthSession, unpack } from './oauth.ts';
import { LmmError, nonnegative, requireValue } from './protocol.ts';
import { referenceCosts } from './reference-costs.ts';
import { RefreshJournal } from './refresh-journal.ts';

type Context = Pick<Plugin.Context, 'options' | 'event'> & {
  integration: Pick<Plugin.Context['integration'], 'transform' | 'connection'>;
  provider: Pick<Plugin.Context['provider'], 'transform' | 'reload'>;
  session: Pick<Plugin.Context['session'], 'hook'>;
};
type Connection = NonNullable<Awaited<ReturnType<Context['integration']['connection']['active']>>>;
type Registration = { dispose(): Promise<void> };
type Snapshot = { connection: Connection; models: Model.Info[]; routes: Map<string, Route>; fingerprint: string };

const METHOD = 'oauth';
const PROVIDER = 'lmm';
const RECONNECT = 'LMM requires its current OAuth connection. Connect LMM again.';
const nativePackages: Readonly<Record<string, string>> = {
  '@ai-sdk/openai-compatible': '@opencode/ai/providers/openai-compatible',
  '@ai-sdk/openai': '@opencode/ai/providers/openai/responses',
  '@ai-sdk/anthropic': '@opencode/ai/providers/anthropic',
};

function connectionKey(connection: Connection | undefined): string | undefined {
  return connection?.type === 'credential' ? connection.id : undefined;
}

function fingerprint(value: Credential.OAuth): string {
  return createHash('sha256').update(JSON.stringify([value.access, value.refresh, value.expires])).digest('hex');
}

function profiles(issuer: string): { provider: LegacyProvider; allowed: Set<string> } {
  const provider: LegacyProvider = { id: PROVIDER, name: 'LMM', source: 'config', env: [], options: {}, models: {} };
  const allowed = new Set<string>();
  for (const [id, profile] of Object.entries(builtinProfiles)) {
    if (deprecatedProfiles.has(id) || profile.status === 'deprecated' || !profile.limit ||
      !Number.isSafeInteger(profile.limit.context) || profile.limit.context <= 0 ||
      !Number.isSafeInteger(profile.limit.output) || profile.limit.output <= 0 ||
      typeof profile.tool_call !== 'boolean' || typeof profile.reasoning !== 'boolean' ||
      typeof profile.attachment !== 'boolean' || typeof profile.temperature !== 'boolean' ||
      typeof profile.options?.lmmApi !== 'string') continue;
    const input = profile.modalities?.input ?? ['text'];
    const output = profile.modalities?.output ?? ['text'];
    provider.models[id] = {
      id, providerID: PROVIDER, name: profile.name ?? id, status: 'active', headers: {},
      api: { id, url: `${issuer}/v1`, npm: '@ai-sdk/openai-compatible' },
      cost: { input: 0, output: 0, cache: { read: 0, write: 0 } },
      options: profile.options, limit: { context: profile.limit.context, output: profile.limit.output },
      capabilities: {
        toolcall: profile.tool_call, reasoning: profile.reasoning, attachment: profile.attachment,
        temperature: profile.temperature,
        input: { text: input.includes('text'), image: input.includes('image'), audio: input.includes('audio'), video: input.includes('video'), pdf: input.includes('pdf') },
        output: { text: output.includes('text'), image: output.includes('image'), audio: output.includes('audio'), video: output.includes('video'), pdf: output.includes('pdf') },
      },
    };
    allowed.add(id);
  }
  return { provider, allowed };
}

function nativeModel(value: LegacyModel): Model.Info {
  const packageName = nativePackages[value.api.npm];
  requireValue(packageName, 'LMM catalog selected an unsupported model protocol.');
  // admitCatalog has validated the canonical model ID and finite USD/million-token rates.
  const id = value.id as Model.ID;
  const dollars = (value: number) => nonnegative(value) as Model.Cost['input'];
  return {
    id, modelID: id, providerID: PROVIDER as Provider.ID, name: value.name,
    package: packageName, status: 'active', enabled: true, variants: [], time: { released: 0 },
    capabilities: {
      tools: value.capabilities.toolcall, temperature: value.capabilities.temperature,
      input: Object.entries(value.capabilities.input).filter(([, enabled]) => enabled).map(([name]) => name),
      output: Object.entries(value.capabilities.output).filter(([, enabled]) => enabled).map(([name]) => name),
    },
    limit: value.limit,
    cost: [{ input: dollars(value.cost.input), output: dollars(value.cost.output), cache: { read: dollars(value.cost.cache.read), write: dollars(value.cost.cache.write) } }],
  };
}

/** Native OpenCode 2 integration. Credentials remain owned and refreshed by its host. */
export async function setupLmmV2(context: Context): Promise<Plugin.Cleanup> {
  const http = new LmmHttp({ issuer: typeof context.options.issuer === 'string' ? context.options.issuer : undefined });
  const stateHome = process.env.XDG_STATE_HOME;
  const state = stateHome && isAbsolute(stateHome) ? stateHome : join(homedir(), '.local', 'state');
  const oauth = new OAuthSession(http, new RefreshJournal(join(state, 'opencode-lmm-auth', 'refresh')));
  const configured = profiles(http.issuer);
  const costs = new Map(Object.entries(referenceCosts));
  const registrations: Registration[] = [];
  const controller = new AbortController();
  let snapshot: Snapshot | undefined;
  let lastCatalogDiagnosticFingerprint: string | undefined;
  let pending = Promise.resolve();
  let timer: ReturnType<typeof setInterval> | undefined;
  const sent = new WeakMap<Request, { connection: Connection; fingerprint: string }>();

  const credential = async (connection: Connection): Promise<Credential.OAuth> => {
    requireValue(connection.type === 'credential' && connection.method === 'oauth', RECONNECT);
    const value = await context.integration.connection.resolve(connection);
    requireValue(value?.type === 'oauth' && value.methodID === METHOD, RECONNECT);
    unpack(value, http.issuer);
    return value;
  };
  const requireCurrent = async (connection: Connection) => {
    const active = await context.integration.connection.active(PROVIDER);
    requireValue(connectionKey(active) === connectionKey(connection), 'The LMM account changed. Select its current model again.');
  };
  const load = async (force: boolean, publish = true) => {
    let connection: Connection | undefined;
    try {
      connection = await context.integration.connection.active(PROVIDER);
      if (!connection) {
        snapshot = undefined;
      } else {
        const current = await credential(connection);
        if (!force && connectionKey(snapshot?.connection) === connectionKey(connection) && snapshot?.fingerprint === fingerprint(current)) return;
        const catalog = await http.bearer('/api/oauth2/catalog', current.access, controller.signal);
        const admitted = admitCatalog(catalog, configured.provider, http.issuer, unpack(current, http.issuer).scope, configured.allowed, costs);
        lastCatalogDiagnosticFingerprint = logCatalogDiagnostics(admitted.diagnostics, console, lastCatalogDiagnosticFingerprint);
        await requireCurrent(connection);
        if (controller.signal.aborted) return;
        snapshot = { connection, models: Object.values(admitted.models).map(nativeModel), routes: admitted.routes, fingerprint: fingerprint(current) };
      }
    } catch (error) {
      snapshot = undefined;
      if (connection && error instanceof LmmError && error.code === 'unauthorized') {
        await context.integration.connection.status({ integrationID: PROVIDER, connection, status: { status: 'needs_auth', message: RECONNECT } });
      }
    }
    if (publish && !controller.signal.aborted) await context.provider.reload();
  };
  const reload = (force = false): Promise<void> => {
    const result = pending.then(() => load(force));
    pending = result.catch(() => {});
    return result;
  };
  const cleanup = async () => {
    controller.abort();
    if (timer) clearInterval(timer);
    for (const registration of registrations.slice().reverse()) await registration.dispose();
    await pending;
  };
  try {
    registrations.push(await context.integration.transform(editor => {
      editor.update(PROVIDER, item => { item.name = 'LMM'; });
      editor.method.update({
        integrationID: PROVIDER, method: { id: METHOD, type: 'oauth', label: 'Sign in with LMM (OAuth)' },
        authorize: async () => {
          const authorization = await oauth.authorize();
          return {
            mode: 'auto', url: authorization.url, instructions: authorization.instructions,
            callback: authorization.callback().then(value => ({ type: 'oauth', methodID: METHOD as Credential.OAuth['methodID'], access: value.access, refresh: value.refresh, expires: value.expires })),
          };
        },
        refresh: async value => {
          requireValue(value.methodID === METHOD, RECONNECT);
          const renewed = await oauth.refresh(value);
          return { ...renewed, methodID: METHOD as Credential.OAuth['methodID'] };
        },
      });
    }));
    // Initial transforms settle with plugin activation; reload only after setup.
    await load(true, false);
    registrations.push(await context.provider.transform(editor => {
      editor.add({
        info: {
          id: PROVIDER as Provider.ID, integrationID: PROVIDER as NonNullable<Provider.Info['integrationID']>,
          name: 'LMM', activation: 'auto', package: '@opencode/ai/providers/openai-compatible',
          settings: { baseURL: `${http.issuer}/v1`, transport: 'http' },
        },
        models: snapshot?.models ?? [],
        ...(snapshot ? { sourceConnection: snapshot.connection } : {}),
      });
    }));
    registrations.push(await context.session.hook('http.request', async event => {
      const selected = snapshot;
      const route = selected?.routes.get(event.model.id);
      requireValue(selected && route, 'The model is not in the current LMM account catalog.');
      const destination = new URL(event.request.url);
      requireValue(destination.origin === http.issuer && !destination.username && !destination.password &&
        !destination.search && !destination.hash && destination.pathname === route.path && event.request.method === 'POST',
      'LMM refuses this request destination.');
      await requireCurrent(selected.connection);
      const current = await credential(selected.connection);
      const scope = unpack(current, http.issuer).scope.split(' ');
      requireValue(scope.includes(`group:${route.group}`), 'LMM group is no longer authorized. Connect again.');
      const request = await prepareRelay(event.request, undefined, http.issuer, new Map([[event.model.id, route]]), current.access);
      await requireCurrent(selected.connection);
      sent.set(request, { connection: selected.connection, fingerprint: fingerprint(current) });
      event.request = request;
    }, { providerID: PROVIDER }));
    registrations.push(await context.session.hook('http.response', async event => {
      if (event.response.status !== 401 && event.response.status !== 403) return;
      const attempt = sent.get(event.request);
      if (!attempt) return;
      const active = await context.integration.connection.active(PROVIDER);
      if (connectionKey(active) !== connectionKey(attempt.connection)) return;
      if (event.response.status === 401) {
        const current = await credential(attempt.connection);
        if (fingerprint(current) !== attempt.fingerprint) return;
        await context.integration.connection.status({ integrationID: PROVIDER, connection: attempt.connection, status: { status: 'needs_auth', message: RECONNECT } });
      }
      await reload(true);
    }, { providerID: PROVIDER }));
    registrations.push(await context.session.hook('retry', event => { event.decision = { retry: false }; }, { providerID: PROVIDER }));
    void (async () => {
      for await (const event of context.event.subscribe({ signal: controller.signal })) {
        if ((event.type === 'credential.switched' && event.data.integrationID === PROVIDER) || event.type === 'credential.updated') await reload();
      }
    })().catch(() => { /* Periodic read-only reload still recovers a closed event stream. */ });
    timer = setInterval(() => { void reload(true).catch(() => {}); }, 60_000);
    timer.unref();
    return cleanup;
  } catch (error) {
    await cleanup();
    throw error;
  }
}

const LmmV2Plugin = { id: 'lmm.oauth', setup: setupLmmV2 } satisfies Plugin.Plugin;
export default LmmV2Plugin;
