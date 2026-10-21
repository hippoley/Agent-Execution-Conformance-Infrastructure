# Managed Agents User Stories

## Product story

> As a maintainer of an agent-to-device integration, when an agent invokes a physical capability through MCP or a provider tool API, I need a portable test profile that checks authorization, expiry, retries, cancellation races and observed device state, so that an API-level success cannot be mistaken for a safe physical outcome. I accept the profile when an independent adapter can run the public fixtures and produce the same outcome classifications without importing this repository's simulator.

This is the first testable infrastructure capability inside the AgentPanel system architecture, not the whole platform. The broader stories below name the outcomes the managed-agent control plane and Tuya/ESP32 edge must eventually support; they do not imply that those services are implemented here or that this project should replace AgentScope or TuyaOpen.

## Architecture mapping

| Story family | Architecture boundary | Role in this repository |
| --- | --- | --- |
| M1-M14 | Managed Agents control plane, runtime and governance | Product requirements; not implemented services. |
| D1-D7 | Tuya device plane and ESP32 execution edge | Product requirements; no real device adapter or board validation. |
| C1-C4 | AECI conformance plane between cloud-agent adapters and device adapters | Current project slice: C1/C2 have simulator evidence; C3/C4 remain unimplemented. |

The AECI harness is test-time infrastructure. It checks that future adapters preserve the command and outcome contract; it does not sit as an extra production service on every device request.

## Repository-owned conformance stories

| ID | Story | Acceptance evidence | Failure boundary | State |
| --- | --- | --- | --- | --- |
| C1 Profile reuse | As an adapter maintainer, I can run public command vectors against my own adapter, so I can check compatibility without importing the reference simulator. | Versioned fixtures, documented adapter interface, JSON report and non-zero exit on a deliberate false-success adapter. | Harness requires project internals or accepts a false-success result. | Partial: 9 versioned v0.2 vectors and local harness exist; no independent adapter result. |
| C2 Effect outcome | As an operator, I can distinguish accepted/executing from observed physical success, so I do not report a requested effect as completed without evidence. | State-setting command returns `succeeded` only with postcondition evidence; missing readback is `unverified`. | Transport/API acknowledgement is treated as physical completion. | Partial: v0.2 rejects unimplemented capability names and undeclared arguments; still simulator-only, no independent physical effect. |
| C3 Cancellation disposition | As a user/operator, when an in-flight tool/task is cancelled, I can learn whether the physical action was prevented, stopped, already completed, or remains unknown, so cancellation UI does not imply rollback. | MCP cancellation reaches an adapter; race vectors assert both operation state and effect state/disposition. | Cancelled request is represented as proof that the physical effect did not happen. | Not implemented. |
| C4 Crash reconciliation | As an operator, after a process/device restart during a command, I can reconcile an ambiguous effect before retrying, so a timeout cannot double-actuate. | Fault injection between dispatch, effect, readback and record persistence yields `unknown` plus a reconciliation-required state, never blind retry. | The system automatically retries an ambiguous non-idempotent effect. | Not implemented. |

## Primary roles

- **Application owner**: publishes an agent and integrates it into a business channel.
- **Platform operator**: manages tenants, providers, quotas, secrets, rollouts and incidents.
- **Agent author**: defines prompts, tools, skills, knowledge and evaluation cases.
- **Security operator**: approves credentials, permissions and audit policies.
- **Framework maintainer**: implements or validates a provider adapter.
- **Business user**: starts a session and receives progress and results.
- **Device owner**: pairs an ESP32/Tuya device, grants scoped capabilities and can revoke them.
- **Firmware maintainer**: builds, signs, stages and rolls back supported device firmware.

## Stories and acceptance evidence

