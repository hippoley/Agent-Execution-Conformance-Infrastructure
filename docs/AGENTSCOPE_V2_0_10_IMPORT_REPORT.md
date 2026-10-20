# AgentScope v2.0.10 Import Report

## Result

The complete AgentScope v2.0.10 source tree is committed in `vendor/agentscope/` as ordinary files on `refactor/coherent-conformance-layout`. The old gitlink and `.gitmodules` entry are removed. This is a source snapshot; it does not include the upstream commit history or imply endorsement.

| Check | Evidence |
| --- | --- |
| Upstream tag | `v2.0.10`, commit `e6c014f0be49b2a6f6f62a9453082a0b975484e1` |
| Exact source tree | `11d2173f891739d3e359af892eb576751a0a85f8` |
| Imported file entries | 1,178 ordinary files |
| Attribution | Original `vendor/agentscope/LICENSE` (Apache-2.0) retained; provenance recorded in [THIRD_PARTY.md](THIRD_PARTY.md) |
| Import commit | `cccc493` (`chore(vendor): import exact AgentScope v2.0.10 source`) |

## Local verification

- `tools/verify_release.sh`: passed. It ran the 5 AECI unit tests, 12 device-command tests, all 7 public vectors, allow/deny CLI fixtures, an isolated import check, and the pinned tree/license/no-gitlink checks.
- `node --test runners/device-command.test.mjs`: 12 tests passed, including the public vectors and false-success adapter check.
- `node runners/conformance.mjs runners/device-command.mjs`: all 7 public vectors passed against the reference simulator.
- Python AST parsing: 496 AgentScope source files parsed successfully.
- Package smoke test: importing from `vendor/agentscope/src` reported version `2.0.10`.
- `git diff --check`: passed for the local changes.

## Not verified

- AgentScope's full upstream pytest suite was not run: `pytest` and the project's development dependency set are not installed in this environment.
- No Tuya account, ESP32 board, device transport, model credentials or external service was configured. The import proves source completeness and a basic Python package import, not end-to-end runtime behavior.
- The change is on the open Draft PR branch and is not merged to `main`.
