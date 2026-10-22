"""AgentScope v2 ToolBase adapter for the loopback-only fake Tuya service.

This is a development integration candidate; a genuine AgentScope runtime invocation
has not been verified without the upstream AgentScope Python dependencies.
"""
import asyncio
import json
import os
import time
import uuid
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

from agentscope.tool import ToolBase, ToolChunk
from agentscope.message import TextBlock, ToolResultState


class FakeTuyaLampTool(ToolBase):
    name = "set_test_lamp_power"
    description = "Set an authorized low-risk test lamp in the isolated fake Tuya service."
    input_schema = {
        "type": "object",
        "properties": {"on": {"type": "boolean"}},
        "required": ["on"],
        "additionalProperties": False,
    }
    is_concurrency_safe = False
    is_read_only = False

    def __init__(self, base_url: str, token: str, tenant: str = "tenant-demo", device: str = "esp32-demo"):
        super().__init__()
        u = urlsplit(base_url)
        if u.scheme != "http" or u.hostname not in {"localhost", "127.0.0.1"}:
            raise ValueError("Only the loopback test service may be connected")
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.tenant = tenant
        self.device = device

    def _request(self, path: str, command=None):
        data = json.dumps(command).encode("utf-8") if command is not None else None
        req = Request(self.base_url + path, data=data, headers={
            "Authorization": f"Bearer {self.token}",
            **({"Content-Type": "application/json"} if data else {}),
        }, method="POST" if data else "GET")
        try:
            with urlopen(req, timeout=2) as res:
                return res.status, json.load(res)
        except HTTPError as exc:
            return exc.code, json.loads(exc.read())

    def _execute(self, on: bool):
        command_id = str(uuid.uuid4())
        now = int(time.time())
        command = {
            "schema_version": "1", "command_id": command_id, "tenant_id": self.tenant,
            "device_id": self.device, "session_id": "agentscope-test", "capability": "lamp.set_power",
            "arguments": {"on": on}, "issued_at": now, "expires_at": now + 60,
            "idempotency_key": f"agentscope-test:{command_id}",
        }
        try:
            status, response = self._request("/v1/commands", command)
            if status != 200:
                return {"status": "DENIED", "reason": response.get("error", "COMMAND_REJECTED")}
        except (URLError, TimeoutError, ConnectionError):
            # A missing ACK MUST NOT automatically repeat a possibly executed command.
            pass
        try:
            rs, receipt = self._request(f"/v1/receipts/{command_id}")
            ss, state = self._request("/v1/state")
            if (rs == ss == 200 and receipt.get("command_id") == command_id
                    and receipt.get("tenant_id") == self.tenant and receipt.get("device_id") == self.device
                    and receipt.get("capability") == "lamp.set_power"
                    and receipt.get("observed", {}).get("lampOn") is on
                    and state.get("lampOn") is on and state.get("version", -1) >= receipt.get("version", 10**20)):
                return {"status": "CONFIRMED_IN_FAKE_SERVICE", "command_id": command_id}
        except (URLError, TimeoutError, ConnectionError, ValueError, KeyError, TypeError):
            pass
        return {"status": "UNKNOWN_RECONCILIATION_REQUIRED", "command_id": command_id}

    async def call(self, on: bool):
        if type(on) is not bool:
            return ToolChunk(content=[TextBlock(text='{"status":"INVALID_ARGUMENTS"}')], state=ToolResultState.ERROR)
        result = await asyncio.to_thread(self._execute, on)
        return ToolChunk(content=[TextBlock(text=json.dumps(result))],
                         state=ToolResultState.RUNNING if result["status"] == "CONFIRMED_IN_FAKE_SERVICE" else ToolResultState.ERROR)
