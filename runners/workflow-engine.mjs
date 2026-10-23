// Deterministic, bounded workflow executor. This is not AgentScope or a durable production worker.
import { randomUUID } from 'node:crypto';

const validId = x => typeof x === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(x);
export function validateWorkflow(definition, { tenant, authorizedDevices }) {
  if (!definition || typeof definition !== 'object' || Array.isArray(definition) ||
      !Array.isArray(definition.nodes) || definition.nodes.length < 1 || definition.nodes.length > 12 ||
      Object.keys(definition).some(k => !['name', 'nodes'].includes(k)) || !validId(definition.name))
    return 'INVALID_WORKFLOW';
  const ids = new Set();
  for (const node of definition.nodes) {
    if (!node || Object.keys(node).some(k => !['id','type','deviceId','on'].includes(k)) ||
        !validId(node.id) || ids.has(node.id) || node.type !== 'lamp.set_power' ||
        !validId(node.deviceId) || typeof node.on !== 'boolean') return 'INVALID_NODE';
    ids.add(node.id);
    if (!authorizedDevices.some(d => d.id === node.deviceId && d.tenant === tenant)) return 'DEVICE_NOT_AUTHORIZED';
  }
  return null;
}

export async function executeWorkflow({ definition, tenant, authorizedDevices, acquire, saveRun, workflowId, dispatchNode }) {
  const reason = validateWorkflow(definition, {tenant, authorizedDevices});
  if (reason) return {status:'DENIED',reason};
  const run = {id:randomUUID(), workflowId, tenant, startedAt:new Date().toISOString(),status:'RUNNING',nodes:[],evidence:'FAKE_DEVICE_HTTP_ONLY'};
  await saveRun(run); // write-ahead run before the first possible effect
  for (const node of definition.nodes) {
    const step = {id:node.id,deviceId:node.deviceId,action:node.type,requested:node.on,
      status:'DISPATCH_INTENT_SAVED',commandId:randomUUID(),startedAt:new Date().toISOString()};
    run.nodes.push(step);
    await saveRun(run); // persist the command identity before sending anything
    try {
      const client = await acquire(node.deviceId);
      const result = dispatchNode ? await dispatchNode({client,node,commandId:step.commandId})
        : await client.execute(client.commandForLamp(node.on,step.commandId));
      if (result.executor) step.executor = result.executor;
      step.status = result.status;
    } catch {
      step.status = 'UNKNOWN_RECONCILIATION_REQUIRED';
    }
    step.finishedAt = new Date().toISOString();
    await saveRun(run);
    if (step.status !== 'CONFIRMED_IN_FAKE_SERVICE') break;
  }
  run.status = run.nodes.length === definition.nodes.length && run.nodes.every(x=>x.status === 'CONFIRMED_IN_FAKE_SERVICE')
    ? 'SIMULATED_CONFIRMED' : 'PARTIAL_OR_UNKNOWN';
  run.finishedAt = new Date().toISOString();
  await saveRun(run);
  return run;
}
