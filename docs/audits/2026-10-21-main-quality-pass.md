# AgentPanel main — repository-quality pass (2026-10-21)

## Audit scope and truth

Reviewed all **first-party paths** discovered in the full GitHub tree and the main product, source-migration and conformance documents. The pinned **third-party** AgentScope snapshot is not reauthored or presented as our work.

- GitHub `main` baseline before this update: `36456d59695ed70f6a6583698663530a4182595a`.
- AgentScope v2.0.10 vendored subtree: `11d2173f891739d3e359af892eb576751a0a85f8`, independently checked via GitHub tree objects.
- AgentPanel is the product; the device-command profile remains a **development test utility**. The repository has no working AgentScope↔Tuya or ESP32 integration.
- A simulated `principal.authenticated` field is **not** real cryptographic authentication; in-memory readback is **not** independent physical proof.

## Changes in this quality pass

1. **Fail-closed caller type validation.** Reject string/number authentication flags and malformed tenant/device IDs or capability containers; do not throw on array-valued grants.
2. **Versioned public vectors.** Experimental `agent-device-effect/0.3` adds a malformed-authentication negative vector (9 → 10); the v1 device command envelope is unchanged.
3. **Conformance error reporting.** Unexpected adapter exceptions / malformed `inspectState` produce schema-compatible `ADAPTER_ERROR` failed vectors, with no exception/credential leakage. No hard timeout, process sandbox or isolation guarantee is claimed.
4. **Positive and negative regression tests.** Preserve authorized legitimate behavior and assert wrong-type callers cannot change modeled state; exercise an adapter that throws.
5. **Verifier coverage.** `tools/verify_release.sh` runs **all** `runners/*.test.mjs`, not just the original test file; reports the current public profile without a stale vector count.
6. **Documentation normalization.** Update stale references to old seven-vector counts, unmerged review branches and outdated branch naming; keep `ARCHITECTURE.md` canonical and distinguish runtime design from shipped code.

## Evidence policy and acceptance

These are **source and static review improvements** until a clean checkout runs:

```bash
node --test runners/*.test.mjs
node runners/conformance.mjs runners/device-command.mjs
bash tools/verify_release.sh
```

Passing historical results from an earlier branch **must not** be represented as results for this commit. CI was not invoked to avoid needless GitHub Actions costs. The same rule applies to import testing; tree identity does not equal a running AgentScope service.

The public test count is **10 vectors**; the suite sources contain **28 declared Node tests** across three files after this change. Count is not a pass claim.

## Remaining blockers, ordered by leverage

1. **P0 integration:** Implement a thin, real AgentScope → isolated fake Tuya service adapter, outside `vendor/agentscope/`; show an actual framework tool call and independently read observable state.
2. **P0 execution authority:** Replace test-only principal injection with an authenticated, scoped device command boundary and real resource ownership checks.
3. **P1 device evidence:** On one explicitly authorized low-risk Tuya/ESP32 test device, obtain a separate device state readback (and distinguish ACK, observation and causality).
4. **P1 recovery:** Implement crash-window + unknown-result reconciliation (Issue #4) before any automatic retry of non-idempotent actions.
5. **P2 isolation:** Verify actual code sandbox filesystem/network/process boundaries. Don't confuse a fake device service with process isolation.
6. **P2 downstream:** Seek independent adapter testing only after an honest reproducible release.

## Exit condition

Until a true AgentScope tool invocation changes a separately owned fake-device state and is verified across trust boundaries, AgentPanel remains a **source + simulator + architecture** project, not a deployable enterprise Agent middle platform.
