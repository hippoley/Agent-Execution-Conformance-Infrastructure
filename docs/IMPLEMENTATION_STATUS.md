# Implementation Status

This page records what runs today. The intended system and layer boundaries are in [ARCHITECTURE.md](ARCHITECTURE.md).

## Current vertical slice

```text
device-command contract + JSON Schema
                 |
                 v
public fixtures -> adapter harness -> reference simulator -> JSON report
```

The contract and harness are development/test-time assets. No component in this slice authenticates a real user or device, contacts Tuya, invokes AgentScope, or changes physical state.

## Directory ownership

| Path | Responsibility | Status |
| --- | --- | --- |
| `contracts/` | Device-command, adapter, execution-trace and report contracts | Command profile is executable against the reference simulator; lifecycle trace remains design-only. |
| `fixtures/` | Deterministic valid, denied, expired and replay cases | Nine v0.2 device-command vectors exercise the simulator and fail-closed unknown capability/argument semantics. |
| `runners/` | Reference simulator and adapter conformance CLI | JavaScript implementation; no generic agent lifecycle runner yet. |
| `adapters/` | Framework/device integration boundary | Documentation only; no AgentScope or Tuya adapter. |
| `vendor/agentscope/` | Exact upstream v2.0.10 source snapshot | Complete source and license retained; not wired into this project. |
| `tools/vendor/` | One-time source import tooling | Historical reproduction path; import already completed on this branch. |
| `tools/verify_release.sh` | Local source and conformance verification | Runs without GitHub Actions; see [import report](AGENTSCOPE_V2_0_10_IMPORT_REPORT.md). |
| `docs/` | System architecture, product stories, implementation truth and provenance | The system target and implemented slice are explicitly distinguished. |

## Known limits

The simulator checks expiry, injected principal/device binding, capability allowlisting, implemented-capability validation, exact argument shape, idempotency and readback against a fake device. It does not provide real authentication, transport delivery, crash-safe persistence, cancellation reconciliation, or physical-state evidence. No third party is recorded as consuming the profile. See [the position review](POSITION_REVIEW.md) for the next falsifiable gate.
