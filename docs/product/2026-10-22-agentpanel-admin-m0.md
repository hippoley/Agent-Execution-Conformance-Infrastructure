# Hardware Agent Studio M0 — first admin console (2026-10-22)

## What this IS
A browser-accessible **loopback development admin console**, with a lightweight Node HTTP service and no npm dependencies. In a local environment it allows:
- Create named local virtual lamp configurations by tenant.
- Create an Agent **configuration record** and bind allowed virtual devices to that record.
- Trigger a bounded simulated switch command through the existing `FakeTuyaClient` and process-local Fake Tuya HTTP service.
- See command status, simulated device state and recent run history.
- Persist Agent/device definitions and 250 most recent run records in a local JSON file with temporary-file rename and file sync.

```bash
node admin/server.mjs
# open http://127.0.0.1:4177 on the same machine
node --test tests/admin.test.mjs
```

This is the first **usable control-plane UI**, not a full Dify/Coze equivalent. The development backend has deliberately limited route and argument surface.

## Proof ceiling and deliberate limitations

**Do NOT expose this admin service on public interfaces or via a tunnel.** It has no real login, account authorization, CSRF/session system or resource quota. It binds only to 127.0.0.1. The in-process device service is an ephemeral test simulator with static capability and memory-only state. Its generated test bearer token is stored in the local JSON file; that file and `.local/` must remain ignored. An Agent is **configuration-only**, no AgentScope Toolkit or LLM has been instantiated, and no VM/container sandbox is created. A simulated success must never be reported as a true physical effect. The app's persisted device *configuration* survives restart but its simulated on/off state **does not**; this is intentional and shown by the UI.

### Implementation scope

| User-facing area | M0 | Not complete |
| --- | --- | --- |
| Agent Studio | Create/list Agent config + device binding | Model, Prompt, Skills, real AgentScope runtime |
| Device Studio | Create/list bound fake devices, see simulated state | Official Tuya virtual-device API, Tuya Cloud live device registry |
| Workflow Studio | One fixed bounded lamp action | Drag/drop graph, workflow versioning, multi-Agent execution |
| Sandbox Studio | Local fake-service loopback process | Docker/VM isolation and policy-enforced untrusted execution |
| Operations Studio | Simulated run history in local JSON | Distributed traces, authenticated audit and independent physical evidence |
| Deployment | Not built | Production credentials, releases, environment/rollback |

## Tests

Locally the stand-alone backend received 5 passing integration checks for config creation, cross-tenant denial, fake execution/state, malformed command denial, and restart persistence **with locally reproduced fake-service/client module stubs**. The GitHub version uses the actual existing `runners/fake-tuya-service.mjs` and `adapters/fake-tuya-client.mjs`. Before marking this slice CLOSED, run `node --test tests/admin.test.mjs` on a clean checkout, then `node --test runners/*.test.mjs`. Do not imply the *exact* uploaded GitHub file suite has been tested from a fresh checkout or that real AgentScope/Tuya SDK/ESP32 hardware is integrated.

## Next acceptance

1. Run exact checkout M0 smoke and integration tests. Fix any mismatch between the true Fake Tuya client and the new backend.
2. Replace development-only local state with a durable, access-controlled DB and proper sessions; make idempotent device operations and agent run IDs durable across restart.
3. Integrate real pinned AgentScope Toolkit for safe tool calls; do not represent config records as live agents before then (Issue #7).
4. Create real workspace and device abstraction independent of Tuya DP shape; adopt Tuya's official virtual device APIs where documented (Issue #8), avoid duplicate virtual machine infrastructure.
5. Add sandbox lifecycle with proven confinement and external process monitoring (Issue #9). No public deployment until IAM, CSRF, audit and isolation tests pass.

No CI or Github Actions have been launched for this UI.
