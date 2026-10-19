# Agent Execution Conformance Infrastructure

An upstream-faithful AgentScope 2.0 baseline plus separately maintained integration and conformance layers for AI agents operating real devices.

## Repository status

- **Upstream baseline:** [AgentScope](https://github.com/agentscope-ai/agentscope) (Apache-2.0), pinned at commit `402c3664f70cb339f397c5ee40e662bc0d99eed0`.
- **Copying strategy:** a Git submodule under `upstream/agentscope/` resolves to that **unchanged, exact upstream commit**, including its original files, authorship, license and history. This is a faithful checkout, not a reimplementation or a claim of authorship.
- **Tuya connection:** separate adapter under `integrations/tuya/`, beginning with a mockable device-execution contract and optional official Tuya Cloud OpenAPI client. This does **not** claim to clone Tuya's closed-source Agent management backend.
- **Safety:** all real device writes must be explicitly enabled and authorized; unit tests require no credentials or network.

## Clone and verify upstream

```bash
git clone --recurse-submodules https://github.com/hippoley/Agent-Execution-Conformance-Infrastructure.git
cd Agent-Execution-Conformance-Infrastructure
git -C upstream/agentscope rev-parse HEAD
# Expected: 402c3664f70cb339f397c5ee40e662bc0d99eed0
git submodule status
```

## Development workflow

1. Verify upstream AgentScope runs unchanged with Python 3.11+ per its own README.
2. Run the integration's standard-library unit tests: `python -m unittest discover -s integrations/tuya/tests -v`.
3. Start with simulated devices and deny-by-default authorization; only then test with a dedicated, non-production Tuya cloud project.
4. Keep source modifications in the integration layer until a proven upstream fix is needed.

See `docs/ARCHITECTURE.md`, `docs/ACCEPTANCE.md`, and `integrations/tuya/README.md` for the actual contract and acceptance gates.

## Attribution and licensing

AgentScope is authored and maintained by [agentscope-ai](https://github.com/agentscope-ai/agentscope). Its upstream license, notices and git history remain in the upstream submodule. Additional original integration code in this repository is separate. Do not imply any official partnership with AgentScope or Tuya.
