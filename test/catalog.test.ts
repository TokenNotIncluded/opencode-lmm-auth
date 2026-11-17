import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Model, Provider } from '@opencode-ai/sdk';
import { admitCatalog, logCatalogDiagnostics, normalizeReferenceCost, prepareRelay } from '../src/catalog.ts';
import { ModelsDevCatalog } from '../src/models-dev-cache.ts';

const issuer = 'https://api.lmm.best';
const group = 'ZGVmYXVsdA';
const upstream = 'exact-model';
const id = `lmm:${group}:${Buffer.from(upstream).toString('base64url')}`;
const modalities = {text:true, audio:false, image:false, video:false, pdf:false};
const profile: Model = {id:upstream, providerID:'lmm', name:'Model', status:'active', headers:{}, api:{id:upstream,url:issuer+'/v1',npm:'@ai-sdk/openai-compatible'}, cost:{input:0,output:0,cache:{read:0,write:0}}, options:{lmmApi:'openai-completions'}, limit:{context:8000, output:2000}, capabilities:{toolcall:true, reasoning:false, attachment:false, temperature:true, input:modalities, output:modalities}};
const provider: Provider = {id:'lmm', name:'LMM', source:'config', env:[], options:{}, models:{[upstream]:profile}};
const item = {id, upstream_model:upstream, group_id:group, group:'default', name:'Model', apis:['openai-completions'], pricing:{currency:'USD', unit:'million_tokens', price_basis:'configured_base_rates'}, native_cost:{input:1, output:2, cacheRead:0.1, cacheWrite:0.2}};
const catalog = (entry: any = item) => ({schema_version:1, resource:issuer+'/api/oauth2', models:[entry]});
const empty = new ModelsDevCatalog();
const admit = (entry: any = item) => admitCatalog(catalog(entry), provider, issuer, `group:${group}`, empty);
const metadata = new ModelsDevCatalog({vendor:{id:'vendor',models:{'future-model-7.2':{
 id:'future-model-7.2', name:'Future Model 7.2',canonical_model_id:'vendor/future-model-7.2',
 limit:{context:131072,input:120000,output:8192},modalities:{input:['text','image'],output:['text']},
 tool_call:true,reasoning:true,temperature:true,cost:{input:3,output:5,cache_read:0.3}
}}}});
const route = (name: string, groupId = group) => ({...item,id:`lmm:${groupId}:${Buffer.from(name).toString('base64url')}`,upstream_model:name,group_id:groupId});

test('unknown models and missing prices remain available in every authorized group', () => {
 const other = Buffer.from('secondary').toString('base64url');
 const entries = [route('unlisted-future-99'),route('unlisted-future-99',other),route('another-unlisted')].map(entry=>({...entry,native_cost:null}));
 const result=admitCatalog({...catalog(),models:entries},{...provider,models:{}},issuer,`group:${group} group:${other}`,empty);
 assert.deepEqual([...result.routes.keys()],entries.map(entry=>entry.id));
 for(const entry of entries){
  assert.equal(result.routes.get(entry.id)?.upstream,entry.upstream_model);
  assert.equal(result.models[entry.id]!.options.lmmMetadataStatus,'unknown');
  assert.deepEqual(result.models[entry.id]!.options.lmmUnknownCostFields,['input','output','cache_read','cache_write']);
  assert.match(result.models[entry.id]!.name,/cost estimate incomplete.*server billed/);
 }
});

test('fuzzy reference enriches limits and capabilities while retaining the exact wire model', () => {
 const entry={...route('VENDOR/FUTURE MODEL 7.2'),native_cost:null};
 const result=admitCatalog(catalog(entry),{...provider,models:{}},issuer,`group:${group}`,metadata);
 const model=result.models[entry.id]!;
 assert.equal(model.limit.context,120000);
 assert.equal(model.limit.output,8192);
 assert.equal(model.capabilities.toolcall,true);
 assert.equal(model.capabilities.input.image,true);
 assert.equal(model.capabilities.reasoning,true);
 assert.equal(model.cost.input,3);
 assert.deepEqual(model.options.lmmUnknownCostFields,['cache_write']);
 assert.equal(result.routes.get(entry.id)?.upstream,'VENDOR/FUTURE MODEL 7.2');
});

