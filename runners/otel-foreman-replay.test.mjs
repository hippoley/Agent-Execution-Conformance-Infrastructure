import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseForemanCapture} from './otel-foreman-replay.mjs';
const path=new URL('../fixtures/otel/foreman-web-worker-receipt.ndjson',import.meta.url);
test('pinned actual Foreman OTLP capture has approve/deny controls',async()=>{
 const r=parseForemanCapture(await readFile(path,'utf8'));
 assert.equal(r.decisions.length,4);
 assert.ok(r.lifecycle.some(x=>x.interpreted==='APPROVE_ONE_EXECUTION' && x.outcomes.includes('require_approval')));
 assert.ok(r.lifecycle.some(x=>x.interpreted==='DENY_NO_EXECUTION' && x.outcomes.includes('require_approval')));
 assert.equal(r.conflicts.length,0);
});
test('deny path with a matching execution fails consumer rule',()=>{
 const base={key:'gen_ai.agent.execution.id',value:{stringValue:'r'}};
 const attrs=[base,{key:'gen_ai.tool.call.id',value:{stringValue:'c'}}];
 const fixture={body:{resourceSpans:[{resource:{attributes:[{key:'service.name',value:{stringValue:'worker'}}]},scopeSpans:[{spans:[{traceId:'t',attributes:[...attrs,{key:'gen_ai.operation.name',value:{stringValue:'execute_tool'}}],events:[{name:'gen_ai.tool.call.decision',attributes:[...attrs,{key:'gen_ai.tool.call.decision.outcome',value:{stringValue:'deny'}}]}]}]}]}]}};
 assert.equal(parseForemanCapture(JSON.stringify(fixture)).lifecycle[0].interpreted,'DENY_EXECUTION_MISMATCH');
});
