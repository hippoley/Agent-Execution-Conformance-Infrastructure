# AgentPanel — Product Overview

## Product proposition

A managed Agent can request a **bounded and authorized action** on a business or IoT resource, then receive a traceable classification of the *observed outcome* instead of treating an API acknowledgement as physical completion.

This is a target product, **not yet a deployed platform**. The present repository ships an upstream AgentScope v2.0.10 **source snapshot** and a small reference simulator / conformance development suite. It does not ship a real AgentScope↔Tuya integration, managed control plane, hardware adapter, production sandbox or independent hardware verification.

## One valuable first scenario

A business event or approved user request asks an Agent to set a low-risk device state.

1. AgentScope formulates a typed, bounded tool request.
2. Device identity, capability and parameter policy are checked at an independent trusted gateway.
3. A simulated device path can validate behavior without production access.
4. A separately authorized live adapter dispatches to a **test** device.
5. The outcome is classified as completed, failed, unverified or unknown using authoritative observations; no fabricated physical success.

**The current executable code only exercises part of steps 2–3 with injected test identity**, not the complete chain.

## Reuse, don't reimplement

- AgentScope: reasoning, tools, session/runtime foundations and supported workspaces.
- TuyaOpen / supported Tuya APIs: device connectivity, pairing, device-specific datapoints and firmware path.
- Existing IAM, audit and sandbox components: deploy proven systems rather than a homemade privileged shell.
- The project owns only the minimal integration and evaluation surface demonstrated by real user outcomes.

## Boundaries

- **Product system:** see [ARCHITECTURE.md](ARCHITECTURE.md), the one canonical AgentPanel diagram.
- **Actual build:** see [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).
- **User requirements:** see [USER_STORIES.md](USER_STORIES.md).
- **Evidence:** see [primary story](USER_STORY.md), [local audit](audits/2026-10-21-capability-boundary-closure.md) and [pinned source record](AGENTSCOPE_V2_0_10_IMPORT_REPORT.md).
- **External adoption and real device proof:** not yet recorded. A passing simulator fixture is not a hardware certification.

## Success gates

1. At least one end-to-end AgentScope tool request against an independently controlled fake device service.
2. An actual approved low-risk Tuya/ESP32 test device with independently verified state, without raw credentials in the model context.
3. Negative probes for wrong device, expired operation, permission denial, unreadable status and ACK ambiguity.
4. A documented business workflow whose measurable outcome is better than a direct deterministic API call.
5. Only then broaden device types, providers and managed-agent UI, if needed.
