import type { Model, Provider } from '@opencode-ai/sdk';
import { canonicalId, nonnegative, object, requireValue, text } from './protocol.ts';

export type Route = { upstream: string; group: string; path: string };
export type ReferenceCost = Model['cost'];
export type CatalogDiagnostics = {groups: ReadonlyArray<{group: string; total: number; admitted: number; filtered: ReadonlyArray<{reason: string; count: number}>}>};
export type CatalogAdmission = {models: Record<string, Model>; routes: Map<string, Route>; diagnostics: CatalogDiagnostics};
export function logCatalogDiagnostics(diagnostics: CatalogDiagnostics, logger: Pick<Console, 'info'> = console, previousFingerprint?: string): string {
  const fingerprint = JSON.stringify(diagnostics);
  if (fingerprint === previousFingerprint) return fingerprint;
  for (const group of diagnostics.groups) {
    logger.info(`[LMM catalog] group=${group.group} admitted=${group.admitted}/${group.total} filtered=${group.filtered.map(item => `${item.reason}:${item.count}`).join(',') || 'none'}`);
  }
  return fingerprint;
}
const protocols: Record<string, {npm: string; path: string}> = {
  'openai-completions': {npm: '@ai-sdk/openai-compatible', path: '/v1/chat/completions'},
  'openai-responses': {npm: '@ai-sdk/openai', path: '/v1/responses'},
  'anthropic-messages': {npm: '@ai-sdk/anthropic', path: '/v1/messages'},
};

/** Read host/vendor reference rates without treating them as an LMM quote. */
export function normalizeReferenceCost(value: unknown): ReferenceCost | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const row = value as Record<string, unknown>;
  const cache = typeof row.cache === 'object' && row.cache !== null && !Array.isArray(row.cache)
    ? row.cache as Record<string, unknown> : {};
  const input = row.input;
  const output = row.output;
  const read = row.cache_read ?? row.cacheRead ?? cache.read;
  const write = row.cache_write ?? row.cacheWrite ?? cache.write;
  if (![input, output, read, write].every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0)) return undefined;
  if (![input, output, read, write].some(value => (value as number) > 0)) return undefined;
  return {input: input as number, output: output as number, cache: {read: read as number, write: write as number}};
}

/** Exact user-supplied capability profiles only; never guess limits from a name. */
export function admitCatalog(value: Record<string, unknown>, provider: Provider, issuer: string, scope: string, allowedProfiles: Set<string>, referenceCosts: ReadonlyMap<string, ReferenceCost> = new Map()): CatalogAdmission {
  requireValue(value.schema_version === 1 && value.resource === `${issuer}/api/oauth2` && Array.isArray(value.models) && value.models.length <= 10000);
  const models: Record<string, Model> = Object.create(null);
  const routes = new Map<string, Route>();
  const counts = new Map<string, {total: number; admitted: number; filtered: Map<string, number>}>();
  const reject = (group: string, reason: string) => {
    const count = counts.get(group)!;
    count.filtered.set(reason, (count.filtered.get(reason) ?? 0) + 1);
  };
  for (const raw of value.models) {
    const item = object(raw);
    const upstream = text(item.upstream_model);
    const group = canonicalId(item.group_id);
    const id = text(item.id, 4096);
    requireValue(id === `lmm:${group}:${Buffer.from(upstream).toString('base64url')}` && !routes.has(id));
    requireValue(scope.split(' ').includes(`group:${group}`));
    const count = counts.get(group) ?? {total: 0, admitted: 0, filtered: new Map<string, number>()};
    count.total++;
    counts.set(group, count);
    const profile = provider.models[upstream];
    if (!profile || !allowedProfiles.has(upstream)) { reject(group, 'missing_profile'); continue; }
    const configured = typeof profile.options.lmmApi === 'string' ? profile.options.lmmApi : '';
    const supported = Array.isArray(profile.options.lmmSupportedApis) ? profile.options.lmmSupportedApis : [configured];
    const api = supported.find((candidate): candidate is string => typeof candidate === 'string' && candidate in protocols && Array.isArray(item.apis) && item.apis.includes(candidate)) ?? configured;
    const protocol = protocols[api];
    if (!protocol || !Array.isArray(item.apis) || !item.apis.includes(api)) { reject(group, 'unsupported_protocol'); continue; }
    const pricing = object(item.pricing);
    const nativePricing = pricing.currency === 'USD' && pricing.unit === 'million_tokens' &&
      (pricing.price_basis === 'configured_base_rates' || pricing.price_basis === 'dynamic_estimate') && item.native_cost !== null;
    const variablePricing = pricing.currency === 'USD' && item.native_cost === null &&
      (pricing.unit === 'expression' || pricing.price_basis === 'tiered_expression');
    // Core currently publishes token rates in pricing, but leaves cache_write
    // unknown and native_cost null. Do not turn the missing rate into zero.
    const incompleteTokenPricing = pricing.currency === 'USD' && item.native_cost === null && pricing.unit === 'million_tokens' &&
      (pricing.price_basis === 'configured_base_rates' || pricing.price_basis === 'effective_user_rates');
    if (!nativePricing && !variablePricing && !incompleteTokenPricing) { reject(group, 'unsupported_pricing'); continue; }
    const reference = (variablePricing || incompleteTokenPricing) ? referenceCosts.get(upstream) : undefined;
    // OpenCode requires numeric cost fields. A reference estimate lets us list
    // an incomplete or dynamic LMM route; the label/options distinguish it from
    // the account's actual server price.
    if ((variablePricing || incompleteTokenPricing) && !reference) { reject(group, 'missing_reference_price'); continue; }
    const native = nativePricing ? object(item.native_cost) : undefined;
    const modelCost = nativePricing
      ? {input: nonnegative(native!.input), output: nonnegative(native!.output), cache: {read: nonnegative(native!.cacheRead), write: nonnegative(native!.cacheWrite)}}
      : reference!;
    const options = {
      ...profile.options,
      ...((variablePricing || incompleteTokenPricing) ? {lmmPricingBasis: pricing.price_basis, lmmReferenceCost: true} : {}),
    };
    const pricingLabel = variablePricing ? ' · LMM variable billing' : incompleteTokenPricing ? (upstream === 'claude-haiku-5-5' ? ' · base-tier reference estimate' : ' · reference estimate') : '';
    models[id] = {...profile, id, providerID: 'lmm', name: `${text(item.name)} [${text(item.group)}]${pricingLabel}`, api: {id, url: `${issuer}/v1`, npm: protocol.npm}, cost: modelCost, headers: {}, options};
    routes.set(id, {upstream, group, path: protocol.path});
    count.admitted++;
  }
  const groups = [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([group, count], index) => ({
    // Logs use an ordinal and aggregate counts, never the raw group ID or name.
    group: `group-${index + 1}`,
    total: count.total,
    admitted: count.admitted,
    filtered: [...count.filtered.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([reason, total]) => ({reason, count: total})),
  }));
  return {models, routes, diagnostics: {groups}};
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
