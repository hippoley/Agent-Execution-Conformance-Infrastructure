#!/usr/bin/env bash
# Fail-closed, local-only verification of the pinned release and conformance profile.
set -euo pipefail
EXPECTED_TREE="11d2173f891739d3e359af892eb576751a0a85f8"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
git rev-parse --show-toplevel >/dev/null 2>&1 || fail 'Not inside a Git repository'
test -z "$(git rev-parse --show-prefix)" || fail 'Run from repository root'
test ! -e .gitmodules || fail 'Legacy .gitmodules remains'
test ! -e third_party/agentscope || fail 'Legacy AgentScope submodule path remains'
test -f vendor/agentscope/LICENSE || fail 'Vendor LICENSE not present'

actual_tree="$(git rev-parse 'HEAD:vendor/agentscope' 2>/dev/null)" || fail 'Committed vendor tree missing'
test "$actual_tree" = "$EXPECTED_TREE" || fail "Vendor tree does not match official v2.0.10: $actual_tree"
if git ls-tree -r HEAD vendor/agentscope | grep -q '^160000 commit '; then
  fail 'Nested Gitlink detected under vendor/agentscope'
fi
if git ls-files --stage -- third_party/agentscope | grep -q '^160000 '; then
  fail 'Old AgentScope gitlink still tracked'
fi
node --test runners/device-command.test.mjs || fail 'Device-command tests failed'
node runners/conformance.mjs runners/device-command.mjs || fail 'Reference adapter conformance failed'
echo 'PASS: exact v2.0.10 committed source tree + original license'
echo 'PASS: no old AgentScope submodule, no nested vendor gitlinks'
echo 'PASS: device-command tests and seven public conformance vectors'
echo 'MANUAL GATE STILL REQUIRED: upstream runtime tests and attribution review'
