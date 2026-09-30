export const PROVIDER_ID = 'lmm';
export const CLIENT_ID = 'lmm-opencode';
export const CALLBACK_PATH = '/oauth/lmm/callback';
export const APPLICATION_SCOPES = ['catalog:read', 'balance:read', 'usage:read', 'models:invoke'];
export const MCP_SCOPES = ['mcp:bounties', 'mcp:drawing'];
export const INITIAL_SCOPES = APPLICATION_SCOPES;
export const SUPPORTED_APIS = ['openai-completions', 'openai-responses', 'anthropic-messages'];
/** Messages are deliberately fixed: never include an HTTP body, code, or credential. */
export class LmmError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.name = 'LmmError';
        this.code = code;
    }
}
export function requireValue(condition, message = 'Invalid LMM protocol response.') {
    if (!condition)
        throw new LmmError('invalid_response', message);
}
export function object(value) {
    requireValue(typeof value === 'object' && value !== null && !Array.isArray(value));
    return value;
}
export function text(value, max = 1024) {
    requireValue(typeof value === 'string' && value.length > 0 && value.length <= max && !/[\p{Cc}\p{Cf}]/u.test(value));
    return value;
}
export function finite(value) {
    requireValue(typeof value === 'number' && Number.isFinite(value));
    return value;
}
export function nonnegative(value) {
    const result = finite(value);
    requireValue(result >= 0);
    return result;
}
export function nullableNumber(value) {
    return value === null ? null : nonnegative(value);
}
export function unixSeconds(value) {
    const result = nonnegative(value);
    requireValue(Number.isSafeInteger(result));
    return result;
}
export function base64url(value) {
    return Buffer.from(value, 'utf8').toString('base64url');
}
export function canonicalId(value) {
    const id = text(value, 4096);
    requireValue(/^[A-Za-z0-9_-]+$/.test(id));
    const decoded = Buffer.from(id, 'base64url').toString('utf8');
    requireValue(base64url(decoded) === id);
    text(decoded);
    return id;
}
export function parseScope(value) {
    const scope = text(value, 16384);
    const parts = scope.split(' ');
    requireValue(new Set(parts).size === parts.length);
    for (const part of parts) {
        if (INITIAL_SCOPES.includes(part))
            continue;
        requireValue(part.startsWith('group:'));
        canonicalId(part.slice(6));
    }
    return scope;
}
export function accessToken(value) {
    const token = text(value, 4096);
    requireValue(/^lmm_at_[A-Za-z0-9_-]+$/.test(token), 'LMM requires its OAuth access token, not an API key.');
    return token;
}
export function credential(value, issuer) {
    const item = object(value);
    requireValue(item.type === 'oauth' && item.lmm_issuer === issuer && item.lmm_resource === `${issuer}/api/oauth2`, 'LMM credential belongs to another issuer or is not OAuth. Use /connect.');
    accessToken(item.access);
    text(item.refresh, 4096);
    text(item.lmm_session, 128);
    parseScope(item.scope);
    nonnegative(item.expires);
    // SAFETY: every required canonical OAuth and LMM credential field is validated above.
    return item;
}
export function safeMessage(error) {
    return error instanceof LmmError ? error.message : 'LMM request failed. Retry read-only requests or sign in again; no credential was printed.';
}
export function boundedSignal(signal, timeoutMs = 15_000) {
    return AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(timeoutMs)]);
}
