#!/usr/bin/env bash
# Fail-closed, local-only verification of the pinned release and AECI core.
set -euo pipefail
EXPECTED_TREE="11d2173f891739d3e359af892eb576751a0a85f8"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || fail 'Not inside a Git repository'
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
test -f src/aeci/contract.py || fail 'AECI first-party code missing'
python -m unittest discover -s tests -v || fail 'AECI unit tests failed'
node --test runners/device-command.test.mjs || fail 'Device-command tests failed'
node runners/conformance.mjs runners/device-command.mjs || fail 'Reference adapter conformance failed'

allowed_output="$(PYTHONPATH=src python -m aeci examples/proposals/allowed.json)" || fail 'Allowed proposal CLI failed'
rejected_status=0
rejected_output="$(PYTHONPATH=src python -m aeci examples/proposals/denied.json)" || rejected_status=$?
test "$rejected_status" -eq 1 || fail "Denied proposal must exit 1, observed $rejected_status"
python - "$allowed_output" "$rejected_output" <<'PY'
import json
import sys
allow = json.loads(sys.argv[1])
deny = json.loads(sys.argv[2])
assert allow['allowed'] is True and allow['reasons'] == [], allow
assert deny['allowed'] is False and 'target_not_allowed' in deny['reasons'], deny
PY

AECI_ROOT="$repo_root" python - <<'PY'
import os
import subprocess
import sys
import tempfile
from pathlib import Path
root = Path(os.environ['AECI_ROOT'])
cmd = [sys.executable, '-c', 'import aeci; assert aeci.evaluate({}).allowed is False']
env = dict(os.environ, PYTHONPATH=str(root / 'src'))
with tempfile.TemporaryDirectory() as isolated_cwd:
    subprocess.run(cmd, cwd=isolated_cwd, env=env, check=True)
PY
echo 'PASS: exact v2.0.10 committed source tree + original license'
echo 'PASS: no old AgentScope submodule, no nested vendor gitlinks'
echo 'PASS: first-party AECI tests and allow/deny outputs'
echo 'PASS: device-command tests and seven public conformance vectors'
echo 'PASS: isolated AECI import'
echo 'MANUAL GATE STILL REQUIRED: upstream runtime tests and attribution review'
