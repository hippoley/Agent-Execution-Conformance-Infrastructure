# TuyaOpen ESP32 (upstream-pinned, not copied)

Use the **official** TuyaOpen v1.9.0 `apps/tuya_cloud/switch_demo` as our first firmware app. The `TuyaOpen-esp32` platform is automatically managed by the parent SDK; it is **not independently buildable**. Source is intentionally downloaded into ignored `.deps/TuyaOpen` via `bash tools/bootstrap_tuyaopen.sh`, never vendored into our repository. The lock file pins the exact 2026-07-22 release commit.

For an ESP32/S3/C3 board, follow [TuyaOpen ESP32 quick start](https://docs.tuyaopen.ai/docs/hardware/espressif/esp32-quick-start). Configure the corresponding board with `tos.py config choice`, then run `tos.py build` from the switch demo directory. Flash and pair only with the actual authorized board, correct PID, **TuyaOpen-specific license/UUID/AuthKey** and 2.4GHz Wi-Fi. Store secrets outside Git; leave OTA, pairing and low-level drivers to upstream. A firmware file or successful compilation is not proof of a live Tuya device.

**Acceptance**: flash and pair; map a real boolean DP code found from Tuya Cloud `/functions`; issue one opt-in low-risk command, record cloud status and a **separate device observation** (hardware LED/sensor or firmware event), serial logs, SDK commit, board name and sanitized trace. Never report `CLOUD_STATUS_MATCH` as causal/physical proof.

No firmware build, flash, Tuya account, SDK installation or hardware verification has been run in this environment (GitHub DNS is blocked). This is a reproducible *upstream import/build entrypoint*, not completed hardware integration.
