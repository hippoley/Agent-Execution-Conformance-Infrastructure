# AECI native AgentScope service (local-only, first migration step)

This service reuses the **actual pinned upstream** `agentscope.app.create_app`; it does not copy AgentScope's API, session, SOP, task, model or team implementations. It intentionally **does not** connect to real Tuya credentials or automatically install/playwright MCP hubs.

## Local setup
- Python >=3.11; install pinned `vendor/agentscope` dependencies in an isolated venv (including its `full` extra if needed).
- Start **local Redis** on 127.0.0.1:6379.
- From repo root: `python services/agentscope_native/main.py` (Python import path must include installed AgentScope package).
- It binds exclusively to `http://127.0.0.1:8000`. Keep the stock sample and Redis on trusted local machine; **the official identity header is not production IAM**.
- For upstream's chat Web UI use `vendor/agentscope/examples/web_ui` independently. Do not replace AgentScope chat/session runtime with `admin/server.mjs`.

## Verification
```bash
python -m unittest discover -s tests -p 'test_agentscope_native_layout.py'
curl -i http://127.0.0.1:8000/health
```
`/health` depends on the upstream user-auth dependency (may require a dev identity header); a 401 is **not** evidence that the SDK is broken. Full service acceptance requires a real installed environment and actual session/chat/team tests.

The layout unittest is static and requires no dependencies, network, Actions or credentials. Its success is **not** runtime acceptance.

## Migration map
- Native AgentScope `/agent`, `/chat`, `/session`, `/sop`, `/model`, `/skill`, `/mcp`: upstream owns these.
- AECI owns only hardware capability authorization, command identity, confirmation semantics and device evidence.
- Legacy Node `admin/server.mjs` stays loopback test-fixture only; never develop a second production agent service.
- Future: register AECI as an AgentScope MCP/tool using the official extension points, and verify server-side permission with independent hardware state.
