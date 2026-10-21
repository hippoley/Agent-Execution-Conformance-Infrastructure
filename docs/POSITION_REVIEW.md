# Position Review: Physical Agent Execution

## Current thesis

Within the AgentPanel system architecture, the repository may benefit from clear command contracts between the managed cloud agent runtime and physical device capabilities. AgentScope supplies an upstream runtime candidate; TuyaOpen and ESP32 supply the device/edge path. The current local test harness checks a simulator against those command semantics; it is an engineering aid, not a product layer, competing runtime, device SDK, or production control plane.

The candidate gap is not another agent framework, IoT SDK, MCP replacement, policy engine, or general observability convention. It is a portable conformance profile for translating asynchronous agent operation outcomes into physical-effect outcomes: authorization, expiry, retries, cancellation races, ambiguous completion and read-after-write verification must remain distinguishable across runtimes and device transports.

This is a useful infrastructure candidate because a stronger model does not remove the need to prevent an expired command from opening a lock, or to prove whether a device actually changed state. Better models increase the number of actions, which increases the need for this boundary.

## What is proven in this batch

- A transport-neutral command envelope and JSON Schema exist.
- A reference validator accepts only a principal context supplied by a trusted authentication boundary, then checks tenant/device binding, expiry, maximum validity, and capability policy.
- The simulated device stores idempotency records and state snapshots; a repeated command is classified without repeating the modeled effect, including after restoration from a saved snapshot.
- Reuse of an idempotency key with changed command content is rejected.
- Concurrent duplicate deliveries produce one modeled state transition in the in-process simulator.
- A public adapter interface, seven machine-readable conformance vectors, and a CLI report work against the reference simulator; a deliberately false-success adapter is detected as non-conformant.
- Acceptance is explicitly distinct from physical success.
- Twelve local tests pass with Node's built-in test runner and no model key, Tuya account or hardware.

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

The hypothesis is that request/task status and physical effect disposition can diverge. Existing work already covers much of physical-action safety, so a possible contribution is clearer interoperability evidence across MCP cancellation/task semantics and device-effect outcomes. The seven current vectors do not test this hypothesis. External demand remains unproven. Keep this as a local engineering test profile unless an independent adapter or maintainer validates its value.

## Next action

The exact SINT physical-AI fixture and schema have now been compared with this repository's seven command vectors. A semantic gap remains around post-dispatch cancellation and physical-effect reconciliation, but there is no proof yet that an independent adapter needs this repository. The next closure is a small transport-neutral effect-disposition fixture set that reuses MCP task states, followed by an independent adapter run. If that run cannot be obtained, stop expanding the profile and offer the cases upstream. Pin a TuyaOpen/ESP32 integration only after the contract survives independent use.