test('server fields win and incomplete metadata is supplemented independently', () => {
 const server={context_window:64000,max_input_tokens:null,max_output_tokens:null,input_modalities:null,output_modalities:null,reasoning:false,tool_call:false,source:'server'};
 const entry={...route('future-model-7.2'),metadata:server};
 const result=admitCatalog(catalog(entry),{...provider,models:{}},issuer,`group:${group}`,metadata);
 assert.deepEqual(result.models[entry.id]!.limit,{context:64000,output:8192});
 assert.equal(result.models[entry.id]!.capabilities.reasoning,false);
 assert.equal(result.models[entry.id]!.capabilities.toolcall,false);
 assert.equal(result.models[entry.id]!.cost.input,1);
 assert.equal(result.models[entry.id]!.options.lmmMetadataSource,'server');
 const incomplete=admit({...item,metadata:{...server,context_window:null},native_cost:null});
 assert.equal(incomplete.routes.size,1);
 assert.throws(()=>admit({...item,metadata:{...server,max_output_tokens:-1}}));
});

test('account prices retain known fields and reference prices fill only missing fields', () => {
 const entry={...route('future-model-7.2'),native_cost:null,pricing:{...item.pricing,input:1,output:2,cache_read:0.1,cache_write:null}};
 const result=admitCatalog(catalog(entry),{...provider,models:{}},issuer,`group:${group}`,metadata);
 assert.deepEqual(result.models[entry.id]!.cost,{input:1,output:2,cache:{read:0.1,write:0}});
 assert.deepEqual(result.models[entry.id]!.options.lmmUnknownCostFields,['cache_write']);
 assert.equal(result.models[entry.id]!.options.lmmReferenceCost,false);
 const dynamic=admitCatalog(catalog({...entry,pricing:{...entry.pricing,unit:'expression'}}),{...provider,models:{}},issuer,`group:${group}`,metadata);
 assert.equal(dynamic.models[entry.id]!.cost.input,3);
 assert.equal(dynamic.models[entry.id]!.options.lmmReferenceCost,true);
});

test('unknown estimates and explicit free reference rates are distinguishable', () => {
 assert.deepEqual(normalizeReferenceCost({input:0,output:0,cache_read:0,cache_write:0}),{input:0,output:0,cache:{read:0,write:0}});
 assert.equal(normalizeReferenceCost({input:-1,output:0}),undefined);
 const result=admit({...item,native_cost:null,pricing:{currency:'EUR',unit:'request',price_basis:'per_request'}});
 assert.equal(result.routes.size,1);
 assert.match(result.models[id]!.name,/cost estimate incomplete/);
 assert.throws(()=>admit({...item,native_cost:{...item.native_cost,input:-1}}));
});

test('only unsupported protocols and explicit non-text capabilities are filtered', () => {
 assert.equal(admit({...item,apis:['unsupported']}).routes.size,0);
 const server={context_window:8000,max_input_tokens:null,max_output_tokens:1000,input_modalities:['text'],output_modalities:['image'],reasoning:false,tool_call:false,source:'server'};
 assert.equal(admit({...item,metadata:server}).routes.size,0);
 assert.equal(admit({...item,metadata:{...server,output_modalities:['text','audio']}}).routes.size,1);
 assert.throws(()=>admitCatalog(catalog(),provider,issuer,'group:b3RoZXI',empty));
 assert.throws(()=>admit({...item,id:'lmm:bad:bad'}));
 assert.throws(()=>admitCatalog({...catalog(),models:[{...item,apis:[]},{...item,apis:[]}]},provider,issuer,`group:${group}`,empty));
});

test('explicit user profiles remain usable without a bundled model table', () => {
 const result=admit();
 assert.equal(result.models[id]!.api.id,id);
 assert.deepEqual(result.models[id]!.limit,profile.limit);
 assert.equal(result.routes.get(id)?.upstream,upstream);
});

