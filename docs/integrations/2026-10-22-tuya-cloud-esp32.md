# Tuya Cloud + TuyaOpen + ESP32 — integration closure 2026-10-22

## Project separation

AgentPanel stays the product. The official Tuya connector handles Tuya Cloud HMAC/signing and access-token renewal. Our first-party `adapters/tuya_cloud_adapter.py` adds a **single explicitly bound device and boolean DP** with default-deny, typed capability discovery and conservative result labeling. It is NOT a production identity provider and does not automatically retry ambiguous POST requests.

ESP32 firmware is NOT copied into this repository. `tools/bootstrap_tuyaopen.sh` fetches a pinned official TuyaOpen source release into ignored `.deps/TuyaOpen` and checks its exact commit SHA; `firmware/tuyaopen/UPSTREAM.lock` records the version. TuyaOpen's official `apps/tuya_cloud/switch_demo` is the first application. The official ESP32 platform subproject is managed by TuyaOpen, and cannot be built as a standalone repo.

## Community sources actually verified

- [tuya-connector-python](https://github.com/tuya/tuya-connector-python), MIT; package `tuya-connector-python==0.1.2`, **released 2021-11-08**. Its SDK provides `TuyaOpenAPI(...).connect(), .get(), .post()`. This SDK is old; evaluate dependency updates, synchronous request timeouts, source security and region API compatibility before production.
- [TuyaOpen v1.9.0](https://github.com/tuya/TuyaOpen/tree/v1.9.0), commit `b80932db6d9e0be1c5692aafb00b3109f3caf134`, root Apache-2.0 license notice (retain third-party/component licenses), released 2026-07-22.
- [TuyaOpen ESP32 platform](https://github.com/tuya/TuyaOpen-esp32): a component of TuyaOpen, **not** a standalone ESP32 SDK/application.
- [Tuya Cloud device control reference](https://developer.tuya.com/en/docs/cloud/device-control?id=K95zu01ksols7): `GET /v1.0/devices/{id}/functions`, `GET /v1.0/devices/{id}/status`, `POST /v1.0/devices/{id}/commands`. A second API family `/v1.0/iot-03/devices/{id}/...` is selectable where the cloud project's subscription requires it.
- [TuyaOpen ESP32 build and flashing](https://docs.tuyaopen.ai/docs/hardware/espressif/esp32-quick-start).

## Developer verification: does not require any credentials

```bash
python -m unittest discover -s tests -v
python -m py_compile adapters/tuya_cloud_adapter.py tools/tuya_cloud_probe.py
bash -n tools/bootstrap_tuyaopen.sh
```

On locally authored source bytes: **13/13 unit tests PASS**, `py_compile` and `bash -n` PASS. Unit tests inject a **fake instance of the real SDK method contract** and do not access Tuya Cloud. Assert default-deny, tenant and boolean DP enforcement, `v1.0` and `iot-03` routes, endpoint host validation, cloud response validation, timeout no POST replay, stale readback classified unverified, and status match never labeled physical proof. Full GitHub checkout regression remains a distinct acceptance gate.

## Connect a real authorized test Tuya device (READ-ONLY first)

Create a Tuya Cloud project, subscribe to the device-management/control APIs, and link an **authorized** test device. Choose the project's correct regional API endpoint and locate its device ID and Boolean DP code from the device's actual functions/specifications; do not assume `switch_1` or any universal DP name. Install the official SDK into a dedicated virtualenv (`python -m pip install -r requirements-tuya-cloud.txt`). Set these environment variables **outside source control**:

```bash
export TUYA_API_ENDPOINT=https://openapi.tuyaeu.com  # example region only
export TUYA_ACCESS_ID='(set privately)'
export TUYA_ACCESS_SECRET='(set privately)'
export TUYA_TENANT_ID=tenant_demo
export TUYA_DEVICE_ID='(authorized test device ID)'
export TUYA_DP_CODE='(actual supported boolean DP)'
export TUYA_API_FAMILY=v1.0                   # or iot-03, based on subscription
python -m tools.tuya_cloud_probe             # READ-ONLY; no command POST
```

For an approved **low-risk test switch only**, enabling `TUYA_LIVE_WRITE=1` in the execution environment **and** supplying `--approve-live-write` and `--set-bool true|false` are required. Do not use this adapter with locks, heaters, motors, potentially hazardous actuators, or production devices. These flags are manual test gates, not production IAM/authorization. Call it only from an already trusted controlled environment, not directly from arbitrary model-generated arguments.

**Result semantics:** `CLOUD_STATUS_MATCH` means the latest cloud-reported DP value equals the requested value. It has `physical_proof=false`. It is NOT evidence that this particular command caused an actual effect. A lost ACK is `UNKNOWN`; the adapter **never automatically repeats** a control POST. Real causality requires device events or a separate safe physical readback.

## Obtain and build official ESP32 firmware

```bash
bash tools/bootstrap_tuyaopen.sh
cd .deps/TuyaOpen
source export.sh
cd apps/tuya_cloud/switch_demo
tos.py config choice    # select correct ESP32 / ESP32-C3 / ESP32-S3 board
tos.py build
```

The clone uses v1.9.0 and refuses a mismatched commit. Configure actual PID, TuyaOpen-specific UUID/AuthKey/license **only on the authorized development machine**, ideally provisioned into the supported secure storage mechanism; never commit credentials or built artifacts containing keys. Connect and pair by following upstream instructions. Flash only after verifying board, ports, GPIO pins and low-risk actuator behavior.

## True closure gates (still OPEN)

1. **Cloud real read:** official Tuya SDK successfully authenticates against the correct region and returns an authorized device function list and status.
2. **ESP32 firmware:** pin board SKU, source and toolchain versions; build, flash and pair the official switch demo; capture redacted UART proof.
3. **Live command:** one explicit boolean control changes a low-risk test device, and a separately recorded LED/GPIO/event observation confirms the effect (cloud DP alone is insufficient).
4. **Real AgentScope execution:** complete #7, including the upstream `ToolBase.check_permissions` contract and stable call/command identity; model cannot supply cloud credentials.
5. **Reliability:** use controlled ACK-loss/offline/reconnect tests on that device; never repeat ambiguous effects, and keep C4 open until physical evidence exists.

**Not executed in this session:** official SDK installation, cloud login, remote firmware clone/build, ESP32 flashing or real device readback. No credentials were provided; GitHub network DNS is blocked in the local test container. No external adoption, firmware proof or Tuya Cloud acceptance is claimed. No GitHub Actions are needed for the offline tests.
