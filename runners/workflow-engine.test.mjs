import test from 'node:test';
import assert from 'node:assert/strict';
import {validateWorkflow,executeWorkflow} from './workflow-engine.mjs';
const authorizedDevices=[{id:'lampA',tenant:'lab'},{id:'lampB',tenant:'lab'}];
const definition={name:'meeting',nodes:[{id:'step1',type:'lamp.set_power',deviceId:'lampA',on:true},{id:'step2',type:'lamp.set_power',deviceId:'lampB',on:false}]};
const dummy=()=>({commandForLamp:(on,id)=>({on,id}),execute:async()=>({status:'CONFIRMED_IN_FAKE_SERVICE'})});
test('run writes intent before effect and records verified synthetic steps',async()=>{
 const events=[];const acquire=async id=>({commandForLamp:(on,cmd)=>({on,cmd}),execute:async cmd=>{events.push(['effect',id,cmd.cmd]);return{status:'CONFIRMED_IN_FAKE_SERVICE'}}});
 const run=await executeWorkflow({definition,tenant:'lab',authorizedDevices,workflowId:'w1',acquire,saveRun:async r=>events.push(['save',JSON.parse(JSON.stringify(r))])});
 assert.equal(run.status,'SIMULATED_CONFIRMED');assert.equal(run.nodes.length,2);
 for(const effect of events.filter(e=>e[0]==='effect'))assert.ok(events.some(e=>e[0]==='save'&&e[1].nodes.some(n=>n.commandId===effect[2]&&n.status==='DISPATCH_INTENT_SAVED')));
});
test('reject cross tenant before side effect',async()=>{
 const bad={name:'meeting',nodes:[{...definition.nodes[0],deviceId:'other'}]};let count=0;
 assert.equal(validateWorkflow(bad,{tenant:'lab',authorizedDevices}),'DEVICE_NOT_AUTHORIZED');
 const r=await executeWorkflow({definition:bad,tenant:'lab',authorizedDevices,workflowId:'w1',acquire:()=>{count++},saveRun:()=>{count++}});
 assert.equal(r.status,'DENIED');assert.equal(count,0);
});
test('unknown stops following steps without blindly retrying',async()=>{
 let calls=0;const r=await executeWorkflow({definition,tenant:'lab',authorizedDevices,workflowId:'w1',acquire:async()=>({commandForLamp:dummy().commandForLamp,execute:async()=>{calls++;throw Error('lost ACK')}}),saveRun:async()=>{}});
 assert.equal(r.status,'PARTIAL_OR_UNKNOWN');assert.equal(r.nodes.length,1);assert.equal(calls,1);assert.equal(r.nodes[0].status,'UNKNOWN_RECONCILIATION_REQUIRED');
});
test('invalid schema and repeated step IDs rejected',()=>{
 assert.equal(validateWorkflow({name:'w',nodes:[definition.nodes[0],definition.nodes[0]]},{tenant:'lab',authorizedDevices}),'INVALID_NODE');
 assert.equal(validateWorkflow({name:'w',nodes:[{...definition.nodes[0],on:1}]},{tenant:'lab',authorizedDevices}),'INVALID_NODE');
});
