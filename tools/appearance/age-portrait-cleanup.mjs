#!/usr/bin/env node
// Operator-only, Thread-scoped cleanup. Reports eligible R2 media before deleting anything.
const flags=process.argv.slice(2);
let environment=null,threadId=null,execute=false;
for(let index=0;index<flags.length;index++){
  if(flags[index]==="--env")environment=flags[++index];
  else if(flags[index]==="--thread-id")threadId=flags[++index];
  else if(flags[index]==="--execute")execute=true;
  else if(flags[index]==="--dry-run")execute=false;
  else throw new TypeError(`Unknown age-portrait cleanup argument: ${flags[index]}`);
}
if(!["staging","production"].includes(environment))
  throw new TypeError("Specify --env staging or --env production");
if(!/^thr_[A-Za-z0-9._:-]+$/.test(threadId??""))
  throw new TypeError("Specify --thread-id thr_...");

const base=environment==="staging"
  ?"https://admin.staging.insidefibre.com"
  :"https://admin.insidefibre.com";
let token=process.env.FIBRE_ADMIN_ACCESS_TOKEN;
if(!token){
  try{
    const {execFileSync}=await import("node:child_process");
    token=execFileSync("cloudflared",["access","token","--app",base],{
      encoding:"utf8",stdio:["ignore","pipe","ignore"],
    }).trim();
  }catch{
    throw new Error("Authenticate with Cloudflare Access: install cloudflared and run its Access login, or provide FIBRE_ADMIN_ACCESS_TOKEN");
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
if(!execute){
  console.log("\nDry run only. Rerun with --execute to remove eligible, completed, discarded media.");
}else{
  console.log("\nOnly eligible media objects were deleted. Immutable admission history and receipts remain.");
}
