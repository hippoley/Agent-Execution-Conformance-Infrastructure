# Upstream source organization for AgentScope-first Hardware Agent Platform

## Source ownership
- `vendor/agentscope/`: preserved upstream AgentScope v2.0.10 snapshot. **Only** Agent Runtime, including model calling, team and tool execution.
- `firmware/tuyaopen/UPSTREAM.lock`: existing pinned **v1.9.0** baseline; `bash tools/bootstrap_upstreams.sh core` retains this version rather than jumping to latest.
- `upstreams/sources.lock.json`: complete **candidate registry** of official Tuya/Espressif repositories, with verified Git commits as of 2026-10-23 and repository license metadata. This is NOT the upstream source tree and not a license audit.
- `tools/bootstrap_upstreams.sh`: opt-in selective cloned upstream trees into gitignored `.deps/`. No uncontrolled vendor copying, recursive vendoring, CI or flashing.
- `adapters/`: our narrow SDK/tool bridges. `runners/`: independent conformance testing; `admin/`: local development prototype, not production control plane.

## Dependency map, one owner per job
```
AgentPanel product/control plane [needs real IAM, persisted graph, deployment]
            |
AgentScope v2 (single Agent Runtime, MCP/Skills, model/team)
            |
AECI [policy gate -> command id -> idempotency -> receipt -> readback]
       |                                    |
Tuya official Cloud connector         TuyaOpen v1.9.0 switch_demo
  |                                         |
Official virtual device ID (API to verify) TuyaOpen-managed ESP32 platform + ESP-IDF
```
Device DP/schema and optional device-side MCP from `agentic-kit` only after a compatible module-level review. Optional ESP-SR for speech, Brookesia for display, esp-matter for a separate Matter build. Do **not** run Arduino-TuyaOpen beside TuyaOpen's own ESP-IDF toolchain, use esp-rainmaker as second cloud, or clone TuyaOpen-esp32 separately.

## Download matrix
```bash
bash tools/bootstrap_upstreams.sh core     # pinned TuyaOpen v1.9.0 only
bash tools/bootstrap_upstreams.sh cloud    # official SDK, control CLI, MCP SDK
bash tools/bootstrap_upstreams.sh ai       # agentic-kit, esp-sr
bash tools/bootstrap_upstreams.sh display  # esp-brookesia
bash tools/bootstrap_upstreams.sh matter   # isolated alternative target
bash tools/bootstrap_upstreams.sh all      # optional candidates but no platform subdeps
```
This needs access to github.com, git, Python, storage and compatible SDK toolchains. Do not run untrusted install scripts automatically. `--filter=blob:none` is used only as a transfer optimization; every checkout is pinned to an immutable commit SHA.

## 1:1 Tuya feature-parity gate (not yet achieved)
Official closed-source SaaS administration cannot be copied from OSS. Treat UI/API behavior as a documented parity contract. We need: tenant/home/product/device/DP data model; actual cloud inventory, DP readback; official virtual-device ID binding; voice/MCP; model/team/workflow execution; authentication/secrets; CI-minimized test; managed sandbox; release audit/rollback. A successful local fake service does not count as Tuya physical evidence.

## Acceptance
- Source manifest entries are verified public upstream commits, not automatic license clearance.
- Required open-source license files, notices and any binary/component-specific restrictions are reviewed **before redistribution**.
- Minimum valid runtime smoke: real AgentScope Toolkit -> AECI -> sanctioned virtual device -> independent state observation -> correlated Trace.
- ESP32 acceptance must include board, pin/DP map, flash, pairing, readback, lost ACK test and evidence. No test was performed on actual hardware in this batch.

## Technical debt to avoid
Do not edit `vendor/agentscope` or mirror ten upstream repos in git; integrate with package managers and pinned checked-out SDKs. Prevent dual workflow engines, dual cloud identity, multiple OTA state machines and model/tool permissions bypass.
