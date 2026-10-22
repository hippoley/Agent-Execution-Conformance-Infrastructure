# Virtual Fleet and Agent Roles — first runnable slice (2026-10-22)

## Reality check

**Not implemented:** virtual machines (VMs), hardened containers, Tuya proprietary/managed sandbox creation, deployed multi-Agent orchestration, AgentScope Toolkit integration, DOS platform integration, any real Tuya/ESP32 actuation or independently observed physical effect.

**Implemented in this closure:** `runners/virtual-fleet-lab.mjs` creates 2–8 separate **local Node child processes** running the pre-existing fake Tuya test service. Each process has its own tenant/device identity, randomly generated bearer token, in-memory synthetic lamp/receipt state and dedicated loopback port. A deterministic role flow separates planning input, pre-dispatch policy, parallel dispatch and readback inspection. It is a **development harness**, not a secure sandbox, multi-LLM-agent runtime, tenant IAM or VM manager.

### Tested role flow

```text
Test Runbook (fixed commands, NOT LLM output)
     |
     v
Policy role: actor + tenant + device + supported capability
     |  all steps checked before any dispatch
     v
Executor role: parallel HTTP requests to per-device child processes
     |
     v
Observer role: receipt + device service state readback
     |
     v
SIMULATED_WORKFLOW_CONFIRMED / PARTIAL_SIMULATED_EFFECT /
UNKNOWN_OR_FAILED / DENIED_BEFORE_DISPATCH
```

Start and stop the fleet within tests; all ports bind to 127.0.0.1. No cloud keys or Tuya entitlement are needed.

```bash
node --test runners/virtual-fleet-lab.test.mjs
# Or the whole development test suite:
node --test runners/*.test.mjs
```

**Local verification:** Node.js 22.16.0, **4/4 PASS** on exact SHA-verified source. Tests spawn three child device processes and exercise:
1. Parallel two-device updates while a third device stays unchanged.
2. Cross-tenant unauthorized runbook rejected before any device sees a command.
3. Unsupported operation or duplicate device target rejected fail closed.
4. Cross-device bearer token denied, and wrong target produces no state change.

Git blob SHAs of locally tested files:
- `runners/virtual-fleet-lab.mjs`: `ea7dda3813b152df089a1036153efe3dd052e228`
- `runners/virtual-fleet-lab.test.mjs`: `ed45637c2e32e9bc5b41f07ad19024225be1b036`

Existing `runners/fake-tuya-service.mjs` now accepts `AGENTPANEL_TEST_TENANT` and `AGENTPANEL_TEST_DEVICE` from the parent-only development harness. It still defaults to the original test identity for previous callers. These environment variables are NOT a production identity or authorization system.

## Important isolation and reliability limitations

- Separate OS processes **are not VMs, containers, or secure tenancy isolation**. Every child still runs under the host account; no seccomp/network or filesystem confinement is claimed.
- The role flow does **not** instantiate real AgentScope agents. It is a deterministic orchestration simulator. Agent-created workflows and official Tuya DOS orchestrations must be integration-tested separately.
- Plan validation is a development policy; the child HTTP service uses a test bearer token and has no secure remote IAM.
- Each child stores state/receipts in memory. A process crash loses those records. Previous C4 recovery probes are separate test programs; this fleet is not a durable multi-device transaction coordinator.
- A validated two-device parallel run can result in partial effects if one worker fails. No physical rollback or atomic multi-device transaction is claimed.
- Client reports `CONFIRMED_IN_FAKE_SERVICE`, **not physical success**. Both receipt and readback remain inside that child simulator.
- The runner generates a new command ID on each workflow invocation; it is stable *during that execution* but not across restarted agent runs. Durable tool-call identity must precede a live-device integration.

## Reuse the actual Tuya/AgentScope platform

Official Tuya documents describe **Omni AI Foundation DOS** multi-Agent orchestration / parallel tool isolation and **TuyaClaw** device orchestration. They do not establish that the service creates one dedicated VM per Agent. Separate Tuya Wind IDE Linux VMs refer to **development/build hosts**, not Agent runtime sandbox guarantees.

- [Official Omni AI Foundation v2.6 / DOS](https://developer.tuya.com/cn/docs/iot/oaf-26?id=Kfndvfhrsej2t)
- [Official TuyaClaw architecture](https://developer.tuya.com/en/docs/iot/tuyaclaw?id=Kfne2xmqalrge)
- [AgentScope v2](https://github.com/agentscope-ai/agentscope)
- [TuyaOpen](https://github.com/tuya/TuyaOpen)

**Future acceptance ladder**, in this order:
1. **Agent lifecycle + registration:** use pinned AgentScope Toolkit and agent runner with role-specific tool permissions. Demonstrate real framework calls, not deterministic stub functions. Reuse upstream multi-agent rather than clone DOS.
2. **Actual sandbox isolation:** use supported AgentScope sandbox / maintained container or VM manager. Enforce tenant-specific filesystem/process/network/pid/cpu constraints and test denial of unauthorized cross-tenant access; container is not automatically equivalent to a VM.
3. **Durable orchestration:** persist signed/trusted execution intent, stable command ID per tool call, task state, per-device outcome and cancellation semantics; recover partial multi-device effects and ACK uncertainty.
4. **Hardware fleet:** connect official Tuya Cloud adapter to a real test account, TuyaOpen ESP32 board, map real DP schema and independent observable device effect, with safe test-only actuation. Gate in [Issue #8](https://github.com/hippoley/Agent-Execution-Conformance-Infrastructure/issues/8).
5. **Independent adopters:** publish versioned fleet conformance fixtures that two different adapters can run, and secure external developer review. Until then, no ecosystem adoption has been validated.

**No Docker, VM, AgentScope SDK, cloud, real board, CI or hardware tests are claimed for this closure.** 
