# Third-party provenance and licensing

## AgentScope release snapshot

- Official upstream: https://github.com/agentscope-ai/agentscope
- License: Apache-2.0 (preserve original LICENSE, notices and copyright)
- Release: https://github.com/agentscope-ai/agentscope/releases/tag/v2.0.10
- Immutable tag commit at verification: `e6c014f0be49b2a6f6f62a9453082a0b975484e1`
- Immutable Git source-tree SHA: `11d2173f891739d3e359af892eb576751a0a85f8`
- Review-branch state: complete `vendor/agentscope` ordinary tracked files, verified by exact Git tree equality; `.gitmodules` and the old gitlink were removed.
- Merge state: this import is on the open review branch and has not been merged to `main`.

AgentPanel contracts, fixtures, runners and adapters live outside `vendor/agentscope`. AgentScope's source always remains attributed to the original authors regardless of whether it is imported. Its original `LICENSE`, author information and source comments are preserved. Copying the release preserves the tagged source tree, not the full upstream commit history.

## Tuya

https://developer.tuya.com/ is an API integration target, not imported open-source source code or an assertion that its private control plane is open. There is currently no working Tuya adapter.
