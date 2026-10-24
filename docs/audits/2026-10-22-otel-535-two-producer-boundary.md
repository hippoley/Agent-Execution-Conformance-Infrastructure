# OpenTelemetry #535 — independent producer comparison (2026-10-22)

## Grounded sources

- Devplane pinned renderer: https://github.com/hupe1980/devplane/blob/055b414af45b373339164dc349901757e44b3147/src/core/genai.rs
- Foreman capture: https://github.com/karank2512/Foreman/blob/main/docs/otel-evidence/web-worker-receipt.ndjson
- Foreman notes: https://github.com/karank2512/Foreman/blob/main/docs/OTEL.md
- Proposed, **not adopted**, convention: https://github.com/open-telemetry/semantic-conventions-genai/pull/535

## What each producer actually supports

| Property | Devplane | Foreman |
| --- | --- | --- |
| Shape | OTLP/JSON **log renderer**, emits stdout from stored decisions; not an exporter | OTLP/HTTP **trace-span events**, worker/web |
| Decision outcomes | allow, deny, require_approval | allow, deny, require_approval, plus custom expired |
| Tool call ID | Explicitly omitted; decision row ID is not substituted | Foreman-local ToolCall row ID, stable across web/worker |
| Correlation | Insufficient source id for tool-call join | Local cross-process join by call ID and execution ID |
| Authority | Private namespaced key where known; absent if unknown | Application-specific review role/source |
| Effect proof | None | Simulated execution spans, not authoritative external physical effects |

**Important correction:** #535's current registry describes `gen_ai.tool.call.id` as the *tool call identifier*, not strictly a model-owned identifier. Foreman's locally sourced ID is not automatically a schema violation. Devplane's conservative omission also must not be relabeled nonconformance without a normative requirement.

## Small executable consumer probe

`node --test runners/otel-decision-evidence.test.mjs`

Six tests use **explicitly synthetic normalized records** patterned after these two public producers. They test safe join/no-join interpretation, not byte-for-byte replay of upstream output, provider SDKs, or normative compatibility. Missing tool call IDs remain **unjoinable**; do not fill them with a different row ID. Different execution scopes do not merge. Custom outcomes remain outside this probe's three-known-value profile. A decision event alone never proves tool execution or an external effect.

**Unclosed gates:** parse the unchanged producer artifacts in their native OTLP envelope shape; pin source revisions for both; independent implementer review; verify whether the SIG wants any further constraints before changing the proposed convention. No GitHub Actions and no upstream comments are needed for this local comparison.


## 2026-10-22 Foreman artifact replay update

The pinned `fixtures/otel/foreman-web-worker-receipt.ndjson` contains 6 OTLP/JSON envelopes, 9 spans, 4 decision events and 3 `execute_tool` spans. Parsing the retrieved artifact bytes with equivalent extraction/join logic yielded two lifecycles:

- `require_approval → allow`: one matching execute span (`APPROVE_ONE_EXECUTION`).
- `require_approval → deny`: zero matching execute spans (`DENY_NO_EXECUTION`).

Both service names (`foreman-worker`, `foreman-web`) appear. All four decision events in this fixture have a tool-call ID and execution ID under the current join rule.

**Verification boundary:** this confirms the *captured fixture's shape and observed relationship*, not that the committed Node module/tests have run. The current environment could not resolve github.com to clone the branch; `node --test runners/otel-foreman-replay.test.mjs` remains pending. The telemetry is explicitly simulated and absence of an execution span is not proof that no external effect occurred outside the captured evidence.
