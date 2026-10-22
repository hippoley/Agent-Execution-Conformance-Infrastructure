// TEST-ONLY process-separated Tuya-style service. NOT Tuya API, hardware or IAM.
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';

export function createFakeTuyaService({ token = 'local-test-token', tenant = 'tenant-demo', device = 'esp32-demo' } = {}) {
  if (!token || !tenant || !device) throw new Error('test service requires fixed scope');
  const state = { lampOn: false, version: 0 };
  const receipts = new Map();
  const send = (response, status, body) => {
    response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    response.end(JSON.stringify(body));
  };
  const server = createServer(async (request, response) => {
    try {
      const route = new URL(request.url, 'http://localhost');
      if (request.method === 'GET' && route.pathname === '/health') return send(response, 200, { ready: true });
      if (request.headers.authorization !== `Bearer ${token}`) return send(response, 401, { error: 'UNAUTHENTICATED' });
      if (request.method === 'GET' && route.pathname === '/v1/state') return send(response, 200, { ...state });
      if (request.method === 'GET' && route.pathname.startsWith('/v1/receipts/')) {
        const id = decodeURIComponent(route.pathname.slice('/v1/receipts/'.length));
        return receipts.has(id) ? send(response, 200, receipts.get(id)) : send(response, 404, { error: 'NO_RECEIPT' });
      }
      if (request.method !== 'POST' || route.pathname !== '/v1/commands') return send(response, 404, { error: 'NOT_FOUND' });
      let data = '';
      for await (const chunk of request) {
        data += chunk;
        if (data.length > 8192) return send(response, 413, { error: 'BODY_TOO_LARGE' });
      }
      let command;
      try { command = JSON.parse(data); } catch { return send(response, 400, { error: 'INVALID_JSON' }); }
      const fields = ['schema_version', 'command_id', 'tenant_id', 'device_id', 'session_id', 'capability', 'arguments', 'issued_at', 'expires_at', 'idempotency_key'];
      if (!command || typeof command !== 'object' || Array.isArray(command)
          || fields.some(k => !Object.hasOwn(command, k))
          || Object.keys(command).some(k => !fields.includes(k))
          || ['command_id','tenant_id','device_id','session_id','capability','idempotency_key'].some(k => typeof command[k] !== 'string' || !command[k])) {
        return send(response, 400, { error: 'INVALID_ENVELOPE' });
      }
      if (command.schema_version !== '1') return send(response, 400, { error: 'UNSUPPORTED_VERSION' });
      if (command.tenant_id !== tenant || command.device_id !== device) return send(response, 403, { error: 'SCOPE_MISMATCH' });
      if (!Number.isSafeInteger(command.issued_at) || !Number.isSafeInteger(command.expires_at)
          || command.expires_at <= command.issued_at || command.expires_at - command.issued_at > 300)
        return send(response, 400, { error: 'INVALID_TIME_WINDOW' });
      const now = Math.floor(Date.now() / 1000);
      if (now < command.issued_at || now >= command.expires_at) return send(response, 400, { error: 'OUTSIDE_TIME_WINDOW' });
      if (command.capability !== 'lamp.set_power') return send(response, 403, { error: 'UNSUPPORTED_CAPABILITY' });
      if (!command.arguments || Array.isArray(command.arguments) || typeof command.arguments !== 'object'
          || Object.keys(command.arguments).length !== 1 || typeof command.arguments.on !== 'boolean')
        return send(response, 400, { error: 'INVALID_ARGUMENTS' });
      const digest = createHash('sha256').update(JSON.stringify(command)).digest('hex');
      const prior = receipts.get(command.command_id);
      if (prior) {
        if (prior.digest !== digest) return send(response, 409, { error: 'COMMAND_ID_CONFLICT' });
        return send(response, 200, { ...prior, duplicate: true });
      }
      for (const entry of receipts.values()) {
        if (entry.idempotency_key === command.idempotency_key) return send(response, 409, { error: 'IDEMPOTENCY_KEY_CONFLICT' });
      }
      state.lampOn = command.arguments.on;
      state.version += 1;
      const receipt = { command_id: command.command_id, idempotency_key: command.idempotency_key,
        tenant_id: tenant, device_id: device, capability: command.capability, digest, observed: { lampOn: state.lampOn }, version: state.version };
      receipts.set(command.command_id, receipt);
      // Inject a lost HTTP acknowledgement AFTER the effect for tests only.
      if (request.headers['x-test-drop-ack'] === '1') { response.destroy(); return; }
      return send(response, 200, receipt);
    } catch { return send(response, 500, { error: 'TEST_SERVER_ERROR' }); }
  });
  return server;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const server = createFakeTuyaService({ token: process.env.AGENTPANEL_TEST_TOKEN || 'local-test-token',
    tenant: process.env.AGENTPANEL_TEST_TENANT || 'tenant-demo',
    device: process.env.AGENTPANEL_TEST_DEVICE || 'esp32-demo' });
  server.listen(0, '127.0.0.1', () => {
    process.stdout.write(JSON.stringify({ port: server.address().port, testOnly: true }) + '\n');
  });
}
