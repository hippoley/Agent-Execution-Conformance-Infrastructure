# Primary User Story and Proof Gate

## What counts as a user story

A user story names an actor, a concrete trigger, an observable outcome, and a condition that would make the outcome false. A feature title or architecture box is not a user story. For infrastructure work, include how another project can verify or reuse the result without trusting our implementation.

> As a **[specific actor]**, when **[trigger and inputs]**, I need **[capability]**, so that **[decision or outcome]**. I can verify this when **[observable acceptance evidence]**; it fails when **[explicit failure condition]**.

## Current product truth

The primary product story is: a business user requests an authorized action on a bound device through a managed cloud agent and receives the observed result, or an explicit failure/unknown outcome. See [the story catalog](USER_STORIES.md) for its acceptance boundary. The engineering stories below support that outcome; they are not standalone product commitments.

The current executable slice is the device-command contract, seven fixtures, and a JavaScript reference simulator/test harness in `contracts/`, `fixtures/`, and `runners/`. These are development/test assets, not a standalone product or runtime layer. They do not constitute a Tuya adapter, authenticated device service, or hardware conformance result. AgentScope v2.0.10 is present as a complete source snapshot, but no AgentScope integration is implemented. No third party is known to consume these artifacts.

## Story 1: independently check a bounded device command contract

> As an **agent-to-device adapter maintainer**, when my adapter receives a versioned device command, I need to run public vectors for principal binding, capability allowlisting, expiry, duplicate delivery, idempotency-key misuse, and observed state, so that API acceptance cannot be reported as physical success. I can verify this when my adapter runs the published conformance CLI and produces the expected machine-readable outcomes without importing the reference simulator; it fails when invalid or expired commands are accepted, a retry repeats the modeled effect, missing readback is reported as success, or the harness depends on private project code.

**Current evidence:** the reference simulator and seven conformance vectors run locally; a deliberately false-success adapter fails the harness. This proves only behavior against a simulator and injected test principal. Cancellation disposition, cross-process concurrency, crash-window reconciliation, real authentication, transport and hardware are outside the current evidence.

## Story 2: reproduce the imported upstream source

> As a **repository maintainer**, when I check out this review branch, I need AgentScope v2.0.10 to exist as ordinary files with a verifiable upstream tree identity and preserved license, so that source review and project changes do not depend on an initialized submodule. I can verify this when `vendor/agentscope` has tree `11d2173f891739d3e359af892eb576751a0a85f8`, contains the upstream Apache-2.0 license, and has no gitlink; it fails when any of those checks differ.

**Current evidence:** exact tree, license, source syntax and basic package import have been checked locally on the review branch. The upstream pytest suite was not run because its development dependencies are not installed. The branch has not been merged to `main`.

## Story 3: prove a second implementation can reuse the profile

> As a **maintainer of another agent/device integration**, when I implement the published adapter interface, I need to run the same versioned vectors and compare a machine-readable report, so that compatibility can be checked without importing this repository's code. I can verify this when an independently maintained adapter passes the public profile and documents its unsupported cases; it fails when the fixtures require simulator internals, manual interpretation, or repository-specific credentials.

**State:** not proven; no independent adapter or adopter evidence is recorded.

## Excluded from the current product claim

- Building the full Managed Agents control plane shown in [the system architecture](ARCHITECTURE.md).
- Claiming Tuya, ESP32, AgentScope runtime, MCP transport, OTA, voice, or cloud service integration from source presence or diagrams.
- Treating a simulator result, GitHub star, or passing local test as proof of physical safety or external adoption.

## Decision gate

Prioritize one AgentScope-to-device integration over expanding the test profile. Select a supported TuyaOpen/ESP32 board and confirm its identity, command, and readback paths before claiming hardware support. Use existing vectors as regression checks and add cases when real integration failures justify them. Independent adoption is a gate for publishing a separate conformance product, not a prerequisite for implementing AgentPanel.
