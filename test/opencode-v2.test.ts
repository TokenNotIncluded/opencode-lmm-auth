import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Credential, Model, Plugin, Provider } from '@opencode/plugin';
import type { IntegrationOAuthMethodRegistration } from '@opencode/plugin/promise/integration';
import { parseToken } from '../src/oauth.ts';
import { setupLmmV2 } from '../src/opencode-v2.ts';

type Context = Parameters<typeof setupLmmV2>[0];
type Event = ReturnType<Context['event']['subscribe']> extends AsyncIterable<infer E> ? E : never;
type ProviderEditor = Parameters<Parameters<Context['provider']['transform']>[0]>[0];
type IntegrationEditor = Parameters<Parameters<Context['integration']['transform']>[0]>[0];
type Definition = Parameters<ProviderEditor['add']>[0];
type Connection = NonNullable<Awaited<ReturnType<Context['integration']['connection']['active']>>>;
type Hook = { providerID?: string; run(value: unknown): Promise<void> };

const issuer = 'https://api.lmm.best';
const protocols = [
  ['gpt-4.1', 'openai-completions', '/v1/chat/completions', '@opencode/ai/providers/openai-compatible'],
  ['gpt-5.4', 'openai-responses', '/v1/responses', '@opencode/ai/providers/openai/responses'],
  ['claude-sonnet-4-5', 'anthropic-messages', '/v1/messages', '@opencode/ai/providers/anthropic'],
] as const;
const group = (account: string) => Buffer.from(account).toString('base64url');
const wire = (account: string, model: string) => `lmm:${group(account)}:${Buffer.from(model).toString('base64url')}`;
const connection = (account: string): Connection => ({ type: 'credential', id: `cred_${account}` as Credential.ID, method: 'oauth', label: account });
function auth(account: string, suffix = ''): Credential.OAuth {
  return { ...parseToken({ token_type: 'Bearer', access_token: `lmm_at_${account}${suffix}`, refresh_token: `lmm_rt_${account}${suffix}`, expires_in: 3600,
    scope: `catalog:read balance:read usage:read models:invoke group:${group(account)}` }, issuer, Date.now()), methodID: 'oauth' as Credential.OAuth['methodID'] };
}
function catalog(account: string) {
  return { schema_version: 1, resource: `${issuer}/api/oauth2`, models: protocols.map(([model, api]) => ({
    id: wire(account, model), upstream_model: model, group_id: group(account), group: account, name: model,
    apis: [api], pricing: { currency: 'USD', unit: 'million_tokens', price_basis: 'configured_base_rates' },
    native_cost: { input: 1, output: 2, cacheRead: 0.1, cacheWrite: 0.2 },
  })) };
}
const json = (value: unknown) => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });

class Events {
  queue: Event[] = [];
  waiting: ((result: IteratorResult<Event>) => void) | undefined;
  push(value: Event) {
    if (this.waiting) { const resolve = this.waiting; this.waiting = undefined; resolve({ done: false, value }); }
    else this.queue.push(value);
  }
  subscribe(signal?: AbortSignal): AsyncIterable<Event> {
    return { [Symbol.asyncIterator]: () => {
      const finish = () => { this.waiting?.({ done: true, value: undefined }); this.waiting = undefined; signal?.removeEventListener('abort', finish); };
      signal?.addEventListener('abort', finish, { once: true });
      return {
        next: async () => {
          if (signal?.aborted) return { done: true, value: undefined };
          const value = this.queue.shift();
          return value ? { done: false, value } : new Promise<IteratorResult<Event>>(resolve => { this.waiting = resolve; });
        },
        return: async () => { finish(); return { done: true, value: undefined }; },
      };
    } };
  }
}

