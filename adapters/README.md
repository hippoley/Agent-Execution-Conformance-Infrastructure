# Adapters

Adapters are the only project-owned code allowed to know a framework's lifecycle API. Each adapter maps framework events to [`contracts/execution-trace.md`](../contracts/execution-trace.md) and declares which capabilities it cannot represent.

No framework or device adapter ships yet. An AgentScope adapter can be added after the profile is independently useful; a Tuya adapter should wait for a real device fixture and verified permission boundary. Integration code must not modify the vendored source under `vendor/agentscope/`.
