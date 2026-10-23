import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAdmin} from '../admin/server.mjs';

test('real HTTP admin persists and executes a 2-device fake workflow',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'agentpanel-flow-'));
 const app=await createAdmin({dataFile:join(dir,'db.json')});
 await new Promise(ok=>app.server.listen(0,'127.0.0.1',ok));
 const origin='http://127.0.0.1:'+app.server.address().port;
 async function api(path,body){
  const res=await fetch(origin+path,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  return {code:res.status,value:await res.json()};
 }
 try {
  const d1=(await api('/api/devices',{name:'lampA',tenant:'lab'})).value;
  const d2=(await api('/api/devices',{name:'lampB',tenant:'lab'})).value;
  const a=(await api('/api/agents',{name:'operator',tenant:'lab',devices:[d1.id,d2.id]})).value;
  const definition={agentId:a.id,name:'meeting',nodes:[
   {id:'n1',type:'lamp.set_power',deviceId:d1.id,on:true},
   {id:'n2',type:'lamp.set_power',deviceId:d2.id,on:true},
  ]};
  const created=await api('/api/workflows',definition);assert.equal(created.code,201);
  const result=await api('/api/workflows/'+created.value.id+'/run',{});
  assert.equal(result.code,200);assert.equal(result.value.status,'SIMULATED_CONFIRMED');
  assert.equal(result.value.nodes.length,2);
  assert.equal((await api('/api/devices/'+d1.id+'/state')).value.lampOn,true);
  assert.equal((await api('/api/devices/'+d2.id+'/state')).value.lampOn,true);
  const overview=await api('/api/overview');
  assert.equal(overview.value.workflows.length,1);
  assert.ok(overview.value.runs.some(x=>x.id===result.value.id&&x.nodes.length===2));
  const deny=await api('/api/workflows',{...definition,name:'invalid',nodes:[{id:'n1',type:'lamp.set_power',deviceId:'unauthorized',on:true}]});
  assert.equal(deny.code,403);
 }finally {await app.close();await rm(dir,{recursive:true,force:true})}
});

test('restart labels unfinished dispatch as unknown; never silently replays',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'agentpanel-recovery-'));
 const dataFile=join(dir,'db.json');
 await writeFile(dataFile,JSON.stringify({agents:[],devices:[],workflows:[],runs:[{
   id:'test-run',status:'RUNNING',nodes:[{id:'step1',commandId:'original-command',status:'DISPATCH_INTENT_SAVED'}]
 }]}));
 const app=await createAdmin({dataFile});
 await new Promise(ok=>app.server.listen(0,'127.0.0.1',ok));
 try{
  const response=await fetch('http://127.0.0.1:'+app.server.address().port+'/api/overview');
  const data=await response.json();
  assert.equal(data.runs[0].status,'INTERRUPTED_UNKNOWN');
  assert.equal(data.runs[0].recovery,'REQUIRES_MANUAL_RECONCILIATION');
  assert.equal(data.runs[0].nodes[0].commandId,'original-command');
 }finally{await app.close();await rm(dir,{recursive:true,force:true})}
});
