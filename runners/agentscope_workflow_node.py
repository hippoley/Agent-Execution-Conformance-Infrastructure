#!/usr/bin/env python3
"""One trusted Workflow node -> pinned real AgentScope Toolkit -> fake Tuya HTTP.
Input is JSON on stdin; output is one JSON document on stdout.
This is NOT an LLM agent, physical device, or production executor.
"""
import asyncio
import json
import os
import sys

from agentscope.message import ToolCallBlock
from agentscope.state import AgentState
from agentscope.tool import Toolkit, ToolResponse
from adapters.agentscope_fake_tuya_tool import FakeTuyaLampTool


async def run(payload):
    required = {"baseUrl", "token", "tenant", "device", "commandId", "on"}
    if not isinstance(payload, dict) or set(payload) != required:
        return {"status": "DENIED", "reason": "INVALID_BRIDGE_INPUT"}
    if type(payload["on"]) is not bool:
        return {"status": "DENIED", "reason": "INVALID_ARGUMENT"}
    if not isinstance(payload["commandId"], str) or not payload["commandId"]:
        return {"status": "DENIED", "reason": "INVALID_COMMAND_ID"}
    # These scope values are supplied by the TRUSTED local Node admin only.
    tool = FakeTuyaLampTool(payload["baseUrl"], payload["token"],
                            tenant=payload["tenant"], device=payload["device"],
                            allow_test_execution=True)
    toolkit = Toolkit(tools=[tool])
    block = ToolCallBlock(id=payload["commandId"], name=tool.name,
                          input=json.dumps({"on": payload["on"], "command_id": payload["commandId"]}))
    final = None
    async for event in toolkit.call_tool(block, AgentState()):
        if isinstance(event, ToolResponse):
            final = event
    if final is None:
        return {"status": "UNKNOWN_RECONCILIATION_REQUIRED", "reason": "NO_FINAL_TOOL_RESPONSE"}
    try:
        data = json.loads(final.content[0].text)
    except (ValueError, IndexError, AttributeError):
        return {"status": "UNKNOWN_RECONCILIATION_REQUIRED", "reason": "INVALID_TOOL_RESPONSE"}
    status = data.get("status")
    if status not in {"CONFIRMED_IN_FAKE_SERVICE", "DENIED", "UNKNOWN_RECONCILIATION_REQUIRED"}:
        return {"status": "UNKNOWN_RECONCILIATION_REQUIRED", "reason": "UNEXPECTED_STATUS"}
    if data.get("command_id", payload["commandId"]) != payload["commandId"]:
        return {"status": "UNKNOWN_RECONCILIATION_REQUIRED", "reason": "COMMAND_ID_MISMATCH"}
    return {"status": status, "commandId": payload["commandId"], "executor": "AGENTSCOPE_V2_TOOLKIT",
            "toolResponseState": getattr(final.state, "value", final.state)}


def main():
    try:
        payload = json.loads(sys.stdin.read(4096))
        output = asyncio.run(run(payload))
    except Exception:
        # Never emit secret-bearing tracebacks on the protocol's stdout.
        output = {"status": "UNKNOWN_RECONCILIATION_REQUIRED", "reason": "SDK_BRIDGE_FAILED"}
    print(json.dumps(output, sort_keys=True))


if __name__ == "__main__":
    main()
