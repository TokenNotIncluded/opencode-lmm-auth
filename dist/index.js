import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { LmmHttp } from "./http.js";
import { OAuthSession, unpack } from "./oauth.js";
import { RefreshJournal } from "./refresh-journal.js";
import { admitCatalog, prepareRelay } from "./catalog.js";
import { requireValue } from "./protocol.js";
import { builtinProfiles } from "./metadata.js";
const LmmOAuthPlugin = async ({ client }, options) => {
    const http = new LmmHttp({ issuer: typeof options?.issuer === 'string' ? options.issuer : undefined });
    const stateHome = process.env.XDG_STATE_HOME;
    const stateDirectory = stateHome && isAbsolute(stateHome) ? stateHome : join(homedir(), '.local', 'state');
    const oauth = new OAuthSession(http, new RefreshJournal(join(stateDirectory, 'opencode-lmm-auth', 'refresh')));
    const profiles = new Set();
    let profileModels = {};
    const readHostAuth = async () => {
        const inline = process.env.OPENCODE_AUTH_CONTENT;
        if (inline !== undefined) {
            try {
                return JSON.parse(inline).lmm;
            }
            catch {
                throw new Error('Invalid OPENCODE_AUTH_CONTENT. Update the native OpenCode credential configuration.');
            }
        }
        const data = process.env.XDG_DATA_HOME;
        const directory = data && isAbsolute(data) ? data : join(homedir(), '.local', 'share');
        try {
            return JSON.parse(await readFile(join(directory, 'opencode', 'auth.json'), 'utf8')).lmm;
        }
        catch (error) {
            if (error.code === 'ENOENT')
                return undefined;
            throw error;
        }
    };
    let pendingRefresh;
    return {
        config: async (config) => {
            config.provider ??= {};
            config.provider.lmm ??= { name: 'LMM', npm: '@ai-sdk/openai-compatible', models: {} };
            const provider = config.provider.lmm;
            provider.models = { ...structuredClone(builtinProfiles), ...provider.models };
            provider.options = { ...provider.options, baseURL: `${http.issuer}/v1` };
            profiles.clear();
            for (const [id, profile] of Object.entries(provider.models ?? {})) {
                if (profile.limit && Number.isSafeInteger(profile.limit.context) && profile.limit.context > 0 && Number.isSafeInteger(profile.limit.output) && profile.limit.output > 0 && typeof profile.tool_call === 'boolean' && typeof profile.reasoning === 'boolean' && typeof profile.attachment === 'boolean' && typeof profile.temperature === 'boolean' && typeof profile.options?.lmmApi === 'string')
                    profiles.add(id);
            }
            // OpenCode 1.18.34 passes a deep copy to auth.loader; model mutations there
            // are discarded. Admit catalog models in config before host parsing instead.
            profileModels = Object.fromEntries(Object.entries(provider.models).map(([id, p]) => [id, {
                    id, providerID: 'lmm', name: id, status: 'active', headers: {},
                    api: { id, url: `${http.issuer}/v1`, npm: provider.npm }, cost: { input: 0, output: 0, cache: { read: 0, write: 0 } },
                    options: p.options ?? {}, limit: p.limit, capabilities: { toolcall: p.tool_call, reasoning: p.reasoning, attachment: p.attachment, temperature: p.temperature, input: Object.fromEntries(['text', 'audio', 'image', 'video', 'pdf'].map(k => [k, p.modalities?.input?.includes(k) ?? k === 'text'])), output: Object.fromEntries(['text', 'audio', 'image', 'video', 'pdf'].map(k => [k, p.modalities?.output?.includes(k) ?? k === 'text'])) }
                }]));
            let stored = await readHostAuth();
            provider.models = {};
            if (stored?.type === 'oauth') {
                unpack(stored, http.issuer);
                if (stored.expires <= Date.now() + 30_000) {
                    requireValue(process.env.OPENCODE_AUTH_CONTENT === undefined, 'The read-only OPENCODE_AUTH_CONTENT credential expired. Update it or remove it and reconnect.');
                    requireValue(typeof client?.auth?.set === 'function', 'This OpenCode host lacks client.auth.set; update the host to persist OAuth refresh credentials.');
                    const rotated = await oauth.refresh(stored);
                    const saved = await client.auth.set({ path: { id: 'lmm' }, body: rotated, throwOnError: true });
                    requireValue(saved.data === true, 'LMM could not save refreshed credentials. Connect again.');
                    stored = rotated;
                }
                const envelope = unpack(stored, http.issuer);
                const catalog = await http.bearer('/api/oauth2/catalog', stored.access);
                const admitted = admitCatalog(catalog, { models: profileModels }, http.issuer, envelope.scope, profiles);
                provider.models = Object.fromEntries(Object.entries(admitted.models).map(([id, m]) => [id, {
                        id, name: m.name, provider: { npm: m.api.npm, api: `${http.issuer}/v1` }, limit: m.limit, tool_call: m.capabilities.toolcall,
                        reasoning: m.capabilities.reasoning, attachment: m.capabilities.attachment, temperature: m.capabilities.temperature,
                        modalities: { input: Object.entries(m.capabilities.input).filter(([, yes]) => yes).map(([key]) => key), output: Object.entries(m.capabilities.output).filter(([, yes]) => yes).map(([key]) => key) },
                        options: m.options, cost: { input: m.cost.input, output: m.cost.output, cache_read: m.cost.cache.read, cache_write: m.cost.cache.write }
                    }]));
            }
        },
        auth: {
            provider: 'lmm',
            methods: [{ type: 'oauth', label: 'Sign in with LMM (OAuth)', authorize: () => oauth.authorize() }],
            loader: async (getAuth, provider) => {
                const initial = await getAuth();
                if (!initial || initial.type !== 'oauth') {
                    provider.models = {};
                    return { apiKey: 'lmm-oauth-required', fetch: async () => { throw new Error('LMM requires OAuth. Use /connect.'); } };
                }
                const fresh = async () => {
                    const auth = await getAuth();
                    requireValue(auth && auth.type === 'oauth', 'LMM requires OAuth. Use /connect.');
                    unpack(auth, http.issuer);
                    if (auth.expires > Date.now() + 30_000)
                        return auth;
                    requireValue(process.env.OPENCODE_AUTH_CONTENT === undefined, 'The read-only OPENCODE_AUTH_CONTENT credential expired. Update it or remove it and reconnect.');
                    pendingRefresh ??= (async () => {
                        requireValue(typeof client?.auth?.set === 'function', 'This OpenCode host lacks client.auth.set; update the host to persist OAuth refresh credentials.');
                        const rotated = await oauth.refresh(auth);
                        // Never invoke with a rotated token until host persistence succeeds.
                        const saved = await client.auth.set({ path: { id: 'lmm' }, body: rotated, throwOnError: true });
                        requireValue(saved.data === true, 'LMM could not save refreshed credentials. Connect again.');
                        return rotated;
                    })();
                    try {
                        return await pendingRefresh;
                    }
                    finally {
                        pendingRefresh = undefined;
                    }
                };
                const auth = await fresh();
                const catalog = await http.bearer('/api/oauth2/catalog', auth.access);
                const admitted = admitCatalog(catalog, { ...provider, models: profileModels }, http.issuer, unpack(auth, http.issuer).scope, profiles);
                provider.models = admitted.models;
                return {
                    apiKey: 'lmm-oauth', baseURL: `${http.issuer}/v1`,
                    fetch: async (input, init) => {
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
