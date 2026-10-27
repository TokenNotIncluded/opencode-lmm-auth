import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {PluginInput, Config} from '@opencode-ai/plugin';
import type {OAuth, Provider as ProviderV2} from '@opencode-ai/sdk/v2';
import {createOpencodeClient, type Provider} from '@opencode-ai/sdk';
import LmmPlugin from '../src/index.ts';
import {parseToken} from '../src/oauth.ts';

const issuer = 'https://api.lmm.best';
const group = 'ZGVmYXVsdA';
const upstream = 'isolation-fixture';
const modelId = `lmm:${group}:${Buffer.from(upstream).toString('base64url')}`;
const scope = `catalog:read balance:read usage:read models:invoke group:${group}`;
const catalog = {schema_version:1, resource:issuer+'/api/oauth2', models:[{
  id:modelId, upstream_model:upstream, group_id:group, group:'default', name:'Isolation fixture',
  apis:['openai-completions'], pricing:{currency:'USD', unit:'million_tokens', price_basis:'configured_base_rates'},
  native_cost:{input:1, output:2, cacheRead:0, cacheWrite:0},
}]};
const config = (): Config => ({provider:{lmm:{models:{[upstream]:{
  limit:{context:8000,output:2000}, tool_call:true, reasoning:false, attachment:false,
  temperature:true, options:{lmmApi:'openai-completions'},
}}}}});
const provider = (): Provider & ProviderV2 => ({id:'lmm',name:'LMM',source:'config',env:[],options:{},models:{}});
const json = (value:unknown) => Response.json(value);
const credential = (account:string, started:number) => parseToken({token_type:'Bearer',
  access_token:`lmm_at_${account}`,refresh_token:`lmm_rt_${account}`,expires_in:60,scope},issuer,started);
const magpieInput = (client:unknown = {}) => ({client, magpie:{option:()=>undefined, options:()=>({})}} as unknown as PluginInput);

async function isolated(run:(directory:string) => Promise<void>) {
  const directory = await mkdtemp(join(tmpdir(),'lmm-account-isolation-'));
  const oldData = process.env.XDG_DATA_HOME;
  const oldState = process.env.XDG_STATE_HOME;
  const oldInline = process.env.OPENCODE_AUTH_CONTENT;
  process.env.XDG_DATA_HOME = join(directory,'data');
  process.env.XDG_STATE_HOME = join(directory,'state');
  delete process.env.OPENCODE_AUTH_CONTENT;
  try { await run(directory); }
  finally {
    for (const [key,value] of [['XDG_DATA_HOME',oldData],['XDG_STATE_HOME',oldState],['OPENCODE_AUTH_CONTENT',oldInline]]) {
      if(value===undefined) delete process.env[key!]; else process.env[key!]=value;
    }
    await rm(directory,{recursive:true,force:true});
  }
}

test('Magpie account transport is not disabled by an unrelated broken OpenCode credential file', async () => isolated(async directory => {
  const oldFetch=globalThis.fetch, oldWarn=console.warn;
  await mkdir(join(directory,'data','opencode'),{recursive:true});
  await writeFile(join(directory,'data','opencode','auth.json'),'{invalid native store');
  globalThis.fetch=async input => {
    if(String(input)===issuer+'/api/oauth2/catalog') return json(catalog);
    assert.ok(input instanceof Request);
    assert.equal(input.headers.get('authorization'),'Bearer lmm_at_magpie');
    return new Response('account transport works');
  };
  console.warn=()=>{};
  try {
    const hooks=await LmmPlugin(magpieInput());
    await hooks.config!(config());
    const auth=credential('magpie',Date.now());
    const listed=await hooks.provider!.models!(provider(),{auth});
    assert.deepEqual(Object.keys(listed),[modelId]);
    const accountProvider=provider();
    const transport=await hooks.auth!.loader!(async()=>auth,accountProvider);
    assert.deepEqual(Object.keys(accountProvider.models),[modelId]);
    const response=await transport.fetch(issuer+'/v1/chat/completions',{method:'POST',body:JSON.stringify({model:modelId})});
    assert.equal(await response.text(),'account transport works');
  } finally {globalThis.fetch=oldFetch;console.warn=oldWarn;}
}));

