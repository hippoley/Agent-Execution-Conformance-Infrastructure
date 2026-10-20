# Runners

A runner converts a fixture and an adapter into machine-readable evidence. It owns validation and exit codes; adapters only translate framework lifecycle events into the execution trace contract.

The generic agent lifecycle runner for `fixtures/basic-lifecycle.jsonl` is planned, not implemented. The device-command reference runner below is implemented and requires no model API key. Keep provider calls, timestamps, and terminal formatting outside compared traces so failures remain attributable to execution semantics.

The device reference validator is runnable today:

```text
node --test runners/device-command.test.mjs
node runners/device-command.mjs valid 1020
```

Run the published adapter conformance profile with the reference implementation:

```text
node runners/conformance.mjs runners/device-command.mjs
```

An independent adapter exports `createDevice({ initialState })` as defined in [`contracts/device-adapter.md`](../contracts/device-adapter.md). The vectors live in [`fixtures/device-command/conformance.json`](../fixtures/device-command/conformance.json); the CLI emits JSON and exits non-zero when any vector fails.

It is a contract reference, not a claim that a physical device or Tuya account has been tested. The accepted result means policy and envelope checks passed; it does not mean the physical state changed.

Possible future command shape:

```text
conformance run --fixture fixtures/basic-lifecycle.jsonl --adapter agentscope
```

Exit code `0` means the trace satisfies the contract. Any contract violation must return a non-zero code and a stable failure code. Until a runtime is added, this directory intentionally contains no claimed passing command.
