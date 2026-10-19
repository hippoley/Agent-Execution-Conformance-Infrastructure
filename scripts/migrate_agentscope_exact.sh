#!/usr/bin/env bash
# Replace the AgentScope submodule gitlink with the entire exact upstream source.
# Execute from the root of hippoley/Agent-Execution-Conformance-Infrastructure.
set -euo pipefail

UPSTREAM_URL="${AGENTSCOPE_UPSTREAM_URL:-https://github.com/agentscope-ai/agentscope.git}"
UPSTREAM_SHA="402c3664f70cb339f397c5ee40e662bc0d99eed0"
DEST="upstream/agentscope"
BRANCH="migration/agentscope-source-${UPSTREAM_SHA:0:12}"

fail() { echo "ERROR: $*" >&2; exit 1; }
command -v git >/dev/null || fail 'git is required'
test "$(git rev-parse --show-prefix 2>/dev/null)" = '' || fail 'Run from repository root'
test -z "$(git status --porcelain --untracked-files=normal)" || fail 'Working tree must be clean'
test -f .gitmodules || fail '.gitmodules missing: expected current AgentScope submodule baseline'
git ls-files --stage -- "$DEST" | grep -q '^160000 ' || fail 'Expected AgentScope gitlink was not found; refusing destructive migration'

echo "Importing complete AgentScope source at $UPSTREAM_SHA"
git fetch --no-tags --depth=1 "$UPSTREAM_URL" "$UPSTREAM_SHA"
git cat-file -e "${UPSTREAM_SHA}^{commit}" || fail 'Upstream commit unavailable'
git switch -c "$BRANCH"

git submodule deinit -f -- "$DEST" >/dev/null 2>&1 || true
git rm -f -- "$DEST"
if [ "$(grep -c '^\[submodule ' .gitmodules)" != '1' ]; then fail 'Expected exactly one .gitmodules section'; fi
git rm -f -- .gitmodules

# Populate Git's index and worktree with original paths, blobs, modes and symlinks.
git read-tree --prefix="${DEST}/" -u "${UPSTREAM_SHA}^{tree}"

# Exact tree equality is stronger than matching file count or file contents alone.
EXPECTED_TREE="$(git rev-parse "${UPSTREAM_SHA}^{tree}")"
NEW_ROOT_TREE="$(git write-tree)"
ACTUAL_TREE="$(git rev-parse "${NEW_ROOT_TREE}:${DEST}")"
echo "Expected AgentScope tree: $EXPECTED_TREE"
echo "Vendored AgentScope tree: $ACTUAL_TREE"
test "$ACTUAL_TREE" = "$EXPECTED_TREE" || fail 'Tree mismatch; nothing committed or pushed'

git config user.name >/dev/null || fail "Set git config user.name before running"
git config user.email >/dev/null || fail "Set git config user.email before running"
git commit -m "chore(upstream): vendor exact AgentScope source at ${UPSTREAM_SHA:0:12}" \
           -m "Upstream: https://github.com/agentscope-ai/agentscope" \
           -m "Commit: $UPSTREAM_SHA" \
           -m "Tree SHA: $EXPECTED_TREE" \
           -m "Preserve original LICENSE, notices, tests, and examples."
git push --set-upstream origin "$BRANCH"
echo "DONE: $BRANCH contains full AgentScope source. Review and merge the PR when ready."