test('Magpie refresh hooks keep explicit account auth independent of the native OpenCode slot', async () => isolated(async directory => {
  const oldFetch = globalThis.fetch;
  const alice = credential('magpie_alice', Date.now() - 40_000);
  const bob = credential('magpie_bob', Date.now() - 40_000);
  const native = credential('native_other', Date.now());
  const file = join(directory, 'data', 'opencode', 'auth.json');
  await mkdir(join(directory, 'data', 'opencode'), {recursive:true});
  const exchanges: string[] = [], saved: string[] = [];
  globalThis.fetch = async (input, init) => {
    if (String(input) === issuer + '/api/oauth2/catalog') {
      assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer lmm_at_magpie_alice_rotated');
      return json(catalog);
    }
    assert.equal(String(input), issuer + '/api/oauth2/token');
    const token = new URLSearchParams(String(init?.body)).get('refresh_token');
    assert.ok(token === 'lmm_rt_magpie_alice' || token === 'lmm_rt_magpie_bob');
    exchanges.push(token);
    const account = token.slice('lmm_rt_'.length);
    return json({token_type:'Bearer', access_token:`lmm_at_${account}_rotated`, refresh_token:`lmm_rt_${account}_rotated`, expires_in:3600, scope});
  };
  try {
    const client = createOpencodeClient({baseUrl:'https://magpie-host.fixture', fetch:async input => {
      assert.ok(input instanceof Request);
      assert.equal(input.url, 'https://magpie-host.fixture/auth/lmm');
      assert.equal(input.method, 'PUT');
      saved.push((await input.json()).access); return json(true);
    }});
    const hooks = await LmmPlugin(magpieInput(client));
    await hooks.config!(config());
    await writeFile(file, JSON.stringify({lmm:native}), {mode:0o600});
    // Magpie refreshes and persists its selected account before model discovery.
    await assert.rejects(hooks.provider!.models!(provider(), {auth:alice}), /host did not provide fresh OAuth/);
    assert.deepEqual(exchanges, []);
    const renewedAlice = await (hooks.auth as any).refresh(alice);
    const listed = await hooks.provider!.models!(provider(), {auth:{...alice,...renewedAlice}});
    assert.deepEqual(Object.keys(listed), [modelId]);
    assert.deepEqual(saved, []);
    // Native refresh returns fields; Magpie selects and persists the account.
    const rotated = await (hooks.auth as any).refresh(bob);
    assert.deepEqual(Object.keys(rotated).sort(), ['access','expires','refresh']);
    assert.equal(rotated.access, 'lmm_at_magpie_bob_rotated');
    assert.equal(JSON.parse(rotated.refresh).token, 'lmm_rt_magpie_bob_rotated');
    assert.deepEqual(saved, []);
    assert.deepEqual(exchanges, ['lmm_rt_magpie_alice', 'lmm_rt_magpie_bob']);
    assert.deepEqual(JSON.parse(await readFile(file, 'utf8')).lmm, native);
  } finally {globalThis.fetch = oldFetch;}
}));