| ID | Story | Acceptance evidence | Failure boundary |
| --- | --- | --- | --- |
| M1 | As an agent author, I can publish immutable agent versions containing instructions, model tier, tools, skills and metadata, so a run is reproducible. | Create, list, get, archive endpoints; archived versions cannot start new runs; version hash appears in traces. | A run resolves mutable configuration or an archived version. |
| M2 | As a business user, I can create, resume, stream and archive a session, so long work survives a disconnected client. | Session event log is ordered, resumable by cursor, and replay produces the same non-time fields. | Events are lost, duplicated, or cannot be attributed to a session. |
| M3 | As a security operator, I can run an agent in an isolated environment with an explicit lifecycle, so one tenant cannot access another tenant's process or files. | Isolation fixture denies cross-tenant process, network and filesystem access; cleanup is observable. | A tool escapes the declared environment or cleanup is unverified. |
| M4 | As an agent author, I can attach versioned files and context to a run, so inputs are inspectable and reproducible. | Upload metadata, content hash, mount scope and deletion record are linked to the trace. | A run reads undeclared or mutable files. |
| M5 | As an agent author, I can store, version, redact and delete memory by scope, so useful context persists without leaking sensitive data. | Memory read/write/redact fixture proves tenant/session scope and audit trail. | Redacted content remains retrievable or scope is ambiguous. |
| M6 | As a business user, I can search an approved knowledge base during a run, so answers cite controlled source material. | Ingestion version, retrieval query, document IDs and citations appear in trace evidence. | Retrieval returns unapproved content or cannot be reproduced. |
| M7 | As an agent author, I can register MCP/tools with schemas and permissions, so the model can discover only allowed actions. | Tool list is schema-valid; deny-by-default and invalid-argument fixtures are recorded. | A tool executes without authorization or schema validation. |
| M8 | As an agent author, I can package and version reusable skills, so a tested workflow can be reused by another agent. | Package hash, dependency set and compatibility range are recorded; rollback restores a prior version. | Skill behavior depends on undeclared host state. |
| M9 | As a security operator, I can store credentials in a vault and inject them only into an authorized run, so secrets never enter prompts or traces. | Secret values are absent from logs; access is denied outside scope and every read is audited. | A secret is persisted in event payloads or accessible to another tenant. |
| M10 | As an operator, I can expose a signed webhook and replay an event, so external systems can trigger work safely. | HMAC verification, idempotency key, replay result and dead-letter status are observable. | Duplicate delivery causes duplicate side effects or unsigned input is accepted. |
| M11 | As an operator, I can route requests across model providers by policy and tier, so cost and latency choices do not change client integration. | Provider selection and fallback appear in trace; contract tests pass for AgentScope and Bailian adapters. | Provider-specific response semantics leak through the public API. |
| M12 | As an agent author, I can evaluate traces against versioned cases and judges, so a release decision uses evidence rather than intuition. | Evaluation result links to exact agent, fixture, trace and evaluator version. | Scores cannot be reproduced or are detached from the run. |
| M13 | As an operator, I can coordinate multiple agents with explicit roles and budgets, so complex work is bounded and inspectable. | Coordinator trace shows delegation, member versions, budget and final aggregation. | A member can recursively expand scope without a budget or audit record. |
| M14 | As a platform operator, I can attribute tokens, tool calls, runtime and storage to tenant, app and agent version, so quotas and billing are enforceable. | Usage ledger is immutable, trace-linked and reconciles with provider reports. | Quota decisions rely on estimates that cannot be reconciled. |

## Tuya and ESP32 stories

| ID | Story | Acceptance evidence | Failure boundary |
| --- | --- | --- | --- |
| D1 Device identity | As a device owner, I can pair an ESP32 device to a tenant and revoke it, so cloud commands cannot target an unknown or transferred device. | Device identity, tenant binding, pairing state and revocation are auditable; revoked identity is denied in a replay fixture. | A stale credential or device ID can still issue or receive privileged actions. |
| D2 Bounded device capability | As an agent author, I can discover typed device capabilities through an MCP server, so the cloud agent can request only declared operations. | MCP tools/list schemas match the device capability manifest; tools/call validates arguments and returns a typed result. | Free-form shell/code execution or undeclared hardware access is exposed. |
| D3 Authorized command execution | As a device owner, I can approve a capability scope and let the cloud agent request an action, so physical effects stay under explicit policy. | Deny-by-default allow/deny fixtures, expiry, idempotency, timeout and audit trace; read-after-write confirms physical state where available. | Duplicate, expired, cross-tenant or unapproved commands cause an effect. |
| D4 Conversational device control | As a user, I can speak to a device and receive spoken feedback, so interaction remains responsive while reasoning runs in the cloud. | Wake/VAD/AEC/Opus events correlate to a cloud session; abort interrupts playback/action; latency is measured at defined boundaries. | Device becomes stuck speaking/listening or a late response executes after abort. |
| D5 Offline and reconnect behavior | As a user, I can still use declared local controls during cloud/network loss, so basic device safety does not depend on LLM availability. | Offline fixture shows local safe controls, queued non-privileged telemetry, and deterministic reconnect reconciliation. | A queued stale command executes after reconnect or safety control requires cloud access. |
| D6 Firmware lifecycle | As a firmware maintainer, I can stage signed firmware updates by hardware cohort and roll back a failed update, so the fleet remains recoverable. | Signature verification, cohort rollout, health gate and rollback are tested on supported boards. | Unsigned firmware is accepted or a failed update bricks the supported recovery path. |
| D7 Device observability | As an operator, I can correlate device event, cloud session, MCP call and physical result, so failures can be diagnosed end to end. | Correlation IDs and sequence numbers survive transport and appear in a redacted trace. | Device logs leak secrets or events cannot be joined to the cloud run. |

