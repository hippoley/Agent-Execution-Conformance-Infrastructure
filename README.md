# Agent Execution Conformance Infrastructure (AECI)

**Independent, framework-neutral conformance tooling for agent-proposed actions.**

AECI evaluates whether a proposed agent action meets a small, explicit execution contract. It does **not** execute device commands and does not treat agent output as authority.

## Start here

```bash
python -m unittest discover -s tests -v
PYTHONPATH=src python -m aeci examples/proposals/allowed.json
PYTHONPATH=src python -m aeci examples/proposals/denied.json
```

Python 3.10+; no third-party Python dependencies for the conformance core.

## Repository map

| Path | Responsibility |
| --- | --- |
| `src/aeci/` | Project-owned, framework-neutral decision contract |
| `tests/` | Deterministic contract tests |
| `examples/proposals/` | Reproducible input fixtures |
| `adapters/` | Future AgentScope / Tuya adapters (**not implemented**) |
| `third_party/agentscope/` | Pinned AgentScope Git submodule (**not project-owned**) |
| `tools/vendor/` | Optional upstream source migration tooling |
| `docs/` | Architecture, provenance, integration boundaries |
| `.github/workflows/` | One **manual-only** upstream import workflow |

## Conformance contract

Input JSON: `request_id`, `actor`, `target`, `operation`, `permissions`, `allowed_targets`, `allowed_operations`, and `expected_state`. Decision JSON: `request_id`, `allowed`, `reasons`. All permission checks are deny-by-default. The independent decision evaluator does not call a model, the network, or any physical device.

**Important limitations:** this is a deterministic authorization *fixture*, not production-ready safety control. It does not yet verify an authenticated principal, prove physical completion, enforce idempotency over persistent storage, or attest the device state. No Tuya adapter is shipped. A PASS is **not** evidence of physical execution.

## Third-party provenance

AgentScope is authored by its upstream maintainers. It is tracked as a Git submodule at `third_party/agentscope`, pinned to commit `402c3664f70cb339f397c5ee40e662bc0d99eed0`. The original source and licensing stay attributed to upstream. No upstream code is represented as AECI-owned. See [provenance](docs/THIRD_PARTY.md) and [vendoring procedure](docs/development/AGENTSCOPE_VENDORING.md).

AECI is independent of AgentScope and Tuya, and does not imply endorsement by either.
