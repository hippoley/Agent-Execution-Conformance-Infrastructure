// Test-only crash-window reasoning model. No real actuator and no durability claims.
export function classifyRecovery({ intentDurable, dispatchStarted, independentEffect, receiptDurable }) {
  if (!intentDurable) return { disposition: 'UNKNOWN', next: 'MANUAL_RECONCILIATION', reason: 'NO_DURABLE_INTENT' };
  if (independentEffect === 'matching') return { disposition: 'CONFIRMED', next: 'DO_NOT_REDISPATCH', reason: 'INDEPENDENT_EFFECT_MATCH' };
  if (independentEffect === 'conflicting') return { disposition: 'UNKNOWN', next: 'MANUAL_RECONCILIATION', reason: 'EFFECT_CONFLICT' };
  if (receiptDurable) return { disposition: 'UNKNOWN', next: 'MANUAL_RECONCILIATION', reason: 'RECEIPT_IS_NOT_EFFECT_PROOF' };
  if (dispatchStarted) return { disposition: 'UNKNOWN', next: 'RECONCILIATION_REQUIRED', reason: 'DISPATCH_OUTCOME_AMBIGUOUS' };
  return { disposition: 'NOT_DISPATCHED', next: 'SAFE_TO_DISPATCH', reason: 'DURABLE_PRE_DISPATCH_INTENT' };
}

export const windows = [
  { id: 'before-dispatch', intentDurable: true, dispatchStarted: false, independentEffect: 'unavailable', receiptDurable: false, expected: 'NOT_DISPATCHED' },
  { id: 'after-effect-before-response', intentDurable: true, dispatchStarted: true, independentEffect: 'unavailable', receiptDurable: false, expected: 'UNKNOWN' },
  { id: 'after-response-before-receipt', intentDurable: true, dispatchStarted: true, independentEffect: 'unavailable', receiptDurable: false, expected: 'UNKNOWN' },
  { id: 'after-receipt-before-client-ack', intentDurable: true, dispatchStarted: true, independentEffect: 'unavailable', receiptDurable: true, expected: 'UNKNOWN' },
  { id: 'after-effect-independent-readback', intentDurable: true, dispatchStarted: true, independentEffect: 'matching', receiptDurable: false, expected: 'CONFIRMED' },
  { id: 'effect-conflicting-readback', intentDurable: true, dispatchStarted: true, independentEffect: 'conflicting', receiptDurable: true, expected: 'UNKNOWN' },
];
