// Test-only crash-window laboratory. No hardware, IAM or exactly-once production claim.
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, openSync, closeSync, fsyncSync, renameSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function durableWrite(file, value) {
  const dir = file.slice(0, file.lastIndexOf('/')); mkdirSync(dir, { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  const fd = openSync(tmp, 'w', 0o600);
  try { writeFileSync(fd, JSON.stringify(value)); fsyncSync(fd); } finally { closeSync(fd); }
  renameSync(tmp, file);
  // Linux fsync on the containing directory makes the rename durable in the test model.
  try { const dfd = openSync(dir, 'r'); try { fsyncSync(dfd); } finally { closeSync(dfd); } } catch { /* portability limitation */ }
}
const load = file => existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
const message = { id: 'c4-nonidempotent-001', scope: 'tenant-demo/virtual-relay', operation: 'pulse_once', value: 1 };
function device(dir) {
  const file = join(dir, 'device.json');
  let data = load(file) ?? { effectCount: 0, records: {} };
  const reply = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
  const server = createServer(async (req,res) => {
    if (req.method === 'GET' && req.url === '/state') return reply(res,200,data);
    if (req.method === 'GET' && req.url?.startsWith('/effect/')) {
      const id = decodeURIComponent(req.url.slice('/effect/'.length));
      return data.records[id] ? reply(res,200,data.records[id]) : reply(res,404,{code:'NO_EFFECT'});
    }
    if (req.method !== 'POST' || req.url !== '/pulse') return reply(res,404,{code:'NOT_FOUND'});
    let body=''; for await (const chunk of req) { body+=chunk; if(body.length>2048) return reply(res,413,{code:'TOO_LARGE'}); }
    let command;try { command=JSON.parse(body); } catch { return reply(res,400,{code:'INVALID_JSON'}); }
    if (!command || command.scope !== message.scope || command.operation !== message.operation || command.value !== 1 || typeof command.id !== 'string') return reply(res,403,{code:'NOT_ALLOWED'});
    const fingerprint=digest(command), previous=data.records[command.id];
    if (previous && previous.digest !== fingerprint) return reply(res,409,{code:'ID_CONFLICT'});
    if (!previous) {
      data={ effectCount:data.effectCount+1, records:{ ...data.records, [command.id]:{id:command.id,digest:fingerprint,effectSequence:data.effectCount+1} } };
      durableWrite(file,data); // the device owns a separate durable effect ledger
    }
    if (req.headers['x-test-hold-ack'] === '1') return; // parent will kill worker before HTTP response
    return reply(res,200,data.records[command.id]);
  });
  server.listen(0,'127.0.0.1',()=>process.stdout.write(JSON.stringify({ port:server.address().port })+'\n'));
}
async function worker(dir,url,stage) {
  const file=join(dir,'gateway.json');
  if(stage === 'recover') {
    const state=load(file);
    if(!state) return process.stdout.write(JSON.stringify({disposition:'UNKNOWN',reason:'NO_DURABLE_INTENT'})+'\n');
    let record=null;
    try { const r=await fetch(url+'/effect/'+encodeURIComponent(state.command.id), {signal:AbortSignal.timeout(1800)});if(r.ok)record=await r.json(); } catch { /* do not replay */ }
    const valid=record && record.id===state.command.id && record.digest===digest(state.command) && Number.isSafeInteger(record.effectSequence);
    const disposition=valid?'CONFIRMED_FAKE_EFFECT':state.phase==='INTENT'?'NOT_DISPATCHED':'UNKNOWN';
    return process.stdout.write(JSON.stringify({disposition,phase:state.phase,mayRedispatch:disposition==='NOT_DISPATCHED'})+'\n');
  }
  if(load(file)) throw new Error('Do not overwrite a durable request; call recover');
  durableWrite(file,{phase:'INTENT',command:message});
  if(stage==='before_dispatch') return process.exit(78);
  durableWrite(file,{phase:'DISPATCH_STARTED',command:message});
  const response=await fetch(url+'/pulse',{method:'POST',headers:{'content-type':'application/json',...(stage==='effect_before_ack'?{'x-test-hold-ack':'1'}:{})},body:JSON.stringify(message)});
  const receipt=await response.json();
  if(!response.ok) throw new Error('device rejected request');
  if(stage==='after_ack_before_receipt') return process.exit(79);
  durableWrite(file,{phase:'RECEIPT_DURABLE',command:message,receipt});
  if(stage==='after_receipt_before_client_ack') return process.exit(80);
  process.stdout.write(JSON.stringify({disposition:'ACK_RECEIVED_NOT_PHYSICAL_PROOF',receipt})+'\n');
}
if(process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const [role,dir,url,stage]=process.argv.slice(2);
  if (role === 'device') device(dir);
  else if (role === 'worker') await worker(dir,url,stage);
  else throw new Error('use: device <dir> | worker <dir> <url> <stage>');
}
