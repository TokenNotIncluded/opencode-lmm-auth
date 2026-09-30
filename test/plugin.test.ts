import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {PluginInput, Config} from '@opencode-ai/plugin';
import type {Provider, Model} from '@opencode-ai/sdk';
import LmmPlugin from '../src/index.ts';
import {parseToken} from '../src/oauth.ts';

const issuer = 'https://api.lmm.best';
const group = 'ZGVmYXVsdA';
const upstream = 'verified-model';
const id = `lmm:${group}:${Buffer.from(upstream).toString('base64url')}`;
const modalities = {text:true, audio:false, image:false, video:false, pdf:false};
const profile: Model = {id:upstream, providerID:'lmm', name:'Model', status:'active', headers:{}, api:{id:upstream,url:issuer+'/v1',npm:'@ai-sdk/openai-compatible'}, cost:{input:0,output:0,cache:{read:0,write:0}}, options:{lmmApi:'openai-completions'}, limit:{context:8000, output:2000}, capabilities:{toolcall:true, reasoning:false, attachment:false, temperature:true, input:modalities, output:modalities}};
const makeProvider = (): Provider => ({id:'lmm',name:'LMM',source:'config',env:[],options:{},models:{[upstream]:structuredClone(profile),'unverified-model':{...structuredClone(profile),id:'unverified-model'}}});

// No host SDK operations are needed when a still-valid OAuth credential is used.
const context = {client:{}} as PluginInput;
const json = (value: unknown) => new Response(JSON.stringify(value), {headers:{'content-type':'application/json'}});
const item = (name:string) => ({id:`lmm:${group}:${Buffer.from(name).toString('base64url')}`,upstream_model:name,group_id:group,group:'default',name,apis:['openai-completions'],pricing:{currency:'USD',unit:'million_tokens',price_basis:'configured_base_rates'},native_cost:{input:1,output:2,cacheRead:0.1,cacheWrite:0.2}});

test('config allowlist gates authenticated loader and actual transport; no request before credential validation', async () => {
 const originalFetch = globalThis.fetch;
 let calls = 0;
 globalThis.fetch = async (input) => {
  calls++;
  if (String(input) === issuer+'/api/oauth2/catalog') return json({schema_version:1,resource:issuer+'/api/oauth2',models:[item(upstream),item('unverified-model')]});
  assert.ok(input instanceof Request);
  assert.equal(input.headers.get('authorization'),'Bearer lmm_at_fixture');
  assert.equal(input.headers.get('x-lmm-group'),group);
  assert.equal((await input.json()).model,upstream);
  return new Response('stream fixture');
 };
 try {
  const hooks = await LmmPlugin(context);
  const config: Config = {provider:{lmm:{models:{[upstream]:{limit:{context:8000,output:2000},tool_call:true,reasoning:false,attachment:false,temperature:true,options:{lmmApi:'openai-completions'}},'unverified-model':{options:{lmmApi:'openai-completions'}}}}}};
  await hooks.config!(config);
  assert.equal(config.provider!.lmm.options!.baseURL,issuer+'/v1');
  const auth = parseToken({token_type:'Bearer',access_token:'lmm_at_fixture',refresh_token:'lmm_rt_fixture',expires_in:3600,scope:`catalog:read balance:read usage:read models:invoke group:${group}`},issuer,Date.now());
  const provider = makeProvider();
  const transport = await hooks.auth!.loader!(async () => auth,provider);
  assert.deepEqual(Object.keys(provider.models),[id]);
  const stream = await transport.fetch(issuer+'/v1/chat/completions',{method:'POST',body:JSON.stringify({model:id,stream:true})});
  assert.equal(await stream.text(),'stream fixture');
  assert.equal(calls,2);
  await assert.rejects(transport.fetch('https://evil.example/v1/chat/completions',{method:'POST',body:JSON.stringify({model:id})}));
  assert.equal(calls,2);
 } finally { globalThis.fetch = originalFetch; }
});

test('unconnected loader yields no models and refuses API-key fallback',async () => {
 const hooks = await LmmPlugin(context);
 const provider = makeProvider();
 const transport = await hooks.auth!.loader!(async () => ({type:'api',key:'must-not-use'}),provider);
 assert.deepEqual(provider.models,{});
 await assert.rejects(transport.fetch(issuer+'/v1/chat/completions'));
});

test('config publishes only authenticated synthetic catalog models with per-model SDK selection',async () => {
 const {mkdtemp,mkdir,writeFile,rm} = await import('node:fs/promises');
 const {tmpdir} = await import('node:os');
 const {join} = await import('node:path');
 const dir = await mkdtemp(join(tmpdir(),'lmm-config-test-'));
 const oldData = process.env.XDG_DATA_HOME;
 const oldFetch = globalThis.fetch;
 process.env.XDG_DATA_HOME = dir;
 try {
  const auth = parseToken({token_type:'Bearer',access_token:'lmm_at_fixture',refresh_token:'lmm_rt_fixture',expires_in:3600,scope:`catalog:read balance:read usage:read models:invoke group:${group}`},issuer,Date.now());
  await mkdir(join(dir,'opencode'));
  await writeFile(join(dir,'opencode','auth.json'),JSON.stringify({lmm:auth}));
  globalThis.fetch = async () => json({schema_version:1,resource:issuer+'/api/oauth2',models:[{...item(upstream),apis:['openai-responses']},item('unverified-model')]});
  const hooks = await LmmPlugin(context);
  const config:Config = {provider:{lmm:{models:{[upstream]:{limit:{context:8000,output:2000},tool_call:true,reasoning:false,attachment:false,temperature:true,modalities:{input:['text','image','pdf'],output:['text']},options:{lmmApi:'openai-responses'}}}}}};
  await hooks.config!(config);
  const models = config.provider!.lmm.models!;
  assert.deepEqual(Object.keys(models),[id]);
  assert.equal(models[id].provider?.npm,'@ai-sdk/openai');
  assert.equal(models[id].id,id);
  assert.equal(models[id].cost?.input,1);
  assert.deepEqual(models[id].modalities,{input:['text','image','pdf'],output:['text']});
 } finally {
  if(oldData===undefined) delete process.env.XDG_DATA_HOME; else process.env.XDG_DATA_HOME=oldData;
  globalThis.fetch=oldFetch;
  await rm(dir,{recursive:true,force:true});
 }
});
