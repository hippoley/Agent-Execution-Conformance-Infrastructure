# Implementation Status — 2026-10-21

**This is the current source-of-truth for implementation claims.** See [ARCHITECTURE.md](ARCHITECTURE.md) for the target design; a drawn service is not implemented merely because it appears there.

## Implemented / verifiable from repository content

| Asset | State | Boundaries |
| --- | --- | --- |
| `vendor/agentscope/` | Imported as ordinary files | Git tree `11d2173f891739d3e359af892eb576751a0a85f8`, upstream v2.0.10; license present; dependencies and services not bundled |
| `contracts/device-command*` | v1 envelope/schema and semantics | Test contract, not production authorization |
| `runners/device-command.mjs` | Local reference state-setting simulator | In-memory effect / dedup, opt-in JSON snapshot; does not actuate hardware |
| `runners/conformance.mjs` | Public adapter test runner | Profile `agent-device-effect/0.3`: 10 deterministic JSON vectors |
| `runners/*.test.mjs` | Local test sources | Core and capability-boundary regressions; run all files, not one subset |
| `docs/` | Canonical product/system/stories/provenance | Documents planned capability separately from deployed code |

The vendor subtree's exact tree identity was independently checked via the GitHub tree object on 2026-10-21. The new device validator and suite in this change need a **fresh complete checkout test run**; their presence alone is not an execution result. Historical import report refers to verification on its original branch.

## Not implemented / unverified

- **AgentScope execution integration:** imported source has not been wired into an AgentPanel session/tool loop.
- **Managed-agent services M1–M14:** product requirements; no complete deployed control plane.
- **Tuya IoT / TuyaOpen / ESP32 D1–D7:** no real credentials, paired board, end-to-end command, readback, offline handling or firmware proof.
- **Conformance C3/C4:** no cancellation disposition, multiprocess crash-window reconciliation or real external outcome oracle.
- **Sandbox isolation:** no live process/filesystem/network isolation acceptance.
- **Security:** injected `principal.authenticated` is not proof of IAM, cryptographic identity or policy enforcement.
- **External adoption:** no independently maintained adapter or downstream dependency confirmed.

## Verification commands

```bash
node --test runners/*.test.mjs
node runners/conformance.mjs runners/device-command.mjs
bash tools/verify_release.sh
```

Do not run GitHub Actions unless a code change strictly requires a remote-only verification. The full AgentScope pytest suite is not claimed to have passed.

## Next acceptance gate

Build an isolated local fake Tuya service and a thin AgentScope adapter without altering `vendor/agentscope/`. Demonstrate a real tool invocation and verify its result from an independently owned state store. Then permit *only low-risk test hardware* behind authenticated, scoped tool access. A green unit suite or an ACK alone never closes the hardware story.
