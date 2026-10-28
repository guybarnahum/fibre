import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {planThreadLocation} from "../../services/world-kernel/src/thread-home-location.mjs";
export {planThreadLocation};
import { normalizeCloudflareEnvironment } from "../deployment/cloudflare-operator.mjs";
import { topology } from "../validation/encounter-autonomy-probe.mjs";

function options(args) {
  let env=null, plan=false, applyFile=null;
  for(let i=0;i<args.length;i++){
    if(args[i]==="--env")env=args[++i];
    else if(args[i]==="--plan")plan=true;
    else if(args[i]==="--apply")applyFile=args[++i];
    else throw new TypeError("unsupported Thread location option "+args[i]);
  }
  if(!env || plan === (applyFile!==null)){
    throw new TypeError("usage: --env staging|production (--plan | --apply <plan.json>)");
  }
  return {env:normalizeCloudflareEnvironment(env),plan,applyFile};
}

async function main(args) {
  const opts=options(args);
  const token=typeof process.env.FIBRE_PRIVATE_TOKEN==="string"
    &&process.env.FIBRE_PRIVATE_TOKEN.trim()?process.env.FIBRE_PRIVATE_TOKEN.trim():null;
  if(!token)throw new Error("FIBRE_PRIVATE_TOKEN is required");
  const base=topology(opts.env).worldBaseUrl;
  const headers={Accept:"application/json","x-fibre-private-token":token};
  async function read(path){
    const response=await fetch(base+path,{headers,signal:AbortSignal.timeout(30000)});
    const result=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(`World ${path}: HTTP ${response.status} ${result?.detail??""}`);
    return result;
  }
  async function inspect(id){
    const result=await read(`/internal/threads/${encodeURIComponent(id)}/observatory?view=full`);
    return result.observatory?.livedNow;
  }
  if(opts.plan){
    const directory=await read("/internal/thread-directory/search?limit=5000");
    const unresolved=directory.threads.filter(thread=>thread.currentLocation?.kind!=="place");
    const decisions=[];
    for(let i=0;i<unresolved.length;i+=4){
      const batch=unresolved.slice(i,i+4);
      decisions.push(...await Promise.all(batch.map(async thread=>{
        const life=await inspect(thread.threadId);
        return {threadId:thread.threadId,name:thread.displayName,
          ...planThreadLocation(thread,life)};
      })));
    }
    process.stdout.write(JSON.stringify({
      contract:"fibre-thread-current-location-repair-v1",
      environment:opts.env,
      // Only explicit current-place repairs can be applied. Unstarted lives
      // remain with the existing Genesis First Life authority.
      summary:Object.fromEntries([...new Set(decisions.map(x=>x.state))]
        .map(state=>[state,decisions.filter(x=>x.state===state).length])),
      decisions,
    },null,2)+"\n");
    return;
  }
  const plan=JSON.parse(readFileSync(resolve(opts.applyFile),"utf8"));
  if(plan.contract!=="fibre-thread-current-location-repair-v1"||plan.environment!==opts.env
    ||!Array.isArray(plan.decisions)){
    throw new Error("Thread location plan does not match target environment");
  }
  const results=[];
  for(const item of plan.decisions.filter(x=>x.state==="ready")){
    const directory=await read(`/internal/thread-directory/search?q=${encodeURIComponent(item.threadId)}&limit=1`);
    const thread=directory.threads.find(x=>x.threadId===item.threadId);
    if(!thread)throw new Error("Thread no longer exists: "+item.threadId);
    const life=await inspect(item.threadId);
    if(life?.privatelyKnownCurrentPlace) {
      results.push({threadId:item.threadId,state:"already_located"});
      continue;
    }
    const fresh=planThreadLocation(thread,life);
    if(fresh.state!=="ready"||JSON.stringify(fresh.place)!==JSON.stringify(item.place)
      ||fresh.basis!==item.basis){
      throw new Error("current World evidence changed; replan Thread "+item.threadId);
    }
    const response=await fetch(base+"/internal/world-venues/locate-private",{
      method:"POST",headers:{...headers,"content-type":"application/json"},
      body:JSON.stringify(item.place),signal:AbortSignal.timeout(30000),
    });
    const result=await response.json().catch(()=>null);
    if(!response.ok||result?.ok!==true){
      throw new Error(`Location admission failed for ${item.threadId}: HTTP ${response.status} ${result?.detail??""}`);
    }
    results.push({threadId:item.threadId,state:"located",locality:result.place.locality});
    process.stderr.write(`Located ${results.length}: ${item.name} — ${result.place.locality}\n`);
  }
  process.stdout.write(JSON.stringify({event:"thread-current-location-migration",environment:opts.env,
    repaired:results.filter(x=>x.state==="located").length,results},null,2)+"\n");
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  main(process.argv.slice(2)).catch(error=>{
    process.stderr.write(String(error?.stack??error)+"\n");
    process.exitCode=1;
  });
}
