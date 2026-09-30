import {spawn} from 'node:child_process';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createServer} from 'node:net';

const binary = process.env.OPENCODE_BIN ?? 'opencode';
const directory = await mkdtemp(join(tmpdir(), 'lmm-opencode-host-'));
const portServer = createServer();
await new Promise(resolve => portServer.listen(0, '127.0.0.1', resolve));
const port = portServer.address().port;
await new Promise(resolve => portServer.close(resolve));
let host;
let hostOutput = "";
let stage = "startup";
try {
 await mkdir(join(directory, 'config', 'opencode'), {recursive:true});
 const config = {
  plugin:[pathToFileURL(resolve('dist/index.js')).href],
  provider:{lmm:{name:'LMM', npm:'@ai-sdk/openai-compatible', models:{'verified-fixture':{limit:{context:8000,output:2000},tool_call:true,reasoning:false,attachment:false,temperature:true,options:{lmmApi:'openai-completions'}}}}},
 };
 await writeFile(join(directory,'config','opencode','opencode.json'), JSON.stringify(config));
 host = spawn(binary, ['serve','--print-logs','--log-level','DEBUG','--hostname','127.0.0.1','--port',String(port)], {cwd:directory,env:{...process.env,XDG_CONFIG_HOME:join(directory,'config'),XDG_DATA_HOME:join(directory,'data'),XDG_STATE_HOME:join(directory,'state'),XDG_CACHE_HOME:join(directory,'cache'),OPENCODE_DISABLE_DEFAULT_PLUGINS:'true'}});
 let output = '';

 host.stdout.on('data', chunk => {output += chunk; hostOutput += chunk;});
 host.stderr.on('data', chunk => {output += chunk; hostOutput += chunk;});
 const started = Date.now();
 const endpoint = `http://127.0.0.1:${port}`;
 while (true) {
  if (host.exitCode !== null) throw new Error(`Host exited: ${output.slice(-2000)}`);
  try { const r = await fetch(endpoint+'/global/health', {signal:AbortSignal.timeout(2000)}); if (r.ok) break; } catch {}
  if (Date.now()-started > 45000) throw new Error(`Host startup timed out: ${output.slice(-2000)}`);
  await new Promise(resolve => setTimeout(resolve, 200));
 }
 stage = 'native OAuth methods';
 const authResponse = await fetch(endpoint+'/provider/auth', {signal:AbortSignal.timeout(90000)});
 assert.equal(authResponse.status, 200);
 const methods = await authResponse.json();
 assert.deepEqual(methods.lmm, [{type:'oauth', label:'Sign in with LMM (OAuth)'}]);
 stage = 'provider configuration';
 const configResponse = await fetch(endpoint+'/config', {signal:AbortSignal.timeout(90000)});
 assert.equal(configResponse.status, 200);
 const loaded = await configResponse.json();
 assert.equal(loaded.provider.lmm.options.baseURL, 'https://api.lmm.best/v1');
 assert.deepEqual(loaded.provider.lmm.models, {}, 'no unauthenticated models should be advertised');
 stage = 'provider catalog';
 const providersResponse = await fetch(endpoint+'/provider', {signal:AbortSignal.timeout(90000)});
 assert.equal(providersResponse.status, 200, 'provider catalog must work before OAuth login');
 const providers = await providersResponse.json();
 assert.ok(!providers.all.some(p => p.id === 'lmm' && Object.keys(p.models).length), 'OAuth-only provider must not advertise unconnected models');
 console.log('OpenCode host smoke passed: plugin loaded, OAuth method registered, config hook applied, provider catalog available before login. No external login or inference performed.');
} catch (error) {
 throw new Error(`OpenCode host smoke failed at ${stage}: ${error instanceof Error ? error.message : "unknown error"}. Host logs: ${host ? hostOutput.slice(-8000) : "not started"}`);
} finally {
 if (host && host.exitCode === null) {
  host.kill('SIGTERM');
  await Promise.race([new Promise(resolve => host.once('exit',resolve)),new Promise(resolve => setTimeout(resolve,3000))]);
  if (host.exitCode === null) host.kill('SIGKILL');
 }
 await rm(directory,{recursive:true,force:true});
}
