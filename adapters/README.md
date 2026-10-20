# Adapters

Adapters translate framework and device APIs into the shared AgentPanel contracts. The current device adapter test interface is [`contracts/device-adapter.md`](../contracts/device-adapter.md); the execution-trace contract is a future lifecycle profile, not yet exercised by a runner.

No framework or production device adapter ships yet. An AgentScope adapter should map its tool-call lifecycle to the device-command contract; a TuyaOpen adapter should map that contract to a real supported device path. Integration code must not modify the vendored source under `vendor/agentscope/`.
