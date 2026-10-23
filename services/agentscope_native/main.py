"""Local AgentScope-only service profile based on pinned upstream v2.0.10.

Development-only: binds loopback, no default external MCP, no CORS wildcard,
no channels, no public authentication. Never expose to the network.
"""
import os
from pathlib import Path

from agentscope.app import create_app
from agentscope.app.message_bus import InMemoryMessageBus
from agentscope.app.storage import RedisStorage
from agentscope.app.workspace_manager import LocalWorkspaceManager

workspace_root = Path(os.environ.get("AECI_WORKSPACES", ".local/agentscope-workspaces")).resolve()
workspace_root.mkdir(parents=True, exist_ok=True)

app = create_app(
    storage=RedisStorage(host="127.0.0.1", port=int(os.environ.get("AECI_REDIS_PORT", "6379"))),
    message_bus=InMemoryMessageBus(),
    workspace_manager=LocalWorkspaceManager(basedir=str(workspace_root), default_mcps=[]),
    knowledge_base_manager=None,
    mcp_hubs=[],
    skill_hubs=[],
    channels=[],
    enable_channel_worker=False,
    enable_scheduler=False,
    title="AECI AgentScope Native Development Service",
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("AECI_AGENT_PORT", "8000")))
