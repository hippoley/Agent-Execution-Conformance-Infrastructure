# AgentScope dependency handling

Current source is a **Git submodule**, not 1:1 imported ordinary tracked files.

- Upstream: https://github.com/agentscope-ai/agentscope
- Pinned commit: `402c3664f70cb339f397c5ee40e662bc0d99eed0`
- Expected upstream source tree: `97ac65b28422ac44ef2d9d8315d6cf95e887d35f`
- Current path: `third_party/agentscope/`

For normal development, clone with `git clone --recurse-submodules`. Do not run source-vendoring workflows merely to use the dependency.

Optional (only if full-source redistribution is specifically needed):

```bash
bash tools/vendor/import_agentscope_exact.sh
```

The script checks a clean working tree, pins the source commit, checks the subtree SHA, then pushes a dedicated review branch. It does **not** merge into main. The optional manual workflow in `.github/workflows/vendor-agentscope.yml` may consume GitHub Actions minutes; it will not run on pushes or PRs. Preserve upstream licensing and original code.
