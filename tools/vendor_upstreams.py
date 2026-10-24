#!/usr/bin/env python3
"""Import pinned, complete upstream source trees INTO Git-tracked third_party/.

Requires network access on the machine executing this script. This deliberately
does not import .git internals, does not flash hardware, and does not run CI.
Use --apply; otherwise performs an inventory / preflight only.
"""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "upstreams" / "sources.lock.json"
DEST = ROOT / "third_party" / "sources"
REJECT = {".git", ".venv", "node_modules", "__pycache__", ".deps"}
MAX_SINGLE_BYTES = 95 * 1024 * 1024

def git(*args, cwd=ROOT):
    return subprocess.check_output(["git", *args], cwd=cwd, text=True).strip()

def entry_source(entry):
    name = entry["name"]
    if name == "tuya/TuyaOpen":
        lock = (ROOT / "firmware" / "tuyaopen" / "UPSTREAM.lock").read_text()
        commit = next(line.partition("=")[2].strip() for line in lock.splitlines() if line.startswith("commit="))
        return ROOT / ".deps" / "TuyaOpen", commit
    return ROOT / ".deps" / "upstream" / name.replace("/", "__"), entry["commit"]

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--apply", action="store_true", help="Copy official source trees into tracked third_party directory")
    p.add_argument("--include-alternatives", action="store_true", help="Include Rainmaker, Arduino, Matter and other alternative stacks")
    p.add_argument("--only", choices=["tuya/TuyaOpen"], help="Import only the pinned TuyaOpen source tree")
    a=p.parse_args()
    if git("status", "--porcelain"):
        sys.exit("Refusing to copy into a dirty repository. Commit or stash changes first.")
    catalog=json.loads(CATALOG.read_text())
    selected=[]
    skipped=[]
    for e in catalog["upstreams"]:
        if a.only and e["name"] != a.only:
            continue
        if not a.include_alternatives and e["install"] in {"reference-only","do-not-combine","separate-target","do-not-clone-separately","use-parent-selected-version"}:
            skipped.append((e["name"],e["install"]))
            continue
        selected.append(e)
    report=[]
    for e in selected:
        path, commit=entry_source(e)
        if not (path / ".git").exists():
            sys.exit(f"Missing checkout {path}; run bash tools/bootstrap_upstreams.sh all or fetch this pinned upstream.")
        actual=git("rev-parse","HEAD",cwd=path)
        if actual!=commit:
            sys.exit(f"Source identity mismatch for {e['name']}: expected {commit}, actual {actual}")
        if git("status","--porcelain",cwd=path):
            sys.exit(f"Modified upstream source: {path}")
        target=DEST / e["name"].replace("/","__")
        files=0; size=0
        for base, dirs, names in os.walk(path):
            dirs[:]=[d for d in dirs if d not in REJECT]
            for name in names:
                f=Path(base)/name
                if f.is_symlink():
                    # Preserve symlinks only where Git supports them, rather than dereference outside repo.
                    link=os.readlink(f)
                    resolved=(f.parent/link).resolve()
                    if not resolved.is_relative_to(path.resolve()):
                        sys.exit(f"Symlink escapes upstream directory: {f}")
                    continue
                if not f.is_file(): continue
                n=f.stat().st_size
                if n>MAX_SINGLE_BYTES: sys.exit(f"GitHub rejects >100MB objects: {f} ({n} bytes)")
                files+=1;size+=n
        report.append({"repo":e["name"],"sha":commit,"files":files,"bytes":size,"destination":str(target.relative_to(ROOT))})
    print(json.dumps({"candidate_sources":report,"excluded_by_default":skipped},ensure_ascii=False,indent=2))
    if not a.apply:
        print("PREVIEW ONLY. Re-run with --apply after reviewing license, repository size and upload costs.")
        return
    for e in selected:
        path, commit = entry_source(e)
        target = DEST / e["name"].replace("/", "__")
        # Refuse mismatches before making any changes: imported upstream files
        # must be byte-identical to their pinned checkout.
        mismatched = []
        for base, dirs, names in os.walk(path):
            dirs[:] = [d for d in dirs if d not in REJECT]
            for name in names:
                src = Path(base) / name
                rel = src.relative_to(path)
                dst = target / rel
                if dst.is_symlink() or src.is_symlink():
                    if not (src.is_symlink() and dst.is_symlink()
                            and os.readlink(src) == os.readlink(dst)):
                        if dst.exists() or dst.is_symlink():
                            mismatched.append(str(rel))
                elif dst.exists() and (not dst.is_file() or src.read_bytes() != dst.read_bytes()):
                    mismatched.append(str(rel))
        if mismatched:
            sys.exit(f"Existing vendor content differs from pinned {e['name']}: {mismatched[:20]}")
        def ignore(directory, names):
            return {x for x in names if x in REJECT}
        shutil.copytree(path, target, ignore=ignore, symlinks=True, dirs_exist_ok=True)
        metadata = target / "AECI_UPSTREAM_METADATA.json"
        metadata.write_text(json.dumps({
            "source": e["url"], "commit": commit,
            "license_metadata": e.get("license_repository_metadata"),
            "warning": "Preserve upstream copyright; check per-component license and binary redistribution rights."
        }, indent=2) + "\n")
    print("Tracked source files copied. Review and run: git add third_party/sources && git commit -m 'vendor: import pinned upstream sources' && git push")
    print("Do not enable GitHub Actions solely for vendoring, and do not claim hardware/SDK runtime validation.")

if __name__=="__main__": main()
