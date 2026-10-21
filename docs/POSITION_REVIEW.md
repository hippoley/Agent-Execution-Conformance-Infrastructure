# Position Review: Physical Agent Execution

## Current thesis

Within the AgentPanel system architecture, this repository should grow the contract and conformance boundary between the managed cloud agent runtime and physical device capabilities. AgentScope supplies an upstream runtime candidate; TuyaOpen and ESP32 supply the device/edge path. AECI tests the compatibility and outcome semantics between those independently evolving sides. It is not a competing agent runtime, device SDK, or production control plane.

The candidate gap is not another agent framework, IoT SDK, MCP replacement, policy engine, or general observability convention. It is a portable conformance profile for translating asynchronous agent operation outcomes into physical-effect outcomes: authorization, expiry, retries, cancellation races, ambiguous completion and read-after-write verification must remain distinguishable across runtimes and device transports.

This is a useful infrastructure candidate because a stronger model does not remove the need to prevent an expired command from opening a lock, or to prove whether a device actually changed state. Better models increase the number of actions, which increases the need for this boundary.

## What is proven in this batch

- A transport-neutral command envelope and JSON Schema exist.
- A reference validator accepts only a principal context supplied by a trusted authentication boundary, then checks tenant/device binding, expiry, maximum validity, and capability policy.
- The simulated device stores idempotency records and state snapshots; a repeated command is classified without repeating the modeled effect, including after restoration from a saved snapshot.
- Reuse of an idempotency key with changed command content is rejected.
- Concurrent duplicate deliveries produce one modeled state transition in the in-process simulator.
- The v0.1 baseline had a public adapter interface, seven machine-readable vectors and a CLI report against the reference simulator; a deliberately false-success adapter was detected as non-conformant.
- Acceptance is explicitly distinct from physical success.
- Twelve v0.1 baseline tests were reported as passing locally with Node's built-in test runner. The v0.2 change has not yet passed a full Node unit run.

## What is not proven

- No ESP32 board has executed a command.
- The simulator is not concurrency-safe across processes, does not model a crash between physical action and result persistence, and is not a secure persistent store. No TuyaOpen adapter, MCP server, MQTT/WebSocket transport, cancellation handling or cryptographic signature verification is implemented.
- No external project consumes the contract.
- No maintainer has reviewed or accepted the design.

## Falsifiers

Abandon or revise this direction if an existing adopted standard/profile already tests the same agent-to-physical-effect semantics; if physical devices cannot expose reliable postconditions for target capabilities; or if independent adapters do not find the fixtures useful. The project should map existing MCP task/cancellation and OpenTelemetry trace conventions rather than duplicate them.

## Competition and position

