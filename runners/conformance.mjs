import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const manifestUrl = new URL("../fixtures/device-command/conformance.json", import.meta.url);
const fixturesUrl = new URL("../fixtures/device-command/", import.meta.url);
const defaultPrincipal = {
  authenticated: true,
  tenantId: "tenant-demo",
  deviceId: "esp32-demo",
  capabilities: ["lamp.set_power"],
};

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function runConformance(createDevice) {
  const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
  const results = [];
  for (const vector of manifest.vectors) {
    const fixture = JSON.parse(await readFile(new URL(`${vector.fixture}.json`, fixturesUrl), "utf8"));
    // Public, declarative first-request variants let third-party adapters replay negatives.
    const command = { ...fixture, ...(vector.commandOverride ?? {}) };
    const principalData = { ...defaultPrincipal, ...vector.principal };
    const principal = { ...principalData, capabilities: new Set(principalData.capabilities) };
    const device = createDevice({ initialState: { lampOn: false } });
    const count = vector.repeat ?? (vector.mutateSecond ? 2 : 1);
    const outcomes = [];
    for (let index = 0; index < count; index += 1) {
      const request = index === 1 && vector.mutateSecond ? { ...command, ...vector.mutateSecond } : command;
      outcomes.push(await device.execute(request, principal, vector.now, vector.options));
    }
    const states = outcomes.map((outcome) => outcome.state);
    const expectedStates = vector.expectedStates ?? [vector.expected.state];
    const state = await device.inspectState();
    const passed = stableJson(states) === stableJson(expectedStates)
      && (!vector.expected || outcomes[0]?.code === vector.expected.code)
      && (!vector.expectedSecondCode || outcomes[1]?.code === vector.expectedSecondCode)
      && stableJson(state) === stableJson(vector.expectedState);
    results.push({ id: vector.id, passed, states, codes: outcomes.map((outcome) => outcome.code), observedState: state });
  }
  return { profile: manifest.profile, passed: results.every((result) => result.passed), results };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const modulePath = process.argv[2];
  if (!modulePath) {
    process.stderr.write("Usage: node runners/conformance.mjs <adapter-module.mjs>\n");
    process.exitCode = 2;
  } else {
    const adapter = await import(pathToFileURL(resolve(modulePath)));
    if (typeof adapter.createDevice !== "function") throw new TypeError("Adapter must export createDevice(options)");
    const report = await runConformance(adapter.createDevice);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.passed) process.exitCode = 1;
  }
}
