# Architecture and ownership boundaries

```text
untrusted proposal (JSON)
        |
        v
src/aeci/contract.py  -- deterministic, deny-by-default decision
        |
        +--> Decision: allowed + reason codes
        |
        X  No device execution, no state mutation

future: adapters/agentscope -> independent contract -> adapters/tuya
                          (not implemented)
third_party/agentscope: upstream Git submodule, not first-party source
```

## Ownership rules

- `src/aeci`: first-party original implementation, no import from a specific agent framework.
- `adapters`: integration-specific translation only; adapters must not grant privileges by themselves.
- `third_party`: licenses, source identities, and upstream provenance remain intact.
- `examples` and `tests`: executable evidence, not marketing assertions.

## Evidence boundary

The current checker can produce a deterministic authorization *decision*. It cannot attest who made the request, whether a device received the command, or whether the requested physical state occurred. Execution receipts, physical observations, replay and idempotency controls, and independent conformance profiles remain future work.
