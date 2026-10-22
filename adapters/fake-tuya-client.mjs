// Development-only command adapter. The server owns state; this client owns none.
import { randomUUID, createHash } from 'node:crypto';

export class FakeTuyaClient {
  constructor({ baseUrl, token = 'local-test-token', tenant = 'tenant-demo', device = 'esp32-demo' }) {
    const u = new URL(baseUrl);
    if (!['127.0.0.1', 'localhost'].includes(u.hostname) || u.protocol !== 'http:') {
      throw new Error('FakeTuyaClient accepts a loopback HTTP test server only');
    }
    this.baseUrl = u.origin;
    this.token = token;
    this.tenant = tenant;
    this.device = device;
  }
  async get(path, method = 'GET', body = undefined, headers = {}) {
    const response = await fetch(this.baseUrl + path, { method,
      headers: { authorization: `Bearer ${this.token}`, ...(body ? { 'content-type': 'application/json' } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(2000) });
    const json = await response.json();
    return { httpStatus: response.status, body: json };
  }
  async execute(command, { dropAckForTest = false } = {}) {
    // Never automatically retry a POST on a lost ACK. Read by command identity first.
    let acknowledgement;
    try { acknowledgement = await this.get('/v1/commands', 'POST', command, dropAckForTest ? { 'x-test-drop-ack': '1' } : {}); }
    catch { acknowledgement = null; }
    if (acknowledgement && acknowledgement.httpStatus !== 200) {
      return { status: 'DENIED', reason: acknowledgement.body.error };
    }
    try {
      const r = await this.get(`/v1/receipts/${encodeURIComponent(command.command_id)}`);
      const s = await this.get('/v1/state');
      const digest = createHash('sha256').update(JSON.stringify(command)).digest('hex');
      if (r.httpStatus === 200 && s.httpStatus === 200 && r.body.digest === digest
          && r.body.command_id === command.command_id && r.body.device_id === command.device_id
          && r.body.tenant_id === command.tenant_id && r.body.capability === command.capability
          && r.body.observed?.lampOn === command.arguments?.on && s.body.lampOn === command.arguments?.on
          && s.body.version >= r.body.version) {
        return { status: 'CONFIRMED_IN_FAKE_SERVICE', commandId: command.command_id, version: r.body.version };
      }
    } catch { /* Reconciliation failure must not become success. */ }
    return { status: 'UNKNOWN_RECONCILIATION_REQUIRED', commandId: command.command_id };
  }
  commandForLamp(on, commandId = randomUUID()) {
    const now = Math.floor(Date.now() / 1000);
    return { schema_version: '1', command_id: commandId, tenant_id: this.tenant, device_id: this.device,
      session_id: 'test-session', capability: 'lamp.set_power', arguments: { on }, issued_at: now,
      expires_at: now + 60, idempotency_key: `test-session:${commandId}` };
  }
}
