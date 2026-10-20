# Architecture and ownership boundaries

```text
Agent / application
        |
        +--> src/aeci/contract.py -- deterministic proposal decision (demo)
        |
        +--> runners/device-command.mjs -- reference command validator/simulator
                    |                         |
                    |                         +--> fixtures + contracts
                    X No real transport or physical device

future: AgentScope adapter -> shared contract -> TuyaOpen / ESP32 adapter
        (not implemented)                       (not implemented)

vendor/agentscope: exact upstream v2.0.10 source snapshot; not first-party code
```

## Ownership rules

- `src/aeci`: first-party original implementation, no import from a specific agent framework.
- `contracts`: first-party experimental contract and schemas; not a standard or production authorization system.
- `adapters`: integration-specific translation only; no framework or device adapter ships yet.
- `vendor/agentscope`: immutable third-party source snapshot; preserve upstream licenses and provenance.
- `examples` and `tests`: executable evidence, not marketing assertions.

## Evidence boundary

The AECI proposal checker and device-command simulator are separate local demonstrators. The simulator exercises expiry, identity/capability checks, idempotency and state readback against a fake device; it does not authenticate a real principal, deliver a command, persist records safely across crashes, or attest physical state. Production transport, hardware observations, cancellation races and independent adapter validation remain future work.
