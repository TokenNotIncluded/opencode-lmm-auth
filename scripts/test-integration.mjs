import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {mkdtemp,mkdir,writeFile,readFile,rm,chmod,cp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from 'node:https';
import {createServer as netServer} from 'node:net';
import {createHash,randomBytes} from 'node:crypto';

// Only local HTTPS fixtures and synthetic credentials. Run against an installed
// pack with LMM_PLUGIN_ENTRY; no production login or inference is performed.
const dir=await mkdtemp(join(tmpdir(),'lmm-host-integration-'));
await chmod(dir,0o700);
const binary=process.env.OPENCODE_BIN??'opencode';
const entry=resolve(process.env.LMM_PLUGIN_ENTRY??'dist/index.js');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
let host,fixture,cli,authorization,issuer,stage='startup',logs='';
let currentAccess='lmm_at_fixture',refreshCalls=0,inferenceCalls=0,fixtureErrors=0,logins=0,revoked=false;
const group='ZGVmYXVsdA',scope='catalog:read balance:read usage:read models:invoke group:'+group;
const apis=['openai-completions','openai-responses','anthropic-messages'];
const id=i=>'lmm:'+group+':'+Buffer.from('fixture-'+i).toString('base64url');
const password=randomBytes(24).toString('hex');
const headers={authorization:'Basic '+Buffer.from('opencode:'+password).toString('base64'),'content-type':'application/json'};
const env={...process.env,HOME:dir,TMPDIR:dir,NODE_EXTRA_CA_CERTS:join(dir,'cert.pem'),SSL_CERT_FILE:join(dir,'cert.pem'),XDG_CONFIG_HOME:join(dir,'config'),XDG_DATA_HOME:join(dir,'data'),XDG_STATE_HOME:join(dir,'state'),XDG_CACHE_HOME:join(dir,'cache'),OPENCODE_DISABLE_DEFAULT_PLUGINS:'true',OPENCODE_DISABLE_MODELS_FETCH:'true',OPENCODE_SERVER_PASSWORD:password};
delete env.OPENCODE_AUTH_CONTENT;
const stop=async child=>{
  if(!child||child.exitCode!==null||child.signalCode!==null)return;
  const exited=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');
  await Promise.race([exited,pause(2000)]);
  if(child.exitCode===null&&child.signalCode===null){child.kill('SIGKILL');await exited;}
};
try {
  execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',join(dir,'key.pem'),'-out',join(dir,'cert.pem'),'-days','1','-subj','/CN=localhost','-addext','subjectAltName=IP:127.0.0.1'],{stdio:'ignore'});
  fixture=createServer({key:await readFile(join(dir,'key.pem')),cert:await readFile(join(dir,'cert.pem'))},async(req,res)=>{try {
    const chunks=[];for await(const chunk of req)chunks.push(chunk);
    const json=value=>{res.setHeader('content-type','application/json');res.end(JSON.stringify(value));};
    if(req.url==='/.well-known/oauth-authorization-server')return json({issuer,authorization_endpoint:issuer+'/api/oauth2/authorize',token_endpoint:issuer+'/api/oauth2/token',revocation_endpoint:issuer+'/api/oauth2/revoke',authorization_response_iss_parameter_supported:true,code_challenge_methods_supported:['S256'],response_types_supported:['code']});
    if(req.url==='/.well-known/oauth-protected-resource/api/oauth2')return json({resource:issuer+'/api/oauth2',authorization_servers:[issuer]});
    if(req.url==='/api/oauth2/token'){
      const form=new URLSearchParams(Buffer.concat(chunks).toString());
      if(form.get('grant_type')==='refresh_token'){refreshCalls++;res.statusCode=400;return json({error:'unsafe_refresh_received'});}
      assert.equal(form.get('client_id'),'lmm-opencode');assert.equal(form.get('resource'),issuer+'/api/oauth2');
      assert.equal(form.get('grant_type'),'authorization_code');assert.equal(form.get('code'),'fixture-code');
      assert.equal(createHash('sha256').update(form.get('code_verifier')).digest('base64url'),authorization.searchParams.get('code_challenge'));
      logins++;revoked=false;currentAccess=logins===1?'lmm_at_fixture':'lmm_at_reconnected';
      return json({token_type:'Bearer',access_token:currentAccess,refresh_token:logins===1?'lmm_rt_fixture':'lmm_rt_reconnected',expires_in:3600,scope});
    }
    if(req.url?.startsWith('/v1/')){inferenceCalls++;res.statusCode=500;return json({error:{message:'Synthetic upstream failure after receipt',type:'server_error'}});}
    assert.equal(req.headers.authorization,'Bearer '+currentAccess);
    if(revoked){res.statusCode=401;return json({error:'invalid_token'});}
    assert.equal(req.url,'/api/oauth2/catalog');
    return json({schema_version:1,resource:issuer+'/api/oauth2',models:apis.map((api,i)=>({id:id(i),upstream_model:'fixture-'+i,group_id:group,group:'default',name:'Fixture '+i,apis:[api],pricing:{unit:'million_tokens',currency:'USD',price_basis:'configured_base_rates'},native_cost:{input:1,output:2,cacheRead:0,cacheWrite:0}}))});
  }catch(error){fixtureErrors++;res.statusCode=500;res.end('fixture assertion: '+error.message);}});
  await new Promise(r=>fixture.listen(0,'127.0.0.1',r));issuer='https://127.0.0.1:'+fixture.address().port;
  const portServer=netServer();await new Promise(r=>portServer.listen(0,'127.0.0.1',r));const port=portServer.address().port;await new Promise(r=>portServer.close(r));
  const endpoint='http://127.0.0.1:'+port;
  await mkdir(join(dir,'config','opencode'),{recursive:true,mode:0o700});
  await writeFile(join(dir,'config','opencode','opencode.json'),JSON.stringify({plugin:[[pathToFileURL(entry).href,{issuer}]],provider:{lmm:{name:'LMM',npm:'@ai-sdk/openai-compatible',models:Object.fromEntries(apis.map((api,i)=>['fixture-'+i,{limit:{context:8000,output:2000},tool_call:true,reasoning:false,attachment:false,temperature:true,options:{lmmApi:api}}]))}}}),{mode:0o600});
  // The pinned host waits for its config-directory SDK installation before
  // loading external plugins. Install the real pinned dependency up front so
  // the bounded API checks do not also time registry bootstrap.
  stage='host SDK dependency installation';
  if(process.env.LMM_HOST_DEPENDENCIES){
    const dependencies=resolve(process.env.LMM_HOST_DEPENDENCIES);
    assert.equal(JSON.parse(await readFile(join(dependencies,'node_modules','@opencode-ai','plugin','package.json'),'utf8')).version,'1.18.34');
    for(const name of ['node_modules','package.json','package-lock.json'])await cp(join(dependencies,name),join(dir,'config','opencode',name),{recursive:true,dereference:true});
  } else {
    execFileSync('npm',['install','--prefix',join(dir,'config','opencode'),'--ignore-scripts','--no-audit','--no-fund','@opencode-ai/plugin@1.18.34'],{env,stdio:'pipe',timeout:90000});
  }
  const launch=async()=>{
    host=spawn(binary,['serve','--print-logs','--hostname','127.0.0.1','--port',String(port)],{cwd:dir,env,stdio:['ignore','pipe','pipe']});
    host.stdout.on('data',b=>logs+=b);host.stderr.on('data',b=>logs+=b);
    const deadline=Date.now()+45000;
    while(true){
      if(host.exitCode!==null||host.signalCode!==null)throw Error('Host exited');
      try{if((await fetch(endpoint+'/global/health',{headers,signal:AbortSignal.timeout(1000)})).ok)break;}catch{}
      if(Date.now()>deadline)throw Error('Host startup timeout');await pause(100);
    }
  };
  const api=async(path,body)=>{
    const r=await fetch(endpoint+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
    assert.equal(r.status,200,path+' '+(r.status===200?'':await r.text()));return r.json();
  };
  const callback=async()=>{
    const url=new URL(authorization.searchParams.get('redirect_uri'));
    url.search=new URLSearchParams({code:'fixture-code',state:authorization.searchParams.get('state'),iss:issuer}).toString();
    assert.equal((await fetch(url)).status,200);
  };
  await launch();
  stage='OAuth PKCE callback';
  authorization=new URL((await api('/provider/lmm/oauth/authorize',{method:0})).url);
  await callback();assert.equal(await api('/provider/lmm/oauth/callback',{method:0}),true);
  await stop(host);await launch();
  const nativePath=join(dir,'data','opencode','auth.json');
  const initial=await readFile(nativePath,'utf8');assert.equal(JSON.parse(initial).lmm.type,'oauth');
  stage='authenticated catalog and honest inference refusal';
  const catalog=await api('/provider');assert.equal(Object.keys(catalog.all.find(p=>p.id==='lmm').models).length,3);
  for(let i=0;i<3;i++){
    const session=await api('/session',{});
    const result=await api('/session/'+session.id+'/message',{model:{providerID:'lmm',modelID:id(i)},parts:[{type:'text',text:'Synthetic refusal boundary'}]});
    assert.ok(result.info.error,'refusal must return an actual assistant error');
    const error=JSON.stringify(result.info.error);
    assert.match(error,/LMM blocks inference.*automatic paid request retries/);
    assert.doesNotMatch(error,/AbortError/);
    assert.ok(!result.parts.some(p=>p.type==='text'&&p.text.trim()),'refusal must not fabricate successful text');
    assert.equal(inferenceCalls,0);
  }
  assert.equal(await readFile(nativePath,'utf8'),initial);
  console.log('PASS: actual host returns explicit errors for all three protocols; zero inference receipts and unchanged credential slot');
  stage='expired credential refusal';
  await stop(host);
  const expired=JSON.parse(initial);expired.lmm.expires=Date.now()-1000;
  const expiredBytes=JSON.stringify(expired);await writeFile(nativePath,expiredBytes,{mode:0o600});
  await launch();
  const unavailable=await api('/provider');assert.ok(!unavailable.all.some(p=>p.id==='lmm'&&Object.keys(p.models).length));
  assert.equal(refreshCalls,0);assert.equal(await readFile(nativePath,'utf8'),expiredBytes);
  assert.equal((await api('/provider/auth')).lmm[0].type,'oauth');
  console.log('PASS: expired native credentials remain unchanged; zero refresh exchanges; login remains available');
  stage='revoked credentials and real CLI reconnect';
  await stop(host);await writeFile(nativePath,initial,{mode:0o600});revoked=true;await launch();
  const denied=await api('/provider');assert.ok(!denied.all.some(p=>p.id==='lmm'&&Object.keys(p.models).length));
  assert.equal((await api('/provider/auth')).lmm[0].type,'oauth');
  let cliOutput='';
  cli=spawn(binary,['auth','login','--provider','lmm','--method','Sign in with LMM (OAuth)'],{cwd:dir,env,stdio:['ignore','pipe','pipe']});
  cli.stdout.on('data',b=>cliOutput+=b);cli.stderr.on('data',b=>cliOutput+=b);
  const deadline=Date.now()+90000;
  while(true){
    const match=cliOutput.replace(/\x1b\[[0-9;]*m/g,'').match(/https:\/\/127\.0\.0\.1:\d+\/api\/oauth2\/authorize\?[^\s]+/);
    if(match){authorization=new URL(match[0]);break;}
    if(cli.exitCode!==null||cli.signalCode!==null)throw Error('CLI login exited before authorization');
    if(Date.now()>deadline)throw Error('CLI login timeout');await pause(100);
  }
  await callback();
  if(cli.exitCode===null)await Promise.race([new Promise(r=>cli.once('exit',r)),new Promise((_,reject)=>setTimeout(()=>reject(Error('CLI login did not finish')),15000).unref())]);
  assert.equal(cli.exitCode,0);
  await stop(host);await launch();
  const recovered=await api('/provider');assert.equal(Object.keys(recovered.all.find(p=>p.id==='lmm').models).length,3);
  assert.equal(JSON.parse(await readFile(nativePath,'utf8')).lmm.access,'lmm_at_reconnected');
  assert.equal(logins,2);assert.equal(refreshCalls,0);assert.equal(inferenceCalls,0);assert.equal(fixtureErrors,0);
  console.log('PASS: actual native CLI PKCE reconnect restores catalog; unsupported legacy inference remains blocked');
  console.log(JSON.stringify({entry,binary,logins,refreshCalls,inferenceCalls,fixtureErrors,legacyInference:'refused',independentAcceptance:false}));
} catch(error){throw Error(stage+': '+error.message);} finally {
  await stop(cli);await stop(host);
  if(fixture){fixture.closeAllConnections();await new Promise(r=>fixture.close(r));}
  if(process.env.LMM_HOST_LOG)await writeFile(process.env.LMM_HOST_LOG,logs,{mode:0o600});
  await rm(dir,{recursive:true,force:true});
}
