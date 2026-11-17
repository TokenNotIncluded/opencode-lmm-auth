import { createHash, randomBytes } from 'node:crypto';
import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { listenCallback } from './callback.ts';
import { admitCatalog, prepareRelay } from './catalog.ts';
import { LmmHttp } from './http.ts';
import { MagpieJournal } from './magpie-journal.ts';
import { loadModelsDev } from './models-dev-cache.ts';
import { accessToken, APPLICATION_SCOPES, parseScope, requireValue, text } from './protocol.ts';

const CLIENT = 'lmm-magpie';
const PROVIDER = 'lmm-magpie';
type Auth = { type: 'oauth'; access: string; refresh: string; expires: number };
type Binding = { v: 1; issuer: string; client: string; installation: string; grant: string; token: string; scope: string };

function unpack(auth: Auth, http: LmmHttp): Binding {
  requireValue(auth?.type === 'oauth' && Number.isSafeInteger(auth.expires));
  accessToken(auth.access);
  let value: Binding;
  try { value = JSON.parse(auth.refresh); } catch { throw new Error('Invalid Magpie authorization. Reconnect.'); }
  requireValue(value.v === 1 && value.issuer === http.issuer && value.client === CLIENT && /^[a-f0-9]{64}$/.test(value.installation) && /^lmm_gr_[a-f0-9]{64}$/.test(value.grant) && /^lmm_rt_[A-Za-z0-9_-]+$/.test(value.token), 'Magpie authorization binding mismatch.');
  parseScope(value.scope);
  return value;
}
function credential(body: Record<string, unknown>, http: LmmHttp, installation: string, started: number, previous?: Auth): Auth {
  requireValue(body.client_id === CLIENT && body.installation_id === installation && body.token_type === 'Bearer');
  const access = accessToken(body.access_token);
  const token = text(body.refresh_token, 4096);
  const grant = text(body.grant_id);
  requireValue(/^lmm_rt_[A-Za-z0-9_-]+$/.test(token) && /^lmm_gr_[a-f0-9]{64}$/.test(grant));
  const scope = parseScope(body.scope);
  requireValue(APPLICATION_SCOPES.every(s => scope.split(' ').includes(s)) && scope.split(' ').some(s => s.startsWith('group:')));
  const seconds = body.expires_in;
  requireValue(typeof seconds === 'number' && Number.isSafeInteger(seconds) && seconds > 0 && seconds <= 86400);
  requireValue(Number.isSafeInteger(body.budget_credits) && Number(body.budget_credits) > 0);
  if (previous) {
    const old = unpack(previous, http);
    requireValue(old.grant === grant && old.installation === installation && token !== old.token && scope.split(' ').every(s => old.scope.split(' ').includes(s)), 'Magpie refresh changed its grant or widened scope.');
  }
  return { type: 'oauth', access, expires: started + seconds * 1000, refresh: JSON.stringify({v: 1, issuer: http.issuer, client: CLIENT, installation, grant, token, scope} satisfies Binding) };
}
const operationBinding = (binding: Binding) => JSON.stringify([binding.issuer, CLIENT, binding.installation, binding.grant, binding.token]);

