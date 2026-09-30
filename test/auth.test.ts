import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LmmHttp } from '../src/http.ts';
import { OAuthSession, parseToken, unpack } from '../src/oauth.ts';
import { RefreshJournal } from '../src/refresh-journal.ts';
import { listenCallback } from '../src/callback.ts';

const issuer = 'https://api.lmm.best';
const scope = 'catalog:read balance:read usage:read models:invoke group:ZGVmYXVsdA';
const token = (extra = {}) => ({token_type: 'Bearer', access_token: 'lmm_at_test', refresh_token: 'lmm_rt_test', expires_in: 3600, scope, ...extra});
const json = (value: unknown) => new Response(JSON.stringify(value), {headers: {'content-type': 'application/json'}});

async function fixture(fn: (directory: string) => Promise<void>) {
 const directory = await mkdtemp(join(tmpdir(), 'opencode-lmm-test-'));
 try { await fn(directory); } finally { await rm(directory, {recursive: true, force: true}); }
}

test('PKCE login binds callback first and exchanges only the verified code', async () => fixture(async directory => {
 let exchange: URLSearchParams | undefined;
 const http = new LmmHttp({fetch: async (input, init) => {
  const url = String(input);
  if (url.endsWith('/.well-known/oauth-authorization-server')) return json({issuer, authorization_endpoint: issuer+'/api/oauth2/authorize', token_endpoint: issuer+'/api/oauth2/token', revocation_endpoint: issuer+'/api/oauth2/revoke', authorization_response_iss_parameter_supported: true, code_challenge_methods_supported: ['S256'], response_types_supported: ['code']});
  if (url.endsWith('/.well-known/oauth-protected-resource/api/oauth2')) return json({resource: issuer+'/api/oauth2', authorization_servers: [issuer]});
  assert.equal(url, issuer+'/api/oauth2/token');
  assert.equal(init?.redirect, 'error');
  exchange = new URLSearchParams(String(init?.body));
  return json(token());
 }});
 const session = new OAuthSession(http, new RefreshJournal(directory));
 const login = await session.authorize();
 const authURL = new URL(login.url);
 assert.equal(authURL.searchParams.get('client_id'), 'lmm-opencode');
 assert.equal(authURL.searchParams.get('scope'), 'catalog:read balance:read usage:read models:invoke');
 const callback = new URL(authURL.searchParams.get('redirect_uri')!);
 callback.search = new URLSearchParams({state: authURL.searchParams.get('state')!, iss: issuer, code: 'accepted_code'}).toString();
 assert.equal((await fetch(callback)).status, 200);
 const auth = await login.callback();
 assert.equal(auth.type, 'success');
 assert.equal(exchange!.get('code'), 'accepted_code');
 assert.equal(exchange!.get('resource'), issuer+'/api/oauth2');
 assert.equal(authURL.searchParams.get('code_challenge'), createHash('sha256').update(exchange!.get('code_verifier')!).digest('base64url'));
 await assert.rejects(login.callback());
}));

test('loopback callback rejects wrong state, issuer and duplicate parameters', async () => {
 const listener = await listenCallback(issuer, 'correct_state', AbortSignal.timeout(5000), 'OpenCode');
 try {
  for (const query of ['state=wrong&iss='+issuer+'&code=code', 'state=correct_state&iss=https://evil.example&code=code', 'state=correct_state&state=correct_state&iss='+issuer+'&code=code']) assert.equal((await fetch(listener.redirectUri+'?'+query)).status, 400);
  const response = await fetch(listener.redirectUri+'?'+new URLSearchParams({state:'correct_state', iss:issuer, code:'valid_code'}));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(await listener.code, 'valid_code');
 } finally { listener.close(); }
});

test('token envelopes bind issuer and preserve grants; invalid token shapes fail', () => {
 const auth = parseToken(token(), issuer, Date.now());
 assert.equal(unpack(auth, issuer).scope, scope);
 assert.throws(() => unpack(auth, 'https://other.example'));
 for (const bad of [{token_type:'MAC'}, {access_token:'sk-secret'}, {refresh_token:'sk-secret'}, {expires_in:0}, {expires_in:86401}, {scope:'catalog:read models:invoke'}]) assert.throws(() => parseToken(token(bad), issuer, Date.now()));
 assert.throws(() => parseToken(token({refresh_token:'lmm_rt_next', scope:scope+' group:b3RoZXI'}), issuer, Date.now(), auth));
 assert.throws(() => parseToken(token(), issuer, Date.now(), auth));
});

test('concurrent refresh makes exactly one exchange and stores no raw credentials in journal', async () => fixture(async directory => {
 let requests = 0;
 const http = new LmmHttp({fetch: async (_input, init) => {
  requests++;
  const body = new URLSearchParams(String(init?.body));
  assert.equal(body.get('client_id'), 'lmm-opencode');
  assert.equal(body.get('refresh_token'), 'lmm_rt_test');
  return json(token({refresh_token:'lmm_rt_next'}));
 }});
 const auth = parseToken(token(), issuer, Date.now());
 const a = new OAuthSession(http, new RefreshJournal(directory));
 const b = new OAuthSession(http, new RefreshJournal(directory));
 const results = await Promise.allSettled([a.refresh(auth), b.refresh(auth)]);
 assert.equal(requests, 1);
 assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
 const files = await readdir(directory);
 const marker = await readFile(join(directory, files[0]), 'utf8');
 assert.ok(!marker.includes('lmm_rt_test') && !marker.includes('lmm_at_test'));
}));

test('lost refresh response fences the token across a new process/session', async () => fixture(async directory => {
 let requests = 0;
 const http = new LmmHttp({fetch: async () => {requests++; throw new Error('connection lost');}});
 const auth = parseToken(token(), issuer, Date.now());
 await assert.rejects(new OAuthSession(http, new RefreshJournal(directory)).refresh(auth));
 await assert.rejects(new OAuthSession(http, new RefreshJournal(directory)).refresh(auth));
 assert.equal(requests, 1);
}));

test('issuer URL credentials and insecure transports are rejected', () => {
 for (const issuer of ['http://api.lmm.best', 'https://name:password@api.lmm.best', 'https://api.lmm.best/path', 'https://api.lmm.best?key=value']) assert.throws(() => new LmmHttp({issuer}));
});
