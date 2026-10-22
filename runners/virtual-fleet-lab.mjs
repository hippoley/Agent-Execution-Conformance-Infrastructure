// Development test laboratory: child processes, NOT VMs, containers or real LLM agents.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { FakeTuyaClient } from '../adapters/fake-tuya-client.mjs';

const serverFile = fileURLToPath(new URL('./fake-tuya-service.mjs', import.meta.url));
const IDENTIFIER = /^[A-Za-z0-9_-]{1,80}$/;
const timeout = (ms, reason) => new Promise((_, reject) => setTimeout(() => reject(new Error(reason)), ms));

async function stopProcess(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([once(child, 'exit'), timeout(1800, 'terminate timeout').catch(() => child.kill('SIGKILL'))]);
}

export async function withVirtualFleet(devices, work) {
  if (!Array.isArray(devices) || devices.length < 2 || devices.length > 8) throw new TypeError('2..8 devices required');
  const managed = new Map();
  const workers = [];
  try {
    for (const item of devices) {
      if (!item || ![item.tenant, item.device].every(x => typeof x === 'string' && IDENTIFIER.test(x))) {
        throw new TypeError('invalid fleet device scope');
      }
      const key = `${item.tenant}:${item.device}`;
      if (managed.has(key)) throw new TypeError('duplicate device scope');
      const token = randomBytes(32).toString('hex');
      const child = spawn(process.execPath, [serverFile], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, AGENTPANEL_TEST_TOKEN: token, AGENTPANEL_TEST_TENANT: item.tenant,
          AGENTPANEL_TEST_DEVICE: item.device },
      });
      workers.push(child);
      const ready = await Promise.race([
        once(child.stdout, 'data').then(([buf]) => JSON.parse(buf.toString().trim().split('\n')[0])),
        once(child, 'exit').then(() => { throw new Error('virtual device exited at startup'); }),
        timeout(3000, 'virtual device startup timed out'),
      ]);
      if (!Number.isSafeInteger(ready.port) || ready.port < 1) throw new Error('invalid child readiness');
      managed.set(key, { client: new FakeTuyaClient({ baseUrl: `http://127.0.0.1:${ready.port}`,
        token, tenant: item.tenant, device: item.device }), pid: child.pid });
    }
    return await work(managed);
  } finally {
    await Promise.allSettled(workers.map(stopProcess));
  }
}

// A deterministic role pipeline, not a deployed multi-Agent service.
// Plan, policy, dispatch and verification have separate trust responsibilities.
export async function runRoleWorkflow({ fleet, plan, grants }) {
  if (!Array.isArray(plan) || !Array.isArray(grants) || plan.length < 1 || plan.length > 8) throw new TypeError('invalid workflow');
  const trace = [];
  const operations = [];
  const used = new Set();
  // Preflight ALL steps before causing ANY simulated effect.
  for (const [index, step] of plan.entries()) {
    const deviceKey = `${step?.tenant}:${step?.device}`;
    const item = fleet.get(deviceKey);
    const allowed = grants.some(g => g.actor === step?.actor && g.tenant === step?.tenant && g.device === step?.device);
    const valid = item && allowed && typeof step?.actor === 'string'
      && IDENTIFIER.test(step.actor) && step.capability === 'lamp.set_power' && typeof step.on === 'boolean'
      && !used.has(deviceKey);
    trace.push({ role: 'policy', step: index, target: deviceKey, decision: valid ? 'ALLOW' : 'DENY' });
    if (!valid) return { disposition: 'DENIED_BEFORE_DISPATCH', trace, effects: 0 };
    used.add(deviceKey);
    operations.push({ index, item, step });
  }
  const outcomes = await Promise.all(operations.map(async ({ index, item, step }) => {
    // One stable command ID per workflow step, held outside the model.
    const cmd = item.client.commandForLamp(step.on, `fleet-${index}-${randomBytes(8).toString('hex')}`);
    let result;
    try { result = await item.client.execute(cmd); }
    catch { result = { status: 'UNKNOWN_RECONCILIATION_REQUIRED' }; }
    return { index, target: `${step.tenant}:${step.device}`, status: result.status,
      // This is the TEST SERVICE's reported state, not an independent physical oracle.
      verifiedInFake: result.status === 'CONFIRMED_IN_FAKE_SERVICE' };
  }));
  for (const event of outcomes) trace.push({ role: 'observer', ...event });
  const count = outcomes.filter(x => x.verifiedInFake).length;
  return { disposition: count === outcomes.length ? 'SIMULATED_WORKFLOW_CONFIRMED'
    : count === 0 ? 'UNKNOWN_OR_FAILED' : 'PARTIAL_SIMULATED_EFFECT', trace, effects: count };
}
