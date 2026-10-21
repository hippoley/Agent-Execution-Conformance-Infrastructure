# C4 recovery classification boundary — 2026-10-21

This is a **test-only, pure classifier**, not a recovered device executor or a claim of crash-safe persistence. It makes one specific error detectable: treating a durable ACK/receipt alone as independently confirmed physical effect, or blindly redispatching a potentially non-idempotent operation when the outcome is ambiguous.

Run locally, without GitHub Actions:

```sh
node --test runners/crash-window-probe.test.mjs
```

Seven tests cover six synthetic window conditions and one missing-intent case. A matching independent effect observation permits CONFIRMED; an absent or conflicting observation produces UNKNOWN, and cannot authorize blind replay. The NOT_DISPATCHED case assumes that `dispatchStarted=false` is an **authoritatively durable** pre-dispatch fact, not a reconstructed in-memory guess.

**Not completed:** separate OS-process termination, fsync durability, an independent authoritative physical effect journal, command digest/idempotency conflict handling, actual cancellation races, or a Tuya/ESP32 adapter. C4 remains OPEN. A later process-kill test must challenge the assumption that `dispatchStarted=false` can be trusted across power loss.

This experimental code belongs to AECI-owned `runners/` and does not modify `vendor/agentscope/` or AgentPanel runtime.
