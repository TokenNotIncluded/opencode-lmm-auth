import type { Plugin, ProviderHookContext } from '@opencode-ai/plugin';
import type { Auth, OAuth } from '@opencode-ai/sdk/v2';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { LmmHttp } from './http.ts';
import { OAuthSession, unpack } from './oauth.ts';
import { RefreshJournal } from './refresh-journal.ts';
import { admitCatalog, logCatalogDiagnostics, normalizeReferenceCost, prepareRelay, type ReferenceCost } from './catalog.ts';
import { LmmError, requireValue } from './protocol.ts';
import { builtinProfiles } from './metadata.ts';
import { referenceCosts } from './reference-costs.ts';
import { deprecatedProfiles } from './model-status.ts';

// Magpie 2a3d9f5a supplies this host-owned interface in PluginInput. Neither
// a provider.models invocation nor user plugin options establish account scope.
const legacyRefusal = 'LMM blocks inference on this OpenCode host because it cannot disable automatic paid request retries. Use the supported OpenCode V2 integration or Magpie. OAuth login remains available.';
const legacyRefreshRefusal = 'LMM blocks automatic OAuth refresh on this OpenCode host because its credential write has no account condition. Run opencode auth login --provider lmm to reconnect, or use OpenCode V2 or Magpie.';

