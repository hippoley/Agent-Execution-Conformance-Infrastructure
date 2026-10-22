import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { FakeTuyaClient } from '../adapters/fake-tuya-client.mjs';

async function withDevice(run) {
  const child = spawn(process.execPath, [new URL('./fake-tuya-service.mjs', import.meta.url).pathname],
    { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, AGENTPANEL_TEST_TOKEN: 'local-test-token' } });
  let port;
  try {
    const [chunk] = await Promise.race([
      once(child.stdout, 'data'),
      once(child, 'exit').then(() => { throw new Error('child exited before ready'); }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('start timeout')), 3000)),
    ]);
    port = JSON.parse(chunk.toString().split('\n')[0]).port;
    await run(new FakeTuyaClient({ baseUrl: `http://127.0.0.1:${port}` }));
  } finally { child.kill(); await once(child, 'exit').catch(() => {}); }
}

test('bounded state write reaches independent HTTP service and is read back', () => withDevice(async client => {
  const command = client.commandForLamp(true);
  assert.equal((await client.execute(command)).status, 'CONFIRMED_IN_FAKE_SERVICE');
  assert.deepEqual((await client.get('/v1/state')).body, { lampOn: true, version: 1 });
  assert.equal((await client.execute(command)).status, 'CONFIRMED_IN_FAKE_SERVICE');
  assert.equal((await client.get('/v1/state')).body.version, 1);
}));

test('wrong target, unsupported capability, and extra arguments cause no effect', () => withDevice(async client => {
  for (const variant of [
    { device_id: 'other-device' },
    { capability: 'lock.unlock' },
    { arguments: { on: true, extra: 'injected' } },
  ]) {
    const result = await client.execute({ ...client.commandForLamp(true), ...variant });
    assert.equal(result.status, 'DENIED');
  }
  assert.deepEqual((await client.get('/v1/state')).body, { lampOn: false, version: 0 });
}));

test('lost ACK triggers independent receipt lookup without redispatch', () => withDevice(async client => {
  const command = client.commandForLamp(true);
  assert.equal((await client.execute(command, { dropAckForTest: true })).status, 'CONFIRMED_IN_FAKE_SERVICE');
  assert.equal((await client.get('/v1/state')).body.version, 1);
  assert.equal((await client.execute(command)).status, 'CONFIRMED_IN_FAKE_SERVICE');
  assert.equal((await client.get('/v1/state')).body.version, 1);
}));

test('missing authentication, ID conflict, expired command, and unknown receipt are distinguished', () => withDevice(async client => {
  const req = client.commandForLamp(true);
  assert.equal((await client.get('/v1/state', 'GET', undefined, { authorization: 'Bearer invalid' })).httpStatus, 401);
  assert.equal((await client.execute({ ...req, issued_at: 1, expires_at: 10 })).status, 'DENIED');
  assert.equal((await client.execute(req)).status, 'CONFIRMED_IN_FAKE_SERVICE');
  assert.deepEqual(await client.execute({ ...req, arguments: { on: false } }), { status: 'DENIED', reason: 'COMMAND_ID_CONFLICT' });
  assert.equal((await client.get('/v1/state')).body.version, 1);
  const other = new FakeTuyaClient({ baseUrl: client.baseUrl, token: 'wrong-token' });
  assert.equal((await other.execute(other.commandForLamp(false))).status, 'DENIED');
}));
