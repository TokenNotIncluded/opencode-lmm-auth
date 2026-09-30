import { createHash, randomBytes } from 'node:crypto';
import { listenCallback } from "./callback.js";
import { APPLICATION_SCOPES, CLIENT_ID, accessToken, nonnegative, object, parseScope, requireValue, text } from "./protocol.js";
// OpenCode persists a fixed OAuth shape. Keep issuer and granted scope inside its
// refresh field, never in a second plaintext credential file or inferred from config.
export function unpack(auth, issuer) {
    accessToken(auth.access);
    requireValue(Number.isSafeInteger(auth.expires) && auth.expires > 0);
    let value;
    try {
        value = object(JSON.parse(auth.refresh));
    }
    catch {
        throw new Error('Invalid LMM credential. Connect again.');
    }
    requireValue(value.v === 1 && value.issuer === issuer && value.resource === `${issuer}/api/oauth2`, 'LMM credential issuer mismatch. Connect again.');
    const token = text(value.token, 4096);
    requireValue(/^lmm_rt_[A-Za-z0-9_-]+$/.test(token));
    return { token, scope: parseScope(value.scope) };
}
export function parseToken(body, issuer, started, previous) {
    requireValue(body.token_type === 'Bearer');
    const access = accessToken(body.access_token);
    const token = text(body.refresh_token, 4096);
    requireValue(/^lmm_rt_[A-Za-z0-9_-]+$/.test(token));
    const seconds = nonnegative(body.expires_in);
    requireValue(Number.isSafeInteger(seconds) && seconds > 0 && seconds <= 86400);
    const old = previous && unpack(previous, issuer);
    const scope = parseScope(body.scope ?? old?.scope);
    const scopes = scope.split(' ');
    requireValue(APPLICATION_SCOPES.every(s => scopes.includes(s)) && scopes.some(s => s.startsWith('group:')));
    if (old)
        requireValue(token !== old.token && scopes.every(s => old.scope.split(' ').includes(s)), 'LMM refresh rotated incorrectly or widened scope. Connect again.');
    return { type: 'oauth', access, refresh: JSON.stringify({ v: 1, issuer, resource: `${issuer}/api/oauth2`, token, scope }), expires: started + seconds * 1000 };
}
export class OAuthSession {
    http;
    journal;
    constructor(http, journal) { this.http = http; this.journal = journal; }
    async authorize() {
        const signal = AbortSignal.timeout(180_000);
        const [server, resource] = await Promise.all([
            this.http.request('/.well-known/oauth-authorization-server', { signal }, 64000),
            this.http.request('/.well-known/oauth-protected-resource/api/oauth2', { signal }, 64000),
        ]);
        requireValue(server.issuer === this.http.issuer && server.authorization_endpoint === `${this.http.resource}/authorize` && server.token_endpoint === `${this.http.resource}/token` && server.revocation_endpoint === `${this.http.resource}/revoke` && server.authorization_response_iss_parameter_supported === true);
        requireValue(Array.isArray(server.code_challenge_methods_supported) && server.code_challenge_methods_supported.includes('S256'));
        requireValue(Array.isArray(server.response_types_supported) && server.response_types_supported.includes('code'));
        requireValue(resource.resource === this.http.resource && Array.isArray(resource.authorization_servers) && resource.authorization_servers.length === 1 && resource.authorization_servers[0] === this.http.issuer);
        const verifier = randomBytes(32).toString('base64url');
        const state = randomBytes(32).toString('base64url');
        const callback = await listenCallback(this.http.issuer, state, signal, 'OpenCode');
        const url = new URL(`${this.http.resource}/authorize`);
        url.search = new URLSearchParams({ client_id: CLIENT_ID, response_type: 'code', redirect_uri: callback.redirectUri, scope: APPLICATION_SCOPES.join(' '), resource: this.http.resource, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256', state }).toString();
        let used = false;
        return { url: url.href, instructions: 'Sign in to LMM and approve access. Return to OpenCode. This login expires after 3 minutes.', method: 'auto', callback: async () => {
                requireValue(!used, 'LMM login callback was already used.');
                used = true;
                try {
                    const code = await callback.code;
                    const started = Date.now();
                    return { ...parseToken(await this.http.form('/api/oauth2/token', { grant_type: 'authorization_code', client_id: CLIENT_ID, code, code_verifier: verifier, redirect_uri: callback.redirectUri, resource: this.http.resource }, signal), this.http.issuer, started), type: 'success' };
                }
                finally {
                    callback.close();
                }
            } };
    }
    async refresh(auth) {
        const old = unpack(auth, this.http.issuer);
        // O_EXCL + fsync prevents another process or a restart from replaying this
        // one-shot token if the server rotated it but host persistence failed.
        await this.journal.begin(this.http.issuer, old.token);
        const started = Date.now();
        return parseToken(await this.http.form('/api/oauth2/token', { grant_type: 'refresh_token', client_id: CLIENT_ID, refresh_token: old.token, resource: this.http.resource }), this.http.issuer, started, auth);
    }
}
