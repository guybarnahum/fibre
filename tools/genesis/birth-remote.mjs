import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeCloudflareEnvironment } from "../deployment/cloudflare-operator.mjs";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));

export function birthEnvironment(argv=[]){
  let environment=null;
  const rest=[];
  for(let i=0;i<argv.length;i++){
    if(argv[i]==="--env")environment=argv[++i]??null;
    else if(argv[i].startsWith("--env="))environment=argv[i].slice(6);
    else rest.push(argv[i]);
  }
  return {environment:environment===null && rest.some(v=>v==="--help"||v==="-h")
    ?null:normalizeCloudflareEnvironment(environment),args:rest};
}
export function birthDeployment(environment){
  const path=resolve(ROOT,".fibre","cloudflare",environment,"deployment.json");
  const record=JSON.parse(readFileSync(path,"utf8"));
  if(record.environment!==environment)throw new Error("Birth deployment environment mismatch");
  const matches=(record.deployments??[]).filter(item=>item?.serviceId==="birth-center");
  if(matches.length!==1)throw new Error("Deployment has no unique Birth Center");
  return {
    baseUrl:matches[0].baseUrl.replace(/\/$/u,""),
    sourceGitSha:record.sourceGitSha,
    privateToken:process.env.FIBRE_PRIVATE_TOKEN,
  };
}
export async function birthRequest(remote,path,{method="GET",body=null,timeoutMs=120_000}={}){
  if(!remote.privateToken)throw new Error("FIBRE_PRIVATE_TOKEN is required");
  const response=await fetch(remote.baseUrl+path,{
    method,
    headers:{
      Accept:"application/json","x-fibre-private-token":remote.privateToken,
      ...(body===null?{}:{"content-type":"application/json"}),
    },
    ...(body===null?{}:{body:JSON.stringify(body)}),
    signal:AbortSignal.timeout(timeoutMs),
  });
  const result=await response.json().catch(()=>null);
  if(!response.ok){
    const error=new Error("Birth Center "+method+" "+path+" returned HTTP "+response.status+
      (result?.detail?": "+result.detail:""));
    error.status=response.status;
    throw error;
  }
  return result;
}