const LmmOAuthPlugin: Plugin = async (input, options) => {
  const magpie = (input as typeof input & {magpie?: {option?: unknown; options?: unknown}}).magpie;
  const accountScopedHost = typeof magpie?.option === 'function' && typeof magpie?.options === 'function';
  const http = new LmmHttp({issuer: typeof options?.issuer === 'string' ? options.issuer : undefined});
  const stateHome = process.env.XDG_STATE_HOME;
  const stateDirectory = stateHome && isAbsolute(stateHome) ? stateHome : join(homedir(), '.local', 'state');
  const oauth = new OAuthSession(http, new RefreshJournal(join(stateDirectory, 'opencode-lmm-auth', 'refresh')));
  const profiles = new Set<string>();
  let profileModels: any = {};
  const bundledReferenceCosts = new Map<string, ReferenceCost>(Object.entries(referenceCosts));
  let profileReferenceCosts = new Map(bundledReferenceCosts);
  const readHostAuth = async (): Promise<OAuth | undefined> => {
    const inline = process.env.OPENCODE_AUTH_CONTENT;
    if (inline !== undefined) { try { return JSON.parse(inline).lmm; } catch { throw new Error('Invalid OPENCODE_AUTH_CONTENT. Update the native OpenCode credential configuration.'); } }
    const data = process.env.XDG_DATA_HOME;
    const directory = data && isAbsolute(data) ? data : join(homedir(), '.local', 'share');
    try { return JSON.parse(await readFile(join(directory, 'opencode', 'auth.json'), 'utf8')).lmm; }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw new Error('Cannot read valid native OpenCode credentials. Repair the native credential store and reconnect.');
    }
  };

  const toProviderModels = (models: Record<string, any>): Record<string, any> => Object.fromEntries(
    Object.entries(models).map(([id, model]) => [id, {
      id,
      name: model.name,
      provider: {npm: model.api.npm, api: `${http.issuer}/v1`},
      limit: model.limit,
      tool_call: model.capabilities.toolcall,
      reasoning: model.capabilities.reasoning,
      attachment: model.capabilities.attachment,
      temperature: model.capabilities.temperature,
      modalities: {
        input: Object.entries(model.capabilities.input).filter(([, yes]) => yes).map(([key]) => key),
        output: Object.entries(model.capabilities.output).filter(([, yes]) => yes).map(([key]) => key),
      },
      options: model.options,
      cost: {
        input: model.cost.input,
        output: model.cost.output,
        cache_read: model.cost.cache.read,
        cache_write: model.cost.cache.write,
      },
    }]),
  );

  let lastCatalogDiagnosticFingerprint: string | undefined;
  const loadCatalog = async (auth: OAuth, providerModels: Record<string, any>, referenceCosts = profileReferenceCosts) => {
    const envelope = unpack(auth, http.issuer);
    const catalog = await http.bearer('/api/oauth2/catalog', auth.access);
    const admitted = admitCatalog(catalog, {models: providerModels} as any, http.issuer, envelope.scope, profiles, referenceCosts);
    lastCatalogDiagnosticFingerprint = logCatalogDiagnostics(admitted.diagnostics, console, lastCatalogDiagnosticFingerprint);
    return admitted;
  };

  // Keep only fixed, structured errors for a bounded time. Never retain an Error,
  // cause, response body, or credential envelope in this cache.
  const refreshFailures = new Map<string, {code: string; message: string; expires: number}>();
  const refreshesInFlight = new Map<string, Promise<OAuth>>();
  const refreshFailureLimit = 64;
  const refreshFailureTtlMs = 10 * 60 * 1000;
  const refreshKey = (auth: OAuth) => createHash('sha256').update(auth.refresh).digest('hex');
  const cachedRefreshFailure = (key: string): LmmError | undefined => {
    const cached = refreshFailures.get(key);
    if (!cached) return undefined;
    if (cached.expires <= Date.now()) { refreshFailures.delete(key); return undefined; }
    return new LmmError(cached.code, cached.message);
  };
  const rememberRefreshFailure = (key: string, error: unknown) => {
    const safeErrors: Record<string, string> = {
      unauthorized: 'LMM authorization is unavailable or was revoked. Reconnect this account.',
      rate_limited: 'LMM rate limit reached. Wait a moment and retry.',
      upstream_unavailable: 'LMM service is temporarily unavailable. Try again shortly.',
      http_error: 'LMM OAuth refresh request failed.',
      aborted: 'LMM OAuth refresh was cancelled or timed out.',
      transport_error: 'LMM OAuth refresh failed due to a network error.',
      invalid_response: 'LMM returned an invalid OAuth response.',
      refresh_already_attempted: 'LMM refresh was already attempted. Reconnect this account.',
      refresh_storage_unavailable: 'LMM refresh could not be safely recorded. Reconnect this account.',
      refresh_storage_unverified: 'LMM refresh could not be safely recorded. Reconnect this account.',
    };
    const code = error instanceof LmmError && safeErrors[error.code] ? error.code : 'refresh_failed';
    const message = safeErrors[code] ?? 'LMM OAuth refresh failed. Reconnect this account.';
    refreshFailures.delete(key);
    refreshFailures.set(key, {code, message, expires: Date.now() + refreshFailureTtlMs});
    while (refreshFailures.size > refreshFailureLimit) refreshFailures.delete(refreshFailures.keys().next().value!);
  };
  const freshForModels = (auth: OAuth): OAuth => {
    unpack(auth, http.issuer);
    const key = refreshKey(auth);
    const failure = cachedRefreshFailure(key);
    if (failure) throw failure;
    if (refreshesInFlight.has(key)) throw new LmmError('refresh_in_progress', 'LMM OAuth refresh is still in progress. Wait for the host to finish refreshing this account.');
    if (auth.expires <= Date.now() + 30_000) {
      requireValue(accountScopedHost, legacyRefreshRefusal);
      throw new Error('The host did not provide fresh OAuth credentials. Reconnect this account and try again.');
    }
    return auth;
  };

  const currentAuth = async (getAuth: () => Promise<Auth | undefined>): Promise<OAuth> => {
    const auth = await getAuth();
    requireValue(auth && auth.type === 'oauth', 'LMM requires OAuth. Reconnect this account.');
    unpack(auth, http.issuer);
    // A timed-out host refresh may still be in flight. Never dispatch using its
    // old access token, even when that token has not reached expiry yet.
    const key = refreshKey(auth);
    const failure = cachedRefreshFailure(key);
    if (failure) throw failure;
    requireValue(!refreshesInFlight.has(key), 'LMM OAuth refresh is still in progress. Wait for the host to finish refreshing this account.');
    requireValue(auth.expires > Date.now() + 30_000, 'The host did not provide fresh OAuth credentials. Reconnect this account and try again.');
    return auth;
  };

  return {
    config: async config => {
      config.provider ??= {};
      config.provider.lmm ??= {name: 'LMM', npm: '@ai-sdk/openai-compatible', models: {}};
      const provider = config.provider.lmm;
      provider.models = {...structuredClone(builtinProfiles), ...provider.models};
      provider.options = {...provider.options, baseURL: `${http.issuer}/v1`};
      profiles.clear();
      profileReferenceCosts = new Map(bundledReferenceCosts);
      for (const [id, profile] of Object.entries(provider.models ?? {})) {
        if (deprecatedProfiles.has(id) || profile.status === 'deprecated') continue;
        if (profile.limit && Number.isSafeInteger(profile.limit.context) && profile.limit.context > 0 && Number.isSafeInteger(profile.limit.output) && profile.limit.output > 0 && typeof profile.tool_call === 'boolean' && typeof profile.reasoning === 'boolean' && typeof profile.attachment === 'boolean' && typeof profile.temperature === 'boolean' && typeof profile.options?.lmmApi === 'string') {
          profiles.add(id);
          const cost = normalizeReferenceCost(profile.cost);
          if (cost) profileReferenceCosts.set(id, cost);
        }
      }
      // OpenCode 1.18.34 passes a deep copy to auth.loader; model mutations there
      // are discarded. Admit catalog models in config before host parsing instead.
      profileModels = Object.fromEntries(Object.entries(provider.models).map(([id, p]) => [id, {
        id, providerID:'lmm', name:id, status:'active', headers:{},
        api:{id,url:`${http.issuer}/v1`,npm:provider.npm}, cost:{input:0,output:0,cache:{read:0,write:0}},
        options:p.options ?? {}, limit:p.limit, capabilities:{toolcall:p.tool_call, reasoning:p.reasoning,attachment:p.attachment,temperature:p.temperature,input:Object.fromEntries(['text','audio','image','video','pdf'].map(k=>[k,p.modalities?.input?.includes(k as 'text') ?? k==='text'])),output:Object.fromEntries(['text','audio','image','video','pdf'].map(k=>[k,p.modalities?.output?.includes(k as 'text') ?? k==='text']))}
      }]));
      provider.models = {};
      try {
        let stored = await readHostAuth();
        if (stored?.type === 'oauth') {
          unpack(stored,http.issuer);
          requireValue(stored.expires > Date.now() + 30_000, legacyRefreshRefusal);
          const admitted = await loadCatalog(stored, profileModels);
          provider.models = toProviderModels(admitted.models);
        }
      } catch (error) {
        provider.models = {};
        // Failure is isolated to LMM: native auth login must remain usable when
        // an old grant was revoked or refresh was fenced. Never log credentials.
        const reason = error instanceof LmmError ? error.message : 'The native credential store or LMM catalog is unavailable.';
        console.warn(`${reason} Run opencode auth login --provider lmm to reconnect, then restart OpenCode.`);
      }
    },
    provider: {
      id: 'lmm',
      // Both hosts can call models with explicit auth. Only Magpie's dedicated
      // PluginInput interface establishes the account-scoped persistence contract.
      models: async (provider: any, input: ProviderHookContext = {}) => {
        const auth = input.auth;
        if (!auth || auth.type !== 'oauth') return provider.models ?? {};
        try {
          const fresh = freshForModels(auth);
          const hostReferenceCosts = new Map(profileReferenceCosts);
          for (const [id, model] of Object.entries(provider.models ?? {}) as [string, any][]) {
            if (!profiles.has(id)) continue;
            const cost = normalizeReferenceCost(model.cost);
            if (cost) hostReferenceCosts.set(id, cost);
          }
          const admitted = await loadCatalog(fresh, profileModels, hostReferenceCosts);
          return toProviderModels(admitted.models);
        } catch (error) {
          if (error instanceof LmmError && error.code === 'unauthorized') {
            throw Object.assign(error, {signIn: 'expired'});
          }
          throw error;
        }
      },
    },
    auth: {
      provider: 'lmm',
      methods: [{type: 'oauth', label: 'Sign in with LMM (OAuth)', authorize: () => oauth.authorize()}],
      refreshLead: 5 * 60 * 1000,
      // Magpie renews each account before calling models, usage or fetch.
      // Legacy OpenCode ignores this hook; its loader refuses unsafe operations.
      refresh: async (auth: OAuth) => {
        const key = refreshKey(auth);
        const failure = cachedRefreshFailure(key);
        if (failure) {
          if (failure.code === 'unauthorized') Object.assign(failure, {signIn: 'expired'});
          throw failure;
        }
        const inFlight = refreshesInFlight.get(key);
        if (inFlight) {
          const rotated = await inFlight;
          return {access: rotated.access, refresh: rotated.refresh, expires: rotated.expires};
        }
        const pending = (async () => {
          try {
            return await oauth.refresh(auth);
          } catch (error) {
            rememberRefreshFailure(key, error);
            const safe = cachedRefreshFailure(key)!;
            if (safe.code === 'unauthorized') Object.assign(safe, {signIn: 'expired'});
            throw safe;
          } finally {
            refreshesInFlight.delete(key);
          }
        })();
        refreshesInFlight.set(key, pending);
        const rotated = await pending;
        return {access: rotated.access, refresh: rotated.refresh, expires: rotated.expires};
      },
      loader: async (getAuth, provider) => {
        const unavailable = (reason = 'LMM requires OAuth. Reconnect this account.') => {
          provider.models = {};
          return {apiKey: 'lmm-oauth-required', fetch: async () => { throw new Error(reason); }};
        };
        // The legacy session processor retries above the SDK's maxRetries. No
        // plugin hook disables that policy, so refuse before any inference I/O.
        if (!accountScopedHost) return unavailable(legacyRefusal);
        const fresh = () => currentAuth(getAuth);
        let admitted: Awaited<ReturnType<typeof loadCatalog>>;
        try {
          const initial = await getAuth();
          if (!initial || initial.type !== 'oauth') return unavailable();
          const auth = await fresh();
          admitted = await loadCatalog(auth, profileModels);
        } catch {
          // Keep native sign-in available without letting an unrelated host's
          // configuration failure disable this account's valid credentials.
          return unavailable();
        }
        provider.models = admitted.models;
        return {
          apiKey: 'lmm-oauth', baseURL: `${http.issuer}/v1`,
          fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
            // Validate destination before any credential-refresh side effect.
            const target = new URL(input instanceof Request ? input.url : input.toString());
            requireValue(target.origin === http.issuer && !target.username && !target.password && ['/v1/chat/completions', '/v1/responses', '/v1/messages'].includes(target.pathname) && !target.search && !target.hash, 'LMM refuses this request destination.');
            const current = await fresh();
            const request = await prepareRelay(input, init, http.issuer, admitted.routes, current.access);
            const allowed = unpack(current, http.issuer).scope.split(' ');
            requireValue(allowed.includes(`group:${request.headers.get('x-lmm-group')}`), 'LMM group is no longer authorized. Connect again.');
            return http.fetch(request);
          },
        };
      },
    },
  };
};
export default LmmOAuthPlugin;
