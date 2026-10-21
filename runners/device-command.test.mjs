import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDevice, SimulatedDevice, validateCommand } from "./device-command.mjs";
import { runConformance } from "./conformance.mjs";

const load = async (name) => JSON.parse(await readFile(new URL(`../fixtures/device-command/${name}.json`, import.meta.url), "utf8"));
const principal = {
  authenticated: true,
  tenantId: "tenant-demo",
  deviceId: "esp32-demo",
  capabilities: new Set(["lamp.set_power"]),
};

test("accepts an authorized, unexpired command exactly once", async () => {
  const command = await load("valid");
  const device = new SimulatedDevice();
  assert.equal((await device.execute(command, principal, 1020)).state, "succeeded");
  assert.deepEqual(await device.execute(command, principal, 1021), { state: "duplicate", code: "DUPLICATE_COMMAND", command_id: "cmd-0001", observed: { on: true } });
});

test("rejects commands at their expiry boundary", async () => {
  assert.deepEqual(await validateCommand(await load("expired"), principal, 1060), { state: "expired", code: "COMMAND_EXPIRED" });
});

test("rejects tenant or device identity mismatch", async () => {
  const command = await load("valid");
  assert.deepEqual(await validateCommand(command, { ...principal, tenantId: "other" }, 1020), { state: "denied", code: "IDENTITY_MISMATCH" });
});

test("rejects unapproved capabilities", async () => {
  const command = { ...await load("valid"), capability: "device.shell" };
  assert.deepEqual(await validateCommand(command, principal, 1020), { state: "denied", code: "CAPABILITY_NOT_ALLOWED" });
});

test("does not claim acceptance is physical success", async () => {
  const result = await new SimulatedDevice().execute(await load("valid"), principal, 1020, { failReadback: true });
  assert.deepEqual(result, { state: "unverified", code: "POSTCONDITION_UNAVAILABLE", command_id: "cmd-0001" });
});

test("does not accept a command before its issued time or beyond the max window", async () => {
  const command = await load("valid");
  assert.deepEqual(validateCommand(command, principal, 999), { state: "denied", code: "COMMAND_NOT_YET_VALID" });
  assert.deepEqual(validateCommand({ ...command, expires_at: 1401 }, principal, 1020), { state: "denied", code: "INVALID_VALIDITY_WINDOW" });
});

test("persists the effect and idempotency record across a simulated restart", async () => {
  const command = await load("valid");
  const first = new SimulatedDevice();
  assert.equal((await first.execute(command, principal, 1020)).state, "succeeded");
  const directory = await mkdtemp(join(tmpdir(), "agent-device-conformance-"));
  const path = join(directory, "state.json");
  try {
    await first.save(path);
    const restarted = await SimulatedDevice.load(path);
    assert.equal((await restarted.execute(command, principal, 1021)).state, "duplicate");
    assert.equal(restarted.state.lampOn, true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects reuse of an idempotency key with changed arguments", async () => {
  const command = await load("valid");
  const device = new SimulatedDevice();
  await device.execute(command, principal, 1020);
  assert.deepEqual(await device.execute({ ...command, arguments: { on: false } }, principal, 1021), { state: "denied", code: "IDEMPOTENCY_KEY_REUSE" });
});

test("concurrent duplicate deliveries cause one modeled physical effect", async () => {
  const command = await load("valid");
  const device = new SimulatedDevice();
  const results = await Promise.all([
    device.execute(command, principal, 1020),
    device.execute(command, principal, 1020),
  ]);
  assert.deepEqual(results.map((result) => result.state).sort(), ["duplicate", "succeeded"]);
  assert.equal(device.state.lampOn, true);
});

test("public conformance vectors pass against the reference simulator", async () => {
  const report = await runConformance(createDevice);
  assert.equal(report.profile, "agent-device-effect/0.1");
  assert.equal(report.passed, true);
  assert.equal(report.results.length, 9);
  assert.ok(report.results.every((result) => typeof result.id === "string"
    && typeof result.passed === "boolean"
    && Array.isArray(result.states)
    && Array.isArray(result.codes)
    && typeof result.observedState === "object"));
});

test("public conformance harness detects an adapter that reports false success", async () => {
  const report = await runConformance(() => ({
    async execute(command) { return { state: "succeeded", code: "POSTCONDITION_VERIFIED", command_id: command.command_id }; },
    async inspectState() { return { lampOn: false }; },
  }));
  assert.equal(report.passed, false);
  assert.ok(report.results.some((result) => !result.passed));
});

test("rejects malformed identifiers before using them as deduplication keys", async () => {
  const command = { ...await load("valid"), idempotency_key: { toString: "bad" } };
  assert.deepEqual(validateCommand(command, principal, 1020), { state: "denied", code: "INVALID_ENVELOPE" });
});
