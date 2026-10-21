# Device Adapter Conformance Interface

This interface is for running the public device-command vectors against an independent adapter. It is a test harness contract, not a production SDK.

## Adapter module

An adapter module exports:

```js
export function createDevice({ initialState }) {
  return {
    async execute(command, principal, trustedNow, options = {}) {
      // Return { state, code, command_id?, observed? }
    },
    async inspectState() {
      // Return a JSON-serializable state snapshot.
    },
  };
}
```

`principal` is supplied by the harness as the result of an external authentication step. It contains `authenticated`, `tenantId`, `deviceId`, and a `Set` named `capabilities`. The adapter must never treat envelope identity fields as proof of authentication. `trustedNow` is integer epoch seconds from the harness clock. The test-only `options` object may request faults such as unavailable readback; adapters must not expose such injection in production APIs.

## Conformance result

Each vector records its ID, input fixture, trusted identity, clock, optional repeated requests/faults, expected outcome state/code, and whether a physical state change is expected. A conformant adapter reports outcomes consistent with the vector and exposes state for verification. If an adapter throws or returns a malformed state snapshot, the harness emits a failed vector with stable code `ADAPTER_ERROR` (no exception text or credentials) and continues testing other vectors. This in-process harness does not enforce hard timeouts or sandbox isolation. The harness prints one JSON result per vector matching [`conformance-report.schema.json`](conformance-report.schema.json) and exits non-zero if any assertion fails.

## Limits

Passing this interface proves behavior against the simulator vectors only. It does not prove hardware identity, cryptographic transport, crash consistency, real actuator feedback, or any Tuya entitlement. Hardware reports must name the board, firmware commit, transport and test setup.
