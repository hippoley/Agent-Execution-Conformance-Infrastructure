# Third-party provenance and licensing

## AgentScope release snapshot

- Official upstream: https://github.com/agentscope-ai/agentscope
- License: Apache-2.0 (preserve original LICENSE, notices and copyright)
- Release: https://github.com/agentscope-ai/agentscope/releases/tag/v2.0.10
- Immutable tag commit at verification: `e6c014f0be49b2a6f6f62a9453082a0b975484e1`
- Immutable Git source-tree SHA: `11d2173f891739d3e359af892eb576751a0a85f8`
- Current review-branch state: old submodule `third_party/agentscope`, NOT a complete imported tree.
- Target after import: `vendor/agentscope` ordinary tracked files, verified by exact Git tree equality.

AECI's first-party source lives under `src/aeci`. AgentScope's source always remains attributed to the original authors regardless of whether it is imported. We must not erase licenses, notices, author information or histories represented in source comments. Copying the release preserves files, not the full upstream commit history.

## Tuya

https://developer.tuya.com/ is an API integration target, not imported open-source source code or an assertion that its private control plane is open. There is currently no working Tuya adapter.
