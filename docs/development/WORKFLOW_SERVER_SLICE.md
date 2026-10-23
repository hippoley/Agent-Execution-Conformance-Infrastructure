# Workflow backend slice — 2026-10-23

This is an actual server-side **deterministic** workflow execution module, not browser state simulation and **not a real AgentScope LLM / multi-Agent call**.

## Entry points
- `POST /api/workflows`: JSON `{"agentId":"<UUID>","name":"meeting","nodes":[{"id":"n1","type":"lamp.set_power","deviceId":"<UUID>","on":true}]}`
- `GET /api/workflows/<UUID>`: saved workflow definition.
- `POST /api/workflows/<UUID>/run` with `{}`: persist run + each node's command ID before sending, then dispatch sequentially to the existing external loopback fake Tuya HTTP service.
- `GET /api/overview`: includes workflows and saved run traces.

Workflow nodes are currently constrained to 1–12 `lamp.set_power` commands. All nodes are schema-checked and bound to the Agent's same-tenant authorized devices *before* any execution. A lost ACK or uncertain result never triggers blind retransmission; subsequent steps stop with `PARTIAL_OR_UNKNOWN`.

## Evidence and restrictions

- `runners/workflow-engine.mjs` is a new reusable engine; its **4/4 isolated Node unit tests passed locally** on exact blob SHA `f0b5c9c19bdc5292501d89db6fac2e385bc10f7b`.
- `admin/server.mjs` uses the true existing `FakeTuyaClient` and `createFakeTuyaService` external-device simulator, not browser localStorage.
- `tests/workflow-admin.test.mjs` checks end-to-end HTTP creation, 2-device execution, persistence and unauthorized device rejection; **clean checkout test execution not yet proven**, so mark HTTP integration pending until `node --test tests/workflow-admin.test.mjs` passes in a complete checkout.
- Write-ahead JSON persistence is a development record; not a production transaction queue. If the process crashes, intent may remain while the external effect is uncertain. No automated restart recovery / exactly-once guarantees are claimed. Multi-instance concurrency and production IAM are absent.
- Only loopback localhost; no public exposure. Do not put API credentials on GitHub Pages.

## Validation commands

```bash
node --test runners/workflow-engine.test.mjs
node --test tests/workflow-admin.test.mjs tests/admin.test.mjs
node --test runners/*.test.mjs
```

## Next genuine blockers

1. Make the graphical editor submit the **same persisted workflow schema**, not its browser-local copy.
2. Execute tool nodes via the actual pinned AgentScope `Toolkit.call_tool` and track real tool call ID, source/target policy and permission result, before claiming model/Agent execution.
3. External device observation/SDK verification and actual sandbox/VM isolation remain independent gates (#7, #8, #9).
4. Replace local JSON with authenticated durable storage and replay-safe outbox/receipt reconciliation before production use.
