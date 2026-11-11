// Saves the Observatory of every living Thread (or the ones named) as
// Thread-private evidence under .fibre/, for an operator's morning read.
// Read-only: nothing in the World changes.
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { normalizeCloudflareEnvironment } from "../deployment/cloudflare-operator.mjs";
import { privateGet, topology } from "../validation/encounter-autonomy-probe.mjs";

const REPO_ROOT=fileURLToPath(new URL("../../",import.meta.url));
const USAGE="usage: world-observatory -- --env staging [--label nov11] [--thread thr_…]…";

function options(argv){
  const config={env:null,label:new Date().toISOString().slice(0,10),threads:[]};
  for(let i=0;i<argv.length;i++){
    if(argv[i]==="--env")config.env=normalizeCloudflareEnvironment(argv[++i]);
    else if(argv[i]==="--label")config.label=argv[++i];
    else if(argv[i]==="--thread")config.threads.push(argv[++i]);
    else throw new TypeError(USAGE);
  }
  if(config.env===null||!/^[a-z0-9-]+$/u.test(config.label??""))throw new TypeError(USAGE);
  return config;
}

async function main(argv){
  const args=options(argv);
  const token=process.env.FIBRE_PRIVATE_TOKEN;
  if(!token)throw new Error("FIBRE_PRIVATE_TOKEN is required");
  const base=topology(args.env).worldBaseUrl;
  const ids=args.threads.length>0?args.threads
    :(await privateGet(base,"/internal/thread-life",token,"thread lives")).threads
      .filter(life=>!life.resting).map(life=>life.threadId);
  const directory=resolve(REPO_ROOT,".fibre","world-social",args.env);
  mkdirSync(directory,{recursive:true});
  for(const threadId of ids){
    const payload=await privateGet(base,`/internal/threads/${encodeURIComponent(threadId)}/observatory`,
      token,"observatory");
    const path=resolve(directory,`observatory-${threadId}-${args.label}.json`);
    writeFileSync(path,JSON.stringify(payload)+"\n");
    process.stdout.write(`${payload.observatory?.thread?.identity?.name??threadId}: ${path}\n`);
  }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  main(process.argv.slice(2)).catch(error=>{
    process.stderr.write(`World observatory: ${error.message}\n`);
    process.exitCode=1;
  });
}
