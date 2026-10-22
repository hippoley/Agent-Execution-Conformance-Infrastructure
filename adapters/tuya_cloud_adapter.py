"""Tuya Cloud read/controlled-write adapter using official tuya-connector-python.

Never equate successful cloud status readback with attributable physical completion.
Cloud API does not provide our command-id idempotency protocol. No automatic retry.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Mapping
from urllib.parse import urlsplit

_ID = re.compile(r"^[A-Za-z0-9_-]{1,128}$")


class TuyaCloudError(RuntimeError):
    """Sanitized cloud failure: never contains token or cloud body."""


@dataclass(frozen=True)
class TuyaBinding:
    device_id: str
    dp_code: str
    tenant_id: str

    def __post_init__(self):
        if not all(_ID.fullmatch(x) for x in (self.device_id, self.dp_code, self.tenant_id)):
            raise ValueError("Invalid Tuya binding identifiers")


class TuyaCloudAdapter:
    def __init__(self, api: Any, binding: TuyaBinding, *, live_enabled: bool = False, api_family: str = "v1.0"):
        if api_family not in ("v1.0", "iot-03"):
            raise ValueError("Unsupported Tuya API family")
        self._prefix = "/v1.0" if api_family == "v1.0" else "/v1.0/iot-03"
        self._api = api
        self.binding = binding
        self.live_enabled = live_enabled

    @staticmethod
    def _result(data: Any) -> Any:
        if not isinstance(data, dict) or data.get("success") is not True:
            raise TuyaCloudError("Tuya Cloud returned an unsuccessful or malformed response")
        return data.get("result")

    def _get(self, suffix: str) -> Any:
        try:
            return self._result(self._api.get(f"{self._prefix}/devices/{self.binding.device_id}/{suffix}"))
        except TuyaCloudError:
            raise
        except Exception:
            raise TuyaCloudError("Tuya Cloud read unavailable") from None

    def functions(self) -> list[dict]:
        result = self._get("functions")
        if isinstance(result, dict):
            result = result.get("functions")
        if not isinstance(result, list) or not all(isinstance(x, dict) for x in result):
            raise TuyaCloudError("Unexpected Tuya function schema")
        return result

    def status(self) -> list[dict]:
        result = self._get("status")
        if not isinstance(result, list) or not all(isinstance(x, dict) for x in result):
            raise TuyaCloudError("Unexpected Tuya status schema")
        return result

    def inspect(self) -> dict:
        """Read-only probe. A cloud DP value is NOT proof of a specific command."""
        funcs = self.functions()
        values = self.status()
        supported = any(x.get("code") == self.binding.dp_code for x in funcs)
        observed = [x["value"] for x in values if x.get("code") == self.binding.dp_code and "value" in x]
        return {"device_id": self.binding.device_id, "dp_code": self.binding.dp_code,
                "writable_supported": supported, "cloud_status": observed[0] if len(observed) == 1 else None,
                "status_unambiguous": len(observed) == 1,
                "evidence": "CLOUD_REPORTED_STATUS_NOT_PHYSICAL_PROOF"}

    def set_bool(self, *, value: bool, tenant_id: str, approved: bool = False) -> dict:
        """Explicit opt-in only; never retry uncertain POST; cloud readback is non-causal."""
        if tenant_id != self.binding.tenant_id:
            return {"disposition": "DENIED", "reason": "TENANT_MISMATCH"}
        if type(value) is not bool:
            return {"disposition": "DENIED", "reason": "INVALID_ARGUMENTS"}
        if not self.live_enabled or approved is not True:
            return {"disposition": "DENIED", "reason": "LIVE_WRITE_NOT_APPROVED"}
        functions = self.functions()
        matches = [f for f in functions if f.get("code") == self.binding.dp_code]
        if len(matches) != 1 or str(matches[0].get("type", "")).lower() not in ("boolean", "bool"):
            return {"disposition": "DENIED", "reason": "BOOLEAN_CAPABILITY_NOT_ADVERTISED"}
        try:
            response = self._api.post(f"{self._prefix}/devices/{self.binding.device_id}/commands",
                                      {"commands": [{"code": self.binding.dp_code, "value": value}]})
        except Exception:
            return {"disposition": "UNKNOWN", "reason": "CLOUD_POST_OUTCOME_UNKNOWN"}
        if not isinstance(response, dict) or response.get("success") is not True:
            return {"disposition": "UNKNOWN", "reason": "CLOUD_WRITE_NOT_CONFIRMED"}
        try:
            rows = self.status()
            observed = [x.get("value") for x in rows if x.get("code") == self.binding.dp_code]
        except TuyaCloudError:
            return {"disposition": "UNKNOWN", "reason": "CLOUD_READBACK_UNAVAILABLE"}
        if len(observed) != 1 or type(observed[0]) is not bool or observed[0] != value:
            return {"disposition": "UNVERIFIED", "reason": "CLOUD_STATUS_MISMATCH_OR_AMBIGUOUS"}
        return {"disposition": "CLOUD_STATUS_MATCH", "physical_proof": False,
                "reason": "NOT_CAUSALLY_ATTRIBUTED_TO_THIS_COMMAND"}


def official_api_from_environment(env: Mapping[str, str]):
    """Construct the official SDK, not a handcrafted HMAC implementation."""
    endpoint, access_id, secret = (env.get(k, "") for k in
                                   ("TUYA_API_ENDPOINT", "TUYA_ACCESS_ID", "TUYA_ACCESS_SECRET"))
    u = urlsplit(endpoint)
    allowed_hosts = {"openapi.tuyacn.com", "openapi.tuyaus.com", "openapi.tuyaeu.com",
                     "openapi.tuyain.com", "openapi-ueaz.tuyaus.com"}
    if u.scheme != "https" or u.hostname not in allowed_hosts or u.username or u.password or u.port or u.path not in ("", "/") or not access_id or not secret:
        raise ValueError("Explicit HTTPS Tuya region endpoint and cloud credentials required")
    from tuya_connector import TuyaOpenAPI
    api = TuyaOpenAPI(endpoint, access_id, secret)
    result = api.connect()
    if not isinstance(result, dict) or result.get("success") is not True:
        raise TuyaCloudError("Tuya Cloud SDK connection failed")
    return api
