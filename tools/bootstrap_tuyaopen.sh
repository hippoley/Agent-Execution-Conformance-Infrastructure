#!/usr/bin/env bash
# Fetch exact official TuyaOpen v1.9.0 commit without copying or modifying upstream.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
UPSTREAM="https://github.com/tuya/TuyaOpen.git"
SHA="b80932db6d9e0be1c5692aafb00b3109f3caf134"
DEST="$ROOT/.deps/TuyaOpen"
command -v git >/dev/null || { echo 'git is required' >&2; exit 2; }
if [ ! -d "$DEST/.git" ]; then
  mkdir -p "$ROOT/.deps"
  git clone --branch v1.9.0 --depth 1 "$UPSTREAM" "$DEST"
fi
ACTUAL="$(git -C "$DEST" rev-parse HEAD)"
if [ "$ACTUAL" != "$SHA" ]; then
  echo "Refusing unpinned TuyaOpen version; HEAD=$ACTUAL" >&2
  exit 3
fi
printf 'Verified upstream TuyaOpen v1.9.0: %s\n' "$SHA"
printf '\nBuild the official ESP32 switch app (interactive board selection):\n'
printf '  cd %s\n' "$DEST"
printf '  source export.sh\n'
printf '  cd apps/tuya_cloud/switch_demo\n'
printf '  tos.py config choice\n'
printf '  tos.py build\n'
printf '\nFlash only when you have your authorized ESP32 board, PID, TuyaOpen license, and test hardware.\n'
printf 'Never commit tuya_config_secrets.h, device UUID/AuthKey, or firmware binaries with embedded secrets.\n'
