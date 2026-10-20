# AgentScope v2.0.10 complete source import

The one-time import replaces the *temporary* `third_party/agentscope` gitlink with a full `vendor/agentscope` directory containing the **exact tagged upstream source**. It has been completed on the review branch; the import commit is `cccc493`.

Pinned Git identifiers:

- Tag: `v2.0.10`
- Commit: `e6c014f0be49b2a6f6f62a9453082a0b975484e1`
- Tree: `11d2173f891739d3e359af892eb576751a0a85f8`

## Execution

The one-time importer is intentionally not rerunnable after import. In a clean checkout from before that commit, run `bash tools/vendor/import_agentscope_v2.sh`. It checks the tag and tree before changing the index, removes the submodule, reads all pinned upstream source objects into the vendor subtree and checks tree equality. It then makes a **local-only** commit. Review and push manually.

## Acceptance

```bash
test ! -f .gitmodules
test -f vendor/agentscope/LICENSE
test "$(git rev-parse HEAD:vendor/agentscope)" = "11d2173f891739d3e359af892eb576751a0a85f8"
test -z "$(git ls-files --stage -- vendor/agentscope | grep '^160000 ' || true)"
python -m unittest discover -s tests -v
```

The pinned source tree and license, AECI tests/CLI, source syntax and basic package import have been verified. The full upstream test suite still requires its development dependencies and service-specific test environment. Import success does not prove runtime compatibility with Tuya, ESP32, model APIs or external services.

No GitHub Actions, workflow dispatch or merge were needed for this import. See [the recorded import evidence](../AGENTSCOPE_V2_0_10_IMPORT_REPORT.md). Merge remains a separate review decision.
