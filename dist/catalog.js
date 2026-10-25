import { canonicalId, nonnegative, object, requireValue, text } from "./protocol.js";
const protocols = {
    'openai-completions': { npm: '@ai-sdk/openai-compatible', path: '/v1/chat/completions' },
    'openai-responses': { npm: '@ai-sdk/openai', path: '/v1/responses' },
    'anthropic-messages': { npm: '@ai-sdk/anthropic', path: '/v1/messages' },
};
/** Read host/vendor reference rates without treating them as an LMM quote. */
export function normalizeReferenceCost(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
        return undefined;
    const row = value;
    const cache = typeof row.cache === 'object' && row.cache !== null && !Array.isArray(row.cache)
        ? row.cache : {};
    const input = row.input;
    const output = row.output;
    const read = row.cache_read ?? row.cacheRead ?? cache.read;
    const write = row.cache_write ?? row.cacheWrite ?? cache.write;
    if (![input, output, read, write].every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0))
        return undefined;
    if (![input, output, read, write].some(value => value > 0))
        return undefined;
    return { input: input, output: output, cache: { read: read, write: write } };
}
/** Exact user-supplied capability profiles only; never guess limits from a name. */
export function admitCatalog(value, provider, issuer, scope, allowedProfiles, referenceCosts = new Map()) {
    requireValue(value.schema_version === 1 && value.resource === `${issuer}/api/oauth2` && Array.isArray(value.models) && value.models.length <= 10000);
    const models = Object.create(null);
    const routes = new Map();
    for (const raw of value.models) {
        const item = object(raw);
        const upstream = text(item.upstream_model);
        const group = canonicalId(item.group_id);
        const id = text(item.id, 4096);
        requireValue(id === `lmm:${group}:${Buffer.from(upstream).toString('base64url')}` && !routes.has(id));
        requireValue(scope.split(' ').includes(`group:${group}`));
        const profile = provider.models[upstream];
        if (!profile || !allowedProfiles.has(upstream))
            continue;
        const configured = typeof profile.options.lmmApi === 'string' ? profile.options.lmmApi : '';
        const supported = Array.isArray(profile.options.lmmSupportedApis) ? profile.options.lmmSupportedApis : [configured];
        const api = supported.find((candidate) => typeof candidate === 'string' && candidate in protocols && Array.isArray(item.apis) && item.apis.includes(candidate)) ?? configured;
        const protocol = protocols[api];
        if (!protocol || !Array.isArray(item.apis) || !item.apis.includes(api))
            continue;
        const pricing = object(item.pricing);
        const nativePricing = pricing.currency === 'USD' && pricing.unit === 'million_tokens' &&
            (pricing.price_basis === 'configured_base_rates' || pricing.price_basis === 'dynamic_estimate') && item.native_cost !== null;
        const variablePricing = pricing.currency === 'USD' && item.native_cost === null &&
            (pricing.unit === 'expression' || pricing.price_basis === 'tiered_expression');
        if (!nativePricing && !variablePricing)
            continue;
        const reference = variablePricing ? referenceCosts.get(upstream) : undefined;
        // OpenCode requires numeric cost fields. A host/vendor reference cost lets
        // us list a dynamic LMM route while the visible label/options state that it
        // is an estimate, never the account's final server quote.
        if (variablePricing && !reference)
            continue;
        const native = nativePricing ? object(item.native_cost) : undefined;
        const modelCost = nativePricing
            ? { input: nonnegative(native.input), output: nonnegative(native.output), cache: { read: nonnegative(native.cacheRead), write: nonnegative(native.cacheWrite) } }
            : reference;
        const options = {
            ...profile.options,
            ...(variablePricing ? { lmmPricingBasis: pricing.price_basis, lmmReferenceCost: true } : {}),
        };
        models[id] = { ...profile, id, providerID: 'lmm', name: `${text(item.name)} [${text(item.group)}]${variablePricing ? ' · LMM variable billing' : ''}`, api: { id, url: `${issuer}/v1`, npm: protocol.npm }, cost: modelCost, headers: {}, options };
        routes.set(id, { upstream, group, path: protocol.path });
    }
    return { models, routes };
}
export function relayRequest(input, init, issuer, routes, access) {
    const original = new Request(input, init);
    const url = new URL(original.url);
    requireValue(url.origin === issuer && !url.username && !url.password && !url.search && !url.hash && original.method === 'POST', 'LMM refuses to send credentials to this request destination.');
    const headers = new Headers(original.headers);
    // A new body is built by the asynchronous transport below.
    for (const name of ['authorization', 'x-api-key', 'x-goog-api-key', 'x-lmm-group', 'cookie', 'proxy-authorization'])
        headers.delete(name);
    headers.set('authorization', `Bearer ${access}`);
    return new Request(original, { headers, redirect: 'error', credentials: 'omit' });
}
export async function prepareRelay(input, init, issuer, routes, access) {
    const request = relayRequest(input, init, issuer, routes, access);
    requireValue(request.body, 'LMM request has no body.');
    const reader = request.body.getReader();
    const chunks = [];
    let bytes = 0;
    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done)
                break;
            bytes += value.byteLength;
            requireValue(bytes <= 10_000_000, 'LMM request exceeded its size limit.');
            chunks.push(value);
        }
    }
    finally {
        await reader.cancel().catch(() => { });
        reader.releaseLock();
    }
    let body;
    try {
        body = object(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    }
    catch {
        throw new Error('Invalid LMM request JSON.');
    }
    const route = typeof body.model === 'string' && routes.get(body.model);
    requireValue(route && new URL(request.url).pathname === route.path, 'Model or protocol is not in the authorized LMM catalog.');
    const headers = new Headers(request.headers);
    headers.set('x-lmm-group', route.group);
    headers.set('content-type', 'application/json');
    body.model = route.upstream;
    return new Request(request.url, { method: 'POST', headers, body: JSON.stringify(body), signal: request.signal, redirect: 'error', credentials: 'omit' });
}
