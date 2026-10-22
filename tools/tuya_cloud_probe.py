#!/usr/bin/env python3
"""Read-only by default. A LIVE write needs TWO affirmative controls.

Intended only for an authorized, low-risk test switch. Do not place credentials in args.
"""
import argparse
import json
import os
from adapters.tuya_cloud_adapter import TuyaCloudAdapter, TuyaBinding, TuyaCloudError, official_api_from_environment


def main():
    parser = argparse.ArgumentParser(description="Safe Tuya device capability/status probe")
    parser.add_argument("--set-bool", choices=["true", "false"], default=None)
    parser.add_argument("--approve-live-write", action="store_true")
    args = parser.parse_args()
    env = os.environ
    if not all(env.get(k) for k in ("TUYA_DEVICE_ID", "TUYA_DP_CODE", "TUYA_TENANT_ID")):
        parser.error("TUYA_DEVICE_ID, TUYA_DP_CODE, TUYA_TENANT_ID are required")
    try:
        api = official_api_from_environment(env)
        binding = TuyaBinding(env["TUYA_DEVICE_ID"], env["TUYA_DP_CODE"], env["TUYA_TENANT_ID"])
        adapter = TuyaCloudAdapter(api, binding, live_enabled=env.get("TUYA_LIVE_WRITE") == "1",
                                   api_family=env.get("TUYA_API_FAMILY", "v1.0"))
        if args.set_bool is None:
            output = adapter.inspect()
        else:
            output = adapter.set_bool(value=args.set_bool == "true", tenant_id=binding.tenant_id,
                                      approved=args.approve_live_write)
        print(json.dumps(output, sort_keys=True))
        return 0 if output.get("disposition", "READ_ONLY") not in ("DENIED", "UNKNOWN", "UNVERIFIED") else 2
    except (TuyaCloudError, ValueError):
        print(json.dumps({"disposition": "UNKNOWN", "reason": "CONFIGURATION_OR_CLOUD_ERROR"}))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
