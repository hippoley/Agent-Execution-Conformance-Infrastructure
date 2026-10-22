import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAdmin } from '../admin/server.mjs';
async function fixture(fn) {
 const dir=await mkdtemp(join(tmpdir(),'agentpanel-m0-'));
 const app=await createAdmin({dataFile:join(dir,'db.json')});
 await new Promise(ok=>app.server.listen(0,'127.0.0.1',ok));
 const origin=`http://127.0.0.1:${app.server.address().port}`;
 async function request(path,body) {
  const res=await fetch(origin+path,{method:body?'POST':'GET',headers:body?{'content-type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
  return [res.status,await res.json()];
 }
 try{await fn({request,app})}finally{await app.close();await rm(dir,{recursive:true,force:true})}
}
test('device and agent configuration are created without a real agent',()=>fixture(async({request})=>{
 const [s,d]=await request('/api/devices',{name:'lamp',tenant:'lab'});
 assert.equal(s,201);assert.equal(d.runtime,'EPHEMERAL_FAKE');
 const [sa,a]=await request('/api/agents',{name:'operator',tenant:'lab',devices:[d.id]});
 assert.equal(sa,201);assert.equal(a.runtime,'CONFIG_ONLY_NO_AGENTSCOPE');
 assert.equal((await request('/api/overview'))[1].agents.length,1);
}));
test('cross tenant bindings fail closed',()=>fixture(async({request})=>{
 const d=(await request('/api/devices',{name:'lamp',tenant:'A'}))[1];
 assert.equal((await request('/api/agents',{name:'operator',tenant:'B',devices:[d.id]}))[0],403);
}));
test('simulated execution returns a fake receipt and recorded run',()=>fixture(async({request})=>{
 const d=(await request('/api/devices',{name:'lamp',tenant:'lab'}))[1];
 const a=(await request('/api/agents',{name:'operator',tenant:'lab',devices:[d.id]}))[1];
 const [code,run]=await request(`/api/agents/${a.id}/run`,{deviceId:d.id,on:true});
 assert.equal(code,200);assert.equal(run.status,'CONFIRMED_IN_FAKE_SERVICE');
 assert.equal((await request(`/api/devices/${d.id}/state`))[1].lampOn,true);
 assert.equal((await request('/api/overview'))[1].runs.length,1);
}));
test('invalid arguments do not dispatch a command',()=>fixture(async({request})=>{
 const d=(await request('/api/devices',{name:'lamp',tenant:'lab'}))[1];
 const a=(await request('/api/agents',{name:'operator',tenant:'lab',devices:[d.id]}))[1];
 assert.equal((await request(`/api/agents/${a.id}/run`,{deviceId:d.id,on:1}))[0],400);
 assert.equal((await request(`/api/devices/${d.id}/state`))[1].version,0);
}));