## Priority and proof order

1. **P0 Profile grounding:** compare vectors with PhysMCP, MCP Tasks, TuyaOpen capability/DP semantics and existing physical-action safety profiles; remove duplicated normative rules.
2. **P1 Adapter harness:** publish a stable adapter API, fixture format, report schema and false-positive/false-negative harness tests.
3. **P2 Cancellation and ambiguity:** add real MCP cancellation propagation plus device effect disposition and crash-window reconciliation vectors.
4. **P3 TuyaOpen/ESP32:** pin one board and firmware release; map Tuya identity/capability semantics; run hardware-in-the-loop with safe, low-risk actuators.
5. **P4 Adoption:** seek one independent adapter or maintainer review with a reproducible result before expanding scope.

M1-M14 describe future managed-agent platform needs. D1-D7 describe IoT product needs. This repository's initial scope is their cross-boundary conformance problem, not implementing each epic.

## Cloud/edge responsibility contract

- **Cloud:** natural-language interpretation, planning, model routing, RAG, long-term memory, authorization policy, session history, evaluation and tenant usage.
- **ESP32:** wake word, audio capture/playback, local UI, bounded device state machine, safe local controls and typed capability execution.
- **Tuya plane:** device identity/connectivity, supported device APIs, pairing and OTA services according to the actual product entitlement.
- **MCP boundary:** discovery and invocation schema between agent and device capability. MCP does not replace device authentication, authorization, transport security, or physical-state confirmation.
- **MCP long-running operations:** reuse MCP Tasks or cancellation where supported for request lifecycle. A cancellation notification or canceled task state alone does not prove a physical action was prevented or reversed; the adapter must report device disposition and observed state separately.

Do not put secrets, unrestricted shell access, arbitrary code execution, or unbounded agent planning on the microcontroller. The edge remains safe and useful when the cloud agent is unavailable.

## External design references

- [TuyaOpen](https://github.com/tuya/tuyaopen): reuse its cross-target SDK and supported device security/connectivity/OTA facilities. The repository identifies ESP32-family targets as supported; actual board, audio peripheral and entitlement still need validation.
- [TuyaOpen ESP32 platform component](https://github.com/tuya/TuyaOpen-esp32): consume as part of the parent TuyaOpen project rather than treating it as an independent SDK.
- [xiaozhi-esp32-server-java](https://github.com/joey-zhou/xiaozhi-esp32-server-java): reference its split between device/admin/OTA management and realtime dialogue processing. Its README also documents device monitoring and OTA paths; its specific implementation is not proof of our contract or adopter demand.
- [AgentScope](https://github.com/agentscope-ai/agentscope): use as one cloud runtime/provider behind a stable adapter.
- [MCP cancellation](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/basic/patterns/cancellation.mdx) and [MCP Tasks](https://tasks.extensions.modelcontextprotocol.io/specification/draft/tasks): reuse operation tracking/cancellation primitives where supported, while retaining explicit device-side outcome semantics.

## Non-goals

The diagram does not justify implementing every transport, model, vector database, hardware device, or workflow editor in the first release. Those are replaceable integrations. The durable product is the versioned execution, authorization, event, evaluation and usage contract that lets those integrations remain interchangeable.
