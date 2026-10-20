import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createHash } from "node:crypto";

const required = [
  "schema_version", "command_id", "tenant_id", "device_id", "session_id",
  "capability", "arguments", "issued_at", "expires_at", "idempotency_key",
];
const MAX_VALIDITY_SECONDS = 300;

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function commandDigest(command) {
  return createHash("sha256").update(stableJson(command)).digest("hex");
}

export function validateCommand(command, principal, now) {
  if (!command || typeof command !== "object" || Array.isArray(command)) {
    return { state: "denied", code: "INVALID_ENVELOPE" };
  }
  for (const key of required) {
    if (!(key in command)) return { state: "denied", code: "MISSING_FIELD", field: key };
  }
  const stringFields = ["command_id", "tenant_id", "device_id", "session_id", "capability", "idempotency_key"];
  if (stringFields.some((key) => typeof command[key] !== "string" || command[key].length === 0)
      || !command.arguments || typeof command.arguments !== "object" || Array.isArray(command.arguments)
      || Object.keys(command).some((key) => !required.includes(key))) {
    return { state: "denied", code: "INVALID_ENVELOPE" };
  }
  if (command.schema_version !== "1") return { state: "denied", code: "UNSUPPORTED_VERSION" };
  if (!principal?.authenticated || !principal.tenantId || !principal.deviceId) {
    return { state: "denied", code: "UNAUTHENTICATED" };
  }
  if (command.tenant_id !== principal.tenantId || command.device_id !== principal.deviceId) {
    return { state: "denied", code: "IDENTITY_MISMATCH" };
  }
  if (!Number.isSafeInteger(command.issued_at) || !Number.isSafeInteger(command.expires_at)
      || command.issued_at < 0 || command.expires_at <= command.issued_at
      || command.expires_at - command.issued_at > MAX_VALIDITY_SECONDS) {
    return { state: "denied", code: "INVALID_VALIDITY_WINDOW" };
  }
  if (!Number.isSafeInteger(now) || now < 0) return { state: "denied", code: "UNTRUSTED_CLOCK" };
  if (now < command.issued_at) return { state: "denied", code: "COMMAND_NOT_YET_VALID" };
  if (now >= command.expires_at) return { state: "expired", code: "COMMAND_EXPIRED" };
  if (!principal.capabilities?.has(command.capability)) return { state: "denied", code: "CAPABILITY_NOT_ALLOWED" };
  if (command.capability === "lamp.set_power" && typeof command.arguments?.on !== "boolean") {
    return { state: "denied", code: "INVALID_ARGUMENTS" };
  }
  return null;
}

export class SimulatedDevice {
  constructor({ state = { lampOn: false }, records = {} } = {}) {
    this.state = state;
    this.records = records instanceof Map ? records : new Map(Object.entries(records));
  }

  async execute(command, principal, now, { failReadback = false } = {}) {
    const invalid = validateCommand(command, principal, now);
    if (invalid) return invalid;

    const digest = commandDigest(command);
    const previous = this.records.get(command.idempotency_key);
    if (previous) {
      if (previous.digest !== digest) return { state: "denied", code: "IDEMPOTENCY_KEY_REUSE" };
      return { ...previous.result, state: "duplicate", code: "DUPLICATE_COMMAND" };
    }
    const commandIdRecord = [...this.records.values()].find((entry) => entry.command_id === command.command_id);
    if (commandIdRecord) return { state: "denied", code: "COMMAND_ID_REUSE" };

    const record = { state: "executing", code: "COMMAND_EXECUTING", command_id: command.command_id };
    this.records.set(command.idempotency_key, { digest, command_id: command.command_id, result: record });
    if (command.capability === "lamp.set_power") this.state.lampOn = command.arguments.on;

    if (failReadback) {
      record.state = "unverified";
      record.code = "POSTCONDITION_UNAVAILABLE";
      this.records.get(command.idempotency_key).result = record;
      return { ...record };
    }
    if (this.state.lampOn !== command.arguments.on) {
      record.state = "failed";
      record.code = "POSTCONDITION_FAILED";
      this.records.get(command.idempotency_key).result = record;
      return { ...record };
    }
    record.state = "succeeded";
    record.code = "POSTCONDITION_VERIFIED";
    record.observed = { on: this.state.lampOn };
    this.records.get(command.idempotency_key).result = record;
    return { ...record };
  }

  async save(path) {
    await mkdir(dirname(path), { recursive: true });
    const temporary = `${path}.tmp`;
    await writeFile(temporary, JSON.stringify({ state: this.state, records: Object.fromEntries(this.records) }, null, 2));
    await rename(temporary, path);
  }

  async inspectState() {
    return structuredClone(this.state);
  }

  static async load(path) {
    try {
      return new SimulatedDevice(JSON.parse(await readFile(path, "utf8")));
    } catch (error) {
      if (error.code === "ENOENT") return new SimulatedDevice();
      throw error;
    }
  }
}

export function createDevice({ initialState }) {
  return new SimulatedDevice({ state: initialState });
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replaceAll("\\", "/")}`).href) {
  const fixtureName = process.argv[2] ?? "valid";
  const now = Number(process.argv[3] ?? 1020);
  const file = new URL(`../fixtures/device-command/${fixtureName}.json`, import.meta.url);
  const command = JSON.parse(await readFile(file, "utf8"));
  const principal = {
    authenticated: true,
    tenantId: "tenant-demo",
    deviceId: "esp32-demo",
    capabilities: new Set(["lamp.set_power"]),
  };
  const device = new SimulatedDevice({ records: fixtureName === "duplicate"
    ? { "session-demo:cmd-0001": { digest: commandDigest(command), command_id: "cmd-0001", result: { state: "succeeded", code: "POSTCONDITION_VERIFIED", command_id: "cmd-0001", observed: { on: true } } } }
    : {} });
  const result = await device.execute(command, principal, now);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (["denied", "expired", "failed", "unverified"].includes(result.state)) process.exitCode = 1;
}
