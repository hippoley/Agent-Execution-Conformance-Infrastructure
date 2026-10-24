import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectDecisionRecords } from './otel-decision-evidence.mjs';
test('Foreman-shaped same-call approve lifecycle joins', () => {
  const base = { event:'gen_ai.tool.call.decision', executionId:'run-a', toolCallId:'call-a' };
  const r = inspectDecisionRecords([{...base,outcome:'require_approval'}, {...base,outcome:'allow'}]);
  assert.deepEqual(r.joinable[0].outcomes, ['require_approval','allow']);
  assert.equal(r.unjoinable.length,0);
});
test('Foreman-shaped deny joins without asserting effect absence', () => {
  const r=inspectDecisionRecords([{event:'gen_ai.tool.call.decision',executionId:'run-b',toolCallId:'call-b',outcome:'deny'}]);
  assert.equal(r.joinable.length,1);
  assert.equal(Object.hasOwn(r,'effectSucceeded'),false);
});
test('Devplane-shaped missing source call ID stays unjoinable rather than guessed', () => {
  const r=inspectDecisionRecords([{event:'gen_ai.tool.call.decision',executionId:'run-c',outcome:'deny',localDecisionId:'row-123'}]);
  assert.equal(r.joinable.length,0);
  assert.equal(r.unjoinable[0].reason,'MISSING_CALL_ID');
});
test('unknown expiry extension remains outside three-outcome profile', () => {
  const r=inspectDecisionRecords([{event:'gen_ai.tool.call.decision',executionId:'run-d',toolCallId:'call-d',outcome:'expired'}]);
  assert.equal(r.unjoinable[0].reason,'NON_PROFILE_OUTCOME');
});
test('do not correlate same call id across different execution scopes',()=>{
  const r=inspectDecisionRecords(['run-a','run-b'].map(executionId=>({event:'gen_ai.tool.call.decision',executionId,toolCallId:'same',outcome:'deny'})));
  assert.equal(r.joinable.length,2);
});
test('opposing terminal decisions flag a consumer-side ambiguity',()=>{
  const base={event:'gen_ai.tool.call.decision',executionId:'run-e',toolCallId:'call-e'};
  assert.equal(inspectDecisionRecords([{...base,outcome:'allow'},{...base,outcome:'deny'}]).conflicts.length,1);
});
