# AgentPanel

**Managed Agent + IoT execution integration** built on a pinned AgentScope source baseline and a future TuyaOpen / ESP32 device path. The repository URL retains its historical AECI name; **AgentPanel is the product**, and the command conformance runner is a development tool—not a second platform, production policy service, or separate runtime layer.

## What runs today (2026-10-21)

| Component | Status | Honest evidence |
| --- | --- | --- |
| AgentScope v2.0.10 source snapshot | **Imported** | 1,178 ordinary tracked files at `vendor/agentscope/`; Git tree `11d2173f891739d3e359af892eb576751a0a85f8` (verified on the consolidated `main` tree) |
| Device command / reference simulator | **Runnable locally** | Versioned `agent-device-effect/0.3` fixture profile with 10 vectors, including malformed authentication context |
| AgentScope runtime / managed control plane | **Not integrated** | Source presence is not a runnable enterprise agent platform |
| Tuya API, TuyaOpen, ESP32 | **Not integrated** | No paired device, real actuation or independent physical readback |
| Production sandbox / identity / durable execution | **Not implemented here** | Simulator principal is injected; a saved snapshot is not crash-safe execution |
| Crash-window reasoning classifier | **Test-only** | Six synthetic windows + one missing-intent test; no process termination or durable physical receipt |
| Independent adoption | **Not verified** | No confirmed third-party adapter or usage |

## Fast local verification (no cloud account and no GitHub Actions)

Requires Node.js 22+ for the development harness and Git for the pinned source check:

```bash
node --test runners/*.test.mjs
node runners/conformance.mjs runners/device-command.mjs
bash tools/verify_release.sh
```

The first command includes both the core device tests **and** capability-boundary regression tests. The second emits machine-readable JSON and exits nonzero on any mismatch. The release script checks the committed AgentScope source tree, attribution prerequisites, and the local test profile. These commands do **not** exercise AgentScope's full upstream test suite, a secure sandbox, real identity provider, Tuya or ESP32.

## Architecture and ownership

- [Canonical AgentPanel architecture](docs/ARCHITECTURE.md) — target system design; not a claim that all boxes run.
- [Implementation truth](docs/IMPLEMENTATION_STATUS.md) — delivered versus blocked, updated per release.
- [User stories and acceptance](docs/USER_STORIES.md) — M1–M14 platform, D1–D7 device, C1–C4 development conformance; unfinished items remain open.
- [Primary vertical slice](docs/USER_STORY.md) — first independently testable business/device outcome.
- [Third-party provenance](docs/THIRD_PARTY.md) and [exact-source evidence](docs/AGENTSCOPE_V2_0_10_IMPORT_REPORT.md).

| Path | Ownership |
| --- | --- |
| `vendor/agentscope/` | Immutable **third-party** upstream snapshot, Apache-2.0 license retained |
| `contracts/`, `fixtures/`, `runners/` | First-party **development tests** and reference simulator |
| `adapters/` | Integration interface notes only; no real adapters yet |
| `tools/` | Pinned source import and local fail-closed verification |
| `docs/` | Canonical architecture, evidence limits, roadmap and historical audit |

## What to build next

First prove **one AgentScope → constrained capability → test device / fake Tuya API → externally observed outcome** path, using deny-by-default permissions and separate simulated versus live modes. Prioritize one safe low-risk device. Only after this gate, prove cancellation/crash reconciliation, real identity, and sandbox isolation. Do not start with another general agent admin UI, new workflow engine, large vendor fork, or unrestricted physical control.

**Safety:** no production credentials in prompts/traces/fixtures; do not connect this reference simulator directly to privileged real actuators. Cloud API acknowledgement is not physical completion. No affiliation with or endorsement by AgentScope or Tuya is claimed.
