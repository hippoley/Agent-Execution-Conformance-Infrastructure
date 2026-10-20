# Device Command Contract v1

This contract defines the safety-relevant boundary between a cloud agent and a physical device. It is transport-neutral: MQTT, WebSocket, HTTP or an MCP adapter may carry the envelope, but must not change its meaning.

## Command envelope

```json
{
  "schema_version": "1",
  "command_id": "cmd-0001",
  "tenant_id": "tenant-demo",
  "device_id": "esp32-demo",
  "session_id": "session-demo",
  "capability": "lamp.set_power",
  "arguments": {"on": true},
  "issued_at": 1000,
  "expires_at": 1060,
  "idempotency_key": "session-demo:cmd-0001"
}
```

The authenticated transport identity must match `tenant_id` and `device_id`; fields in the payload are not authentication. A policy decision must authorize the capability and arguments for the principal before dispatch.

## Required execution semantics

1. Reject an unknown schema version, capability, argument shape, tenant/device mismatch, expired command, or non-positive validity window.
2. Never execute a command after its expiry. The receiver checks expiry using a trusted clock or a transport/session lease; an untrusted device timestamp alone is insufficient.
3. Treat `command_id` and `idempotency_key` as deduplication keys within a documented retention window. A duplicate returns the original result and does not repeat the physical effect.
4. Return distinct states: `accepted`, `executing`, `succeeded`, `failed`, `expired`, `denied`, `duplicate`. Acceptance is not physical success.
5. For state-setting capabilities, read back state when supported. Report `succeeded` only when the defined postcondition is observed; otherwise return `unverified` or `failed`.
6. An abort/cancel is best effort after dispatch. The result must say whether the physical action was prevented, stopped, or already completed.
7. Trace records may include identifiers, policy outcome, capability, timing and redacted result; they must not contain credentials or raw secret material.

Version 1 uses integer epoch seconds and caps command validity at 300 seconds. `issued_at` and `expires_at` are checked by the trusted receiver clock. The JSON Schema checks field types; cross-field ordering, maximum duration, principal binding and replay behavior are semantic checks performed by the runner/adapter.

## Trust model

MCP describes capability discovery and invocation. It does not authenticate the device, authorize a tenant, protect a transport, guarantee delivery ordering, make commands idempotent, or prove a physical effect. Those properties belong to the adapter and device execution contract.

## Current scope

Version 1 covers a bounded state-setting command with expiry, authorization outcome, idempotency and result verification. It does not standardize pairing, firmware OTA, audio streaming, Tuya-specific device schemas or a particular transport.
