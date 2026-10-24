// Consumer-side test utility for experimental #535 records; not a normative OTel validator.
export function inspectDecisionRecords(records) {
  const result = { decisionCount: 0, joinable: [], unjoinable: [], conflicts: [] };
  const seen = new Map();
  for (const record of records) {
    if (record.event !== 'gen_ai.tool.call.decision') continue;
    result.decisionCount++;
    const outcome = record.outcome;
    if (!['allow', 'deny', 'require_approval'].includes(outcome)) {
      result.unjoinable.push({ reason: 'NON_PROFILE_OUTCOME', outcome }); continue;
    }
    if (typeof record.toolCallId !== 'string' || !record.toolCallId) {
      result.unjoinable.push({ reason: 'MISSING_CALL_ID', outcome }); continue;
    }
    const scope = record.executionId || null;
    if (!scope) {
      result.unjoinable.push({ reason: 'MISSING_EXECUTION_SCOPE', outcome }); continue;
    }
    const key = JSON.stringify([scope, record.toolCallId]);
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key).push(outcome);
  }
  for (const [key, outcomes] of seen) {
    const [executionId, toolCallId] = JSON.parse(key);
    const terminal = [...new Set(outcomes.filter(x => x !== 'require_approval'))];
    if (terminal.length > 1) result.conflicts.push({ executionId, toolCallId, outcomes });
    result.joinable.push({ executionId, toolCallId, outcomes });
  }
  return result;
}
