import test from 'node:test';
import assert from 'node:assert/strict';
import { withVirtualFleet, runRoleWorkflow } from './virtual-fleet-lab.mjs';
const devs = [{ tenant: 'teamA', device: 'lampA' }, { tenant: 'teamA', device: 'lampB' }, { tenant: 'teamB', device: 'lampC' }];
const grants = [{ actor: 'operator', tenant: 'teamA', device: 'lampA' }, { actor: 'operator', tenant: 'teamA', device: 'lampB' }];
const plan = [{ actor: 'operator', tenant: 'teamA', device: 'lampA', capability: 'lamp.set_power', on: true },
  { actor: 'operator', tenant: 'teamA', device: 'lampB', capability: 'lamp.set_power', on: true }];

test('two device processes can be orchestrated without cloud keys', () => withVirtualFleet(devs, async fleet => {
  assert.equal(fleet.size, 3);
  assert.equal(new Set([...fleet.values()].map(v => v.pid)).size, 3);
  const report = await runRoleWorkflow({ fleet, plan, grants });
  assert.equal(report.disposition, 'SIMULATED_WORKFLOW_CONFIRMED');
  assert.equal(report.effects, 2);
  assert.equal((await fleet.get('teamA:lampA').client.get('/v1/state')).body.version, 1);
  assert.equal((await fleet.get('teamA:lampB').client.get('/v1/state')).body.version, 1);
  assert.equal((await fleet.get('teamB:lampC').client.get('/v1/state')).body.version, 0);
}));

test('cross-tenant access denied before any command effects', () => withVirtualFleet(devs, async fleet => {
  const forbidden = [...plan, { actor: 'operator', tenant: 'teamB', device: 'lampC', capability: 'lamp.set_power', on: true }];
  const report = await runRoleWorkflow({ fleet, plan: forbidden, grants });
  assert.equal(report.disposition, 'DENIED_BEFORE_DISPATCH');
  assert.equal(report.effects, 0);
  for (const node of fleet.values()) assert.equal((await node.client.get('/v1/state')).body.version, 0);
}));

test('unsupported capability and duplicate target fail closed', () => withVirtualFleet(devs, async fleet => {
  const report = await runRoleWorkflow({ fleet, grants, plan: [plan[0], { ...plan[1], capability: 'lock.unlock' }] });
  assert.equal(report.disposition, 'DENIED_BEFORE_DISPATCH');
  const duplicate = await runRoleWorkflow({ fleet, grants, plan: [plan[0], plan[0]] });
  assert.equal(duplicate.disposition, 'DENIED_BEFORE_DISPATCH');
  for (const node of fleet.values()) assert.equal((await node.client.get('/v1/state')).body.version, 0);
}));

test('separate fleet tokens and device scopes prevent cross-worker calls', () => withVirtualFleet(devs, async fleet => {
  const a = fleet.get('teamA:lampA').client;
  const b = fleet.get('teamB:lampC').client;
  const leaked = await a.get('/v1/state');
  assert.equal(leaked.httpStatus, 200);
  const cross = await fetch(b.baseUrl+'/v1/state', { headers: { authorization: `Bearer ${a.token}` } });
  assert.equal(cross.status, 401);
  const crossCommand = await a.execute({ ...a.commandForLamp(true), device_id: 'lampC' });
  assert.equal(crossCommand.status, 'DENIED');
  assert.equal((await a.get('/v1/state')).body.version, 0);
}));
