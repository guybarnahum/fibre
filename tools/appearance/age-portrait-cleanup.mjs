#!/usr/bin/env node
// Operator-only, Thread-scoped cleanup. Dry run unless --execute is explicit.
import {readFile} from "node:fs/promises";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {parseOperatorEnv,repoRootFrom} from "../deployment/cloudflare-operator.mjs";

export function parseAgePortraitCleanupArgs(flags){
  let environment=null,threadId=null,file=null,execute=false;
  for(let index=0;index<flags.length;index++){
    if(flags[index]==="--env")environment=flags[++index]??null;
    else if(flags[index]==="--thread-id")threadId=flags[++index]??null;
    else if(flags[index]==="--file")file=flags[++index]??null;
    else if(flags[index]==="--execute")execute=true;
    else if(flags[index]==="--dry-run")execute=false;
    else throw new TypeError(`Unknown age-portrait cleanup argument: ${flags[index]}`);
  }
  if(!["staging","production"].includes(environment))
    throw new TypeError("Specify --env staging or --env production");
  if(!/^thr_[A-Za-z0-9._:-]+$/.test(threadId??""))
    throw new TypeError("Specify --thread-id thr_...");
  if(file==="")throw new TypeError("--file requires an operator-config path");
  return {environment,threadId,file,execute};
}

export function cleanupAccessToken(config={},environment=process.env){
  return config.FIBRE_ADMIN_ACCESS_TOKEN||environment.FIBRE_ADMIN_ACCESS_TOKEN||null;
}

async function main(flags){
  const {environment,threadId,file,execute}=parseAgePortraitCleanupArgs(flags);
  const config=file===null?{}:parseOperatorEnv(await readFile(
    resolve(repoRootFrom(import.meta.url),file),"utf8"));
  const base=environment==="staging"
    ?"https://admin.staging.insidefibre.com"
    :"https://admin.insidefibre.com";
  let token=cleanupAccessToken(config);
  if(!token){
    try{
      const {execFileSync}=await import("node:child_process");
      token=execFileSync("cloudflared",["access","token","--app",base],{
        encoding:"utf8",stdio:["ignore","pipe","ignore"],
      }).trim();
    }catch{
      throw new Error(
        "Admin cleanup requires a Cloudflare Access JWT. "+
        "Put FIBRE_ADMIN_ACCESS_TOKEN=<Access JWT> in "+
        (file??"your environment")+" or authenticate with cloudflared access login. "+
        "CLOUDFLARE_API_TOKEN alone cannot authorize Admin Dashboard requests."
      );
    }
  }
  const url=base+"/api/threads/"+encodeURIComponent(threadId)+"/age-anchors/cleanup";
  const response=await fetch(url,{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      Accept:"application/json",
      "Cf-Access-Jwt-Assertion":token,
    },
    body:JSON.stringify({execute}),
  });
  const payload=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(
    `Cleanup failed (HTTP ${response.status}): ${payload?.detail??payload?.error??"unknown response"}`);
  console.log(JSON.stringify(payload,null,2));
  console.log(execute
    ?"\nOnly eligible media objects were deleted. Immutable admission history and receipts remain."
    :"\nDry run only. Rerun with --execute to remove eligible, completed, discarded media.");
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
  main(process.argv.slice(2)).catch(error=>{
    console.error(error instanceof Error?error.message:String(error));
    process.exitCode=1;
  });
}
