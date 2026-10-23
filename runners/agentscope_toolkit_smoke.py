#!/usr/bin/env python3
"""Real AgentScope v2.0.10 Toolkit smoke against an isolated fake Tuya service.

Prerequisite: pinned AgentScope with its Python dependencies installed. This
checks ToolKit invocation, NOT model reasoning or actual Tuya Cloud/hardware.
Never send cloud credentials to this process.
"""
import asyncio
import json
import os
import subprocess
import sys
from urllib.parse import urlsplit

from agentscope.tool import Toolkit
from agentscope.message import ToolCallBlock, ToolResultState
from agentscope.state import AgentState
from adapters.agentscope_fake_tuya_tool import FakeTuyaLampTool

def assert_result(responses, expected):
    # The last item MUST be an actual ToolResponse from Toolkit, not our fake.
    from agentscope.tool import ToolResponse
    final = [r for r in responses if isinstance(r, ToolResponse)]
    if len(final) != 1:
        raise AssertionError(f"Expected exactly one final ToolResponse; got {len(final)}")
    status = final[0].state
    if str(status) != expected and getattr(status, "value", status) != expected:
        raise AssertionError(f"Unexpected tool result state: {status}, expected {expected}")
    return final[0]

async def invoke(toolkit, value):
    block = ToolCallBlock(id="local-smoke", name="set_test_lamp_power",
                          input=json.dumps({"on": value}))
    return [item async for item in toolkit.call_tool(block, AgentState())]

async def main():
    token = os.urandom(16).hex()
    env = {**os.environ, "AGENTPANEL_TEST_TOKEN":token,
           "AGENTPANEL_TEST_TENANT":"tenant-demo","AGENTPANEL_TEST_DEVICE":"esp32-demo"}
    proc = subprocess.Popen(["node", "runners/fake-tuya-service.mjs"],
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                            env=env, text=True)
    try:
        line = await asyncio.wait_for(asyncio.to_thread(proc.stdout.readline), 8)
        ready = json.loads(line)
        port = ready.get("port")
        if not isinstance(port, int) or port < 1 or port > 65535:
            raise AssertionError("Missing fake service port")
        base = f"http://127.0.0.1:{port}"
        # Intentionally a real Toolkit and a real ToolBase subclass.
        denied = Toolkit(tools=[FakeTuyaLampTool(base, token)])
        # Toolkit.call_tool is an execution interface; a definitive permission
        # decision must come from the AgentScope PermissionEngine/calling agent.
        # Explicit trusted config is therefore required before execution.
        tool = FakeTuyaLampTool(base, token, allow_test_execution=True)
        from agentscope.permission import PermissionContext, PermissionBehavior
        assert (await denied.tool_groups[0].tools[0].check_permissions(
            {"on": True}, PermissionContext())).behavior == PermissionBehavior.DENY
        assert (await tool.check_permissions(
            {"on": True}, PermissionContext())).behavior == PermissionBehavior.ALLOW
        assert_result(await invoke(denied, True), "denied")
        kit = Toolkit(tools=[tool])
        result = assert_result(await invoke(kit, True), "success")
        content = json.loads(result.content[0].text)
        assert content["status"] == "CONFIRMED_IN_FAKE_SERVICE", content
        assert_result(await invoke(kit, "true"), "error")
        print(json.dumps({"real_toolkit": True, "authorized_fake_execution": True,
                          "invalid_argument_rejected":True, "default_deny":True, "physical_proof":False}, sort_keys=True))
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait(timeout=3)

if __name__ == "__main__":
    asyncio.run(main())
