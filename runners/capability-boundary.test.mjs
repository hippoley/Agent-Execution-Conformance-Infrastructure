import test from "node:test";
import assert from "node:assert/strict";
import { SimulatedDevice, validateCommand } from "./device-command.mjs";

// This is a simulator boundary test, not a real Tuya or physical actuator test.
const command = {
  schema_version: "1",
  command_id: "cmd-1",
  tenant_id: "t",
  device_id: "d",
  session_id: "s",
  capability: "lamp.set_power",
  arguments: { on: false },
  issued_at: 1000,
  expires_at: 1060,
  idempotency_key: "s:cmd-1",
};
const principal = {
  authenticated: true,
  tenantId: "t",
  deviceId: "d",
  capabilities: new Set(["lamp.set_power", "lock.unlock"]),
};

test("allowlisted but unimplemented capability cannot claim a verified physical effect", async () => {
  const device = new SimulatedDevice();
  const result = await device.execute({ ...command, capability: "lock.unlock" }, principal, 1010);
  assert.deepEqual(result, { state: "denied", code: "UNSUPPORTED_CAPABILITY" });
  assert.equal(device.records.size, 0);
  assert.deepEqual(await device.inspectState(), { lampOn: false });
});

test("supported capability rejects undeclared arguments", () => {
  assert.deepEqual(
    validateCommand({ ...command, arguments: { on: false, unexpected: "injected" } }, principal, 1010),
    { state: "denied", code: "INVALID_ARGUMENTS" },
  );
});

test("legitimate state-setting command remains usable", async () => {
  const device = new SimulatedDevice();
  const result = await device.execute(command, principal, 1010);
  assert.equal(result.state, "succeeded");
  assert.deepEqual(result.observed, { on: false });
});
