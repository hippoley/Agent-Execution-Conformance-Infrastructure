# Documentation Map

The project follows the AgentPanel system architecture. The current repository contains the first device-command development harness and a pinned upstream source snapshot; it is not yet a deployed managed-agent platform.

Read in this order:

1. [Product overview](PRODUCT_OVERVIEW.md) separates what runs today from the product hypothesis.
2. [Primary user story](USER_STORY.md) defines the first outcome and evidence gate; [story catalog](USER_STORIES.md) keeps the customer requirements and future acceptance criteria.
3. [System architecture](ARCHITECTURE.md) is the canonical Managed Agents, AgentScope, TuyaOpen and ESP32 design. The local command test harness is not a runtime architecture layer.
4. [Implementation status](IMPLEMENTATION_STATUS.md) documents code ownership and limits of local evidence.
5. [Position review](POSITION_REVIEW.md) records comparison, falsifiers and ecosystem evidence.
6. [Source import record](SOURCE_MIGRATION.md), [import report](AGENTSCOPE_V2_0_10_IMPORT_REPORT.md), and [third-party notices](THIRD_PARTY.md) document AgentScope provenance.

`ARCHITECTURE.md` owns the system diagram; `IMPLEMENTATION_STATUS.md` owns current code truth. `USER_STORY.md` is the prioritized story and proof gate; `USER_STORIES.md` is the fuller customer requirements catalog.
