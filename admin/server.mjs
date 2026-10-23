// AgentPanel M0: loopback-only administrative development console, not production IAM.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile, mkdir, rename, open } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFakeTuyaService } from '../runners/fake-tuya-service.mjs';
import { FakeTuyaClient } from '../adapters/fake-tuya-client.mjs';
import { executeWorkflow, validateWorkflow } from '../runners/workflow-engine.mjs';
const folder=dirname(fileURLToPath(import.meta.url));
const valid=s=>typeof s==='string' && /^[A-Za-z0-9_-]{1,48}$/.test(s);
const respond=(res,status,value,type='application/json')=>{res.writeHead(status,{'content-type':type,'cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'"});res.end(type==='application/json'?JSON.stringify(value):value)};
async function load(path){try{return JSON.parse(await readFile(path,'utf8'))}catch(e){if(e.code==='ENOENT')return null;throw e}}
async function persist(path,value){await mkdir(dirname(path),{recursive:true});const tmp=path+'.'+randomUUID()+'.tmp';const f=await open(tmp,'wx',0o600);try{await f.writeFile(JSON.stringify(value,null,2));await f.sync()}finally{await f.close()}await rename(tmp,path)}
export async function createAdmin({dataFile=join(process.cwd(),'.local','agentpanel.json')}={}){
 let db=await load(dataFile)??{agents:[],devices:[],runs:[],workflows:[]};
 db.workflows??=[];
 for(const run of db.runs){if(run.status==='RUNNING'){run.status='INTERRUPTED_UNKNOWN';run.recovery='REQUIRES_MANUAL_RECONCILIATION';}}
 const workers=new Map(),activeRuns=new Set();let saving=Promise.resolve();
 const save=()=>{const snapshot=structuredClone(db);saving=saving.then(()=>persist(dataFile,snapshot));return saving};
 async function fake(d){if(workers.has(d.id))return workers.get(d.id);const service=createFakeTuyaService({token:d.token,tenant:d.tenant,device:d.id});await new Promise(resolve=>service.listen(0,'127.0.0.1',resolve));const client=new FakeTuyaClient({baseUrl:`http://127.0.0.1:${service.address().port}`,token:d.token,tenant:d.tenant,device:d.id});workers.set(d.id,{service,client});return workers.get(d.id)}
 const device=d=>({id:d.id,name:d.name,tenant:d.tenant,type:'virtual_lamp',runtime:'EPHEMERAL_FAKE',connected:workers.has(d.id)});
 const agent=a=>({...a,runtime:'CONFIG_ONLY_NO_AGENTSCOPE'});
 const server=createServer(async(req,res)=>{
  try{
   const u=new URL(req.url,'http://localhost');
   if(req.method==='GET'&&u.pathname==='/')return respond(res,200,await readFile(join(folder,'index.html'),'utf8'),'text/html; charset=utf-8');
   if(req.method==='GET'&&u.pathname==='/admin.js')return respond(res,200,await readFile(join(folder,'admin.js'),'utf8'),'text/javascript; charset=utf-8');
   if(req.method==='GET'&&u.pathname==='/api/overview')return respond(res,200,{agents:db.agents.map(agent),devices:db.devices.map(device),runs:db.runs,workflows:db.workflows,limits:['LOCAL_DEV_ONLY','NO_REAL_AGENTSCOPE','NO_VM_SANDBOX','NO_TUYA_HARDWARE']});
   if(req.method==='GET'&&u.pathname.startsWith('/api/devices/')&&u.pathname.endsWith('/state')){const id=u.pathname.slice(13,-6),d=db.devices.find(x=>x.id===id);if(!d)return respond(res,404,{error:'NOT_FOUND'});const {client}=await fake(d);return respond(res,200,{deviceId:id,...(await client.get('/v1/state')).body,source:'EPHEMERAL_FAKE'})}
   if(req.method==='GET' && /^\/api\/workflows\/[a-f0-9-]{36}$/.test(u.pathname)){const w=db.workflows.find(w=>w.id===u.pathname.split('/')[3]);return w?respond(res,200,w):respond(res,404,{error:'NOT_FOUND'})}
   if(req.method!=='POST')return respond(res,404,{error:'NOT_FOUND'});
   if(!['/api/agents','/api/devices','/api/workflows'].includes(u.pathname)&&!/^\/api\/workflows\/[a-f0-9-]{36}\/run$/.test(u.pathname)&&!/^\/api\/agents\/[a-f0-9-]{36}\/run$/.test(u.pathname))return respond(res,404,{error:'NOT_FOUND'});
   if(req.headers['content-type']?.split(';')[0]!=='application/json')return respond(res,415,{error:'JSON_REQUIRED'});
   let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>4096)return respond(res,413,{error:'BODY_TOO_LARGE'})}
   let input;try{input=JSON.parse(raw)}catch{return respond(res,400,{error:'INVALID_JSON'})}if(!input||typeof input!=='object'||Array.isArray(input))return respond(res,400,{error:'INVALID_JSON'});
   if(u.pathname==='/api/devices'){
    if(!valid(input.name)||!valid(input.tenant)||Object.keys(input).some(k=>!['name','tenant'].includes(k)))return respond(res,400,{error:'INVALID_DEVICE'});
    const d={id:randomUUID(),name:input.name,tenant:input.tenant,token:randomUUID()+randomUUID()};db.devices.push(d);await save();return respond(res,201,device(d));
   }
   if(u.pathname==='/api/agents'){
    if(!valid(input.name)||!valid(input.tenant)||!Array.isArray(input.devices)||input.devices.length<1||input.devices.length>8||new Set(input.devices).size!==input.devices.length||Object.keys(input).some(k=>!['name','tenant','devices'].includes(k)))return respond(res,400,{error:'INVALID_AGENT'});
    if(input.devices.some(id=>!db.devices.some(d=>d.id===id&&d.tenant===input.tenant)))return respond(res,403,{error:'CROSS_TENANT_DEVICE'});
    const a={id:randomUUID(),name:input.name,tenant:input.tenant,devices:input.devices};db.agents.push(a);await save();return respond(res,201,agent(a));
   }
   if(u.pathname==='/api/workflows'){
    if(!valid(input.agentId))return respond(res,400,{error:'INVALID_AGENT_ID'});
    const a=db.agents.find(x=>x.id===input.agentId);
    if(!a)return respond(res,404,{error:'AGENT_NOT_FOUND'});
    const def={name:input.name,nodes:input.nodes};
    if(Object.keys(input).some(k=>!['agentId','name','nodes'].includes(k)))return respond(res,400,{error:'INVALID_WORKFLOW'});
    const error=validateWorkflow(def,{tenant:a.tenant,authorizedDevices:db.devices.filter(d=>a.devices.includes(d.id))});
    if(error)return respond(res,error==='DEVICE_NOT_AUTHORIZED'?403:400,{error});
    const workflow={id:randomUUID(),agentId:a.id,tenant:a.tenant,revision:1,definition:def};
    db.workflows.push(workflow);await save();return respond(res,201,workflow);
   }
   const match=u.pathname.match(/^\/api\/workflows\/([a-f0-9-]{36})\/run$/);
   if(match){
    if(Object.keys(input).length!==0)return respond(res,400,{error:'NO_RUN_ARGUMENTS_ALLOWED'});
    const workflow=db.workflows.find(x=>x.id===match[1]),a=db.agents.find(x=>x.id===workflow?.agentId);
    if(!workflow||!a)return respond(res,404,{error:'WORKFLOW_NOT_FOUND'});
    if(activeRuns.has(workflow.id))return respond(res,409,{error:'WORKFLOW_ALREADY_RUNNING'});
    activeRuns.add(workflow.id);
    const allowed=db.devices.filter(d=>a.devices.includes(d.id));
    let result;
    try{result=await executeWorkflow({definition:workflow.definition,tenant:a.tenant,workflowId:workflow.id,authorizedDevices:allowed,
       acquire:async id=>(await fake(db.devices.find(d=>d.id===id))).client,
       saveRun:async run=>{const index=db.runs.findIndex(r=>r.id===run.id);const copy=structuredClone(run);if(index<0)db.runs.unshift(copy);else db.runs[index]=copy;db.runs=db.runs.slice(0,250);await save()}});
    }finally{activeRuns.delete(workflow.id)}
    return respond(res,result.status==='DENIED'?403:200,result);
   }
   const id=u.pathname.split('/')[3],a=db.agents.find(x=>x.id===id),d=db.devices.find(x=>x.id===input.deviceId);
   if(!a||!d)return respond(res,404,{error:'NOT_FOUND'});
   if(a.tenant!==d.tenant||!a.devices.includes(d.id))return respond(res,403,{error:'DEVICE_NOT_AUTHORIZED'});
   if(typeof input.on!=='boolean'||Object.keys(input).some(k=>!['deviceId','on'].includes(k)))return respond(res,400,{error:'INVALID_ARGUMENTS'});
   const {client}=await fake(d);const result=await client.execute(client.commandForLamp(input.on));
   const run={id:randomUUID(),agentId:a.id,deviceId:d.id,on:input.on,status:result.status,at:new Date().toISOString(),evidence:'FAKE_DEVICE_HTTP_ONLY'};db.runs.unshift(run);db.runs=db.runs.slice(0,250);await save();return respond(res,200,run);
  }catch{respond(res,500,{error:'ADMIN_INTERNAL_ERROR'})}
 });
 return {server,async close(){await new Promise(ok=>server.close(ok));await Promise.all([...workers.values()].map(({service})=>new Promise(ok=>service.close(ok))))},dataFile};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){const app=await createAdmin();app.server.listen(4177,'127.0.0.1',()=>console.log('AgentPanel M0 http://127.0.0.1:4177 (LOCAL ONLY)'))}