test('catalog diagnostics aggregate anonymous group filtering and suppress unchanged output', () => {
 const diagnostics = {
  groups: [
   {group:'group-1', total:4, admitted:2, filtered:[{reason:'missing_reference_price', count:1}, {reason:'unsupported_protocol', count:1}]},
   {group:'group-2', total:1, admitted:0, filtered:[{reason:'missing_profile', count:1}]},
  ],
 } as const;
 const output: string[] = [];
 const logger = {info: (message: string) => output.push(message)};
 const fingerprint = logCatalogDiagnostics(diagnostics, logger);
 assert.equal(output.length, 2);
 assert.match(output[0]!, /group=group-1 admitted=2\/4/);
 assert.match(output[0]!, /missing_reference_price:1/);
 assert.doesNotMatch(output.join(' '), /ZGVmYXVsdA|default|exact-model|kimi|haiku/);
 assert.equal(logCatalogDiagnostics(diagnostics, logger, fingerprint), fingerprint);
 assert.equal(output.length, 2, 'unchanged V2 periodic reload emits no repeated diagnostics');
});

test('relay replaces synthetic id, strips alternate credentials and preserves cancellation', async () => {
 const abort = new AbortController();
 const original = new Request(issuer+'/v1/chat/completions', {method:'POST', body:JSON.stringify({model:id, stream:true}), headers:{authorization:'Bearer stale', 'x-api-key':'secret', 'x-goog-api-key':'secret', cookie:'secret', 'x-lmm-group':'wrong'}, signal:abort.signal});
 const prepared = await prepareRelay(original, undefined, issuer, admit().routes, 'lmm_at_fresh');
 assert.equal(prepared.headers.get('authorization'), 'Bearer lmm_at_fresh');
 assert.equal(prepared.headers.get('x-lmm-group'), group);
 assert.equal(prepared.headers.get('x-api-key'), null);
 assert.equal(prepared.headers.get('x-goog-api-key'), null);
 assert.equal(prepared.headers.get('cookie'), null);
 assert.equal(prepared.redirect, 'error');
 assert.deepEqual(await prepared.clone().json(), {model:upstream, stream:true});
 abort.abort();
 assert.equal(prepared.signal.aborted, true);
});

test('relay rejects untrusted destination, keys in URL, model, group and protocol substitutions', async () => {
 for (const [url, model] of [[issuer+'/v1/chat/completions?key=secret',id], ['https://evil.example/v1/chat/completions',id], [issuer+'/v1/responses',id], [issuer+'/v1/chat/completions','other-model']]) await assert.rejects(prepareRelay(url, {method:'POST', body:JSON.stringify({model})}, issuer, admit().routes, 'lmm_at_fresh'));
});


test('explicit embedding types are not treated as chat merely because they output text', () => {
 const data=new ModelsDevCatalog({vendor:{id:'vendor',models:{embedding:{id:'embedding',name:'Embedding',type:'embedding',limit:{context:8000,output:1},modalities:{input:['text'],output:['text']},tool_call:false,reasoning:false}}}});
 const entry=route('embedding');
 const result=admitCatalog(catalog(entry),{...provider,models:{}},issuer,`group:${group}`,data);
 assert.equal(result.routes.size,0);
 assert.equal(result.diagnostics.groups[0]!.filtered[0]!.reason,'unsupported_modality');
});

test('zero public capacities remain unknown and cannot empty an otherwise complete catalog', () => {
 const data=new ModelsDevCatalog({vendor:{id:'vendor',models:{zero:{id:'zero',name:'Zero',limit:{context:0,input:0,output:0},modalities:{input:['text'],output:['text']},tool_call:false,reasoning:false}}}});
 const entry=route('zero');
 const result=admitCatalog({...catalog(),models:[entry,item]},{...provider,models:{}},issuer,`group:${group}`,data);
 assert.equal(result.routes.size,2);
 assert.deepEqual(result.models[entry.id]!.limit,{context:32768,output:4096});
 assert.equal(result.models[entry.id]!.options.lmmEstimatedLimits,true);
 assert.match(result.models[entry.id]!.name,/estimated token limits/);
});