| Existing project | What it already covers | Implication for this repository |
| --- | --- | --- |
| [PhysMCP](https://github.com/alexlqi/physmcp) | Draft physical-device MCP vocabulary, manifests, feasibility and policy concepts. Its current README marks the conformance suite as not started. | Reuse its capability vocabulary if relevant; do not compete on device manifests. Absence of its suite does not prove demand for ours. |
| [Ori Runtime](https://github.com/ori-platform/ori-runtime) | Local agentic IoT runtime with graduated authority, offline safety, traceable action and broad device adapters. | Do not rebuild a physical agent runtime. A transport/profile conformance harness is a narrower possible complement. |
| [SINT Protocol](https://github.com/sint-ai/sint-protocol) | Physical-AI fixtures cover authorization/escalation, ROS2/SROS2 transport enforcement, e-stop rollback and decision receipts. The checked fixture schema is scoped to `ros2/sros2` and `pre-actuation`. | Reuse its authorization, safety and evidence work. Its checked fixtures do not assert MCP task cancellation mapped to post-dispatch device disposition or observed postcondition. This is an uncovered intersection, not proof of a market. |
| [MCP cancellation](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/basic/patterns/cancellation.mdx) and [Tasks](https://tasks.extensions.modelcontextprotocol.io/specification/draft/tasks) | Request/task lifecycle, cancellation and asynchronous status. | Reuse protocol states; test the bridge from those states to device-effect dispositions. |
| [TuyaOpen](https://github.com/tuya/tuyaopen) | Device firmware/connectivity/OTA infrastructure for ESP32 and Tuya targets. | Build an adapter/profile around it; do not replace its device stack. |

An OpenClaw issue documented that MCP host cancellation could fail to reach an in-flight plugin tool, with a focused fix and real wire-level probe in its PR. That PR is closed, so this is evidence of a specific resolved integration defect, not an open contribution target or proof of unmet physical-device demand. It reinforces that cancellation plumbing and physical effect cancellation are distinct test boundaries.

## Identity value gates

**6-12 months:** this becomes a credible identity credential only if the profile has a versioned release, a real TuyaOpen/ESP32 report, and at least one independent adapter/maintainer discussion that cites reproducible results. None of those adoption/hardware gates is met today.

**5-10 years:** only durable if the profile maps existing standards instead of freezing today's custom envelope, and if it accumulates independent compatibility reports across changing hardware and runtimes. Without that evidence this repo is replaceable documentation/code, not an entry credential.

## Ecosystem research and reuse boundary

- [MCP cancellation](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/basic/patterns/cancellation.mdx) is a best-effort request lifecycle primitive. It explicitly accounts for races; it does not establish that a physical effect was prevented or reversed.
- [MCP Tasks](https://tasks.extensions.modelcontextprotocol.io/specification/draft/tasks) provides async operation tracking/cancel concepts. The C# SDK documents cooperative, eventually consistent cancellation: acknowledgement does not guarantee work stopped. Reuse MCP task states and test only their mapping to a separate device-effect disposition.
- [OpenTelemetry GenAI conventions](https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/) already cover agent/tool-call trace attributes. Reuse trace context and redact sensitive payloads instead of creating a parallel observability schema.
- [TuyaOpen](https://github.com/tuya/tuyaopen) and its [ESP32 platform component](https://github.com/tuya/TuyaOpen-esp32) are the device stack to adapt, subject to board/release testing. Current public TuyaOpen issue traffic demonstrates ordinary device/SDK integration friction, but no reviewed issue yet proves demand for this conformance profile.

The leverage hypothesis is that request/task status and physical effect disposition can diverge. Existing work already covers much of physical-action safety, so the only plausible independent contribution is interoperability evidence across MCP cancellation/task semantics and device-effect outcomes. The original seven vectors do not test this hypothesis; v0.2 adds two capability-fail-closed negatives, not cancellation or crash reconciliation. External demand remains unproven. Present this as an experimental test profile, not a new standard, until an independent adapter or maintainer validates it.

## Next action

The exact SINT physical-AI fixture and schema have now been compared with this repository's v0.1 seven command vectors. A semantic gap remains around post-dispatch cancellation and physical-effect reconciliation, but there is no proof yet that an independent adapter needs this repository. The next closure is a small transport-neutral effect-disposition fixture set that reuses MCP task states, followed by an independent adapter run. If that run cannot be obtained, stop expanding the profile and offer the cases upstream. Pin a TuyaOpen/ESP32 integration only after the contract survives independent use.

## 2026-10-21 evidence/position ledger (unmerged review work)

- **C1/C2 engineering closure candidate:** [AECI PR #2](https://github.com/hippoley/Agent-Execution-Conformance-Infrastructure/pull/2) adds `agent-device-effect/0.2` with two falsifying negatives: a granted-but-unimplemented capability and unexpected arguments. On the prior code both were accepted by validation; the capability case could be misreported as success without any matching operation. The repaired code rejects both before effect mutation.
- **Verification ceiling:** published v0.2 validation and runner logic were replayed in-memory with file/hash stubs: 9/9 vectors match and an always-successful adapter fails. This is not the full Node test runner, actual SHA-256 persistence verification, hardware test, independent adapter, or external adoption. Keep the PR **draft** until full local tests are independently executed.
- **External technical participation:** [hippoley's evidence-first review in AAIF PR #60](https://github.com/aaif/wg-observability-and-traceability/pull/60#issuecomment-6305585327) is a publicly submitted evidence-analysis comment based on Foreman's source-pinned OTLP capture. It is **not** AAIF acceptance, an AECI citation, or proof that the WG uses this repository.
- **Reuse boundary:** [AAIF test-kit PR #57](https://github.com/aaif/wg-observability-and-traceability/pull/57) already covers synthetic effect/receipt correlation with independent readers. AECI should not clone that kit or create competing OTel names; its possible addition is **dispatch authority and physical-effect disposition under cancellation/crash ambiguity**, then an independent adapter report.
- **Open acceptance gates:** C1 independent adapter, C2 independent effect confirmation, C3 cancellation disposition, C4 ambiguous-crash reconciliation. M1–M14 and D1–D7 are broader system requirements, not silently closed by these fixture tests. No external AECI adopter or production deployment has been verified.
- **Pivot gate:** if an established conformance suite already checks the same boundary, or no independent adapter is willing to consume a pinned AECI profile after a narrowly scoped request, prioritize contributing the distinct negative cases upstream over expanding a standalone platform.
