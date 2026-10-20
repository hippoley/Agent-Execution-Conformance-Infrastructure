#!/usr/bin/env bash
# AECI release gate: inspect exact vendored source and run standalone tests.
set -euo pipefail
EXPECTED_TREE="11d2173f891739d3e359af892eb576751a0a85f8"
EXPECTED_COMMIT="e6c014f0be49b2a6f6f62a9453082a0b975484e1"
fail() { echo "FAIL: $*" >&2; exit 1; }
test "$(git rev-parse --show-toplevel)" = "$PWD" || fail "Run at repository root"
test -d vendor/agentscope || fail "vendor/agentscope missing"
test -f vendor/agentscope/LICENSE || fail "Original upstream LICENSE missing"
test ! -f .gitmodules || fail "Old Git submodule configuration still exists"
test -z "$(git ls-files --stage -- vendor/agentscope | awk '$1 == "160000" {print $0}')" || fail "Gitlink in vendor directory"
actual_tree="$(git rev-parse HEAD:vendor/agentscope 2>/dev/null)" || fail "Vendored source absent from committed Git tree"
test "$actual_tree" = "$EXPECTED_TREE" || fail "Tree mismatch: $actual_tree expected $EXPECTED_TREE"
test -f src/aeci/contract.py || fail "Independent AECI core missing"
python -m unittest discover -s tests -v || fail "AECI tests failed"
PYTHONPATH=src python -m aeci examples/proposals/allowed.json > /tmp/aeci-allowed-$$.json || fail "Allowed fixture rejected"
if PYTHONPATH=src python -m aeci examples/proposals/denied.json > /tmp/aeci-denied-$$.json; then
  fail "Denied fixture unexpectedly allowed"
fi
rm -f /tmp/aeci-allowed-$$.json /tmp/aeci-denied-$$.json
echo "PASS: exact v2.0.10 vendor tree $actual_tree ($EXPECTED_COMMIT)"
echo "PASS: upstream LICENSE present; no submodule configuration or gitlink"
echo "PASS: independent AECI tests and allow/deny fixtures"
echo "NOTE: upstream runtime compatibility and third-party notices still require manual review."
