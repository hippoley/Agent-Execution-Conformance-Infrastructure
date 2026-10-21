import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyRecovery, windows } from './crash-window-probe.mjs';
for (const w of windows) test(`recovery window: ${w.id}`, () => {
  const result = classifyRecovery(w);
  assert.equal(result.disposition, w.expected);
  if (result.disposition === 'UNKNOWN') assert.notEqual(result.next, 'SAFE_TO_DISPATCH');
});
test('missing durable intent never licenses blind non-idempotent replay', () => {
  assert.equal(classifyRecovery({intentDurable:false,dispatchStarted:true,independentEffect:'unavailable',receiptDurable:false}).next,'MANUAL_RECONCILIATION');
});
