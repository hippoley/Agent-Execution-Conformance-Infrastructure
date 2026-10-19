# Agent Execution Conformance Infrastructure

An independent integration and conformance project, using the complete [AgentScope](https://github.com/agentscope-ai/agentscope) 2.0 source as an immutable upstream baseline and adding Tuya adapters separately.

## Exact-source migration status

**PENDING ONE-TIME IMPORT.** `main` currently contains an AgentScope **git submodule**, not ordinary checked-in source files. We will not call this a completed 1:1 migration until the full source is committed as regular files and its Git tree SHA matches upstream.

- Source commit: `402c3664f70cb339f397c5ee40e662bc0d99eed0`
- Upstream tree SHA: `97ac65b28422ac44ef2d9d8315d6cf95e887d35f`
- Source inventory: **1,187 files / 17,138,367 bytes**.
- Destination: `upstream/agentscope/` (ordinary Git-tracked files after migration, no gitlink).
- Attribution: upstream copyright holders, original LICENSE and notices unchanged.

### Complete the import

**Preferred, no GitHub Actions charges:** clone this repository, then run:

```bash
bash scripts/migrate_agentscope_exact.sh
```

The script fetches upstream source, replaces the gitlink, verifies **exact Git subtree SHA equality**, commits to `migration/agentscope-source-402c3664f70c`, and pushes that review branch. Requires Git push rights and a clean checkout.

**Optional, may consume GitHub Actions minutes:** manually run [Import AgentScope complete source](../../actions/workflows/import-agentscope-source.yml). This workflow has only `workflow_dispatch`, so it never runs automatically.

See [migration instructions and verification gates](docs/SOURCE_MIGRATION.md).

## Planned Tuya integration (not shipped)

Only after the upstream source import, add `integrations/tuya/` to connect AgentScope via official Tuya APIs. Device execution should have deny-by-default write permissions, idempotency and physical state verification. Tuya's commercial agent management control plane is not claimed to be open source.

## License

AgentScope is Apache-2.0 licensed; preserve all original attribution and its LICENSE. This is an independent project, not an official AgentScope or Tuya distribution.
