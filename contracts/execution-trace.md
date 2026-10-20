# Execution Trace Contract

This contract is the smallest shared fact between an agent runtime and a conformance runner. It describes lifecycle behavior, not a model provider, UI, storage product, or vendor SDK.

## Event shape

Each event is one JSON object on one line:

```json
{"seq":1,"type":"run.started","run_id":"fixture-basic","payload":{"input":"ping"}}
```

Required fields:

- `seq`: positive integer, strictly increasing from `1`.
- `type`: one of the event types below.
- `run_id`: stable identifier for the fixture run.
- `payload`: JSON object containing event-specific data.

Allowed lifecycle types for version `1`:

| Type | Meaning | Required payload |
| --- | --- | --- |
| `run.started` | Execution accepted | `input` string |
| `step.started` | A deterministic step began | `name` string |
| `step.completed` | The step produced a result | `name`, `result` |
| `run.completed` | Execution reached its declared outcome | `status` = `passed` |
| `run.failed` | Execution stopped with a classified failure | `code`, `message` |

The trace is valid only when it contains exactly one `run.started`, ends in either `run.completed` or `run.failed`, and has no duplicate sequence numbers. Timestamps are deliberately excluded from the conformance comparison; a runner may record them as out-of-band evidence.

## Compatibility rule

An adapter may add fields inside `payload`, but it must preserve the required fields and lifecycle ordering. A runner must report the first violated rule with a stable failure code rather than silently normalizing the trace.
