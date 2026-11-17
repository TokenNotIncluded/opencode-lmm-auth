import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LmmHttp } from '../src/http.ts';

test('large complete catalogs load while authentication response limits stay bounded', async () => {
  const body = JSON.stringify({models: [], padding: 'x'.repeat(3_000_000)});
  const requests: RequestInit[] = [];
  const http = new LmmHttp({fetch: (async (_input, init) => {
    requests.push(init!);
    return new Response(body, {headers:{'content-type':'application/json'}});
  }) as typeof fetch});
  const result = await http.bearer('/api/oauth2/catalog', 'lmm_at_fixture');
  assert.deepEqual(result.models, []);
  assert.equal(requests[0]!.redirect, 'error');
  await assert.rejects(http.bearer('/api/oauth2/application', 'lmm_at_fixture'));
});
