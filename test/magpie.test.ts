import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdtemp, readFile, readdir, realpath, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { windowsTestACL } from './windows-journal-acl.ts';
import Plugin, { _magpieTest } from '../src/magpie.ts';
import { MagpieJournal } from '../src/magpie-journal.ts';
import { LmmHttp } from '../src/http.ts';

const issuer = 'https://core.example';
const installation = 'a'.repeat(64), grant = `lmm_gr_${'b'.repeat(64)}`;
const token = (n: string) => ({client_id: 'lmm-magpie', installation_id: installation, grant_id: grant, token_type: 'Bearer', access_token: `lmm_at_${n.repeat(43)}`, refresh_token: `lmm_rt_${n.repeat(43)}`, expires_in: 3600, scope: 'catalog:read balance:read usage:read models:invoke group:ZGVmYXVsdA', budget_credits: 100});
const http = new LmmHttp({issuer});
const auth = () => _magpieTest.credential(token('c'), http, installation, Date.now());
const host = {magpie: {option() {}, options() {}}};

test('Magpie credentials reject foreign clients, installations and widening', () => {
  assert.throws(() => _magpieTest.credential({...token('c'), client_id: 'lmm-cc-switch'}, http, installation, Date.now()));
  assert.throws(() => _magpieTest.credential(token('c'), http, 'd'.repeat(64), Date.now()));
  assert.throws(() => _magpieTest.credential({...token('d'), scope: token('d').scope + ' group:b3RoZXI'}, http, installation, Date.now(), auth()));
  assert.throws(() => _magpieTest.credential({...token('d'), grant_id: `lmm_gr_${'e'.repeat(64)}`}, http, installation, Date.now(), auth()));
});

test('Magpie requires account-scoped host and registers an independent provider', async () => {
  await assert.rejects(Plugin({}, {issuer}));
  const plugin = await Plugin(host, {issuer});
  const config = {provider: {other: {name: 'Keep'}}};
  await plugin.config(config);
  assert.deepEqual(config.provider.other, {name: 'Keep'});
  assert.equal(plugin.auth.provider, 'lmm-magpie');
  assert.deepEqual(await plugin.provider.models({}), {});
});

test('native Magpie login binds PKCE, issuer, installation and a one-use loopback callback', async () => {
  const originalFetch = globalThis.fetch;
  let installationId = '';
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname === '127.0.0.1') return originalFetch(input, init);
    if (url.pathname === '/.well-known/oauth-authorization-server') return Response.json({issuer, authorization_endpoint: issuer + '/api/oauth2/authorize', token_endpoint: issuer + '/api/oauth2/token', authorization_response_iss_parameter_supported: true, code_challenge_methods_supported: ['S256'], lmm_managed_clients: [{client_id: 'lmm-magpie', application: 'magpie', refresh_recovery: {window_seconds: 600}}]});
    if (url.pathname === '/api/oauth2/token') {
      const form = new URLSearchParams(String(init!.body));
      assert.equal(form.get('client_id'), 'lmm-magpie');
      assert.equal(form.get('installation_id'), installationId);
      assert.equal(form.get('code'), 'synthetic-code');
      assert.match(form.get('code_verifier')!, /^[A-Za-z0-9_-]{43}$/);
      return Response.json({...token('c'), installation_id: installationId});
    }
    if (url.pathname === '/api/oauth2/application') return Response.json({contract: 'lmm.application-status.v1', client_id: 'lmm-magpie', application: 'magpie', installation_id: installationId, grant_id: grant, scopes: ['models:invoke'], access_expires_at: Math.floor(Date.now() / 1000) + 3600});
    throw Error('Unexpected test request');
  };
  try {
    const plugin = await Plugin(host, {issuer});
    const login = await plugin.auth.methods[0]!.authorize();
    const url = new URL(login.url);
    assert.equal(url.searchParams.get('application'), 'magpie');
    assert.equal(url.searchParams.get('client_id'), 'lmm-magpie');
    assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
    installationId = url.searchParams.get('installation_id')!;
    assert.match(installationId, /^[a-f0-9]{64}$/);
    const callback = new URL(url.searchParams.get('redirect_uri')!);
    callback.search = new URLSearchParams({state: url.searchParams.get('state')!, iss: issuer, code: 'synthetic-code'}).toString();
    assert.equal((await fetch(callback)).status, 200);
    const result = await login.callback();
    assert.equal(result.type, 'success');
    assert.equal(JSON.parse(result.refresh).client, 'lmm-magpie');
    await assert.rejects(login.callback());
  } finally { globalThis.fetch = originalFetch; }
});

