import { parseMetadata } from './server-metadata.ts';
import type { Model, Provider } from '@opencode-ai/sdk';
import { canonicalId, nonnegative, object, requireValue, text } from './protocol.ts';
import { peekModelsDev, type ModelsDevCatalog } from './models-dev-cache.ts';

export type Route = { upstream: string; group: string; path: string };
export type ReferenceCost = Model['cost'];
export type CatalogDiagnostics = {groups: ReadonlyArray<{group: string; total: number; admitted: number; filtered: ReadonlyArray<{reason: string; count: number}>}>};
export type CatalogAdmission = {models: Record<string, Model>; routes: Map<string, Route>; diagnostics: CatalogDiagnostics};
export function logCatalogDiagnostics(diagnostics: CatalogDiagnostics, logger: Pick<Console, 'info'> = console, previousFingerprint?: string): string {
  const fingerprint = JSON.stringify(diagnostics);
  if (fingerprint === previousFingerprint) return fingerprint;
  for (const group of diagnostics.groups) logger.info(`[LMM catalog] group=${group.group} admitted=${group.admitted}/${group.total} filtered=${group.filtered.map(item => `${item.reason}:${item.count}`).join(',') || 'none'}`);
  return fingerprint;
}
const protocols: Record<string, {npm: string; path: string}> = {
  'openai-completions': {npm: '@ai-sdk/openai-compatible', path: '/v1/chat/completions'},
  'openai-responses': {npm: '@ai-sdk/openai', path: '/v1/responses'},
  'anthropic-messages': {npm: '@ai-sdk/anthropic', path: '/v1/messages'},
};
const finiteRate = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const positiveLimit = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

/** Host reference rates are estimates, never an account quote. */
export function normalizeReferenceCost(value: unknown): ReferenceCost | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const row = value as Record<string, any>;
  if (!finiteRate(row.input) || !finiteRate(row.output)) return undefined;
  const read = row.cache_read ?? row.cacheRead ?? row.cache?.read;
  const write = row.cache_write ?? row.cacheWrite ?? row.cache?.write;
  return {input: row.input, output: row.output, cache: {read: finiteRate(read) ? read : 0, write: finiteRate(write) ? write : 0}};
}

