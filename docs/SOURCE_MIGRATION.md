# AgentScope Source Import Record

## Result

The complete AgentScope `v2.0.10` source snapshot is present as ordinary files in `vendor/agentscope/` on this review branch. The old Git submodule and `.gitmodules` entry were removed. This copies the tagged source tree; it does not copy upstream commit history or make AECI an official AgentScope distribution.

| Property | Verified value |
| --- | --- |
| Upstream | [agentscope-ai/agentscope](https://github.com/agentscope-ai/agentscope) |
| Release | `v2.0.10` |
| Commit | `e6c014f0be49b2a6f6f62a9453082a0b975484e1` |
| Source tree | `11d2173f891739d3e359af892eb576751a0a85f8` |
| Files | 1,178 ordinary files |
| License | Upstream Apache-2.0 license retained |
| Import commit | `cccc493` |
| Review state | Local review branch; push to the remote Draft PR is blocked by GitHub HTTPS connectivity, so the latest commits are not yet published |

## Reproduce the checks

From the repository root:

```bash
test ! -f .gitmodules
test -f vendor/agentscope/LICENSE
test "$(git rev-parse HEAD:vendor/agentscope)" = "11d2173f891739d3e359af892eb576751a0a85f8"
test -z "$(git ls-files --stage -- vendor/agentscope | grep '^160000 ' || true)"
```

The exact tree check is the primary completeness assertion. The import report records the local verifier, source syntax parse and package smoke test. The full upstream pytest suite was not run because the development dependencies are unavailable in the environment used for this import.

## Scope boundary

An ordinary-file snapshot makes source review independent of submodule initialization. It does not make Python dependencies, model services, Tuya APIs, ESP32 firmware, or device hardware available offline. No AgentScope runtime adapter, Tuya integration, or endorsement is implied. AECI-owned code remains outside `vendor/agentscope/`; upstream source and attribution must remain intact.

See [the import evidence](AGENTSCOPE_V2_0_10_IMPORT_REPORT.md), [third-party attribution](THIRD_PARTY.md), and [vendoring procedure](development/AGENTSCOPE_VENDORING.md).
