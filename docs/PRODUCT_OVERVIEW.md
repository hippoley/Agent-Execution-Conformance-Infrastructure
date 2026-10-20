# Product Overview

## What exists

AgentPanel is the target managed-agent and IoT system. AECI is its first executable infrastructure slice: a conformance profile for agent-to-device commands. The current runnable slice consists of:

- a transport-neutral device-command envelope and schemas in `contracts/`;
- a JavaScript reference simulator and adapter conformance runner in `runners/`;
- seven machine-readable command vectors in `fixtures/device-command/`;
- a complete AgentScope v2.0.10 source snapshot under `vendor/agentscope/`, kept separate from AECI-owned code.

The simulator exercises allow/deny, identity and capability checks, expiry, duplicate delivery, idempotency-key reuse and readback outcomes. It is test evidence for contract behavior, not a real device, production policy service or authenticated transport. The full customer system remains a target architecture.

## Product hypothesis

When an agent asks a device to act, an API-level accepted/completed state can diverge from the physical effect. A reusable profile may help adapter maintainers keep authorization, expiry, retries, cancellation and observed outcome semantics explicit across agent frameworks and device transports. The hypothesis remains unproven until an independent adapter uses the fixtures; no external adoption is recorded.

## Architecture views

- [System architecture](ARCHITECTURE.md): the canonical AgentPanel target and the AECI conformance layer within it.
- [Implementation status](IMPLEMENTATION_STATUS.md): code ownership and evidence boundary for what runs today.

The system diagram is kept in one canonical document so product overview does not duplicate it.

## Story map

| Area | User outcome | State |
| --- | --- | --- |
| Command conformance | Another adapter can classify bounded command outcomes from public vectors. | Partial local simulator; no independent adapter. |
| AgentScope source baseline | Reviewers can inspect the pinned upstream source without a submodule. | Complete on this review branch; not merged to `main`. |
| AgentScope runtime adapter | Run the same contract through AgentScope. | Not implemented. |
| TuyaOpen / ESP32 device path | Deliver an authenticated bounded action and verify device state. | Target only; no hardware validation. |
| Managed Agent platform (M1-M14) | Publish, run, govern and meter tenant-scoped agents. | Customer requirements, not repository implementation. |

Detailed actors, acceptance criteria and failure boundaries are in [USER_STORIES.md](USER_STORIES.md). The single primary story and proof gates are in [USER_STORY.md](USER_STORY.md). Strategic assumptions and falsifiers are in [POSITION_REVIEW.md](POSITION_REVIEW.md).

## Evidence ladder

1. **Local contract evidence:** current reference simulator passes seven vectors and the harness detects a deliberately false-success adapter. Test identity is injected; no real principal is authenticated.
2. **Independent implementation:** a separately maintained adapter passes the published fixtures without importing this code. Not yet achieved.
3. **Hardware evidence:** one named ESP32 board and pinned TuyaOpen release execute safe commands with traceable result/readback. Not yet achieved.
4. **External adoption:** a third-party issue, PR, dependency, citation, or documented deployment refers to a released contract version. Not yet achieved.

Claims must stop at the highest completed level. See [the position review](POSITION_REVIEW.md) for current falsifiers and next gates.
