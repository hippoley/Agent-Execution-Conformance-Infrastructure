# Exact AgentScope source migration

**Requested outcome:** move **all** AgentScope files, including Python package, tests, docs, Web UI, sample assets and binary images, into `upstream/agentscope/` as ordinary tracked files in this repository.

- Source: https://github.com/agentscope-ai/agentscope
- Commit: `402c3664f70cb339f397c5ee40e662bc0d99eed0`
- Source root tree: `97ac65b28422ac44ef2d9d8315d6cf95e887d35f`
- Git object inventory: **1,187 blobs (17,138,367 bytes) and 202 directory trees** at pinned commit.
- Expected result: `git ls-tree HEAD:upstream/agentscope` equals the upstream tree, `.gitmodules` and the gitlink are removed.

## How to complete the import

Choose **one** method:

**Zero GitHub Actions minutes (preferred):**

```bash
git clone https://github.com/hippoley/Agent-Execution-Conformance-Infrastructure.git
cd Agent-Execution-Conformance-Infrastructure
bash scripts/migrate_agentscope_exact.sh
```

Requires working Git access to both GitHub repositories and an origin credential permitted to push branches. The script refuses a dirty working tree, uses a dedicated review branch, and checks exact tree SHA equality **before** committing.

**Single manually requested GitHub Actions run (may consume paid minutes):**

Open [Actions → Import AgentScope complete source](https://github.com/hippoley/Agent-Execution-Conformance-Infrastructure/actions/workflows/import-agentscope-source.yml), select **Run workflow**. The workflow has **only `workflow_dispatch`**; it will never start on pushes or pull requests.

Both routes push `migration/agentscope-source-402c3664f70c`, not main. Review the source/attribution, then merge. No new dependent workflows should be enabled for the vendored upstream tree.

## Verification

```bash
git checkout migration/agentscope-source-402c3664f70c
git rev-parse HEAD:upstream/agentscope
# MUST equal 97ac65b28422ac44ef2d9d8315d6cf95e887d35f
git ls-files upstream/agentscope | wc -l
# MUST equal 1187
test ! -e .gitmodules
```

This migrates source, **not** its upstream Git commit history. The source attribution remains with AgentScope's copyright holders. Preserve `upstream/agentscope/LICENSE`, and do not claim upstream or Tuya endorsement.

## Current integration boundary

Place future Tuya adapter code in `integrations/tuya/`. Do not modify vendored AgentScope sources just to integrate Tuya. The Tuya Agent control plane is not known to be open sourced.
