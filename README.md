# Agent Execution Conformance Infrastructure (AECI)

**Independent, framework-neutral evaluation of agent-proposed actions.** AECI is its own project, not a rebranded distribution of AgentScope.

## Current progress (read before use)

- Independent decision contract in `src/aeci/`: implemented (deterministic example, not production authorization).
- AgentScope `v2.0.10` full source: **imported on this review branch** as ordinary files at `vendor/agentscope/`; exact upstream tree SHA verified. This change is not yet merged to `main`.
- One-time exact release import script: `tools/vendor/import_agentscope_v2.sh`.
- Tuya/AgentScope integration adapters, physical confirmation, durable idempotency: **NOT IMPLEMENTED**.

## Local smoke tests (free; no Actions)

```bash
python -m unittest discover -s tests -v
PYTHONPATH=src python -m aeci examples/proposals/allowed.json
PYTHONPATH=src python -m aeci examples/proposals/denied.json
```

The second fixture is expected to exit 1 (denied).

## Imported AgentScope source

The official release snapshot is `v2.0.10` (released 2026-10-12): commit `e6c014f0be49b2a6f6f62a9453082a0b975484e1`, tree `11d2173f891739d3e359af892eb576751a0a85f8`. All 1,178 files are ordinary Git files, not a submodule; the original Apache-2.0 `LICENSE` is preserved. Verification details are in [the import report](docs/AGENTSCOPE_V2_0_10_IMPORT_REPORT.md).

The one-time importer and fail-closed verifier are retained under `tools/vendor/` and `tools/verify_release.sh`. The importer was updated for Windows Git Bash root detection, verifies the pinned tag/tree before changing the index, and commits locally; it does not push, merge or run CI. The source snapshot is complete, but its Python dependencies, external services and model APIs are not bundled, so this is not an offline-runtime claim.

## Ownership structure

| Directory | Ownership / responsibility |
| --- | --- |
| `src/aeci/` | First-party independent conformance contract |
| `adapters/` | Future integration adapters; none shipped |
| `vendor/agentscope/` | Exact third-party v2.0.10 source snapshot; not first-party code |
| `tests/`, `examples/` | Reproducible conformance fixtures |
| `tools/vendor/` | Auditable one-time import tools |
| `docs/` | Architectural boundaries and third-party provenance |

See [architecture](docs/ARCHITECTURE.md) and [provenance](docs/THIRD_PARTY.md). No affiliation with or endorsement from AgentScope or Tuya is claimed.