for (const failure of ['rate_limit', 'network'] as const) {
  test(`Magpie model discovery preserves the first ${failure} refresh error without another exchange`, async () => isolated(async () => {
    const oldFetch = globalThis.fetch;
    // Hosts renew ahead of expiry; preserve failures even while access is fresh.
    const alice = credential('failed_alice', Date.now() - (failure === 'network' ? 0 : 40_000));
    const bob = credential('healthy_bob', Date.now());
    let exchanges = 0, catalogs = 0, saves = 0;
    globalThis.fetch = async (input, init) => {
      if (String(input) === issuer + '/api/oauth2/token') {
        exchanges++;
        if (failure === 'network') throw new Error('connection lost after possible send');
        return new Response(null, {status:429});
      }
      assert.equal(String(input), issuer + '/api/oauth2/catalog');
      assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer lmm_at_healthy_bob');
      catalogs++;
      return json(catalog);
    };
    try {
      const hooks = await LmmPlugin(magpieInput({auth:{set:async () => {saves++; return {data:true};}}}));
      await hooks.config!(config());
      let original: unknown;
      try { await (hooks.auth as any).refresh(alice); }
      catch (error) { original = error; }
      assert.ok(original instanceof Error);
      const expectedCode = failure === 'network' ? 'transport_error' : 'rate_limited';
      assert.equal((original as any).code, expectedCode);
      assert.equal(original.message, failure === 'network'
        ? 'LMM OAuth refresh failed due to a network error.'
        : 'LMM rate limit reached. Wait a moment and retry.');
      assert.equal((original as any).cause, undefined);
      for (let attempt = 0; attempt < 2; attempt++) {
        await assert.rejects(hooks.provider!.models!(provider(), {auth:{...alice}}), error =>
          error instanceof Error && error !== original && (error as any).code === expectedCode && error.message === original.message);
      }
      await assert.rejects((hooks.auth as any).refresh({...alice}), error =>
        error instanceof Error && error !== original && (error as any).code === expectedCode && error.message === original.message);
      assert.equal(exchanges, 1);
      assert.equal(saves, 0);
      assert.equal(catalogs, 0);
      assert.deepEqual(Object.keys(await hooks.provider!.models!(provider(), {auth:bob})), [modelId]);
      // A new plugin instance still sees the durable one-shot fence.
      const restarted = await LmmPlugin(magpieInput());
      await assert.rejects((restarted.auth as any).refresh(alice), {code:'refresh_already_attempted'});
      assert.equal(exchanges, 1);
      assert.equal(catalogs, 1);
    } finally { globalThis.fetch = oldFetch; }
  }));
}

test('Magpie distinguishes a pending host refresh from expired credentials and deduplicates refresh calls', async () => isolated(async () => {
  const oldFetch = globalThis.fetch;
  const alice = credential('pending_alice', Date.now());
  const bob = credential('healthy_bob', Date.now());
  let exchanges = 0, catalogs = 0, inferences = 0;
  let complete!: (response: Response) => void;
  const response = new Promise<Response>(resolve => { complete = resolve; });
  globalThis.fetch = async (input, init) => {
    if (String(input) === issuer + '/api/oauth2/token') { exchanges++; return response; }
    if (String(input) === issuer + '/api/oauth2/catalog') { catalogs++; return json(catalog); }
    inferences++;
    return new Response('unexpected inference');
  };
  try {
    const hooks = await LmmPlugin(magpieInput({client:{}, magpie:{option:()=>undefined, options:()=>({})}}));
    await hooks.config!(config());
    const providerContext = provider();
    const aliceTransport = await hooks.auth!.loader!(async () => alice, providerContext);
    const first = (hooks.auth as any).refresh(alice);
    const second = (hooks.auth as any).refresh({...alice});
    await assert.rejects(hooks.provider!.models!(provider(), {auth:alice}), {code:'refresh_in_progress'});
    const pendingLoader = await hooks.auth!.loader!(async () => alice, providerContext);
    assert.equal(pendingLoader.apiKey, 'lmm-oauth-required');
    await assert.rejects(pendingLoader.fetch(issuer + '/v1/chat/completions'), /LMM requires OAuth/);
    await assert.rejects(aliceTransport.fetch(issuer + '/v1/chat/completions', {method:'POST',body:JSON.stringify({model:modelId})}), /still in progress/);
    assert.deepEqual(Object.keys(await hooks.provider!.models!(provider(), {auth:bob})), [modelId]);
    assert.equal(inferences, 0);
    complete(json({token_type:'Bearer',access_token:'lmm_at_pending_rotated',refresh_token:'lmm_rt_pending_rotated',expires_in:3600,scope}));
    const [a,b] = await Promise.all([first,second]);
    assert.deepEqual(a,b);
    assert.equal(exchanges,1);
    assert.equal(catalogs,2); // Initial Alice admission and independent Bob admission.
  } finally { globalThis.fetch = oldFetch; }
}));

