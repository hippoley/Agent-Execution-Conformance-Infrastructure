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

test("refuses an unimplemented capability even if it appears in the principal grant", async () => {
  const command = { ...await load("valid"), capability: "device.shell", arguments: { on: false } };
  const granted = { ...principal, capabilities: new Set(["lamp.set_power", "device.shell"]) };
  const device = new SimulatedDevice();
  assert.deepEqual(validateCommand(command, granted, 1020), { state: "denied", code: "UNSUPPORTED_CAPABILITY" });
  assert.deepEqual(await device.execute(command, granted, 1020), { state: "denied", code: "UNSUPPORTED_CAPABILITY" });
  assert.deepEqual(await device.inspectState(), { lampOn: false });
});

test("rejects unexpected arguments even for an implemented capability", async () => {
  const command = { ...await load("valid"), arguments: { on: false, extra: "unexpected" } };
  const device = new SimulatedDevice();
  assert.deepEqual(await device.execute(command, principal, 1020), { state: "denied", code: "INVALID_ARGUMENTS" });
  assert.deepEqual(await device.inspectState(), { lampOn: false });
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
  assert.equal(report.profile, "agent-device-effect/0.3");
  assert.equal(report.passed, true);
  assert.equal(report.results.length, 10);
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

test("malformed principal context is rejected without throwing or causing an effect", async () => {
  const command = await load("valid");
  const device = new SimulatedDevice();
  for (const caller of [
    { ...principal, authenticated: "true" },
    { ...principal, authenticated: 1 },
    { ...principal, tenantId: 42 },
    { ...principal, deviceId: {} },
    { ...principal, capabilities: ["lamp.set_power"] },
    { ...principal, capabilities: null },
  ]) {
    assert.deepEqual(await device.execute(command, caller, 1020), {
      state: "denied", code: "UNAUTHENTICATED",
    });
  }
  assert.deepEqual(await device.inspectState(), { lampOn: false });
  assert.equal(device.records.size, 0);
});

test("valid typed principal remains authorized", async () => {
  assert.equal((await new SimulatedDevice().execute(await load("valid"), principal, 1020)).state, "succeeded");
});

test("public conformance suite rejects string-valued authentication context", async () => {
  const report = await runConformance(createDevice);
  const example = report.results.find((item) => item.id === "malformed-authentication-context");
  assert.ok(example);
  assert.equal(example.passed, true);
  assert.deepEqual(example.states, ["denied"]);
  assert.deepEqual(example.observedState, { lampOn: false });
});

test("faulting third-party adapter yields machine-readable failures without leaking exception details", async () => {
  const report = await runConformance(() => { throw new Error("SECRET_SHOULD_NOT_LEAK"); });
  assert.equal(report.passed, false);
  assert.equal(report.results.length, 10);
  assert.ok(report.results.every((entry) => entry.passed === false
    && entry.codes.length === 1 && entry.codes[0] === "ADAPTER_ERROR"));
  assert.equal(JSON.stringify(report).includes("SECRET_SHOULD_NOT_LEAK"), false);
});