async function fixture(run: (host: ReturnType<typeof makeHost>, directory: string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(), 'lmm-v2-unit-'));
  const previousState = process.env.XDG_STATE_HOME;
  const previousFetch = globalThis.fetch;
  process.env.XDG_STATE_HOME = directory;
  const host = makeHost();
  let cleanup: Plugin.Cleanup | undefined;
  globalThis.fetch = (input, init) => host.fetch(input, init);
  try { cleanup = await setupLmmV2(host.context); await run(host, directory); }
  finally {
    await cleanup?.(); globalThis.fetch = previousFetch;
    if (previousState === undefined) delete process.env.XDG_STATE_HOME; else process.env.XDG_STATE_HOME = previousState;
    await rm(directory, { recursive: true, force: true });
  }
}

function makeHost() {
  const events = new Events();
  const credentials = new Map([['cred_A', auth('A')], ['cred_B', auth('B')]]);
  let active: Connection | undefined = connection('A');
  const hooks = new Map<string, Hook>();
  let transform: Parameters<Context['provider']['transform']>[0] | undefined;
  let definition: Definition | undefined;
  let method: IntegrationOAuthMethodRegistration | undefined;
  const published: Definition[] = [];
  let reloads = 0;
  let exchanges = 0;
  const status: string[] = [];
  const providerEditor: ProviderEditor = {
    list: () => [], get: () => undefined, update: () => {}, remove: () => {},
    add: value => { definition = value; published.push(value); },
    models: { set: () => {}, update: () => {}, remove: () => {} },
  };
  const integrationEditor: IntegrationEditor = {
    list: () => [], get: () => undefined, update: (id, update) => { update({ id, name: id }); }, remove: () => {},
    method: { list: () => [], remove: () => {}, update: value => { if (value.method.type === 'oauth' && 'authorize' in value) method = value; } },
  };
  const registration = async () => ({ dispose: async () => {} });
  const context: Context = {
    options: {}, event: { subscribe: options => events.subscribe(options?.signal) },
    integration: {
      transform: async callback => { callback(integrationEditor); return registration(); },
      connection: {
        active: async () => active,
        resolve: async value => value.type === 'credential' ? credentials.get(value.id) : undefined,
        status: async value => { status.push(value.status?.status ?? 'cleared'); },
      },
    },
    provider: {
      transform: async callback => { transform = callback; callback(providerEditor); return registration(); },
      reload: async () => { reloads++; transform?.(providerEditor); },
    },
    session: {
      hook: async (name, callback, options) => {
        hooks.set(name, { providerID: options?.providerID, run: async value => { await Reflect.apply(callback, undefined, [value]); } });
        return registration();
      },
    },
  };
  let fetcher: typeof globalThis.fetch = async (input, init) => {
    if (String(input) === `${issuer}/api/oauth2/token`) {
      exchanges++;
      return json({ token_type: 'Bearer', access_token: 'lmm_at_A_rotated', refresh_token: 'lmm_rt_A_rotated', expires_in: 3600,
        scope: `catalog:read balance:read usage:read models:invoke group:${group('A')}` });
    }
    assert.equal(String(input), `${issuer}/api/oauth2/catalog`);
    const token = new Headers(init?.headers).get('authorization');
    return json(catalog(token?.includes('_B') ? 'B' : 'A'));
  };
  const switched = (account?: string) => {
    active = account ? connection(account) : undefined;
    events.push({ id: 'evt_test' as Event['id'], created: Date.now(), type: 'credential.switched', data: {
      integrationID: 'lmm' as Extract<Event, { type: 'credential.switched' }>['data']['integrationID'],
      credentialID: active?.type === 'credential' ? active.id : null,
    } });
  };
  return {
    context, credentials, hooks, published, status, switched,
    get definition() { assert.ok(definition); return definition; },
    get method() { assert.ok(method); return method; },
    get reloads() { return reloads; }, get exchanges() { return exchanges; },
    set fetch(value: typeof globalThis.fetch) { fetcher = value; }, get fetch() { return fetcher; },
    async waitFor(check: () => boolean) {
      const until = Date.now() + 2000;
      while (!check()) { assert.ok(Date.now() < until, 'expected native event reload'); await new Promise(resolve => setTimeout(resolve, 5)); }
    },
    async request(model: Model.Info, url: string, bodyModel = model.id) {
      const event = { model: { id: model.id, providerID: model.providerID }, request: new Request(url, { method: 'POST', headers: {
        authorization: 'Bearer stale', 'x-api-key': 'stale', cookie: 'stale', 'x-lmm-group': 'wrong',
      }, body: JSON.stringify({ model: bodyModel, stream: true }) }) };
      await hooks.get('http.request')!.run(event);
      return event.request;
    },
  };
}

