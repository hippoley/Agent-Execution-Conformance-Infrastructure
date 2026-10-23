# Real AgentScope Toolkit integration gate (2026-10-23)

This is an integration **entrypoint**, not a claim of a completed real SDK test.

## Run against real pinned AgentScope v2.0.10

Install the pinned `vendor/agentscope` package and its Python dependencies in an isolated environment, including MCP, as specified by upstream. After installing, from the repository root:

```bash
python -m py_compile adapters/agentscope_fake_tuya_tool.py runners/agentscope_toolkit_smoke.py
python runners/agentscope_toolkit_smoke.py
```

`runners/agentscope_toolkit_smoke.py` starts our existing **separate Node HTTP test device** process, instantiates **real** `agentscope.tool.Toolkit`, `ToolCallBlock` and `AgentState`, streams the final `ToolResponse`, and checks:
- The default tool is denied and has no write path.
- A trusted opt-in test tool calls the fake device and receives `ToolResultState.SUCCESS` after matching receipt and test-device state.
- Invalid command argument fails.
- No model key, Tuya Cloud account, physical device or VM is involved.

## Critical fixes

The adapter now emits the same compact JSON bytes it hashes with SHA-256. Previously `_request` encoded Python's default whitespace-separated `json.dumps` while `_execute` hashed compact JSON: the fake HTTP server hashes the actual request bytes after `JSON.stringify` and comparison would fail despite a valid effect. This fix makes the simple constrained payload byte representation consistent. It is **not** a cross-language RFC 8785 canonicalization implementation.

The `check_permissions` method is now complemented by a **fail-closed check inside `call`**: the low-level `Toolkit.call_tool` method does not independently invoke the full agent PermissionEngine. Without explicit trusted `allow_test_execution=True`, the tool itself returns DENIED.

## Remaining OPEN

- This current runtime does not have `agentscope` or its Python `mcp` dependency installed. Therefore the new smoke command **has not been executed against the actual upstream package here**; it must not be treated as a passed integration test until run and captured on a real installed v2.0.10 environment.
- The adapter still makes a new random command identity for each separate logical `call`; stable durable intent-to-tool-call identity remains future work.
- No real model prompting, multi-Agent delegation, Tuya Cloud official virtual-device API, ESP32 physical readback, hardened sandbox, user IAM or production release.

This closes the *source-level SDK entrypoint and obvious interface mismatch*, not Issue #7's end-to-end acceptance. No GitHub Actions were triggered.
