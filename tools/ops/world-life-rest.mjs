// Rest or wake Threads' autonomous lives. Records World lifecycle facts only;
// a woken life resumes through its own overdue boundary in World.
import { pathToFileURL } from "node:url";
import { normalizeCloudflareEnvironment } from "../deployment/cloudflare-operator.mjs";
import { topology } from "../validation/encounter-autonomy-probe.mjs";

const USAGE=`usage: world-life:rest -- --env staging --keep thr_A,thr_B --reason "compute budget" [--actor NAME] [--dry-run]
       world-life:wake -- --env staging --thread thr_A[,thr_B] [--reason TEXT] [--actor NAME] [--dry-run]`;

const shortThread=(id)=>id.replace(/^(thr_[0-9a-f]{7})[0-9a-f]+$/u,"$1");

function known(lives,ids,label){
  const living=new Set(lives.map(life=>life.threadId));
  const unknown=ids.filter(id=>!living.has(id));
  if(unknown.length>0)throw new Error(`${label} names unknown or retired Threads: ${unknown.join(", ")}`);
}

// Rest every living Thread except the kept ones. Already-resting lives are
// untouched, so the command is idempotent.
export function planLifeRest(lives,{keep}){
  if(!Array.isArray(keep)||keep.length<1)throw new TypeError("rest requires --keep with at least one Thread");
  known(lives,keep,"--keep");
  const kept=new Set(keep);
  return Object.freeze({
    rest:lives.filter(life=>!life.resting&&!kept.has(life.threadId)).map(life=>life.threadId),
    alreadyResting:lives.filter(life=>life.resting&&!kept.has(life.threadId)).map(life=>life.threadId),
    keptResting:lives.filter(life=>life.resting&&kept.has(life.threadId)).map(life=>life.threadId),
    kept:[...kept],
  });
}

export function planLifeWake(lives,{threadIds}){
  if(!Array.isArray(threadIds)||threadIds.length<1)throw new TypeError("wake requires --thread");
  known(lives,threadIds,"--thread");
  const resting=new Set(lives.filter(life=>life.resting).map(life=>life.threadId));
  return Object.freeze({
    wake:threadIds.filter(id=>resting.has(id)),
    alreadyLiving:threadIds.filter(id=>!resting.has(id)),
  });
}

function options(argv){
  const [action,...rest]=argv;
  const config={action,env:null,ids:[],reason:null,actor:"operator",dryRun:false};
  const list=(value)=>String(value??"").split(",").map(item=>item.trim()).filter(Boolean);
  for(let i=0;i<rest.length;i++){
    const arg=rest[i];
    if(arg==="--env")config.env=normalizeCloudflareEnvironment(rest[++i]);
    else if(arg===(action==="rest"?"--keep":"--thread"))config.ids=list(rest[++i]);
    else if(arg==="--reason")config.reason=rest[++i];
    else if(arg==="--actor")config.actor=rest[++i];
    else if(arg==="--dry-run")config.dryRun=true;
    else throw new TypeError(USAGE);
  }
  if(!["rest","wake"].includes(action)||config.env===null)throw new TypeError(USAGE);
  if(action==="rest"&&!config.reason?.trim())throw new TypeError("rest requires --reason");
  config.reason??="operator wake";
  return config;
}

async function main(argv){
  const args=options(argv);
  const token=process.env.FIBRE_PRIVATE_TOKEN;
  if(!token)throw new Error("FIBRE_PRIVATE_TOKEN is required");
  const base=topology(args.env).worldBaseUrl;
  const headers={"x-fibre-private-token":token,Accept:"application/json"};
  async function request(path,init={}){
    const response=await fetch(base+path,{headers,...init,signal:AbortSignal.timeout(30000)});
    const body=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(`${path}: HTTP ${response.status} ${JSON.stringify(body)}`);
    return body;
  }
  const {threads:lives}=await request("/internal/thread-life");
  const plan=args.action==="rest"
    ?planLifeRest(lives,{keep:args.ids}):planLifeWake(lives,{threadIds:args.ids});
  const targets=args.action==="rest"?plan.rest:plan.wake;
  const line=(label,ids)=>ids.length===0?null
    :`${label} (${ids.length}): ${ids.map(shortThread).join(" ")}`;
  const report=[
    `${args.env} · ${lives.length} Threads · ${args.dryRun?"dry run":args.action}`,
    line(args.action==="rest"?"would rest":"would wake",targets),
    line("kept living",args.action==="rest"?plan.kept.filter(id=>!plan.keptResting.includes(id)):[]),
    line("kept but resting — wake them explicitly",plan.keptResting??[]),
    line("already resting",plan.alreadyResting??[]),
    line("already living",plan.alreadyLiving??[]),
  ].filter(Boolean);
  if(args.dryRun||targets.length===0){
    process.stdout.write(report.join("\n")+"\n");
    return;
  }
  const result=await request(`/internal/thread-life/${args.action}`,{
    method:"POST",headers:{...headers,"content-type":"application/json"},
    body:JSON.stringify({threadIds:targets,reason:args.reason,actor:args.actor}),
  });
  const changed=result.results.filter(item=>item.changed).map(item=>item.threadId);
  const settled=result.results.reduce((sum,item)=>sum+(item.settledSocialOpportunities??0),0);
  report[1]=line(args.action==="rest"?"rested":"woke",changed);
  if(settled>0)report.push(`settled pending social chances: ${settled}`);
  process.stdout.write(report.filter(Boolean).join("\n")+"\n");
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  main(process.argv.slice(2)).catch(error=>{
    process.stderr.write(`World life rest: ${error.message}\n`);
    process.exitCode=1;
  });
}
