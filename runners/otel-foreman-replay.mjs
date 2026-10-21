import { readFile } from 'node:fs/promises';
import { inspectDecisionRecords } from './otel-decision-evidence.mjs';

function attributes(items = []) {
  return Object.fromEntries(items.map(({key,value})=>[key,value?.stringValue ?? value?.intValue ?? value?.boolValue ?? null]));
}
export function parseForemanCapture(ndjson) {
  const decisions=[], executions=[], scopes=new Set();
  for (const line of ndjson.split(/\r?\n/).filter(Boolean)) {
    const envelope=JSON.parse(line);
    for (const rs of envelope.body?.resourceSpans ?? []) {
      const service=attributes(rs.resource?.attributes)['service.name'];
      for (const ss of rs.scopeSpans ?? []) {
        for (const span of ss.spans ?? []) {
          const sa=attributes(span.attributes);
          if (sa['gen_ai.operation.name']==='execute_tool') executions.push({
            service, executionId:sa['gen_ai.agent.execution.id'], toolCallId:sa['gen_ai.tool.call.id'],
            traceId:span.traceId, spanId:span.spanId
          });
          for (const event of span.events ?? []) {
            if (event.name !== 'gen_ai.tool.call.decision') continue;
            const ea=attributes(event.attributes);
            decisions.push({event:event.name, outcome:ea['gen_ai.tool.call.decision.outcome'],
              executionId:ea['gen_ai.agent.execution.id'] ?? sa['gen_ai.agent.execution.id'],
              toolCallId:ea['gen_ai.tool.call.id'] ?? sa['gen_ai.tool.call.id'],service,
              traceId:span.traceId});
          }
        }
      }
    }
  }
  const grouped=inspectDecisionRecords(decisions);
  const lifecycle=grouped.joinable.map(c=>{
    const matches=executions.filter(e=>e.executionId===c.executionId && e.toolCallId===c.toolCallId);
    const isApproved=c.outcomes.includes('allow');
    const isDenied=c.outcomes.includes('deny');
    return {...c, executionSpanCount:matches.length,
      interpreted: isApproved&&!isDenied ? (matches.length===1?'APPROVE_ONE_EXECUTION':'APPROVE_EXECUTION_MISMATCH')
       : isDenied&&!isApproved ? (matches.length===0?'DENY_NO_EXECUTION':'DENY_EXECUTION_MISMATCH')
       : 'PENDING_OR_CONFLICT'};
  });
  return {decisions,executions,lifecycle,unjoinable:grouped.unjoinable,conflicts:grouped.conflicts};
}
if(process.argv[1]?.endsWith('otel-foreman-replay.mjs')){
  const path=process.argv[2] ?? 'fixtures/otel/foreman-web-worker-receipt.ndjson';
  const result=parseForemanCapture(await readFile(path,'utf8'));
  process.stdout.write(JSON.stringify({decisionCount:result.decisions.length,executionSpanCount:result.executions.length,lifecycle:result.lifecycle,unjoinable:result.unjoinable},null,2)+'\n');
}