test('rotation journal recovers the same operation without keeping secrets and rejects symlinks', async () => {
  const directory = await realpath(await mkdtemp(join(tmpdir(), 'lmm-magpie-journal-')));
  try {
    const path = join(directory, 'private');
    const journal = new MagpieJournal(path);
    assert.equal(await journal.pending('secret-binding'), false);
    const operation = await journal.begin('secret-binding');
    assert.deepEqual(await new MagpieJournal(path).begin('secret-binding'), operation);
    const files = await readdir(path);
    assert.equal((await readFile(join(path, files[0]!), 'utf8')).includes('secret-binding'), false);
    if (process.platform === 'win32') {
      const secure = await windowsTestACL(path);
      assert.equal(secure.ownerMatches, true);
      assert.equal(secure.protected, true);
      assert.equal(secure.ruleCount, 1);
      assert.equal(secure.onlyCurrent, true);
      const unsafe = await windowsTestACL(path, 'grant_other');
      await assert.rejects(journal.begin('secret-binding'));
      assert.deepEqual(await windowsTestACL(path), unsafe, 'rejection must not repair an existing directory ACL');
      await windowsTestACL(path, 'private');
      const file = join(path, files[0]!);
      const contents = await readFile(file, 'utf8');
      const unsafeFile = await windowsTestACL(file, 'grant_other');
      await assert.rejects(journal.begin('secret-binding'));
      assert.deepEqual(await windowsTestACL(file), unsafeFile, 'rejection must not repair an existing record ACL');
      assert.equal(await readFile(file, 'utf8'), contents);
      await windowsTestACL(file, 'private');
      assert.deepEqual(await journal.begin('secret-binding'), operation);
    } else {
      await chmod(path, 0o755);
      await assert.rejects(journal.begin('secret-binding'));
      await chmod(path, 0o700);
    }
    await symlink(path, join(directory, 'link'), process.platform === 'win32' ? 'junction' : undefined);
    await assert.rejects(new MagpieJournal(join(directory, 'link')).begin('x'));
  } finally { await rm(directory, {recursive: true, force: true}); }
});

test('response loss and plugin restart recover the same rotation; usage reports lifetime reservations', async () => {
  const directory = await realpath(await mkdtemp(join(tmpdir(), 'lmm-magpie-refresh-')));
  const originalFetch = globalThis.fetch, state = process.env.XDG_STATE_HOME;
  process.env.XDG_STATE_HOME = directory;
  const rotations: string[] = [];
  let fail = true, corruptBudget = false;
  globalThis.fetch = async (input, init) => {
    const path = new URL(String(input)).pathname;
    if (path === '/api/oauth2/token') {
      const form = new URLSearchParams(String(init!.body));
      assert.equal(form.get('client_id'), 'lmm-magpie');
      assert.equal(form.get('installation_id'), installation);
      rotations.push(form.get('rotation_id')!);
      if (fail) { fail = false; throw new Error('lost response after server commit'); }
      return Response.json(token('d'));
    }
    if (path === '/api/oauth2/application') return Response.json({contract: 'lmm.application-status.v1', client_id: 'lmm-magpie', application: 'magpie', installation_id: installation, grant_id: grant, scopes: ['models:invoke'], access_expires_at: Math.floor(Date.now() / 1000) + 3600});
    if (path === '/api/oauth2/application/budget') return Response.json({contract: 'lmm.application-budget.v1', unit: 'credit_500k_usd', client_id: 'lmm-magpie', application: 'magpie', installation_id: installation, grant_id: grant, budget_credits: 100, consumed_credits: 20, reserved_credits: 10, remaining_credits: corruptBudget ? 100 : 70});
    throw new Error('Unexpected test request');
  };
  try {
    const first = await Plugin(host, {issuer});
    const old = auth();
    await assert.rejects(first.auth.refresh(old));
    assert.equal(rotations.length, 1, 'lost-ACK recovery requires the fixture to receive exactly one refresh POST');
    assert.equal(fail, false, 'lost-ACK recovery requires the fixture to throw after recording the upstream rotation');
    const pendingUsage = await first.auth.usage(async () => old);
    assert.deepEqual(pendingUsage.windows, []);
    const restarted = await Plugin(host, {issuer});
    const rotated = await restarted.auth.refresh(old);
    assert.equal(rotations.length, 2);
    assert.equal(rotations[0], rotations[1]);
    assert.match(rotations[0]!, /^[a-f0-9]{64}$/);
    const usage = await restarted.auth.usage(async () => rotated);
    assert.equal(usage.windows[0]!.used, 30);
    assert.equal(usage.windows[0]!.amount, 30);
    assert.equal('resetsAt' in usage.windows[0]!, false);
    corruptBudget = true;
    assert.deepEqual((await restarted.auth.usage(async () => rotated)).windows, []);
    const loader = await restarted.auth.loader(async () => rotated).catch(() => undefined);
    assert.equal(loader, undefined, 'catalog failure cannot expose an inference loader');
  } finally {
    globalThis.fetch = originalFetch;
    if (state === undefined) delete process.env.XDG_STATE_HOME; else process.env.XDG_STATE_HOME = state;
    await rm(directory, {recursive: true, force: true});
  }
});