test('v2 registers host-owned OAuth and all three native protocols without startup reload or cross-provider hooks', async () => fixture(async host => {
  assert.equal(host.method.method.id, 'oauth');
  assert.equal(host.reloads, 0, 'initial catalog must settle in the plugin activation batch');
  assert.equal(host.definition.sourceConnection?.type, 'credential');
  assert.equal(host.definition.sourceConnection?.type === 'credential' && host.definition.sourceConnection.id, 'cred_A');
  assert.equal(host.definition.models.length, 3);
  for (const [upstream, , path, packageName] of protocols) {
    const model = host.definition.models.find(model => model.id === wire('A', upstream)); assert.ok(model);
    assert.equal(model.package, packageName);
    const request = await host.request(model, issuer + path);
    assert.equal((await request.json()).model, upstream);
    assert.equal(request.headers.get('authorization'), 'Bearer lmm_at_A');
    assert.equal(request.headers.get('x-lmm-group'), group('A'));
    assert.equal(request.headers.get('x-api-key'), null); assert.equal(request.headers.get('cookie'), null);
  }
  for (const hook of host.hooks.values()) assert.equal(hook.providerID, 'lmm');
  const retry = { decision: { retry: true, delay: 0 } };
  await host.hooks.get('retry')!.run(retry); assert.deepEqual(retry.decision, { retry: false });
}));

test('v2 rejects destination, model and live scope substitutions before transport', async () => fixture(async host => {
  const model = host.definition.models[0]; assert.ok(model);
  await assert.rejects(host.request(model, 'https://evil.example/v1/chat/completions'));
  await assert.rejects(host.request(model, issuer + '/v1/chat/completions', host.definition.models[1]!.id));
  host.credentials.set('cred_A', auth('B'));
  await assert.rejects(host.request(model, issuer + '/v1/chat/completions'), /group is no longer authorized/);
}));

test('v2 switch and removal reload account-bound inventory and reject stale selections', async () => fixture(async host => {
  const old = host.definition.models[0]; assert.ok(old);
  host.switched('B');
  await host.waitFor(() => host.definition.sourceConnection?.type === 'credential' && host.definition.sourceConnection.id === 'cred_B');
  assert.ok(host.definition.models.every(model => model.id.startsWith(`lmm:${group('B')}:`)));
  await assert.rejects(host.request(old, issuer + '/v1/chat/completions'));
  const current = host.definition.models[0]; assert.ok(current);
  assert.equal((await host.request(current, issuer + '/v1/chat/completions')).headers.get('authorization'), 'Bearer lmm_at_B');
  host.switched();
  await host.waitFor(() => host.definition.models.length === 0);
  await assert.rejects(host.request(current, issuer + '/v1/chat/completions'));
}));

test('v2 native refresh preserves the method and envelope and fences consumed tokens', async () => fixture(async (host, directory) => {
  assert.ok(host.method.refresh);
  const renewed = await host.method.refresh(host.credentials.get('cred_A')!);
  assert.equal(renewed.methodID, 'oauth'); assert.equal(renewed.access, 'lmm_at_A_rotated');
  await assert.rejects(host.method.refresh(host.credentials.get('cred_A')!), /already attempted/);
  assert.equal(host.exchanges, 1);
  const files = await readdir(join(directory, 'opencode-lmm-auth', 'refresh'));
  assert.equal(files.length, 1);
  assert.doesNotMatch(await readFile(join(directory, 'opencode-lmm-auth', 'refresh', files[0]!), 'utf8'), /lmm_rt_/);
}));
