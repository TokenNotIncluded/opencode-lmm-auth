// Native OpenCode V2 acceptance, pinned to the public 2.1.4 API contract.
// Uses only an isolated HOME and locally trusted synthetic OAuth/inference.
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp,mkdir,writeFile,readFile,rm,copyFile,chmod,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createServer} from 'node:https';
import {createServer as netServer} from 'node:net';
import {createHash,randomBytes} from 'node:crypto';

const binary=process.env.OPENCODE_V2_BIN??process.env.OPENCODE_BIN??'opencode';
const directory=await mkdtemp(join(tmpdir(),'lmm-opencode-v2-'));
await chmod(directory,0o700);
const outputRoot=process.env.LMM_V2_TEST_OUTPUT;
let evidence;
try{
  if(outputRoot){
    const root=resolve(outputRoot);
    assert.ok(root!==directory&&!root.startsWith(directory+'/'),'retained evidence must be outside the fixture HOME');
    await mkdir(root,{recursive:true,mode:0o700});
    assert.equal((await stat(root)).mode&0o077,0,'retained evidence parent must be private (chmod 700)');
    evidence=await mkdtemp(join(root,'native-v2-'));
    await chmod(evidence,0o700);
  }
}catch(error){await rm(directory,{recursive:true,force:true});throw error;}
const result={startedAt:new Date().toISOString(),binary,checks:[],archive:undefined,success:false};
let launchCount=0;
async function retain(name,value){
  if(evidence)await writeFile(join(evidence,name),value,{mode:0o600});
}
const group='ZGVmYXVsdA';
const scope='catalog:read balance:read usage:read models:invoke group:'+group;
const models=['gpt-4.1','gpt-5.4','claude-sonnet-4-5'];
const apis=['openai-completions','openai-responses','anthropic-messages'];
const paths=['/v1/chat/completions','/v1/responses','/v1/messages'];
const wire=i=>'lmm:'+group+':'+Buffer.from(models[i]).toString('base64url');
const observed=[];
let host,hostError,fixture,authorization,currentAccess='lmm_at_fixture',refreshCalls=0,revoked=false,logins=0;
let logs='',serverPassword='',stage='startup',issuer='',endpoint='',pluginDirectory='';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const redact=text=>String(text)
  .replace(/server password[^\n]*/gi,'server password [redacted fixture]')
  .replace(/lmm-fixture-[A-Za-z0-9_-]+|amr_[A-Za-z0-9_-]+/g,'[redacted fixture]')
  .replace(/\blmm_(?:at|rt)_[A-Za-z0-9_-]+/g,'[redacted fixture token]')
  .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9+/_=.-]+/gi,'$1 [redacted]')
  .replace(/([?&](?:code|state|code_challenge|code_verifier)=)[^&\s"']+/g,'$1[redacted]');
async function command(name,program,args,options={}){
  const run=spawnSync(program,args,{...options,encoding:'utf8',stdio:['ignore','pipe','pipe']});
  await retain(name+'.stdout.log',redact(run.stdout??''));
  await retain(name+'.stderr.log',redact(run.stderr??''));
  result.checks.push({name,program,args,exitCode:run.status,signal:run.signal,error:run.error?redact(run.error.message):undefined});
  assert.equal(run.status,0,`${name} failed: ${redact(run.error?.message??run.stderr??'')}`);
  return run.stdout;
}

async function stopHost() {
  if(!host)return;
  if(host.pid&&host.exitCode===null&&host.signalCode===null){
    host.kill('SIGTERM');
    await Promise.race([new Promise(resolve=>host.once('exit',resolve)),pause(3000)]);
    if(host.exitCode===null&&host.signalCode===null){host.kill('SIGKILL');await new Promise(resolve=>host.once('exit',resolve));}
  }
  await retain(`host-${launchCount}.redacted.log`,redact(logs));
  host=undefined;
}
async function api(path,body,method=body===undefined?'GET':'POST') {
  const headers={authorization:'Basic '+Buffer.from('opencode:'+serverPassword).toString('base64')};
  if(body!==undefined)headers['content-type']='application/json';
  const response=await fetch(endpoint+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
  assert.ok(response.ok,`${method} ${path}: HTTP ${response.status}: ${redact((await response.clone().text()).slice(0,800))}`);
  if(response.status===204)return;
  assert.match(response.headers.get('content-type')??'',/application\/json/);
  return response.json();
}
async function launch() {
  logs='';serverPassword='';hostError=undefined;launchCount++;
  const environment={PATH:process.env.PATH,HOME:directory,XDG_CONFIG_HOME:join(directory,'config'),XDG_DATA_HOME:join(directory,'data'),XDG_STATE_HOME:join(directory,'state'),XDG_CACHE_HOME:join(directory,'cache'),TMPDIR:directory,BROWSER:'true',NODE_EXTRA_CA_CERTS:join(directory,'cert.pem'),SSL_CERT_FILE:join(directory,'cert.pem'),OPENCODE_SERVER_PASSWORD:'lmm-fixture-'+randomBytes(24).toString('hex')};
  serverPassword=environment.OPENCODE_SERVER_PASSWORD;
  host=spawn(binary,['serve','--print-logs','--hostname','127.0.0.1','--port',new URL(endpoint).port],{cwd:directory,env:environment});
  const append=chunk=>{logs+=chunk;const found=logs.match(/server password\s+(\S+)/);if(found)serverPassword=found[1];};
  host.stdout.on('data',append);host.stderr.on('data',append);
  host.once('error',error=>{hostError=error;logs+='spawn: '+error.message;});
  const started=Date.now();
  while(true){
    if(hostError)throw hostError;
    if(host.exitCode!==null)throw Error('OpenCode V2 host exited: '+redact(logs.slice(-2500)));
    try {const info=await api('/api/info');if(info)return;}catch{}
    if(Date.now()-started>45000)throw Error('OpenCode V2 API startup timed out: '+redact(logs.slice(-2500)));
    await pause(100);
  }
}
async function listModels() {
  const result=await api('/api/model');
  assert.ok(Array.isArray(result.data));
  return result.data.filter(model=>model.providerID==='lmm');
}
async function waitModels(count) {
  const started=Date.now();
  while(true){const result=await listModels();if(result.length===count)return result;if(Date.now()-started>15000)throw Error(`Expected ${count} admitted LMM models, found ${result.length}`);await pause(100);}
}
async function signIn() {
  const integrations=await api('/api/integration');
  const integration=integrations.data.find(item=>item.id==='lmm');
  assert.ok(integration,'LMM must be registered through the actual V2 plugin loader');
  const method=integration.methods.find(item=>item.type==='oauth');
  assert.ok(method,'Only the real registered OAuth method may be used');
  const started=await api('/api/integration/lmm/connect/oauth',{methodID:method.id});
  const attempt=started.data;authorization=new URL(attempt.url);
  assert.equal(authorization.searchParams.get('client_id'),'lmm-opencode');
  assert.equal(authorization.searchParams.get('code_challenge_method'),'S256');
  const callback=new URL(authorization.searchParams.get('redirect_uri'));
  callback.search=new URLSearchParams({code:'fixture-code',state:authorization.searchParams.get('state'),iss:issuer}).toString();
  assert.equal((await fetch(callback)).status,200);
  const began=Date.now();
  while(true){
    const result=await api(`/api/integration/lmm/connect/oauth/${attempt.attemptID}`);
    if(result.data.status==='complete')return;
    assert.equal(result.data.status,'pending',JSON.stringify(result.data));
    if(Date.now()-began>10000)throw Error('Native OAuth persistence did not complete');
    await pause(50);
  }
}
async function prompt(i) {
  const model={providerID:'lmm',id:wire(i)};
  const created=await api('/api/session',{title:'LMM isolated V2 protocol fixture',model});
  const session=created.data;
  await api(`/api/session/${session.id}/prompt`,{text:'Reply Fixture OK only.'});
  await api(`/api/experimental/session/${session.id}/wait`,{});
  const messages=await api(`/api/session/${session.id}/message?type=assistant&limit=100`);
  assert.ok(messages.data.length>0,'the real session must record an assistant response');
  for(const message of messages.data)assert.equal(message.error,undefined,JSON.stringify(message.error));
  assert.ok(messages.data.some(message=>message.content.some(part=>part.type==='text'&&part.text.includes('Fixture OK'))),'streamed content must reach the native session transcript');
  assert.ok(observed.some(row=>row.protocol===i),'the actual catalog-specific native SDK must dispatch inference');
}

try {
  result.binaryVersion=(await command('native-version',binary,['--version'])).trim();
  assert.match(result.binaryVersion,/^(?:opencode v)?2\.1\.4$/,'this harness verifies the pinned official 2.1.4 contract');
  if(binary.startsWith('/'))result.binarySha256=createHash('sha256').update(await readFile(binary)).digest('hex');
  await command('fixture-certificate','openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',join(directory,'key.pem'),'-out',join(directory,'cert.pem'),'-days','1','-subj','/CN=localhost','-addext','subjectAltName=IP:127.0.0.1']);
  fixture=createServer({key:await readFile(join(directory,'key.pem')),cert:await readFile(join(directory,'cert.pem'))},async(req,res)=>{
    try {
      const chunks=[];for await(const chunk of req)chunks.push(chunk);const raw=Buffer.concat(chunks).toString();
      const json=value=>{res.setHeader('content-type','application/json');res.end(JSON.stringify(value));};
      if(req.url==='/.well-known/oauth-authorization-server')return json({issuer,authorization_endpoint:issuer+'/api/oauth2/authorize',token_endpoint:issuer+'/api/oauth2/token',revocation_endpoint:issuer+'/api/oauth2/revoke',authorization_response_iss_parameter_supported:true,code_challenge_methods_supported:['S256'],response_types_supported:['code']});
      if(req.url==='/.well-known/oauth-protected-resource/api/oauth2')return json({resource:issuer+'/api/oauth2',authorization_servers:[issuer]});
      if(req.url==='/api/oauth2/token'){
        const form=new URLSearchParams(raw);assert.equal(form.get('client_id'),'lmm-opencode');assert.equal(form.get('resource'),issuer+'/api/oauth2');
        if(form.get('grant_type')==='refresh_token'){
          assert.equal(form.get('refresh_token'),'lmm_rt_fixture');refreshCalls++;currentAccess='lmm_at_rotated';return json({token_type:'Bearer',access_token:currentAccess,refresh_token:'lmm_rt_rotated',expires_in:3600,scope});
        }
        assert.equal(form.get('grant_type'),'authorization_code');assert.equal(form.get('code'),'fixture-code');
        assert.equal(createHash('sha256').update(form.get('code_verifier')).digest('base64url'),authorization.searchParams.get('code_challenge'));
        logins++;revoked=false;currentAccess=logins===1?'lmm_at_fixture':'lmm_at_reconnected';
        return json({token_type:'Bearer',access_token:currentAccess,refresh_token:logins===1?'lmm_rt_fixture':'lmm_rt_reconnected',expires_in:logins===1?1:3600,scope});
      }
      assert.equal(req.headers.authorization,'Bearer '+currentAccess);
      if(revoked){res.statusCode=401;return json({error:'invalid_token'});}
      if(req.url==='/api/oauth2/catalog')return json({schema_version:1,resource:issuer+'/api/oauth2',models:apis.map((api,i)=>({id:wire(i),upstream_model:models[i],group_id:group,group:'default',name:'Fixture '+i,apis:[api],pricing:{unit:'million_tokens',currency:'USD',price_basis:'configured_base_rates'},native_cost:{input:1,output:2,cacheRead:0,cacheWrite:0}}))});
      const i=paths.indexOf(req.url);assert.ok(i>=0,'only an approved inference endpoint may receive a credential');
      const body=JSON.parse(raw);assert.equal(body.model,models[i]);assert.equal(req.headers['x-lmm-group'],group);assert.equal(req.headers['x-api-key'],undefined);observed.push({protocol:i,access:req.headers.authorization});
      res.setHeader('content-type','text/event-stream');const send=(event,data)=>res.write((event?'event: '+event+'\n':'')+'data: '+JSON.stringify(data)+'\n\n');
      if(i===0){send('',{id:'chat-fixture',object:'chat.completion.chunk',created:1,model:body.model,choices:[{index:0,delta:{role:'assistant',content:'Fixture OK'},finish_reason:null}]});send('',{id:'chat-fixture',object:'chat.completion.chunk',created:1,model:body.model,choices:[{index:0,delta:{},finish_reason:'stop'}],usage:{prompt_tokens:1,completion_tokens:2,total_tokens:3}});res.write('data: [DONE]\n\n');}
      if(i===1){const output={id:'msg_fixture',type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:'Fixture OK',annotations:[]}]};const response={id:'resp_fixture',object:'response',created_at:1,model:body.model,status:'completed',output:[output],usage:{input_tokens:1,output_tokens:2,total_tokens:3}};send('response.created',{type:'response.created',response:{...response,status:'in_progress',output:[]}});send('response.output_item.added',{type:'response.output_item.added',output_index:0,item:{...output,status:'in_progress',content:[]}});send('response.content_part.added',{type:'response.content_part.added',item_id:output.id,output_index:0,content_index:0,part:{type:'output_text',text:'',annotations:[]}});send('response.output_text.delta',{type:'response.output_text.delta',item_id:output.id,output_index:0,content_index:0,delta:'Fixture OK'});send('response.output_item.done',{type:'response.output_item.done',output_index:0,item:output});send('response.completed',{type:'response.completed',response});}
      if(i===2){send('message_start',{type:'message_start',message:{id:'msg_fixture',type:'message',role:'assistant',model:body.model,content:[],stop_reason:null,stop_sequence:null,usage:{input_tokens:1,output_tokens:0}}});send('content_block_start',{type:'content_block_start',index:0,content_block:{type:'text',text:''}});send('content_block_delta',{type:'content_block_delta',index:0,delta:{type:'text_delta',text:'Fixture OK'}});send('content_block_stop',{type:'content_block_stop',index:0});send('message_delta',{type:'message_delta',delta:{stop_reason:'end_turn',stop_sequence:null},usage:{output_tokens:2}});send('message_stop',{type:'message_stop'});}
      res.end();
    }catch(error){res.statusCode=500;res.end('synthetic fixture assertion failed');logs+='fixture assertion: '+error.message+'\n';}
  });
  await new Promise(resolve=>fixture.listen(0,'127.0.0.1',resolve));issuer='https://127.0.0.1:'+fixture.address().port;
  const portServer=netServer();await new Promise(resolve=>portServer.listen(0,'127.0.0.1',resolve));endpoint='http://127.0.0.1:'+portServer.address().port;await new Promise(resolve=>portServer.close(resolve));
  stage='real published-layout package';
  const archiveDir=join(directory,'archive');await mkdir(archiveDir);
  const packed=JSON.parse(await command('npm-pack','npm',['pack','--ignore-scripts','--json','--pack-destination',archiveDir],{cwd:resolve('.')}));
  const packedInfo=Array.isArray(packed)?packed[0]:Object.values(packed)[0];
  const archive=join(archiveDir,packedInfo.filename);
  const archiveSha256=createHash('sha256').update(await readFile(archive)).digest('hex');
  result.archive={filename:packedInfo.filename,sha256:archiveSha256};
  if(evidence){
    const retained=join(evidence,packedInfo.filename);
    await copyFile(archive,retained);await chmod(retained,0o600);
    assert.equal(createHash('sha256').update(await readFile(retained)).digest('hex'),archiveSha256);
    await retain('archive.sha256',`${archiveSha256}  ${packedInfo.filename}\n`);
    await retain('package-metadata.json',JSON.stringify(packedInfo,null,2)+'\n');
  }
  const install=join(directory,'installed');await mkdir(install);
  const installEnv={PATH:process.env.PATH,HOME:directory,TMPDIR:directory};
  await command('npm-install','npm',['install','--omit=dev','--ignore-scripts','--no-audit','--no-fund','--prefix',install,archive],{cwd:directory,env:installEnv});
  const installedGraph=JSON.parse(await command('npm-ls','npm',['ls','--all','--json','--prefix',install],{cwd:directory,env:installEnv}));
  const installedPlugin=installedGraph.dependencies?.['@tokennotincluded/opencode-lmm-auth'];
  assert.ok(installedPlugin,'the actual packed plugin must be installed');
  assert.ok(!installedPlugin.dependencies?.['@opencode-ai/plugin']?.version,'optional legacy SDK must not be installed for V2');
  const audit=JSON.parse(await command('npm-audit-installed','npm',['audit','--omit=dev','--json','--prefix',install],{cwd:directory,env:installEnv}));
  result.installedAudit=audit.metadata?.vulnerabilities;
  pluginDirectory=join(install,'node_modules','@tokennotincluded','opencode-lmm-auth');
  const manifest=JSON.parse(await readFile(join(pluginDirectory,'package.json'),'utf8'));
  assert.equal(manifest.exports['./server'],'./dist/opencode-v2.js');
  assert.equal(manifest.exports['.'],'./dist/index.js');
  assert.ok((await readFile(join(pluginDirectory,'dist','opencode-v2.js'),'utf8')).includes('setup'));
  assert.doesNotMatch(await readFile(join(pluginDirectory,'dist','opencode-v2.js'),'utf8'),/from\s+["'](?:@opencode\/plugin|@opencode\/schema|effect)/,'V2 must not rely on unshipped development imports');
  await mkdir(join(directory,'config','opencode'),{recursive:true});
  await writeFile(join(directory,'config','opencode','opencode.json'),JSON.stringify({plugins:[{package:pluginDirectory,options:{issuer}}]}));
  await launch();stage='V2 plugin registration';
  assert.equal((await listModels()).length,0,'unconnected LMM must not advertise models');
  stage='native OAuth PKCE and catalog';await signIn();await waitModels(3);
  stage='native refresh persistence';assert.equal(refreshCalls,1,'a near-expiry native credential must rotate exactly once');await stopHost();await launch();await waitModels(3);assert.equal(refreshCalls,1,'restart must reuse persisted rotated credential');
  for(let i=0;i<3;i++){stage=apis[i];await prompt(i);console.log('OpenCode V2 native '+apis[i]+' OAuth transport passed');}
  stage='revocation rejection';revoked=true;await stopHost();await launch();await waitModels(0);
  const calls=observed.length;
  await assert.rejects(prompt(0));assert.equal(observed.length,calls,'revoked account must not reach inference');
  stage='native reconnect';await signIn();await waitModels(3);await prompt(0);assert.equal(logins,2);
  result.success=true;
  result.behavior={oauthLogins:logins,refreshCalls,protocols:apis.filter((_,i)=>observed.some(row=>row.protocol===i)),nativeSessionInferenceCalls:observed.length,revocationRejected:true,reconnected:true};
  console.log('OpenCode V2 OAuth registration, PKCE, refresh/restart, three native SDKs, revocation and reconnect passed. Only local synthetic requests were executed.');
}catch(error){
  result.error=redact(error.message);
  throw new Error('OpenCode V2 fixture failed at '+stage+': '+redact(error.message)+'; host: '+redact(logs.slice(-6000)));
}
finally{
  try{
    try{
      await stopHost();
    }finally{
      if(fixture){fixture.closeAllConnections();await new Promise(resolve=>fixture.close(resolve));}
    }
  }catch(error){
    result.success=false;result.cleanupError=redact(error.message);throw error;
  }finally{
    try{
      result.stage=stage;result.finishedAt=new Date().toISOString();
      await retain('result.json',JSON.stringify(result,null,2)+'\n');
      if(evidence)console.log('Retained V2 evidence: '+evidence);
    }finally{await rm(directory,{recursive:true,force:true});}
  }
}