test('native Magpie provider hook preserves SDK capabilities, endpoint and cache prices', async () => {
  const directory = await realpath(await mkdtemp(join(tmpdir(), 'lmm-magpie-metadata-')));
  const originalFetch = globalThis.fetch, state = process.env.XDG_STATE_HOME;
  process.env.XDG_STATE_HOME = directory;
  const upstream = 'future-native-metadata-model';
  const id = 'lmm:ZGVmYXVsdA:' + Buffer.from(upstream).toString('base64url');
  globalThis.fetch = async input => {
    const url = String(input);
    if (url.startsWith('https://models.dev/')) return Response.json({});
    if (url === issuer + '/api/oauth2/application') return Response.json({
      contract: 'lmm.application-status.v1', client_id: 'lmm-magpie', application: 'magpie',
      installation_id: installation, grant_id: grant, scopes: ['models:invoke'],
      access_expires_at: Math.floor(Date.now() / 1000) + 3600,
    });
    if (url === issuer + '/api/oauth2/catalog') return Response.json({
      schema_version: 1, resource: issuer + '/api/oauth2', models: [{
        id, upstream_model: upstream, group_id: 'ZGVmYXVsdA', group: 'default', name: upstream,
        apis: ['openai-completions'], pricing: {currency: 'USD', unit: 'million_tokens'},
        native_cost: {input: 1, output: 2, cacheRead: 0.1, cacheWrite: 0.2},
        metadata: {context_window: 64000, max_input_tokens: null, max_output_tokens: 8000,
          input_modalities: ['text', 'image'], output_modalities: ['text'],
          reasoning: true, tool_call: true, source: 'server'},
      }],
    });
    throw Error('Unexpected metadata test request');
  };
  try {
    const plugin = await Plugin(host, {issuer});
    const models = await plugin.provider.models({}, {auth: auth()});
    assert.deepEqual(Object.keys(models), [id]);
    const model = models[id]!;
    assert.equal(model.providerID, 'lmm-magpie');
    assert.equal(model.api.id, id);
    assert.equal(model.api.url, issuer + '/v1');
    assert.equal(model.api.npm, '@ai-sdk/openai-compatible');
    assert.equal(model.capabilities.reasoning, true);
    assert.equal(model.capabilities.input.image, true);
    assert.equal(model.capabilities.toolcall, true);
    assert.deepEqual(model.cost.cache, {read: 0.1, write: 0.2});
    assert.deepEqual(model.limit, {context: 32000, output: 8000});
    assert.equal(model.options.lmmMaximumContextTokens, 64000);
  } finally {
    globalThis.fetch = originalFetch;
    if (state === undefined) delete process.env.XDG_STATE_HOME; else process.env.XDG_STATE_HOME = state;
    await rm(directory, {recursive: true, force: true});
  }
});
