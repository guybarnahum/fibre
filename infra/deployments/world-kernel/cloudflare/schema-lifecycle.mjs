import {classifyCloudflareInfraError} from "../../../providers/cloudflare/health.mjs";

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
