#!/usr/bin/env bash
# Import *all* source files from the verified AgentScope v2.0.10 release.
# This is a one-time, reviewable, fail-closed conversion of the gitlink into
# ordinary tracked source files. It does not modify other repositories.
set -euo pipefail

SOURCE_URL="https://github.com/agentscope-ai/agentscope.git"
SOURCE_REF="refs/tags/v2.0.10"
SOURCE_COMMIT="e6c014f0be49b2a6f6f62a9453082a0b975484e1"
SOURCE_TREE="11d2173f891739d3e359af892eb576751a0a85f8"
DEST="vendor/agentscope"
OLD="third_party/agentscope"

fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
command -v git >/dev/null || fail 'Git required'
test "$(git rev-parse --show-toplevel)" = "$PWD" || fail 'Run from repository root'
test -z "$(git status --porcelain --untracked-files=normal)" || fail 'Working tree must be clean'
test "$(git branch --show-current)" = "refactor/coherent-conformance-layout" || fail 'Use the dedicated review branch'
git ls-files --stage -- "$OLD" | grep -q '^160000 ' || fail 'Expected AgentScope gitlink not found'
test -f .gitmodules || fail 'Expected .gitmodules not found'
test ! -e "$DEST" || fail 'Vendor destination exists'
git config user.name >/dev/null || fail 'Set git user.name'
git config user.email >/dev/null || fail 'Set git user.email'

echo "Fetching verified AgentScope tag $SOURCE_REF"
git fetch --no-tags "$SOURCE_URL" "$SOURCE_REF"
actual_ref="$(git rev-parse FETCH_HEAD^{commit})"
test "$actual_ref" = "$SOURCE_COMMIT" || fail "Tag commit mismatch: $actual_ref"
actual_tree="$(git rev-parse "$SOURCE_COMMIT^{tree}")"
test "$actual_tree" = "$SOURCE_TREE" || fail "Upstream tree mismatch: $actual_tree"

# An immutable nested upstream tree; all upstream files, modes and symlinks
# are copied into Git's index exactly, with their original source untouched.
git submodule deinit -f -- "$OLD" >/dev/null 2>&1 || true
git rm -f -- "$OLD"
git rm -f -- .gitmodules
git read-tree --prefix="$DEST/" -u "$SOURCE_COMMIT^{tree}"

root_tree="$(git write-tree)"
imported_tree="$(git rev-parse "$root_tree:$DEST")"
test "$imported_tree" = "$SOURCE_TREE" || fail 'Imported source tree checksum mismatch'
test -f "$DEST/LICENSE" || fail 'Upstream LICENSE missing from imported files'

echo "Verified complete source tree: $imported_tree"
git commit -m "chore(vendor): import exact AgentScope v2.0.10 source" \
  -m "Upstream: $SOURCE_URL" \
  -m "Tag: v2.0.10" \
  -m "Commit: $SOURCE_COMMIT" \
  -m "Tree: $SOURCE_TREE" \
  -m "Preserve upstream license, notices, exact modes and source contents."
echo "SOURCE IMPORT COMMITTED LOCALLY. Review changes and push explicitly:"
echo "  git push origin refactor/coherent-conformance-layout"