/** The authorized catalog determines availability. Metadata enriches, never whitelists it. */
export function admitCatalog(value: Record<string, unknown>, provider: Provider, issuer: string, scope: string, metadataCatalog: ModelsDevCatalog = peekModelsDev(), referenceCosts: ReadonlyMap<string, ReferenceCost> = new Map()): CatalogAdmission {
  requireValue(value.schema_version === 1 && value.resource === `${issuer}/api/oauth2` && Array.isArray(value.models) && value.models.length <= 20_000);
  const models: Record<string, Model> = Object.create(null);
  const routes = new Map<string, Route>();
  const seen = new Set<string>();
  const scopes = new Set(scope.split(' '));
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
    requireValue(id === `lmm:${group}:${Buffer.from(upstream).toString('base64url')}` && !seen.has(id));
    seen.add(id);
    requireValue(scopes.has(`group:${group}`));
    const count = counts.get(group) ?? {total: 0, admitted: 0, filtered: new Map<string, number>()};
    count.total++;
    counts.set(group, count);
    const server = parseMetadata(item.metadata);
    const reference = metadataCatalog.resolve(upstream);
    const profile = provider.models[upstream];
    const offered = Array.isArray(item.apis) ? item.apis.filter((api): api is string => typeof api === 'string' && api in protocols) : [];
    const preferred = profile?.options?.lmmApi;
    const api = typeof preferred === 'string' && offered.includes(preferred) ? preferred : offered[0];
    if (!api) { reject(group, 'unsupported_protocol'); continue; }
    const input = server?.input_modalities ?? reference?.modalities.input;
    const output = server?.output_modalities ?? reference?.modalities.output;
    if ((reference?.type && reference.type !== 'chat') || (input && !input.includes('text')) || (output && !output.includes('text'))) {
      reject(group, 'unsupported_modality'); continue;
    }
    const context = server?.context_window ?? server?.max_input_tokens ?? profile?.limit?.context ?? reference?.limit.context ?? 32768;
    const inputLimit = server?.max_input_tokens ?? reference?.limit.input;
    const contextWindow = inputLimit ? Math.min(context, inputLimit) : context;
    const outputLimit = server?.max_output_tokens ?? profile?.limit?.output ?? reference?.limit.output ?? 4096;
    requireValue(positiveLimit(contextWindow) && positiveLimit(outputLimit));
    const pricing = object(item.pricing);
    const native = item.native_cost === undefined || item.native_cost === null ? undefined : object(item.native_cost);
    if (native) {
      requireValue(pricing.currency === 'USD' && pricing.unit === 'million_tokens', 'LMM native cost has incompatible units.');
      for (const key of ['input', 'output', 'cacheRead', 'cacheWrite']) nonnegative(native[key]);
    }
    const tokenRates = pricing.currency === 'USD' && pricing.unit === 'million_tokens';
    const supplied = referenceCosts.get(upstream);
    const rates = reference?.cost;
    const unknownCosts: string[] = [];
    let usesReference = false;
    const rate = (field: 'input' | 'output' | 'cacheRead' | 'cacheWrite', pricingField: string, referenceRate: unknown) => {
      if (native) return native[field] as number;
      if (tokenRates && finiteRate(pricing[pricingField])) return pricing[pricingField] as number;
      if (finiteRate(referenceRate)) { usesReference = true; return referenceRate; }
      unknownCosts.push(pricingField);
      // These hosts require numeric estimates. The visible label and options
      // explicitly mark absent estimates; this value never controls LMM billing.
      return 0;
    };
    const modelCost = {
      input: rate('input', 'input', supplied?.input ?? rates?.input),
      output: rate('output', 'output', supplied?.output ?? rates?.output),
      cache: {
        read: rate('cacheRead', 'cache_read', supplied?.cache.read ?? rates?.cache_read),
        write: rate('cacheWrite', 'cache_write', supplied?.cache.write ?? rates?.cache_write),
      },
    };
    const modalities = (values: readonly string[] | undefined, fallback: Model['capabilities']['input'] | undefined) =>
      Object.fromEntries(['text', 'image', 'audio', 'video', 'pdf'].map(kind => [kind, values ? values.includes(kind) : fallback?.[kind as keyof typeof fallback] ?? kind === 'text'])) as Model['capabilities']['input'];
    const inputModes = modalities(input, profile?.capabilities.input);
    const outputModes = modalities(output, profile?.capabilities.output);
    const unknownMetadata = !server && !reference && !profile;
    const pricingLabel = unknownCosts.length ? ' · cost estimate incomplete (server billed)' : usesReference ? ' · reference estimate (server billed)' : '';
    const metadataLabel = unknownMetadata ? ' · metadata unavailable' : '';
    models[id] = {
      id, providerID: 'lmm', name: `${text(item.name)} [${text(item.group)}]${metadataLabel}${pricingLabel}`,
      status: 'active', api: {id, url: `${issuer}/v1`, npm: protocols[api]!.npm}, headers: {},
      limit: {context: contextWindow, output: Math.min(contextWindow, outputLimit)},
      capabilities: {
        toolcall: server?.tool_call ?? profile?.capabilities.toolcall ?? reference?.tool_call ?? false,
        reasoning: server?.reasoning ?? profile?.capabilities.reasoning ?? reference?.reasoning ?? false,
        attachment: Object.entries(inputModes).some(([kind, enabled]) => kind !== 'text' && enabled),
        temperature: profile?.capabilities.temperature ?? reference?.temperature ?? false,
        input: inputModes, output: outputModes,
      },
      cost: modelCost,
      options: {
        ...profile?.options, lmmApi: api, lmmUpstreamModel: upstream, lmmPricing: pricing,
        ...(server ? {lmmMetadata: server} : {}),
        lmmMetadataSource: server?.source || reference?.source || (profile ? 'user configuration' : 'unknown'),
        lmmMetadataStatus: unknownMetadata ? 'unknown' : 'available',
        lmmPricingBasis: pricing.price_basis, lmmReferenceCost: usesReference,
        lmmUnknownCostFields: unknownCosts,
      },
    };
    routes.set(id, {upstream, group, path: protocols[api]!.path});
    count.admitted++;
  }
  const groups = [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, count], index) => ({
    group: `group-${index + 1}`, total: count.total, admitted: count.admitted,
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
