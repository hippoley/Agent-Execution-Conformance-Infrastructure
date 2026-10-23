// Trusted local Node -> Python pinned AgentScope Toolkit bridge.
// Not for cloud/real devices; do not expose the child input as an API.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export async function executeAgentScopeNode({ client, on, commandId, python = process.env.AGENTPANEL_PYTHON || 'python3' }) {
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(commandId) || typeof on !== 'boolean')
    return { status: 'DENIED', reason: 'INVALID_TOOL_INPUT' };
  const payload = { baseUrl: client.baseUrl, token: client.token,
    tenant: client.tenant, device: client.device, commandId, on };
  return new Promise(resolveResult => {
    const child = spawn(python, ['runners/agentscope_workflow_node.py'], {
      cwd: root, stdio: ['pipe', 'pipe', 'ignore'],
      env: { ...process.env, PYTHONPATH: [root, process.env.PYTHONPATH].filter(Boolean).join(':') }
    });
    let text = '', finished = false;
    const finish = value => { if (!finished) { finished = true; clearTimeout(timer); resolveResult(value); } };
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish({ status: 'UNKNOWN_RECONCILIATION_REQUIRED', reason: 'TOOLKIT_TIMEOUT' });
    }, 12000);
    child.on('error', () => finish({ status:'UNKNOWN_RECONCILIATION_REQUIRED', reason:'SDK_PROCESS_UNAVAILABLE' }));
    child.stdout.on('data', chunk => { text += chunk; if (text.length > 4096) {
      child.kill('SIGKILL'); finish({ status:'UNKNOWN_RECONCILIATION_REQUIRED', reason:'OVERSIZED_SDK_RESPONSE' });
    }});
    child.on('close', code => {
      if (finished) return;
      try {
        const data = JSON.parse(text);
        if (code === 0 && data.commandId === commandId &&
            ['CONFIRMED_IN_FAKE_SERVICE','DENIED','UNKNOWN_RECONCILIATION_REQUIRED'].includes(data.status))
          return finish(data);
      } catch {}
      finish({ status:'UNKNOWN_RECONCILIATION_REQUIRED', reason:'SDK_PROCESS_FAILED' });
    });
    child.stdin.end(JSON.stringify(payload));
  });
}
