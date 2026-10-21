# AgentPanel

AgentPanel is a managed-agent and IoT system project centered on the customer architecture in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). AgentScope is the first cloud runtime candidate; TuyaOpen and ESP32 define the device path. The repository currently includes a small device-command contract and local test harness to check assumptions during development. They are validation assets, not a separate product, production service, or runtime layer.

## Current progress (read before use)

- Device-command checks in `contracts/`, `runners/`, and `fixtures/`: local reference simulator and seven vectors; no real adapter or physical device.
- AgentScope `v2.0.10` full source: **imported on this review branch** as ordinary files at `vendor/agentscope/`; exact upstream tree SHA verified. This change is not yet merged to `main`.
- One-time exact release import script: `tools/vendor/import_agentscope_v2.sh`.
- Tuya/AgentScope integration adapters, physical confirmation, durable idempotency: **NOT IMPLEMENTED**.

## Local smoke tests (free; no Actions)

```bash
node --test runners/device-command.test.mjs
node runners/conformance.mjs runners/device-command.mjs
```

## Imported AgentScope source

The official release snapshot is `v2.0.10` (released 2026-10-12): commit `e6c014f0be49b2a6f6f62a9453082a0b975484e1`, tree `11d2173f891739d3e359af892eb576751a0a85f8`. All 1,178 files are ordinary Git files, not a submodule; the original Apache-2.0 `LICENSE` is preserved. Verification details are in [the import report](docs/AGENTSCOPE_V2_0_10_IMPORT_REPORT.md).

The one-time importer and fail-closed verifier are retained under `tools/vendor/` and `tools/verify_release.sh`. The importer was updated for Windows Git Bash root detection, verifies the pinned tag/tree before changing the index, and commits locally; it does not push, merge or run CI. The source snapshot is complete, but its Python dependencies, external services and model APIs are not bundled, so this is not an offline-runtime claim.

## Ownership structure

| Directory | Ownership / responsibility |
| --- | --- |
| `contracts/`, `fixtures/`, `runners/` | Development/test-time command contract checks, vectors, and reference simulator |
| `adapters/` | Integration boundary notes; no real framework/device adapter shipped |
| `vendor/agentscope/` | Exact third-party v2.0.10 source snapshot; not first-party code |
| `tools/vendor/` | Auditable one-time import tools |
| `docs/` | Architectural boundaries and third-party provenance |

See the [AgentPanel system architecture](docs/ARCHITECTURE.md), [current implementation status](docs/IMPLEMENTATION_STATUS.md), [user stories](docs/USER_STORIES.md), and [provenance](docs/THIRD_PARTY.md). No affiliation with or endorsement from AgentScope or Tuya is claimed.
