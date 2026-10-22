# AgentPanel interactive GitHub Pages demo

Entry: `docs/index.html` (plain HTML/JS, no npm, no bundler, no CI).

In repository **Settings → Pages → Build and deployment**, choose **Deploy from a branch**, `main`, `/docs`, then Save. When GitHub completes publication the expected project URL is:

https://hippoley.github.io/Agent-Execution-Conformance-Infrastructure/

The GitHub Pages publishing infrastructure may run its own GitHub Pages build job; we do not add a GitHub Actions workflow or invoke a paid build workflow. If the repository Pages source is already configured, do not change it without inspecting existing deployment needs.

The page runs a **browser-only demonstration** with localStorage, not the repository's Node HTTP backend. It supports creating virtual lamps and Agent configuration records, binding within one tenant, running a simulated on/off operation and reviewing run history. Different browsers have different data; deleting browser storage resets the demo.

**Not connected:** actual AgentScope agents, Tuya official virtual devices, Tuya Cloud API, ESP32, real VM/container sandbox, production IAM, persistent server database, actual publishing, any physical effect. No secrets should be entered into this public client-only demo. Functional test gate: open published Pages, create device, create Agent with matching tenant, run simulation, inspect Run Logs, reload and confirm browser-local persisted state. This has not yet been tested against a live GitHub Pages URL.

To preview without Pages, serve repository `docs/` using a local static server or open `docs/index.html` in a browser. Don't confuse that with a backend execution acceptance.
