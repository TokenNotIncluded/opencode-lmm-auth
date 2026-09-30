import type { Model, Provider } from '@opencode-ai/sdk';
import { canonicalId, nonnegative, object, requireValue, text } from './protocol.ts';

export type Route = { upstream: string; group: string; path: string };
const protocols: Record<string, {npm: string; path: string}> = {
  'openai-completions': {npm: '@ai-sdk/openai-compatible', path: '/v1/chat/completions'},
  'openai-responses': {npm: '@ai-sdk/openai', path: '/v1/responses'},
  'anthropic-messages': {npm: '@ai-sdk/anthropic', path: '/v1/messages'},
};

/** Exact user-supplied capability profiles only; never guess limits from a name. */
export function admitCatalog(value: Record<string, unknown>, provider: Provider, issuer: string, scope: string, allowedProfiles: Set<string>): { models: Record<string, Model>; routes: Map<string, Route> } {
  requireValue(value.schema_version === 1 && value.resource === `${issuer}/api/oauth2` && Array.isArray(value.models) && value.models.length <= 10000);
  const models: Record<string, Model> = Object.create(null);
  const routes = new Map<string, Route>();
  for (const raw of value.models) {
    const item = object(raw);
    const upstream = text(item.upstream_model);
    const group = canonicalId(item.group_id);
    const id = text(item.id, 4096);
    requireValue(id === `lmm:${group}:${Buffer.from(upstream).toString('base64url')}` && !routes.has(id));
    requireValue(scope.split(' ').includes(`group:${group}`));
    const profile = provider.models[upstream];
    if (!profile || !allowedProfiles.has(upstream)) continue;
    const configured = typeof profile.options.lmmApi === 'string' ? profile.options.lmmApi : '';
    const supported = Array.isArray(profile.options.lmmSupportedApis) ? profile.options.lmmSupportedApis : [configured];
    const api = supported.find((candidate): candidate is string => typeof candidate === 'string' && candidate in protocols && Array.isArray(item.apis) && item.apis.includes(candidate)) ?? configured;
    const protocol = protocols[api];
    if (!protocol || !Array.isArray(item.apis) || !item.apis.includes(api)) continue;
    const pricing = object(item.pricing);
    // Unknown/request/expression billing cannot be represented accurately by
    // OpenCode's mandatory numeric token cost fields. Omit these models.
    if (pricing.unit !== 'million_tokens' || pricing.price_basis !== 'configured_base_rates' || pricing.currency !== 'USD' || item.native_cost === null) continue;
    const cost = object(item.native_cost);
    models[id] = {...profile, id, providerID: 'lmm', name: `${text(item.name)} [${text(item.group)}]`, api: {id, url: `${issuer}/v1`, npm: protocol.npm}, cost: {input: nonnegative(cost.input), output: nonnegative(cost.output), cache: {read: nonnegative(cost.cacheRead), write: nonnegative(cost.cacheWrite)}}, headers: {}, options: {...profile.options}};
    routes.set(id, {upstream, group, path: protocol.path});
  }
  return {models, routes};
}

export function relayRequest(input: RequestInfo | URL, init: RequestInit | undefined, issuer: string, routes: Map<string, Route>, access: string): Request {
  const original = new Request(input, init);
  const url = new URL(original.url);
  requireValue(url.origin === issuer && !url.username && !url.password && !url.search && !url.hash && original.method === 'POST', 'LMM refuses to send credentials to this request destination.');
  const headers = new Headers(original.headers);
  // A new body is built by the asynchronous transport below.
  for (const name of ['authorization', 'x-api-key', 'x-goog-api-key', 'x-lmm-group', 'cookie', 'proxy-authorization']) headers.delete(name);
  headers.set('authorization', `Bearer ${access}`);
  return new Request(original, {headers, redirect: 'error', credentials: 'omit'});
}

export async function prepareRelay(input: RequestInfo | URL, init: RequestInit | undefined, issuer: string, routes: Map<string, Route>, access: string): Promise<Request> {
  const request = relayRequest(input, init, issuer, routes, access);
  requireValue(request.body, 'LMM request has no body.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const {value, done} = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      requireValue(bytes <= 10_000_000, 'LMM request exceeded its size limit.');
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  let body: Record<string, unknown>;
  try { body = object(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
  catch { throw new Error('Invalid LMM request JSON.'); }
  const route = typeof body.model === 'string' && routes.get(body.model);
  requireValue(route && new URL(request.url).pathname === route.path, 'Model or protocol is not in the authorized LMM catalog.');
  const headers = new Headers(request.headers);
  headers.set('x-lmm-group', route.group);
  headers.set('content-type', 'application/json');
  body.model = route.upstream;
  return new Request(request.url, {method: 'POST', headers, body: JSON.stringify(body), signal: request.signal, redirect: 'error', credentials: 'omit'});
}
