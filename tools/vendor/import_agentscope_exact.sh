#!/usr/bin/env bash
# Optional, one-time conversion from a pinned AgentScope submodule to vendored source.
set -euo pipefail
UPSTREAM_URL="${AGENTSCOPE_UPSTREAM_URL:-https://github.com/agentscope-ai/agentscope.git}"
UPSTREAM_SHA="402c3664f70cb339f397c5ee40e662bc0d99eed0"
DEST="third_party/agentscope"
BRANCH="migration/vendor-agentscope-${UPSTREAM_SHA:0:12}"
fail() { echo "ERROR: $*" >&2; exit 1; }
command -v git >/dev/null || fail "git required"
test "$(git rev-parse --show-prefix 2>/dev/null)" = '' || fail "Run from repository root"
test -z "$(git status --porcelain --untracked-files=normal)" || fail "Working tree must be clean"
test -f .gitmodules || fail ".gitmodules missing"
git ls-files --stage -- "$DEST" | grep -q '^160000 ' || fail "Expected pinned gitlink missing"
git fetch --no-tags --depth=1 "$UPSTREAM_URL" "$UPSTREAM_SHA"
git cat-file -e "${UPSTREAM_SHA}^{commit}" || fail "Upstream SHA not found"
git switch -c "$BRANCH"
git submodule deinit -f -- "$DEST" >/dev/null 2>&1 || true
git rm -f -- "$DEST"
test "$(grep -c '^\[submodule ' .gitmodules)" = 1 || fail "Expected exactly one submodule"
git rm -f -- .gitmodules
git read-tree --prefix="${DEST}/" -u "${UPSTREAM_SHA}^{tree}"
expected="$(git rev-parse "${UPSTREAM_SHA}^{tree}")"
root="$(git write-tree)"
actual="$(git rev-parse "${root}:${DEST}")"
test "$expected" = "$actual" || fail "Upstream tree mismatch"
git config user.name >/dev/null || fail "Set git user.name"
git config user.email >/dev/null || fail "Set git user.email"
git commit -m "chore(vendor): pin complete AgentScope source at ${UPSTREAM_SHA:0:12}" -m "Upstream: $UPSTREAM_URL" -m "Source commit: $UPSTREAM_SHA" -m "Tree: $expected; preserve upstream LICENSE and notices."
git push --set-upstream origin "$BRANCH"
echo "Review branch pushed: $BRANCH"
