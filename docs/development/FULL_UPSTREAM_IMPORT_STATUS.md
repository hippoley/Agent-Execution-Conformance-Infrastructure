# Full upstream source import: verified status and execution path (2026-10-23)

**Acceptance definition:** every requested upstream source file is present as a Git blob in AECI's `main` tree, with upstream commit identity and LICENSE/NOTICE retained. A lock, submodule pointer, git URL, bootstrap script, or locally cloned uncommitted checkout does **not** count.

## Current verified outcome
- `vendor/agentscope/`: earlier pinned v2.0.10 source mirror, present.
- `third_party/sources/tuya__tuya-connector-python/`: all 12 upstream tracked files, present.
- `third_party/sources/tuya__tuya-smart-control-cli/`: all 17 upstream tracked files, present.
- The remaining 11 upstream complete trees: **NOT present on GitHub** as of this audit.

An official GitHub tree inspection of the 11 missing upstream projects found the following upstream blob counts: TuyaOpen 13,183; agentic-kit 376; tuya-mcp-sdk 80; TuyaOpen-esp32 143; arduino-TuyaOpen 520; esp-idf 22,168; esp-sr 1,195; esp-brookesia 2,935; esp-matter 1,873; esp-skainet 387; esp-rainmaker 639. The cumulative byte size is large; do not assume it can be copied through per-file API calls.

## Blocking limitation here
The model's shell has no GitHub DNS resolution (`Could not resolve host: github.com`). The GitHub connector can read UTF-8 files, but cannot bulk transfer binary assets and rejects references to a blob SHA belonging to a different repository. That means **full import cannot be completed via the available connection alone**.

## Execute on network-enabled clone / Codespace
```bash
git clone https://github.com/hippoley/Agent-Execution-Conformance-Infrastructure.git
cd Agent-Execution-Conformance-Infrastructure
bash tools/bootstrap_upstreams.sh full
python3 tools/vendor_upstreams.py --include-alternatives
python3 tools/vendor_upstreams.py --apply --include-alternatives
git add third_party/sources
git commit -m 'vendor: import all pinned Tuya Espressif upstream sources'
git push origin main
```
Caveat: the importer is designed to stop if a source tree is dirty or files exceed GitHub limits. Audit binary licensing before publication; the above is **not evidence these commands have been executed**. Git submodule contents within an upstream repository need separate inspection; the parent checkout alone may not contain nested submodule files. Do not commit secrets, compiled proprietary blobs with unsuitable licenses, or device credentials.

## Verification before marking complete
1. Compare each vendored `third_party/sources/<org>__<repo>` tree and its tracked file count to the pinned upstream tree, accounting for intentional exclusions and documenting every exclusion.
2. Review upstream license/NOTICE and third-party binaries; do not use 'repository Apache' as blanket clearance.
3. Confirm all files appear in the **remote main tree** after push (not only local disk), and verify a fresh checkout.
4. No GitHub Actions required for pure source import. Do not mistake CI for an upload mechanism.
