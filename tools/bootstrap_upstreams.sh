#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 - "$@" <<'PY'
import json, pathlib, subprocess, sys
manifest=json.loads(pathlib.Path("upstreams/sources.lock.json").read_text())
modes={"core":{"tuya/TuyaOpen"},"cloud":{"tuya/tuya-connector-python","tuya/tuya-smart-control-cli","tuya/tuya-mcp-sdk"},"ai":{"tuya/agentic-kit","espressif/esp-sr"},"display":{"espressif/esp-brookesia"},"matter":{"espressif/esp-matter"},"all":set()}
modes["all"]={x["name"] for x in manifest["upstreams"] if x["install"] in ("optional","existing-package-dependency")}|modes["core"]
if len(sys.argv)!=2 or sys.argv[1] not in modes:
    sys.exit("usage: bash tools/bootstrap_upstreams.sh core|cloud|ai|display|matter|all")
selected=modes[sys.argv[1]]
root=pathlib.Path(".deps/upstream")
root.mkdir(parents=True,exist_ok=True)
for x in manifest["upstreams"]:
    if x["name"] not in selected: continue
    if x["name"]=="tuya/TuyaOpen":
        # Honor the already established tested baseline lock, not the latest manifest reference.
        lock=pathlib.Path("firmware/tuyaopen/UPSTREAM.lock").read_text()
        sha=next(y.partition("=")[2].strip() for y in lock.splitlines() if y.startswith("commit="))
        dest=pathlib.Path(".deps/TuyaOpen")
    else:
        sha=x["commit"]
        dest=root/x["name"].replace("/","__")
    if not dest.exists():
        subprocess.run(["git","clone","--filter=blob:none","--no-checkout",x["url"],str(dest)],check=True)
    actual=subprocess.check_output(["git","-C",str(dest),"rev-parse","HEAD"],text=True).strip()
    if actual!=sha:
        if subprocess.run(["git","-C",str(dest),"status","--porcelain"],capture_output=True,text=True,check=True).stdout.strip():
            sys.exit(f"Refusing to reset modified worktree: {dest}")
        subprocess.run(["git","-C",str(dest),"fetch","--depth","1","origin",sha],check=True)
        subprocess.run(["git","-C",str(dest),"checkout","--detach",sha],check=True)
    print(f"PINNED {x['name']} {sha[:12]} at {dest}")
print("Source fetched; dependencies/build/license compatibility and hardware are NOT validated.")
PY
