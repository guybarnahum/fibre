import {classifyCloudflareInfraError} from "#infra/providers/cloudflare";

// A quota failure is not evidence of a missing or mismatched schema stamp.
export function readWorldSchemaStatus(readStamp,expectedGitSha){
  try{
    const installedGitSha=readStamp()??null;
    return Object.freeze({
      ready:installedGitSha!==null&&installedGitSha===expectedGitSha,
      installedGitSha,expectedGitSha,
    });
  }catch(error){
    return Object.freeze({
      ready:false,installedGitSha:null,expectedGitSha,
      unavailable:classifyCloudflareInfraError(error,"WORLD_SCHEMA_STATUS_UNAVAILABLE"),
    });
  }
}

export function worldSchemaStatusError(status){
  return status.unavailable??{code:"WORLD_SCHEMA_NOT_INSTALLED"};
}

export async function deferAlarmForSchemaInstall(storage,at=Date.now()){
  await storage.setAlarm(at+30_000);
}

export async function resumeAlarmAfterSchemaInstall(storage,at=Date.now()){
  const scheduled=await storage.getAlarm();
  if(scheduled===null||scheduled<at-60_000){
    await storage.setAlarm(at);
  }
}

 
// Refuse a stale serving revision before opening World SQL or installing schema.
export function installWorldSchemaForRevision({
  expectedGitSha,deploymentGitSha,readInstalledGitSha,install,onSuperseded=()=>{},
}={}){
  if(!/^[0-9a-f]{40}$/u.test(expectedGitSha??""))
    return {status:400,body:{ok:false,code:"WORLD_EXPECTED_REVISION_INVALID"}};
  if(expectedGitSha!==deploymentGitSha){
    onSuperseded(expectedGitSha);
    return {status:409,body:{
      ok:false,code:"WORLD_REVISION_NOT_SERVING",deploymentGitSha:deploymentGitSha??null,
    }};
  }
  const already=readInstalledGitSha()===deploymentGitSha;
  if(!already)install();
  return {status:200,body:{
    ok:true,contract:"fibre-world-schema-installed-v1",
    deploymentGitSha,installed:!already,already,
  }};
}
