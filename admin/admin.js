const $=id=>document.getElementById(id);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(path,body){const r=await fetch(path,{method:body?'POST':'GET',headers:body?{'content-type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const result=await r.json();if(!r.ok)throw new Error(result.error||'REQUEST_FAILED');return result}
function option(items,label){return items.map(x=>`<option value="${escape(x.id)}">${escape(label(x))}</option>`).join('')}
let view;
async function reload(){view=await api('/api/overview');$('devices').innerHTML=view.devices.map(d=>`<div class="item"><strong>${escape(d.name)}</strong><small>${escape(d.tenant)} · ${escape(d.id.slice(0,8))} · EPHEMERAL_FAKE</small></div>`).join('')||'<p class="muted">尚无虚拟设备</p>';$('agents').innerHTML=view.agents.map(a=>`<div class="item"><strong>${escape(a.name)}</strong><small>${escape(a.tenant)} · 绑定 ${a.devices.length} 台设备 · CONFIG_ONLY</small></div>`).join('')||'<p class="muted">尚无 Agent 配置</p>';$('device-select').innerHTML=option(view.devices,d=>`${d.name} (${d.tenant})`);$('agent-select').innerHTML=option(view.agents,a=>`${a.name} (${a.tenant})`);updateDevices();$('runs').innerHTML=view.runs.map(r=>`<div class="item"><strong>${escape(r.status)}</strong><small>${escape(r.at)} · ${escape((r.deviceId||r.workflowId||'').slice(0,8))} · ${escape(r.evidence)}</small></div>`).join('')||'<p class="muted">尚无执行记录</p>';
 $('workflow-agent').innerHTML=option(view.agents,a=>`${a.name} (${a.tenant})`);updateWorkflowDevices();$('workflows').innerHTML=(view.workflows||[]).map(w=>`<div class="item"><strong>${escape(w.definition.name)}</strong><small>${w.definition.nodes.length} node(s) · ${escape(w.id.slice(0,8))}</small><button type="button" class="secondary" data-workflow-id="${escape(w.id)}">Run Backend Workflow</button></div>`).join('')||'<p class="muted">暂无 Workflow；请先创建 Agent 并绑定虚拟设备。</p>';}
function updateDevices(){const a=view.agents.find(a=>a.id===$('agent-select').value);$('run-device').innerHTML=option(view.devices.filter(d=>a?.devices.includes(d.id)),d=>d.name)}
function notify(t,error=false){$('msg').className=error?'error':'';$('msg').textContent=t}
$('device-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{await api('/api/devices',Object.fromEntries(f));await reload();notify('已创建本地模拟设备（非虚拟机）')}catch(x){notify(x.message,true)}};
$('agent-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{await api('/api/agents',{name:f.get('name'),tenant:f.get('tenant'),devices:[$('device-select').value]});await reload();notify('已保存 Agent 配置（未启动 AgentScope）')}catch(x){notify(x.message,true)}};
$('agent-select').onchange=updateDevices;
$('run-form').onsubmit=async e=>{e.preventDefault();try{const id=$('agent-select').value,deviceId=$('run-device').value;const run=await api(`/api/agents/${encodeURIComponent(id)}/run`,{deviceId,on:$('power').value==='true'});const state=await api(`/api/devices/${encodeURIComponent(deviceId)}/state`);$('state').textContent=`执行 ${run.status}；模拟灯 ${state.lampOn?'ON':'OFF'}；版本 ${state.version}`;await reload();notify('模拟结果已记录，不代表物理硬件验收')}catch(x){notify(x.message,true)}};
reload().catch(x=>notify(x.message,true));

function updateWorkflowDevices(){
 const a=view?.agents.find(a=>a.id===$('workflow-agent').value);
 $('workflow-device').innerHTML=option(view?.devices.filter(d=>a?.devices.includes(d.id))||[],d=>d.name);
}
$('workflow-agent').addEventListener('change',updateWorkflowDevices);
$('workflow-form').onsubmit=async event=>{
 event.preventDefault();
 const f=new FormData(event.target),agentId=$('workflow-agent').value,deviceId=$('workflow-device').value;
 if(!agentId||!deviceId)return notify('请先创建 Agent，并绑定同租户虚拟设备',true);
 try{
   await api('/api/workflows',{agentId,name:f.get('name'),nodes:[{id:'step1',type:'lamp.set_power',deviceId,on:$('workflow-power').value==='true'}]});
   await reload();notify('Workflow 已保存到本地开发服务器');
 }catch(e){notify(e.message,true)}
};
$('workflows').addEventListener('click',async event=>{
 const id=event.target.closest('[data-workflow-id]')?.dataset.workflowId;
 if(!id)return;
 try{
  const run=await api('/api/workflows/'+encodeURIComponent(id)+'/run',{});
  $('workflow-trace').textContent=JSON.stringify({status:run.status,evidence:run.evidence,nodes:run.nodes},null,2);
  await reload();notify('后端 Workflow 执行完成：'+run.status);
 }catch(e){notify(e.message,true)}
});
