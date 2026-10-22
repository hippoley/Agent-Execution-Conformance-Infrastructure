# Closure Batch C4-PROCESS-01 — restart and lost-ACK proof (2026-10-22)

**Purpose:** challenge the hidden premise that an API receipt, an in-memory dedup table, or a successful tool return proves a physical effect. This is an experimental **development-only** fork of one scenario, **not a durable production executor, Tuya Cloud API, or physical hardware acceptance**.

## Independent processes and failure windows

- `runners/c4-durable-probe.mjs device <scratch-dir>` owns a **test-only simulated non-idempotent pulse counter**. It writes `device.json` and its per-command digest/effect sequence to a local file via temp-file write, file fsync, rename and best-effort directory fsync.
- `runners/c4-durable-probe.mjs worker <scratch-dir> <url> <stage>` owns **separate** `gateway.json` intent/dispatch/receipt metadata, written before an HTTP command is sent.
- `worker ... recover` consults the device ledger by HTTP; it never issues POST. Device and worker use distinct OS processes and state files, restarted independently by the tests. The device service binds to `127.0.0.1` only and has **no authentication**: development fixture only.
- The simulated operation is `pulse_once` (a counter increment), to ensure duplicate execution would be measurable rather than hidden by setting the lamp to the same value.

## Source-matched local verification

```bash
node --test runners/c4-durable-probe.test.mjs
```

Local Node.js **v22.16.0**: **9 tests / 9 PASS / 0 FAIL / 0 CANCEL**. The two GitHub blob SHAs of the exact tested files were checked before writing the tree:

| File | Tested Git Blob SHA |
| --- | --- |
| `runners/c4-durable-probe.mjs` | `4807ca05dae603f89dfb25164ffb52cfecd08db5` |
| `runners/c4-durable-probe.test.mjs` | `db5953734c9f7e036bfd3c5df1b1eab8db1dbb14` |

Verified controls:
1. Crash before dispatch after persisting intent → `NOT_DISPATCHED` and no effect.
2. Crash after HTTP response, before receipt persistence → externally corroborated simulated effect.
3. Crash after durable receipt, before client ACK → externally corroborated simulated effect.
4. Device logs effect then **holds HTTP ACK**; caller is killed with SIGKILL → recovery sees simulated effect, no retransmission.
5. Device process restart leaves its file-based effect ledger intact and identical command returns same effect number.
6. Forged gateway receipt without effect ledger → `UNKNOWN`, never success.
7. Device offline / no reachable oracle following dispatch → `UNKNOWN`, no replay.
8. Corrupted external effect digest → `UNKNOWN`.
9. Conflicting payload under the same command ID → HTTP 409, simulated pulse count unchanged.

## What did NOT close

- **C4 remains PARTIAL / OPEN**: Linux fsync/rename only test local persistence, not hardware power-failure atomicity, crash while device file is being written, distributed consensus or real-world exactly-once semantics. The directory fsync fallback is explicitly best-effort on other platforms.
- An observer located in the **same simulated device process** provides authoritative *test* evidence but is not an independent *physical* sensor or trusted third party.
- The simulated server has no real identity, authorization, TLS, provisioning or sandbox. Never connect it to production devices, or trust its `SAFE_TO_DISPATCH` rule without a genuinely durable pre-dispatch invariant.
- C3 cancel-after-dispatch and M7 real AgentScope Toolkit execution (#7) remain unimplemented. The same low-risk test device must later be driven by a real framework tool call.
- The latest complete `main` test suite and vendor/runtime integration are not freshly executed in this closure; only the exact two new source files have passing local evidence.

## Highest-value next experiment

Implement a real no-cloud-key AgentScope v2 `Toolkit.call_tool` → bounded device adapter → external process path, then tie its correlation ID to the durable `gateway.json` entry. Test malicious/incorrect caller claims separately. Only after the framework trace exists should a supported low-risk Tuya/ESP32 board be used; C4 is not complete until hardware status and crash observations are independently repeatable.

This fixture can become a portable failure-case contribution to AgentScope/Tuya/MCP only if its contracts survive an **independent adapter** and external maintainer review. No such adoption is claimed.
