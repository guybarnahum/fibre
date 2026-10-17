import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeCloudflareEnvironment } from "../deployment/cloudflare-operator.mjs";
import { topology } from "../validation/encounter-autonomy-probe.mjs";

export function firstLifeRecoveryCandidates(backlog){
  if(!Array.isArray(backlog))throw new TypeError("First Life backlog must be an array");
  return Object.freeze(backlog.filter(item=>item.state==="missing_obligation"
    &&item.hasGroundedPlace===true).map(item=>item.threadId).sort());
}

async function main(argv){
  let environment=null,plan=false,applyFile=null;
  for(let i=0;i<argv.length;i++){
    if(argv[i]==="--env")environment=normalizeCloudflareEnvironment(argv[++i]);
    else if(argv[i]==="--plan")plan=true;
    else if(argv[i]==="--apply")applyFile=argv[++i];
    else throw new TypeError("unsupported first-life recovery argument "+argv[i]);
  }
  if(!environment||plan===(applyFile!==null)){
    throw new TypeError("usage: --env staging|production (--plan | --apply <plan.json>)");
  }
  const token=process.env.FIBRE_PRIVATE_TOKEN;
  if(!token)throw new Error("FIBRE_PRIVATE_TOKEN is required");
  const base=topology(environment).worldBaseUrl;
  const headers={"x-fibre-private-token":token,Accept:"application/json"};
  async function request(path,init={}){
    const response=await fetch(base+path,{headers,...init,signal:AbortSignal.timeout(30000)});
    const body=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(path+": HTTP "+response.status+" "+JSON.stringify(body));
    return body;
  }
  const backlog=await request("/internal/first-life/backlog");
  const candidates=firstLifeRecoveryCandidates(backlog.threads);
  if(plan){
    process.stdout.write(JSON.stringify({
      contract:"fibre-first-life-recovery-plan-v1",environment,
      threadIds:candidates,
      deferred:backlog.threads.filter(item=>!candidates.includes(item.threadId))
        .map(item=>({threadId:item.threadId,state:item.state,
          hasGroundedPlace:item.hasGroundedPlace})),
    },null,2)+"\n");
    return;
  }
  const saved=JSON.parse(readFileSync(resolve(applyFile),"utf8"));
  if(saved.contract!=="fibre-first-life-recovery-plan-v1"
    ||saved.environment!==environment
    ||JSON.stringify(saved.threadIds)!==JSON.stringify(candidates)){
    throw new Error("First Life backlog changed; regenerate and review the plan");
  }
  if(!candidates.length){
    process.stdout.write("No eligible missing First Life obligations.\n");
    return;
  }
  const result=await request("/internal/first-life/recover",{
    method:"POST",headers:{...headers,"content-type":"application/json"},
    body:JSON.stringify({threadIds:candidates}),
  });
  process.stdout.write(JSON.stringify({
    event:"first-life-recovery-queued",environment,
    enqueued:result.enqueued,threadIds:candidates,
    note:"World's normal reconciliation establishes each life independently",
  },null,2)+"\n");
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  main(process.argv.slice(2)).catch(error=>{
    process.stderr.write(String(error?.stack??error)+"\n");
    process.exitCode=1;
  });
}
