import test from 'node:test';
import assert from 'node:assert/strict';
import { executeAgentScopeNode } from '../adapters/agentscope-workflow-bridge.mjs';
import { executeWorkflow } from './workflow-engine.mjs';
const devices=[{id:'lampA',tenant:'lab'}];
const definition={name:'test',nodes:[{id:'first',type:'lamp.set_power',deviceId:'lampA',on:true}]};

test('Workflow preserves written command identity through the pluggable SDK bridge',async()=>{
 let savedId,calledId;
 const run=await executeWorkflow({definition,tenant:'lab',authorizedDevices:devices,workflowId:'wf',
  saveRun:async r=>{const n=r.nodes.at(-1);if(n?.status==='DISPATCH_INTENT_SAVED')savedId=n.commandId},
  acquire:async()=>({}),dispatchNode:async({node,commandId})=>{calledId=commandId;assert.equal(node.on,true);return {status:'CONFIRMED_IN_FAKE_SERVICE',executor:'AGENTSCOPE_V2_TOOLKIT'}}});
 assert.equal(savedId,calledId);
 assert.equal(run.nodes[0].executor,'AGENTSCOPE_V2_TOOLKIT');
 assert.equal(run.status,'SIMULATED_CONFIRMED');
});
test('missing Python SDK cannot cause fake success or a blind retry',async()=>{
 const client={baseUrl:'http://127.0.0.1:1234',token:'test',tenant:'lab',device:'lampA'};
 const outcome=await executeAgentScopeNode({client,on:true,commandId:'test-cmd',python:'__definitely_missing_python_binary__'});
 assert.equal(outcome.status,'UNKNOWN_RECONCILIATION_REQUIRED');
});
test('bridge rejects command-ID and argument spoofing before child spawn',async()=>{
 const client={};
 assert.equal((await executeAgentScopeNode({client,on:true,commandId:'../other'})).status,'DENIED');
 assert.equal((await executeAgentScopeNode({client,on:1,commandId:'good'})).status,'DENIED');
});