test('Magpie failure cache expires while the durable refresh fence remains', async () => isolated(async () => {
  const oldFetch = globalThis.fetch, oldNow = Date.now;
  const started = oldNow();
  Date.now = () => started;
  const alice = credential('ttl_alice', started - 40_000);
  let exchanges = 0;
  globalThis.fetch = async () => { exchanges++; return new Response(null,{status:429}); };
  try {
    const hooks = await LmmPlugin(magpieInput());
    await assert.rejects((hooks.auth as any).refresh(alice), {code:'rate_limited'});
    Date.now = () => started + 10 * 60 * 1000 + 1;
    await assert.rejects(hooks.provider!.models!(provider(), {auth:alice}), /host did not provide fresh OAuth/);
    await assert.rejects((hooks.auth as any).refresh(alice), {code:'refresh_already_attempted'});
    assert.equal(exchanges,1);
  } finally { globalThis.fetch = oldFetch; Date.now = oldNow; }
}));

test('a revoked Magpie account keeps the login hook available and cannot invoke', async () => isolated(async () => {
  const oldFetch=globalThis.fetch;
  let requests=0;
  globalThis.fetch=async()=>{requests++;return new Response('denied',{status:401});};
  try {
    const hooks=await LmmPlugin(magpieInput());
    await hooks.config!(config());
    const current=provider();
    const transport=await hooks.auth!.loader!(async()=>credential('revoked',Date.now()),current);
    assert.deepEqual(current.models,{});
    assert.equal(hooks.auth!.methods[0].type,'oauth');
    assert.equal(typeof hooks.auth!.methods[0].authorize,'function');
    await assert.rejects(transport.fetch(issuer+'/v1/chat/completions',{method:'POST',body:JSON.stringify({model:modelId})}),/requires OAuth/);
    assert.equal(requests,1,'only catalog admission may use the revoked credential');
  } finally {globalThis.fetch=oldFetch;}
}));

// Legacy has a single provider slot and no conditional auth.set. These replace
// the unsafe success expectations preserved in the before snapshot and original
// independent evidence. Refusal must occur before exchange, write or inference.
for (const replacement of ['bob', 'api', 'removed', 'unchanged', 'malformed'] as const) {
  test(`legacy config/models/overlapping loaders preserve ${replacement} slot without refresh or inference`, async () => isolated(async directory => {
    const oldFetch=globalThis.fetch, oldWarn=console.warn;
    const file=join(directory,'data','opencode','auth.json');
    await mkdir(join(directory,'data','opencode'),{recursive:true});
    const alice=credential('alice',Date.now()-40_000);
    const bob=credential('bob',Date.now());
    let requests=0,saves=0,getters=0;
    globalThis.fetch=async()=>{requests++;throw Error('unexpected network side effect');};
    console.warn=()=>{};
    try {
      const client=createOpencodeClient({baseUrl:'https://native-host.fixture',fetch:async()=>{saves++;return json(true);}});
      const hooks=await LmmPlugin({client} as PluginInput, {magpie:{option:()=>true,options:()=>({})}});
      await writeFile(file,JSON.stringify({lmm:alice}),{mode:0o600});
      const configured=config();
      await hooks.config!(configured);
      assert.deepEqual(configured.provider!.lmm.models,{});
      assert.deepEqual(JSON.parse(await readFile(file,'utf8')).lmm,alice);
      await assert.rejects(hooks.provider!.models!(provider(),{auth:alice}),/blocks automatic OAuth refresh/);
      const getAuth=async()=>{getters++;return JSON.parse(await readFile(file,'utf8')).lmm;};
      const a=await hooks.auth!.loader!(getAuth,provider());
      const next=replacement==='bob'?JSON.stringify({lmm:bob}):replacement==='api'?JSON.stringify({lmm:{type:'api',key:'fixture'}}):replacement==='removed'?'{}':replacement==='malformed'?'{malformed':JSON.stringify({lmm:alice});
      await writeFile(file,next,{mode:0o600});
      const b=await hooks.auth!.loader!(getAuth,provider());
      const outcomes=await Promise.allSettled([a,b,a,b].map(t=>t.fetch(issuer+'/v1/chat/completions',{method:'POST',body:JSON.stringify({model:modelId})})));
      for(const outcome of outcomes){assert.equal(outcome.status,'rejected');if(outcome.status==='rejected')assert.match(outcome.reason.message,/blocks inference.*automatic paid request retries/);}
      assert.equal(await readFile(file,'utf8'),next);
      assert.equal(requests,0);assert.equal(saves,0);assert.equal(getters,0);
      assert.equal(hooks.auth!.methods[0].type,'oauth');
      assert.equal(typeof hooks.auth!.methods[0].authorize,'function');
    } finally {globalThis.fetch=oldFetch;console.warn=oldWarn;}
  }));
}

