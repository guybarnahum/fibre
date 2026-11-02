import {classifyCloudflareInfraError} from "#infra/providers/cloudflare";

// Only a real schema change requires expensive installation. Source Git SHA
// still gates which serving revision can perform the migration.
export function readWorldSchemaStatus(readStamp,expectedSchemaDigest){
  try{
    const stamp=readStamp();
    const installedSchemaDigest=typeof stamp==="string"?stamp
      :stamp?.installedSchemaDigest??null;
    const installedGitSha=typeof stamp==="string"?null
      :stamp?.installedGitSha??null;
    return Object.freeze({
      ready:installedSchemaDigest!==null&&installedSchemaDigest===expectedSchemaDigest,
      installedSchemaDigest,installedGitSha,expectedSchemaDigest,
    });
  }catch(error){
    return Object.freeze({
      ready:false,installedSchemaDigest:null,installedGitSha:null,expectedSchemaDigest,
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
  if(scheduled===null||scheduled<at-60_000)await storage.setAlarm(at);
}

// A superseded revision is refused before opening storage.
export function installWorldSchemaForRevision({
  expectedGitSha,deploymentGitSha,expectedSchemaDigest,
  readInstalledSchemaDigest,install,onSuperseded=()=>{},
}={}){
  if(!/^[0-9a-f]{40}$/u.test(expectedGitSha??""))
    return {status:400,body:{ok:false,code:"WORLD_EXPECTED_REVISION_INVALID"}};
  if(expectedGitSha!==deploymentGitSha){
    onSuperseded(expectedGitSha);
    return {status:409,body:{
      ok:false,code:"WORLD_REVISION_NOT_SERVING",deploymentGitSha:deploymentGitSha??null,
    }};
  }
  const already=readInstalledSchemaDigest()===expectedSchemaDigest;
  const installation=already?null:install();
  return {status:200,body:{
    ok:true,contract:"fibre-world-schema-installed-v1",
    deploymentGitSha,installed:!already,already,
    schemaDigest:expectedSchemaDigest,
    ...(installation?.hotFrontiers?{hotFrontiers:installation.hotFrontiers}:{}),
  }};
}
