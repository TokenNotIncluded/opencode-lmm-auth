import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Model, Provider } from '@opencode-ai/sdk';
import { admitCatalog, logCatalogDiagnostics, normalizeReferenceCost, prepareRelay } from '../src/catalog.ts';
import { builtinProfiles } from '../src/metadata.ts';
import { referenceCosts } from '../src/reference-costs.ts';

const issuer = 'https://api.lmm.best';
const group = 'ZGVmYXVsdA';
const upstream = 'exact-model';
const id = `lmm:${group}:${Buffer.from(upstream).toString('base64url')}`;
const modalities = {text:true, audio:false, image:false, video:false, pdf:false};
const profile: Model = {id:upstream, providerID:'lmm', name:'Model', status:'active', headers:{}, api:{id:upstream,url:issuer+'/v1',npm:'@ai-sdk/openai-compatible'}, cost:{input:0,output:0,cache:{read:0,write:0}}, options:{lmmApi:'openai-completions'}, limit:{context:8000, output:2000}, capabilities:{toolcall:true, reasoning:false, attachment:false, temperature:true, input:modalities, output:modalities}};
const provider: Provider = {id:'lmm', name:'LMM', source:'config', env:[], options:{}, models:{[upstream]:profile}};
const item = {id, upstream_model:upstream, group_id:group, group:'default', name:'Model', apis:['openai-completions'], pricing:{currency:'USD', unit:'million_tokens', price_basis:'configured_base_rates'}, native_cost:{input:1, output:2, cacheRead:0.1, cacheWrite:0.2}};
const catalog = (entry: any = item) => ({schema_version:1, resource:issuer+'/api/oauth2', models:[entry]});
const admit = (entry = item) => admitCatalog(catalog(entry), provider, issuer, `group:${group}`, new Set([upstream]));

test('new exact profiles still require an authorized catalog entry and compatible protocol', () => {
 for (const [name, api, context, output] of [['kimi-k3', 'openai-completions', 1048576, 1048576], ['claude-haiku-5-5', 'anthropic-messages', 1000000, 128000]] as const) {
  const metadata = builtinProfiles[name]!;
  assert.deepEqual(metadata.limit, {context, output});
  assert.equal(metadata.tool_call, true);
  assert.equal(metadata.options?.lmmMetadataSource, `https://models.dev/${name === 'kimi-k3' ? 'moonshotai' : 'anthropic'}#${name}`);
  const modelId = `lmm:${group}:${Buffer.from(name).toString('base64url')}`;
  const entry = {...item, id:modelId, upstream_model:name, apis:[api]};
  const model = {...profile, id:name, limit:metadata.limit!, options:metadata.options!};
  const source = {...provider, models:{[name]:model}};
  const admitted = admitCatalog(catalog(entry), source, issuer, `group:${group}`, new Set([name]));
  assert.equal(admitted.routes.get(modelId)?.upstream, name);
  assert.equal(admitted.models[modelId].cost.input, 1);
  assert.equal(admitCatalog(catalog(entry), source, issuer, `group:${group}`, new Set()).routes.size, 0);
  assert.equal(admitCatalog(catalog({...entry, apis:[]}), source, issuer, `group:${group}`, new Set([name])).routes.size, 0);
  assert.throws(() => admitCatalog(catalog(entry), source, issuer, 'group:b3RoZXI', new Set([name])));
 }
});

test('bundled exact profiles and costs admit Core null-cost models only with matching protocol and USD', () => {
 for (const name of ['kimi-k3', 'claude-haiku-5-5'] as const) {
  const model = builtinProfiles[name]!;
  const api = model.options!.lmmApi as string;
  const modelId = `lmm:${group}:${Buffer.from(name).toString('base64url')}`;
  const source = {...provider, models:{[name]: {...profile, id:name, limit:model.limit!, options:model.options!}}};
  const entry = {...item, id:modelId, upstream_model:name, apis:[api], native_cost:null, pricing:{currency:'USD', unit:'million_tokens', price_basis:'effective_user_rates', cache_write:null}};
  const admitted = admitCatalog(catalog(entry), source, issuer, `group:${group}`, new Set([name]), new Map(Object.entries(referenceCosts)));
  assert.equal(admitted.routes.get(modelId)?.upstream, name);
  assert.equal(admitted.models[modelId].options.lmmReferenceCost, true);
  assert.equal(admitted.models[modelId].name.includes('reference estimate'), true);
  assert.equal(admitCatalog(catalog({...entry, apis:['unsupported-protocol']}), source, issuer, `group:${group}`, new Set([name]), new Map(Object.entries(referenceCosts))).routes.size, 0);
  assert.equal(admitCatalog(catalog({...entry, pricing:{...entry.pricing, currency:'EUR'}}), source, issuer, `group:${group}`, new Set([name]), new Map(Object.entries(referenceCosts))).routes.size, 0);
 }
});

test('catalog keeps eligible groups when another group has no exact profile or reference cost', () => {
 const secondGroup = Buffer.from('secondary').toString('base64url');
 const known = {...item, native_cost:null, pricing:{currency:'USD', unit:'million_tokens', price_basis:'effective_user_rates', cache_write:null}};
 const missingProfile = {...known, id:`lmm:${secondGroup}:${Buffer.from('unknown-model').toString('base64url')}`, group_id:secondGroup, upstream_model:'unknown-model'};
 const models = [known, missingProfile];
 const allowed = admitCatalog({schema_version:1, resource:issuer+'/api/oauth2', models}, provider, issuer, `group:${group} group:${secondGroup}`, new Set([upstream]), new Map([[upstream, referenceCosts['kimi-k3']!]]));
 assert.equal(allowed.routes.size, 1);
 assert.equal(allowed.routes.has(id), true);
 assert.equal(allowed.models[id].name.includes('reference estimate'), true);
 assert.equal(allowed.routes.has(missingProfile.id), false);
 const noPrice = admitCatalog(catalog(known), provider, issuer, `group:${group}`, new Set([upstream]), new Map());
 assert.equal(noPrice.routes.size, 0, 'only the group without a reference estimate is filtered');
});

