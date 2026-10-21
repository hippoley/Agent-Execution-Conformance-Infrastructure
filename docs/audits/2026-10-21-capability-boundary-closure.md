# AECI Closure Batch — physical capability dispatch boundary
Date: 2026-10-21
Base: `refactor/coherent-conformance-layout`
Scope: reference simulator + published device-command conformance profile. No production gateway, hardware or Tuya access.

## Hidden assumption (falsified)

A device command being allowed by the principal's capability set does **not** prove
the adapter has a handler for that operation. Previously, `execute()` only
mutated the lamp for `lamp.set_power` but could still evaluate the **lamp**
readback for some other allowlisted command and return
`succeeded / POSTCONDITION_VERIFIED`.

For example, an allowlisted `lock.unlock` command with `{"on": false}`
could return success while the simulator had not dispatched or changed any
lock. This is an **incorrect success classification in a simulator**,
not a claim that an actual lock was opened.

The old validator also accepted undeclared properties of the lamp capability,
such as `{"on": true, "unexpected": "injected"}`. A caller must not infer
that an arbitrary JSON payload was interpreted and authorized merely because
one expected field was valid.

## Minimal change

- Fail closed on every capability for which the reference adapter has no
  implemented handler, even when the capability is allowlisted.
- Require exactly the declared arguments for `lamp.set_power`.
- Publish two additional portable conformance vectors:
  `allowlisted-unsupported-capability` and `reject-extra-arguments`.
- Add three explicit regression tests, including a legitimate positive
  operation, to ensure that a deny-all policy cannot pass the suite.

This is a small reference-adapter correctness fix, **not** a new policy
protocol, an MCP authorization implementation or a physical proof system.

## Before / after evidence (local Node 22.16.0)

For a locally reconstructed copy of the reviewed runner and its fixtures:

- Baseline plus 3 new targeted tests: 1 PASS, 2 FAIL.
- Fixed implementation plus 3 tests: 3 PASS.
- Fixed implementation plus 12 existing runner tests: 15 PASS total.
- Public `conformance.json` cases: 7 -> 9; all nine pass against the fixed reference adapter.

Test commands:

```bash
node --test runners/*.test.mjs
node runners/conformance.mjs runners/device-command.mjs
```

The reproduction used an isolated local copy of the relevant GitHub branch files
because direct `git clone` was blocked by DNS in the execution environment.
**The new remote GitHub branch has been written, but a full repository checkout
or remote CI run is not claimed.** Verification of the latest PR head remains
an independent release gate.

## What remains unproven

- Physical effect readback must be independent of the same in-memory
  simulator variable that the command mutates. A successful self-inspection
  is not an independent physical observation.
- The `principal.authenticated` flag is a test injection, not identity proof.
- Model-driven AgentScope integration is absent; so is real Tuya/ESP32 device
  control, provisioning, isolation, revocation and token security.
- Simulated idempotency records are in memory until explicitly saved.
  Crashes between physical dispatch and durable intent/receipt persistence
  remain unsolved (C4).
- Cancellation disposition and real MCP Tasks mapping are not implemented (C3).
- No independent external adapter or adopter has passed these vectors.

## Reuse and competition

- [AgentScope](https://github.com/agentscope-ai/agentscope): agent runtime and
  sandbox; do not fork generic session/tool infrastructure.
- [TuyaOpen](https://github.com/tuya/tuyaopen): supported embedded connectivity
  and device capabilities; do not reinvent device drivers and firmware OTA.
- [Tuya IoT status API](https://developer.tuya.com/en/docs/cloud/1ef1a3044b?id=Kconf2usgnfwo):
  actual device status query is a future external observation input.
- [MCP Tasks](https://github.com/modelcontextprotocol/ext-tasks):
  reuse async task lifecycle/cancellation instead of inventing an MCP protocol.
- [MCP Conformance](https://github.com/modelcontextprotocol/conformance):
  protocol-level checks already exist. This project tests *physical-effect
  disposition*, not duplicate MCP transport behavior.

## Next falsifiable gate

Take one authorized state-setting command and one *simulated non-idempotent*
operation, insert process termination in at least four windows (before dispatch,
after dispatch before receipt, after receipt before persistence, after
persistence), then recover with an external state oracle.

Pass requires: no false `succeeded`, no blind replay of ambiguous operations,
positive completion of safe cases, precise traces for every window, and an
independent test process. Keep C4 OPEN until the test exists and runs.
