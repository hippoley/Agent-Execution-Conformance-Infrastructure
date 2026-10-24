#!/usr/bin/env python3
"""Verify a complete, byte-identical pinned TuyaOpen vendor snapshot in Git's index."""
import json
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
catalog = json.loads((root / "upstreams/sources.lock.json").read_text())
commit = next(e["commit"] for e in catalog["upstreams"] if e["name"] == "tuya/TuyaOpen")
source = root / ".deps/upstream/tuya__TuyaOpen"
prefix = b"third_party/sources/tuya__TuyaOpen/"
def run(*args, cwd=root):
    return subprocess.check_output(["git", *args], cwd=cwd)

actual = run("rev-parse", "HEAD", cwd=source).decode().strip()
if actual != commit:
    sys.exit(f"Wrong upstream commit: {actual}; expected {commit}")
up = {}
for rec in run("ls-tree", "-r", "-z", "HEAD", cwd=source).split(b"\0"):
    if not rec: continue
    spec, path = rec.split(b"\t", 1)
    mode, kind, sha = spec.split()
    if kind == b"blob":
        up[path] = (mode, sha)
index = {}
for rec in run("ls-files", "--stage", "-z", "--", prefix.decode()).split(b"\0"):
    if not rec: continue
    spec, path = rec.split(b"\t", 1)
    mode, sha, stage = spec.split()
    if stage != b"0": sys.exit("Unmerged index entry")
    if path.startswith(prefix):
        index[path[len(prefix):]] = (mode, sha)
missing = sorted(set(up) - set(index))
extra = sorted(set(index) - set(up) - {b"AECI_UPSTREAM_METADATA.json"})
wrong = sorted(p for p in up.keys() & index.keys() if up[p] != index[p])
print(json.dumps({"upstream_commit":commit,"upstream_blobs":len(up),
                  "vendored_upstream_blobs":len(up)-len(missing),
                  "missing":len(missing),"extra":len(extra),"mismatched":len(wrong),
                  "examples": [p.decode(errors="replace") for p in (missing+extra+wrong)[:25]]},indent=2))
if missing or extra or wrong:
    sys.exit("FAIL: vendor Git index is not byte-identical to pinned upstream")
print("PASS: complete pinned TuyaOpen Git index, modes, symlinks and blob SHAs")
