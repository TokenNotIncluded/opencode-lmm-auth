import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Model, Provider } from '@opencode-ai/sdk';
import { admitCatalog, prepareRelay } from '../src/catalog.ts';

const issuer = 'https://api.lmm.best';
const group = 'ZGVmYXVsdA';
const upstream = 'exact-model';
const id = `lmm:${group}:${Buffer.from(upstream).toString('base64url')}`;
const modalities = {text:true, audio:false, image:false, video:false, pdf:false};
const profile: Model = {id:upstream, providerID:'lmm', name:'Model', status:'active', headers:{}, api:{id:upstream,url:issuer+'/v1',npm:'@ai-sdk/openai-compatible'}, cost:{input:0,output:0,cache:{read:0,write:0}}, options:{lmmApi:'openai-completions'}, limit:{context:8000, output:2000}, capabilities:{toolcall:true, reasoning:false, attachment:false, temperature:true, input:modalities, output:modalities}};
const provider: Provider = {id:'lmm', name:'LMM', source:'config', env:[], options:{}, models:{[upstream]:profile}};
const item = {id, upstream_model:upstream, group_id:group, group:'default', name:'Model', apis:['openai-completions'], pricing:{currency:'USD', unit:'million_tokens', price_basis:'configured_base_rates'}, native_cost:{input:1, output:2, cacheRead:0.1, cacheWrite:0.2}};
const catalog = (entry = item) => ({schema_version:1, resource:issuer+'/api/oauth2', models:[entry]});
const admit = (entry = item) => admitCatalog(catalog(entry), provider, issuer, `group:${group}`, new Set([upstream]));

test('catalog generates distinct group model id and preserves exact supplied capabilities', () => {
 const result = admit();
 assert.equal(result.models[id].api.id, id);
 assert.equal(result.models[id].api.npm, '@ai-sdk/openai-compatible');
 assert.deepEqual(result.models[id].limit, profile.limit);
 assert.equal(result.models[id].cost.input, 1);
 assert.equal(result.routes.get(id)?.upstream, upstream);
});

test('catalog refuses unknown prices and unverified models, and fails on scope mismatch', () => {
 assert.equal(Object.keys(admit({...item, native_cost:null as never}).models).length, 0);
 assert.equal(Object.keys(admit({...item, pricing:{...item.pricing, unit:'expression'}}).models).length, 0);
 assert.equal(Object.keys(admitCatalog(catalog(), provider, issuer, `group:${group}`, new Set()).models).length, 0);
 assert.throws(() => admitCatalog(catalog(), provider, issuer, 'group:b3RoZXI', new Set([upstream])));
 assert.throws(() => admit({...item, id:'lmm:bad:bad'}));
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
