# AgentScope v2.0.10 complete source import

This replaces the *temporary* `third_party/agentscope` gitlink with a full `vendor/agentscope` directory containing the **exact tagged upstream source**.

Pinned Git identifiers:

- Tag: `v2.0.10`
- Commit: `e6c014f0be49b2a6f6f62a9453082a0b975484e1`
- Tree: `11d2173f891739d3e359af892eb576751a0a85f8`

## Execution

From clean checkout of `refactor/coherent-conformance-layout`, run `bash tools/vendor/import_agentscope_v2.sh`. It checks the tag and tree before any destructive index change, removes the submodule, reads all pinned upstream source objects into the vendor subtree and checks tree equality. It then makes a **local-only** commit. Review and push manually.

## Acceptance

```bash
test ! -f .gitmodules
test -f vendor/agentscope/LICENSE
test "$(git rev-parse HEAD:vendor/agentscope)" = "11d2173f891739d3e359af892eb576751a0a85f8"
test -z "$(git ls-files --stage -- vendor/agentscope | grep '^160000 ' || true)"
python -m unittest discover -s tests -v
```

Additional gates: inspect source inventory / license, test AgentScope installation and its official test profile in a suitable environment; verify AECI's standalone fixture CLI. Import success does not prove runtime compatibility.

No GitHub Actions, workflow dispatch or merge are needed for this import. Source cannot be claimed as imported until the new source-tree SHA is observed in the target repository.