test('Core catalog keeps priced profiles across groups and filters all profiles lacking reference prices', () => {
 const secondGroup = Buffer.from('secondary').toString('base64url');
 const missingPrices = Object.keys(builtinProfiles).filter(name => !referenceCosts[name]);
 assert.equal(missingPrices.length, 11);
 const sourceModels: Record<string, Model> = {};
 const makeModel = (name: string): Model => {
  const metadata = builtinProfiles[name]!;
  const boolModalities = (values: unknown) => Object.fromEntries(['text','audio','image','video','pdf'].map(key => [key, Array.isArray(values) && values.includes(key)])) as typeof modalities;
  const model: Model = {
   ...profile, id:name, name:metadata.name!, limit:metadata.limit!, options:metadata.options!,
   capabilities:{toolcall:metadata.tool_call!, reasoning:metadata.reasoning!, attachment:metadata.attachment!, temperature:metadata.temperature!, input:boolModalities(metadata.modalities?.input), output:boolModalities(metadata.modalities?.output)},
  };
  sourceModels[name] = model;
  return model;
 };
 const first = 'kimi-k3';
 const second = 'claude-haiku-5-5';
 makeModel(first); makeModel(second);
 for (const name of missingPrices) makeModel(name);
 const missingPrice = missingPrices[0]!;
 const makeEntry = (name: string, groupId: string) => ({
  ...item, id:`lmm:${groupId}:${Buffer.from(name).toString('base64url')}`, group_id:groupId, upstream_model:name,
  apis:[builtinProfiles[name]!.options!.lmmApi], native_cost:null,
  pricing:{currency:'USD', unit:'million_tokens', price_basis:'effective_user_rates', cache_write:null},
 });
 const routes = [makeEntry(first, group), makeEntry(first, secondGroup), makeEntry(second, group), makeEntry(missingPrice, group)];
 const admitted = admitCatalog({schema_version:1, resource:issuer+'/api/oauth2', models:routes}, {...provider, models:sourceModels}, issuer,
  `group:${group} group:${secondGroup}`, new Set(Object.keys(sourceModels)), new Map(Object.entries(referenceCosts)));
 assert.deepEqual([...admitted.routes.keys()], routes.slice(0, 3).map(route => route.id));
 assert.equal(admitted.routes.get(routes[0]!.id)?.upstream, first);
 assert.equal(admitted.routes.get(routes[1]!.id)?.upstream, first);
 assert.notEqual(routes[0]!.id, routes[1]!.id);
 assert.equal(admitted.routes.get(routes[2]!.id)?.upstream, second);
 assert.equal(admitted.routes.has(routes[3]!.id), false);
 assert.equal(missingPrices.length, 11, 'eleven builtin profiles lack bundled reference estimates');
 assert.equal(missingPrices.every(name => !referenceCosts[name]), true);
});

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

test('catalog admits dynamic billing with an explicit host reference cost and labels it', () => {
 const dynamic = {...item, native_cost:null, pricing:{...item.pricing, unit:'expression', price_basis:'tiered_expression'}};
 const result = admitCatalog(catalog(dynamic), provider, issuer, `group:${group}`, new Set([upstream]), new Map([[upstream, {input:3, output:4, cache:{read:0.5, write:0.75}}]]));
 assert.equal(Object.keys(result.models).length, 1);
 assert.equal(result.models[id].cost.input, 3);
 assert.match(result.models[id].name, /LMM variable billing/);
 assert.equal(result.models[id].options.lmmPricingBasis, 'tiered_expression');
 assert.equal(result.models[id].options.lmmReferenceCost, true);
 assert.equal(result.routes.get(id)?.upstream, upstream);
});

test('Core catalog token pricing with missing cache write uses labeled reference only', () => {
 const cost = {input:3, output:4, cache:{read:0.5, write:0.75}};
 for (const basis of ['configured_base_rates', 'effective_user_rates']) {
  const entry = {...item, native_cost:null, pricing:{currency:'USD', unit:'million_tokens', price_basis:basis, group_multiplier:1, trust_multiplier:null, input:1, output:2, cache_read:0.1, cache_write:null, request:null, final_cost_depends_on_usage:true, updated_at:123}};
  const without = admitCatalog(catalog(entry), provider, issuer, `group:${group}`, new Set([upstream]));
  assert.equal(without.routes.size, 0);
  const result = admitCatalog(catalog(entry), provider, issuer, `group:${group}`, new Set([upstream]), new Map([[upstream, cost]]));
  assert.deepEqual(result.models[id].cost, cost);
  assert.match(result.models[id].name, /reference estimate/);
  assert.equal(result.models[id].options.lmmReferenceCost, true);
  assert.equal(result.models[id].options.lmmPricingBasis, basis);
  assert.throws(() => admitCatalog(catalog(entry), provider, issuer, 'group:b3RoZXI', new Set([upstream]), new Map([[upstream, cost]])));
 }
});

test('catalog refuses a zero-filled host cost instead of presenting dynamic billing as free', () => {
 const dynamic = {...item, native_cost:null, pricing:{...item.pricing, unit:'expression', price_basis:'tiered_expression'}};
 assert.equal(normalizeReferenceCost({input:0, output:0, cache_read:0, cache_write:0}), undefined);
 const result = admitCatalog(catalog(dynamic), provider, issuer, `group:${group}`, new Set([upstream]), new Map());
 assert.equal(Object.keys(result.models).length, 0);
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
