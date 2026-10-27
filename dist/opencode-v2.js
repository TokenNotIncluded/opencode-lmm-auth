import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { admitCatalog, logCatalogDiagnostics, prepareRelay } from "./catalog.js";
import { LmmHttp } from "./http.js";
import { builtinProfiles } from "./metadata.js";
import { deprecatedProfiles } from "./model-status.js";
import { OAuthSession, unpack } from "./oauth.js";
import { LmmError, nonnegative, requireValue } from "./protocol.js";
import { referenceCosts } from "./reference-costs.js";
import { RefreshJournal } from "./refresh-journal.js";
const METHOD = 'oauth';
const PROVIDER = 'lmm';
const RECONNECT = 'LMM requires its current OAuth connection. Connect LMM again.';
const nativePackages = {
    '@ai-sdk/openai-compatible': '@opencode/ai/providers/openai-compatible',
    '@ai-sdk/openai': '@opencode/ai/providers/openai/responses',
    '@ai-sdk/anthropic': '@opencode/ai/providers/anthropic',
};
function connectionKey(connection) {
    return connection?.type === 'credential' ? connection.id : undefined;
}
function fingerprint(value) {
    return createHash('sha256').update(JSON.stringify([value.access, value.refresh, value.expires])).digest('hex');
}
function profiles(issuer) {
    const provider = { id: PROVIDER, name: 'LMM', source: 'config', env: [], options: {}, models: {} };
    const allowed = new Set();
    for (const [id, profile] of Object.entries(builtinProfiles)) {
        if (deprecatedProfiles.has(id) || profile.status === 'deprecated' || !profile.limit ||
            !Number.isSafeInteger(profile.limit.context) || profile.limit.context <= 0 ||
            !Number.isSafeInteger(profile.limit.output) || profile.limit.output <= 0 ||
            typeof profile.tool_call !== 'boolean' || typeof profile.reasoning !== 'boolean' ||
            typeof profile.attachment !== 'boolean' || typeof profile.temperature !== 'boolean' ||
            typeof profile.options?.lmmApi !== 'string')
            continue;
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
function nativeModel(value) {
    const packageName = nativePackages[value.api.npm];
    requireValue(packageName, 'LMM catalog selected an unsupported model protocol.');
    // admitCatalog has validated the canonical model ID and finite USD/million-token rates.
    const id = value.id;
    const dollars = (value) => nonnegative(value);
    return {
        id, modelID: id, providerID: PROVIDER, name: value.name,
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
export async function setupLmmV2(context) {
    const http = new LmmHttp({ issuer: typeof context.options.issuer === 'string' ? context.options.issuer : undefined });
    const stateHome = process.env.XDG_STATE_HOME;
    const state = stateHome && isAbsolute(stateHome) ? stateHome : join(homedir(), '.local', 'state');
    const oauth = new OAuthSession(http, new RefreshJournal(join(state, 'opencode-lmm-auth', 'refresh')));
    const configured = profiles(http.issuer);
    const costs = new Map(Object.entries(referenceCosts));
    const registrations = [];
    const controller = new AbortController();
    let snapshot;
    let lastCatalogDiagnosticFingerprint;
    let pending = Promise.resolve();
    let timer;
    const sent = new WeakMap();
    const credential = async (connection) => {
        requireValue(connection.type === 'credential' && connection.method === 'oauth', RECONNECT);
        const value = await context.integration.connection.resolve(connection);
        requireValue(value?.type === 'oauth' && value.methodID === METHOD, RECONNECT);
        unpack(value, http.issuer);
        return value;
    };
    const requireCurrent = async (connection) => {
        const active = await context.integration.connection.active(PROVIDER);
        requireValue(connectionKey(active) === connectionKey(connection), 'The LMM account changed. Select its current model again.');
    };
    const load = async (force, publish = true) => {
        let connection;
        try {
            connection = await context.integration.connection.active(PROVIDER);
            if (!connection) {
                snapshot = undefined;
            }
            else {
                const current = await credential(connection);
                if (!force && connectionKey(snapshot?.connection) === connectionKey(connection) && snapshot?.fingerprint === fingerprint(current))
                    return;
                const catalog = await http.bearer('/api/oauth2/catalog', current.access, controller.signal);
                const admitted = admitCatalog(catalog, configured.provider, http.issuer, unpack(current, http.issuer).scope, configured.allowed, costs);
                lastCatalogDiagnosticFingerprint = logCatalogDiagnostics(admitted.diagnostics, console, lastCatalogDiagnosticFingerprint);
                await requireCurrent(connection);
                if (controller.signal.aborted)
                    return;
                snapshot = { connection, models: Object.values(admitted.models).map(nativeModel), routes: admitted.routes, fingerprint: fingerprint(current) };
            }
        }
        catch (error) {
            snapshot = undefined;
            if (connection && error instanceof LmmError && error.code === 'unauthorized') {
                await context.integration.connection.status({ integrationID: PROVIDER, connection, status: { status: 'needs_auth', message: RECONNECT } });
            }
        }
        if (publish && !controller.signal.aborted)
            await context.provider.reload();
    };
    const reload = (force = false) => {
        const result = pending.then(() => load(force));
        pending = result.catch(() => { });
        return result;
    };
    const cleanup = async () => {
        controller.abort();
        if (timer)
            clearInterval(timer);
        for (const registration of registrations.slice().reverse())
            await registration.dispose();
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
                        callback: authorization.callback().then(value => ({ type: 'oauth', methodID: METHOD, access: value.access, refresh: value.refresh, expires: value.expires })),
                    };
                },
                refresh: async (value) => {
                    requireValue(value.methodID === METHOD, RECONNECT);
                    const renewed = await oauth.refresh(value);
                    return { ...renewed, methodID: METHOD };
                },
            });
        }));
        // Initial transforms settle with plugin activation; reload only after setup.
        await load(true, false);
        registrations.push(await context.provider.transform(editor => {
            editor.add({
                info: {
                    id: PROVIDER, integrationID: PROVIDER,
                    name: 'LMM', activation: 'auto', package: '@opencode/ai/providers/openai-compatible',
                    settings: { baseURL: `${http.issuer}/v1`, transport: 'http' },
                },
                models: snapshot?.models ?? [],
                ...(snapshot ? { sourceConnection: snapshot.connection } : {}),
            });
        }));
        registrations.push(await context.session.hook('http.request', async (event) => {
            const selected = snapshot;
            const route = selected?.routes.get(event.model.id);
            requireValue(selected && route, 'The model is not in the current LMM account catalog.');
            const destination = new URL(event.request.url);
            requireValue(destination.origin === http.issuer && !destination.username && !destination.password &&
                !destination.search && !destination.hash && destination.pathname === route.path && event.request.method === 'POST', 'LMM refuses this request destination.');
            await requireCurrent(selected.connection);
            const current = await credential(selected.connection);
            const scope = unpack(current, http.issuer).scope.split(' ');
            requireValue(scope.includes(`group:${route.group}`), 'LMM group is no longer authorized. Connect again.');
            const request = await prepareRelay(event.request, undefined, http.issuer, new Map([[event.model.id, route]]), current.access);
            await requireCurrent(selected.connection);
            sent.set(request, { connection: selected.connection, fingerprint: fingerprint(current) });
            event.request = request;
        }, { providerID: PROVIDER }));
        registrations.push(await context.session.hook('http.response', async (event) => {
            if (event.response.status !== 401 && event.response.status !== 403)
                return;
            const attempt = sent.get(event.request);
            if (!attempt)
                return;
            const active = await context.integration.connection.active(PROVIDER);
            if (connectionKey(active) !== connectionKey(attempt.connection))
                return;
            if (event.response.status === 401) {
                const current = await credential(attempt.connection);
                if (fingerprint(current) !== attempt.fingerprint)
                    return;
                await context.integration.connection.status({ integrationID: PROVIDER, connection: attempt.connection, status: { status: 'needs_auth', message: RECONNECT } });
            }
            await reload(true);
        }, { providerID: PROVIDER }));
        registrations.push(await context.session.hook('retry', event => { event.decision = { retry: false }; }, { providerID: PROVIDER }));
        void (async () => {
            for await (const event of context.event.subscribe({ signal: controller.signal })) {
                if ((event.type === 'credential.switched' && event.data.integrationID === PROVIDER) || event.type === 'credential.updated')
                    await reload();
            }
        })().catch(() => { });
        timer = setInterval(() => { void reload(true).catch(() => { }); }, 60_000);
        timer.unref();
        return cleanup;
    }
    catch (error) {
        await cleanup();
        throw error;
    }
}
const LmmV2Plugin = { id: 'lmm.oauth', setup: setupLmmV2 };
export default LmmV2Plugin;
