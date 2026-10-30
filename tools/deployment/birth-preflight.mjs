import {fileURLToPath,pathToFileURL} from "node:url";
import {resolve} from "node:path";
import {birthDeployment,birthEnvironment,birthRequest} from "../genesis/birth-remote.mjs";
import {rehearseBirthSnapshot} from "../../services/birth-center/src/birth-preflight.mjs";
import {probeBirthModelSchemas} from "../../services/birth-center/src/birth-schema-probe.mjs";
import {loadDeploymentManifest,resolveServiceDeployment} from "./deployment-manifest.mjs";

// Fail closed before any upload. The old Worker supplies only pinned records;
// all composition/World validation and provider schema transport run locally.
export async function runLocalBirthPreflight({
  repoRoot,environment,place="United States/Hilo",
  fetchMaterial=null,probeSchemas=probeBirthModelSchemas,log=console.log,
}={}){
  const remote=birthDeployment(environment);
  const material=fetchMaterial
    ?await fetchMaterial(remote,place)
    :(await birthRequest(remote,"/internal/births/preflight/material?place="+
        encodeURIComponent(place),{timeoutMs:30_000})).material;
  if(!Array.isArray(material?.places)||!material.places.length)
    throw new Error("BIRTH PREFLIGHT no pinned Place/naming material from serving Birth Center");
  const rehearsal=rehearseBirthSnapshot(material);
  const manifest=await loadDeploymentManifest(resolve(repoRoot,
    "infra/deployments/environments/cloudflare.yaml"));
  const integrations=resolveServiceDeployment(manifest,"birth-center").integrations;
  const schemas=await probeSchemas(process.env,{
    creative:integrations.creative,repair:integrations.repair,
  });
  log("BIRTH LOCAL PREFLIGHT ok ("+schemas+" schemas, place "+rehearsal.place+")");
  return {schemas,rehearsal};
}

export async function runBirthPreflight({
  baseUrl,privateToken,place="United States/Hilo",expectedSha=null,
  fetchImpl=fetch,log=console.log,
}={}){
  if(!baseUrl||!privateToken)
    throw new Error("BIRTH PREFLIGHT requires the deployed Birth Center URL and FIBRE_PRIVATE_TOKEN");
  const response=await fetchImpl(baseUrl.replace(/\/$/u,"")+"/internal/births/preflight",{
    method:"POST",
    headers:{"content-type":"application/json","x-fibre-private-token":privateToken},
    body:JSON.stringify({place}),
    signal:AbortSignal.timeout(600_000),
  });
  const result=await response.json().catch(()=>null);
  if(!response.ok||result?.ok!==true){
    throw new Error("BIRTH PREFLIGHT failed: "+
      (result?.detail??result?.error??"HTTP "+response.status));
  }
  if(expectedSha!==null&&result.deploymentGitSha!==expectedSha)
    throw new Error("BIRTH PREFLIGHT failed: deployed revision "+
      result.deploymentGitSha+" does not match "+expectedSha);
  if(!Number.isSafeInteger(result.schemas)||result.schemas<1||
    typeof result.place!=="string")
    throw new Error("BIRTH PREFLIGHT failed: invalid deployed preflight evidence");
  log("BIRTH PREFLIGHT ok ("+result.schemas+" schemas, place "+result.place+")");
  return result;
}

async function main(argv){
  const parsed=birthEnvironment(argv);
  let place="United States/Hilo";
  for(let i=0;i<parsed.args.length;i++){
    if(parsed.args[i]==="--place")place=parsed.args[++i]??"";
    else if(parsed.args[i].startsWith("--place="))place=parsed.args[i].slice(8);
    else throw new TypeError("Unknown birth preflight option "+parsed.args[i]);
  }
  if(!place)throw new TypeError("--place needs Country/City");
  const remote=birthDeployment(parsed.environment);
  await runBirthPreflight({baseUrl:remote.baseUrl,privateToken:remote.privateToken,place});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)
  main(process.argv.slice(2)).catch(error=>{
    console.error(String(error?.message??error));
    process.exitCode=1;
  });