test('legacy explicit valid models hook and misleading plugin options cannot enable inference', async () => isolated(async () => {
  const oldFetch=globalThis.fetch;
  let catalogs=0;
  globalThis.fetch=async input=>{assert.equal(String(input),issuer+'/api/oauth2/catalog');catalogs++;return json(catalog);};
  try {
    const hooks=await LmmPlugin({client:{}} as PluginInput,{magpie:{option:()=>true,options:()=>({})}});
    await hooks.config!(config());
    const auth=credential('legacy_valid',Date.now());
    assert.deepEqual(Object.keys(await hooks.provider!.models!(provider(),{auth})),[modelId]);
    const transport=await hooks.auth!.loader!(async()=>auth,provider());
    await assert.rejects(transport.fetch(issuer+'/v1/chat/completions'),/blocks inference/);
    assert.equal(catalogs,1);
  } finally {globalThis.fetch=oldFetch;}
}));

test('Magpie loaders use host-renewed separate account credentials without a second exchange', async () => isolated(async () => {
  const oldFetch=globalThis.fetch;
  const stored=new Map<string,OAuth>([['alice',credential('alice',Date.now())],['bob',credential('bob',Date.now())]]);
  const relayed:string[]=[];
  globalThis.fetch=async input=>{
    if(String(input)===issuer+'/api/oauth2/catalog')return json(catalog);
    assert.ok(input instanceof Request);relayed.push(input.headers.get('authorization')!);return new Response('ok');
  };
  try {
    const hooks=await LmmPlugin(magpieInput());await hooks.config!(config());
    const accounts=['alice','bob','alice'];
    const transports=await Promise.all(accounts.map(account=>hooks.auth!.loader!(async()=>stored.get(account)!,provider())));
    for(const account of ['alice','bob'])stored.set(account,credential(account+'_host_renewed',Date.now()));
    await Promise.all(transports.map(t=>t.fetch(issuer+'/v1/chat/completions',{method:'POST',body:JSON.stringify({model:modelId})})));
    assert.deepEqual(relayed.sort(),['Bearer lmm_at_alice_host_renewed','Bearer lmm_at_alice_host_renewed','Bearer lmm_at_bob_host_renewed']);
    stored.set('alice',credential('alice_expired',Date.now()-40_000));
    await assert.rejects(transports[0].fetch(issuer+'/v1/chat/completions',{method:'POST',body:JSON.stringify({model:modelId})}),/host did not provide fresh OAuth/);
    assert.equal(relayed.length,3);
  } finally {globalThis.fetch=oldFetch;}
}));
