// Late expression of urge loci (ADR-0036): every Thread that is not retired
// receives, once, the loci of urge families its Body never expressed, drawn
// from its own genome. Idempotent: a second run expresses nothing.
import { pathToFileURL } from "node:url";
import { normalizeCloudflareEnvironment } from "../deployment/cloudflare-operator.mjs";
import { topology } from "../validation/encounter-autonomy-probe.mjs";

const USAGE="usage: world-genome:express -- --env staging [--dry-run]";
const ROUTE="/internal/thread-genome/express";
const shortThread=(id)=>id.replace(/^(thr_[0-9a-f]{7})[0-9a-f]+$/u,"$1");

function expressionReport(threads,{env,dryRun}){
  const receiving=threads.filter(entry=>entry.receives.length>0);
  const line=(entry)=>`${entry.name??shortThread(entry.threadId)} (${shortThread(entry.threadId)}): `
    +`had ${entry.expressed.length}, ${dryRun?"would receive":"received"} ${entry.receives.length}`
    +(entry.receives.length>0?` — ${entry.receives.map(item=>item.variantId).join(" ")}`:"");
  return [
    `${env} · ${threads.length} Threads · ${dryRun?"dry run":"expressed"} · ${receiving.length} ${dryRun?"would receive":"received"} loci`,
    ...threads.filter(entry=>entry.genome==="none").map(entry=>`no genome, nothing expressed: ${entry.name??shortThread(entry.threadId)}`),
    ...receiving.map(line),
  ].join("\n");
}

function options(argv){
  const config={env:null,dryRun:false};
  for(let i=0;i<argv.length;i++){
    if(argv[i]==="--env")config.env=normalizeCloudflareEnvironment(argv[++i]);
    else if(argv[i]==="--dry-run")config.dryRun=true;
    else throw new TypeError(USAGE);
  }
  if(config.env===null)throw new TypeError(USAGE);
  return config;
}

async function main(argv){
  const args=options(argv);
  const token=process.env.FIBRE_PRIVATE_TOKEN;
  if(!token)throw new Error("FIBRE_PRIVATE_TOKEN is required");
  const response=await fetch(topology(args.env).worldBaseUrl+ROUTE,{method:args.dryRun?"GET":"POST",
    headers:{"x-fibre-private-token":token,Accept:"application/json"},signal:AbortSignal.timeout(60000)});
  const body=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(`HTTP ${response.status} ${JSON.stringify(body)}`);
  process.stdout.write(expressionReport(body.threads,args)+"\n");
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  main(process.argv.slice(2)).catch(error=>{
    process.stderr.write(`World genome expression: ${error.message}\n`);
    process.exitCode=1;
  });
}