/** Separate native Magpie entry; never reads OpenCode, Pi or browser credentials. */
const MagpieLmmPlugin = async (input: any, options?: { issuer?: string }) => {
  requireValue(typeof input.magpie?.option === 'function' && typeof input.magpie?.options === 'function', 'The LMM Magpie entry requires the account-scoped Magpie host.');
  const http = new LmmHttp({issuer: options?.issuer});
  const state = process.env.XDG_STATE_HOME;
  const journal = new MagpieJournal(join(state && isAbsolute(state) ? state : join(homedir(), '.local', 'state'), 'lmm-magpie', 'refresh'));
  const inFlight = new Map<string, Promise<Auth>>();
  const status = async (auth: Auth) => {
    const binding = unpack(auth, http);
    const value = await http.bearer('/api/oauth2/application', auth.access);
    requireValue(value.contract === 'lmm.application-status.v1' && value.client_id === CLIENT && value.application === 'magpie' && value.installation_id === binding.installation && value.grant_id === binding.grant && Array.isArray(value.scopes) && value.scopes.includes('models:invoke') && typeof value.access_expires_at === 'number' && value.access_expires_at * 1000 > Date.now(), 'Magpie authorization is unavailable or belongs to another installation.');
    return value;
  };
  const fresh = async (getAuth: () => Promise<Auth>) => {
    const auth = await getAuth();
    const binding = unpack(auth, http);
    requireValue(auth.expires > Date.now() && !inFlight.has(operationBinding(binding)) && !await journal.pending(operationBinding(binding)), 'Magpie authorization is expired or awaiting refresh recovery.');
    await status(auth);
    return auth;
  };
  const catalog = async (auth: Auth) => {
    const [value, metadata] = await Promise.all([http.bearer('/api/oauth2/catalog', auth.access), loadModelsDev()]);
    return admitCatalog(value, {models: {}} as any, http.issuer, unpack(auth, http).scope, metadata);
  };
  return {
    config: async (config: any) => {
      config.provider ??= {};
      config.provider[PROVIDER] = {name: 'LMM Magpie', npm: '@ai-sdk/openai-compatible', api: `${http.issuer}/v1`, models: {}};
    },
    auth: {
      provider: PROVIDER,
      refreshLead: 60_000,
      methods: [{type: 'oauth', label: 'LMM Magpie (browser authorization)', authorize: async () => {
        const signal = AbortSignal.timeout(180_000);
        const discovery = await http.request('/.well-known/oauth-authorization-server', {signal});
        requireValue(discovery.issuer === http.issuer && discovery.authorization_endpoint === `${http.resource}/authorize` && discovery.token_endpoint === `${http.resource}/token` && discovery.authorization_response_iss_parameter_supported === true && Array.isArray(discovery.code_challenge_methods_supported) && discovery.code_challenge_methods_supported.includes('S256'));
        requireValue(Array.isArray(discovery.lmm_managed_clients) && discovery.lmm_managed_clients.some((c: any) => c.client_id === CLIENT && c.application === 'magpie' && c.refresh_recovery?.window_seconds === 600), 'This Core has not enabled native Magpie authorization.');
        const verifier = randomBytes(32).toString('base64url');
        const state = randomBytes(32).toString('base64url');
        const installation = randomBytes(32).toString('hex');
        const callback = await listenCallback(http.issuer, state, signal, 'Magpie');
        const url = new URL(`${http.resource}/authorize`);
        url.search = new URLSearchParams({response_type: 'code', client_id: CLIENT, redirect_uri: callback.redirectUri, scope: APPLICATION_SCOPES.join(' '), resource: http.resource, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256', state, installation_id: installation, application: 'magpie', display_label: 'Magpie'}).toString();
        let used = false;
        return {url: url.href, method: 'auto', instructions: 'Approve a finite LMM budget in your browser, then return to Magpie.', callback: async () => {
          requireValue(!used, 'Magpie login callback was already used.'); used = true;
          try {
            const code = await callback.code;
            const started = Date.now();
            const auth = credential(await http.form('/api/oauth2/token', {grant_type: 'authorization_code', client_id: CLIENT, installation_id: installation, resource: http.resource, code, code_verifier: verifier, redirect_uri: callback.redirectUri}, signal), http, installation, started);
            await status(auth);
            return {...auth, type: 'success', accountId: `LMM ${installation.slice(0, 8)}`};
          } finally { callback.close(); }
        }};
      }}],
      refresh: async (auth: Auth) => {
        const old = unpack(auth, http);
        const key = operationBinding(old);
        let pending = inFlight.get(key);
        if (!pending) {
          pending = (async () => {
            const operation = await journal.begin(key);
            const started = Date.now();
            const rotated = credential(await http.form('/api/oauth2/token', {grant_type: 'refresh_token', client_id: CLIENT, installation_id: old.installation, resource: http.resource, refresh_token: old.token, rotation_id: operation.rotation}), http, old.installation, started, auth);
            await status(rotated);
            return rotated;
          })();
          inFlight.set(key, pending);
        }
        try { return await pending; } finally { inFlight.delete(key); }
      },
      usage: async (getAuth: () => Promise<Auth>) => {
        try {
          const auth = await fresh(getAuth);
          const binding = unpack(auth, http);
          const budget = await http.bearer('/api/oauth2/application/budget', auth.access);
          requireValue(budget.contract === 'lmm.application-budget.v1' && budget.unit === 'credit_500k_usd' && budget.client_id === CLIENT && budget.application === 'magpie' && budget.installation_id === binding.installation && budget.grant_id === binding.grant);
          const fields = ['budget_credits', 'consumed_credits', 'reserved_credits', 'remaining_credits'] as const;
          for (const key of fields) requireValue(Number.isSafeInteger(budget[key]) && Number(budget[key]) >= 0);
          const total = Number(budget.budget_credits), consumed = Number(budget.consumed_credits), reserved = Number(budget.reserved_credits), remaining = Number(budget.remaining_credits);
          requireValue(total > 0 && BigInt(consumed) + BigInt(reserved) + BigInt(remaining) === BigInt(total));
          return {plan: 'LMM authorization lifetime', windows: [{name: 'Authorized lifetime budget', used: (consumed + reserved) / total * 100, amount: consumed + reserved, limit: total, unit: 'credits', display: `${remaining} credits remaining; ${reserved} reserved`}]};
        } catch { return {error: 'LMM family budget is unavailable. Check authorization or recover the pending refresh.', windows: []}; }
      },
      loader: async (getAuth: () => Promise<Auth>) => {
        const auth = await fresh(getAuth);
        const admitted = await catalog(auth);
        return {apiKey: 'lmm-magpie-oauth', baseURL: `${http.issuer}/v1`, maxRetries: 0, fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
          const target = new URL(input instanceof Request ? input.url : input.toString());
          requireValue(target.origin === http.issuer && !target.username && !target.password && !target.search && !target.hash && ['/v1/chat/completions', '/v1/responses', '/v1/messages'].includes(target.pathname), 'Magpie refuses this model destination.');
          const current = await fresh(getAuth);
          requireValue(unpack(current, http).grant === unpack(auth, http).grant, 'Magpie account changed. Reload models.');
          const request = await prepareRelay(input, init, http.issuer, admitted.routes, current.access);
          requireValue(unpack(current, http).scope.split(' ').includes(`group:${request.headers.get('x-lmm-group')}`), 'Magpie group authorization was revoked.');
          return http.fetch(request);
        }};
      },
    },
    provider: {id: PROVIDER, models: async (_provider: any, context?: {auth?: Auth}) => {
      if (!context?.auth) return {};
      const auth = await fresh(async () => context.auth!);
      const admitted = await catalog(auth);
      return Object.fromEntries(Object.entries(admitted.models).map(([id, model]: [string, any]) => [id, {id, name: model.name, provider: {npm: model.api.npm, api: `${http.issuer}/v1`}, limit: model.limit, tool_call: model.capabilities.toolcall, reasoning: model.capabilities.reasoning, attachment: model.capabilities.attachment, temperature: model.capabilities.temperature, options: model.options, cost: {input: model.cost.input, output: model.cost.output, cache_read: model.cost.cache.read, cache_write: model.cost.cache.write}}]));
    }},
  };
};
export default MagpieLmmPlugin;
export const _magpieTest = {credential, unpack};
