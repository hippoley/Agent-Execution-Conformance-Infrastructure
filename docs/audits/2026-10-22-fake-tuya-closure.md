# Closure Batch: process-separated fake Tuya execution boundary (2026-10-22)

## Decision and scope

The previous AgentPanel repository contained a command reference simulator that inspected its own mutable state. No command crossed a separate process/service boundary. This batch adds a **loopback-only test device service**, a Node HTTP adapter, and an *unverified* AgentScope v2 ToolBase bridge candidate. It leaves AgentPanel as the sole product architecture and never modifies `vendor/agentscope/`.

**Not a Tuya Cloud API**, certified device emulator, sandbox, production identity provider or hardware integration. Do not expose this service on a routable network; the default bearer token is a test fixture only.

## Falsifiable scenarios (local Node 22.16.0)

```bash
node --test runners/fake-tuya-integration.test.mjs
python -m py_compile adapters/agentscope_fake_tuya_tool.py
```

Observed in the local authored-file workspace: **4/4 Node tests passed**; Python bridge compiled successfully. Tests use a child Node OS process and a separate `127.0.0.1` HTTP service for device-state ownership.

- Authorized `lamp.set_power` changes that child service's state. Explicit GET readback matches, with a service-local monotonically increasing version.
- Wrong-device, unimplemented-capability, undeclared-argument and missing-token requests are rejected without modeled state change.
- Repeating an identical command_id has no second modeled effect; reuse with conflicting arguments is rejected.
- When the test service **applies the command then drops the HTTP ACK**, the client queries a named receipt and state rather than blindly resending the POST.
- A denied/expired command does not create a receipt or effect.

**Evidence ceiling:** a receipt and state GET served by the *same* synthetic process are not an independent physical-world oracle. The service is in-memory; restarting loses its ledger. The test does not kill the server mid-write, does not invoke the AgentScope Python runtime, does not connect to Tuya/ESP32, and does not verify sandbox isolation or production IAM. C4 (#4) remains OPEN.

## Interface split

- `runners/fake-tuya-service.mjs`: listens on loopback, authoritatively owns its synthetic state; authorization is a single test token plus static tenant/device scope.
- `adapters/fake-tuya-client.mjs`: issues a versioned command and reads receipt+state. No automatic POST retry on uncertain ACK.
- `runners/fake-tuya-integration.test.mjs`: spawns the service in another OS process; validates four end-to-end cases.
- `adapters/agentscope_fake_tuya_tool.py`: a **ToolBase adapter candidate**, bound to a fixed device/tenant/token and allowing only a boolean lamp state; source syntax verified but actual AgentScope Toolkit/agent-loop execution is BLOCKED by missing runtime dependency `mcp` in this environment.

## Dependencies / reuse

Upstream AgentScope v2.0.10 ToolBase and ToolChunk interfaces are reused, not forked. TuyaOpen remains the device/firmware integration target; no device driver, pairing or OTA was reimplemented. Existing enterprise/IAM/MCP stacks remain external. A passing fake-service test is not evidence of third-party adoption.

## Next release gate — remains OPEN

1. Install the **pinned** vendored AgentScope dependencies in an isolated test environment, register `FakeTuyaLampTool` via the upstream Toolkit and invoke it through an actual AgentScope agent/tool-call path. Preserve stdout JSON evidence and package versions.
2. Replace the fake-service-only observation with a separate authority (e.g. test device status or independent device event journal); verify ID and causal linkage, not just a matching final lamp state.
3. Add a test-only durable intent/outbox and injected child-process crashes before/after synthetic effect to tackle C4 (#4). No blind replay when authoritative status is absent.
4. After these pass, try one *approved, low-risk* Tuya/ESP32 hardware device with explicit human permission and properly scoped credentials.

No GitHub Actions were requested or required. The local 4/4 evidence pertains to the newly authored files; a clean checkout test of the eventual pushed `main` remains a separate gate.
