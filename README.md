# Agent Execution Conformance Infrastructure (AECI)

**Independent, framework-neutral evaluation of agent-proposed actions.** AECI is its own project, not a rebranded distribution of AgentScope.

## Current progress (read before use)

- Independent decision contract in `src/aeci/`: implemented (deterministic example, not production authorization).
- AgentScope `v2.0.10` **full source copy**: **NOT IMPORTED YET**. The current review branch still contains a gitlink at `third_party/agentscope/` to an older commit.
- One-time exact release import script: `tools/vendor/import_agentscope_v2.sh`.
- Tuya/AgentScope integration adapters, physical confirmation, durable idempotency: **NOT IMPLEMENTED**.

## Local smoke tests (free; no Actions)

```bash
python -m unittest discover -s tests -v
PYTHONPATH=src python -m aeci examples/proposals/allowed.json
PYTHONPATH=src python -m aeci examples/proposals/denied.json
```

The second fixture is expected to exit 1 (denied).

## Import complete, pinned AgentScope source

The official **latest stable release as checked 2026-10-20** is `v2.0.10` (released 2026-10-12).

```bash
git clone https://github.com/hippoley/Agent-Execution-Conformance-Infrastructure.git
cd Agent-Execution-Conformance-Infrastructure
git switch refactor/coherent-conformance-layout
git config user.name "Your Name"
git config user.email "you@example.com"
bash tools/vendor/import_agentscope_v2.sh
git push origin refactor/coherent-conformance-layout
```

The script verifies the upstream tag's exact commit and the imported Git tree against the pinned hashes **before** committing. It preserves upstream source paths and LICENSE. It **never** pushes, merges or runs CI by itself. Run it in a network-enabled local Git environment or Codespaces. It does not touch any of your other projects.

After import, `vendor/agentscope/` contains all ordinary source files, with no submodule. Note that Python dependencies, services and model APIs may still need network access; source vendoring is not a promise of offline runtime.

## Ownership structure

| Directory | Ownership / responsibility |
| --- | --- |
| `src/aeci/` | First-party independent conformance contract |
| `adapters/` | Future integration adapters; none shipped |
| `vendor/agentscope/` | **Future** exact third-party snapshot; not first-party code |
| `third_party/agentscope/` | **Temporary** existing Git submodule until import |
| `tests/`, `examples/` | Reproducible conformance fixtures |
| `tools/vendor/` | Auditable one-time import tools |
| `docs/` | Architectural boundaries and third-party provenance |

See [architecture](docs/ARCHITECTURE.md) and [provenance](docs/THIRD_PARTY.md). No affiliation with or endorsement from AgentScope or Tuya is claimed.
