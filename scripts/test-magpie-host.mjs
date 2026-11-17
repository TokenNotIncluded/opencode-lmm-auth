import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const directory = await mkdtemp(join(tmpdir(), 'lmm-magpie-host-'));
try {
  for (const name of ['config', 'data', 'state', 'cache']) await mkdir(join(directory, name), {mode: 0o700});
  const env = {...process.env, HOME: directory, XDG_CONFIG_HOME: join(directory, 'config'), XDG_DATA_HOME: join(directory, 'data'), XDG_STATE_HOME: join(directory, 'state'), XDG_CACHE_HOME: join(directory, 'cache')};
  const run = args => {
    const result = spawnSync(process.env.MAGPIE_BIN ?? 'magpie', args, {env, encoding: 'utf8', timeout: 55_000});
    assert.equal(result.status, 0, `Magpie command failed: ${result.error?.message ?? result.stderr}`);
    assert.ok(!result.stderr.includes('plugin [error]'), result.stderr);
    return result.stdout;
  };
  const version = run(['--version']).trim();
  run(['plugin', 'add', resolve('dist/magpie.js')]);
  const result = JSON.parse(run(['plugin', 'list', '--json']));
  const provider = result.providers.find(p => p.id === 'lmm-magpie');
  assert.ok(provider);
  assert.equal(provider.signedIn, false);
  assert.equal(provider.usage, true);
  assert.deepEqual(provider.models, []);
  assert.equal(provider.methods[0].type, 'oauth');
  console.log(JSON.stringify({version, provider: provider.id, oauth: true, usage: true, signed_in: false, models: 0, paid_calls: 0}));
} finally { await rm(directory, {recursive: true, force: true}); }
