import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const script=new URL('./c4-durable-probe.mjs',import.meta.url).pathname;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function processResult(args, timeout=4500){
  const p=spawn(process.execPath,[script,...args],{stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='';p.stdout.on('data',b=>stdout+=b);p.stderr.on('data',b=>stderr+=b);
  const done=Promise.race([once(p,'exit').then(([code,signal])=>({code,signal,stdout,stderr})),sleep(timeout).then(()=>{p.kill('SIGKILL');throw new Error('worker timed out')})]);
  return done;
}
async function start(dir){
  const p=spawn(process.execPath,[script,'device',dir],{stdio:['ignore','pipe','pipe']});
  const [buf]=await Promise.race([once(p.stdout,'data'),sleep(2500).then(()=>{throw new Error('service readiness timed out')})]);
  const port=JSON.parse(buf.toString().split('\n')[0]).port;
  return {p,url:`http://127.0.0.1:${port}`};
}
async function state(url){return (await (await fetch(url+'/state')).json());}
async function waitEffect(url){for(let i=0;i<80;i++){if((await state(url)).effectCount===1)return;await sleep(20);}throw new Error('effect never appeared');}
async function fixture(fn){const dir=await mkdtemp(join(tmpdir(),'aeci-c4-'));let service;try{service=await start(dir);await fn(dir,service);}finally{if(service && service.p.exitCode===null && service.p.signalCode===null){service.p.kill();await once(service.p,'exit').catch(()=>{});}await rm(dir,{force:true,recursive:true});}}
for(const [stage,expected,phase] of [
 ['before_dispatch','NOT_DISPATCHED','INTENT'],
 ['after_ack_before_receipt','CONFIRMED_FAKE_EFFECT','DISPATCH_STARTED'],
 ['after_receipt_before_client_ack','CONFIRMED_FAKE_EFFECT','RECEIPT_DURABLE']
]) test(`separate process recovery ${stage}`,()=>fixture(async(dir,{p,url})=>{
  const run=await processResult(['worker',dir,url,stage]);assert.notEqual(run.code,0);
  const before=await state(url);
  assert.equal(before.effectCount,stage==='before_dispatch'?0:1);
  const restart=await processResult(['worker',dir,url,'recover']);assert.equal(restart.code,0);
  const result=JSON.parse(restart.stdout);assert.equal(result.disposition,expected);assert.equal(result.phase,phase);
  assert.equal((await state(url)).effectCount,before.effectCount);
}));
test('effect persisted but HTTP ACK never sent: kill worker and recover without replay',()=>fixture(async(dir,{p,url})=>{
  const worker=spawn(process.execPath,[script,'worker',dir,url,'effect_before_ack'],{stdio:'ignore'});
  try{await waitEffect(url);worker.kill('SIGKILL');await once(worker,'exit');
   const recovery=await processResult(['worker',dir,url,'recover']);assert.equal(recovery.code,0);
   assert.equal(JSON.parse(recovery.stdout).disposition,'CONFIRMED_FAKE_EFFECT');
   assert.equal((await state(url)).effectCount,1);
  }finally{worker.kill('SIGKILL');}
}));
test('external device ledger survives device-process restart; duplicate operation does not double-pulse',()=>fixture(async(dir,service)=>{
  assert.equal((await processResult(['worker',dir,service.url,'after_ack_before_receipt'])).code,79);
  service.p.kill();await once(service.p,'exit');
  const revived=await start(dir);
  service.p=revived.p;service.url=revived.url;
  const rec=await processResult(['worker',dir,revived.url,'recover']);assert.equal(JSON.parse(rec.stdout).disposition,'CONFIRMED_FAKE_EFFECT');
  const command=JSON.parse(await readFile(join(dir,'gateway.json'),'utf8')).command;
  const duplicate=await fetch(revived.url+'/pulse',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(command)});
  assert.equal(duplicate.status,200);assert.equal((await state(revived.url)).effectCount,1);
}));
test('forged durable gateway receipt without independent effect is UNKNOWN, not success',()=>fixture(async(dir,{url})=>{
  const command={id:'c4-nonidempotent-001',scope:'tenant-demo/virtual-relay',operation:'pulse_once',value:1};
  await writeFile(join(dir,'gateway.json'),JSON.stringify({phase:'RECEIPT_DURABLE',command,receipt:{effectSequence:1}}));
  const r=await processResult(['worker',dir,url,'recover']);const result=JSON.parse(r.stdout);
  assert.equal(result.disposition,'UNKNOWN');assert.equal(result.mayRedispatch,false);assert.equal((await state(url)).effectCount,0);
}));
test('no external observer available leaves an already-dispatched operation UNKNOWN',()=>fixture(async(dir,service)=>{
  assert.equal((await processResult(['worker',dir,service.url,'after_ack_before_receipt'])).code,79);
  service.p.kill();await once(service.p,'exit');
  const r=await processResult(['worker',dir,service.url,'recover']);
  const result=JSON.parse(r.stdout);assert.equal(result.disposition,'UNKNOWN');assert.equal(result.mayRedispatch,false);
}));
test('tampered external effect digest must not verify completion',()=>fixture(async(dir,service)=>{
  assert.equal((await processResult(['worker',dir,service.url,'after_ack_before_receipt'])).code,79);
  service.p.kill();await once(service.p,'exit');
  const file=join(dir,'device.json'), ledger=JSON.parse(await readFile(file,'utf8'));
  ledger.records['c4-nonidempotent-001'].digest='attacker-forged';
  await writeFile(file,JSON.stringify(ledger));
  const fresh=await start(dir);service.p=fresh.p;service.url=fresh.url;
  const r=await processResult(['worker',dir,fresh.url,'recover']);
  const result=JSON.parse(r.stdout);assert.equal(result.disposition,'UNKNOWN');assert.equal(result.mayRedispatch,false);
}));
test('changed command under the same key is rejected by external device ledger',()=>fixture(async(dir,service)=>{
  assert.equal((await processResult(['worker',dir,service.url,'after_ack_before_receipt'])).code,79);
  const original=JSON.parse(await readFile(join(dir,'gateway.json'),'utf8')).command;
  const r=await fetch(service.url+'/pulse',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...original,note:'changed'})});
  assert.equal(r.status,409);assert.equal((await r.json()).code,'ID_CONFLICT');
  assert.equal((await state(service.url)).effectCount,1);
}));
