import {createHash} from "node:crypto";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import {fileURLToPath,pathToFileURL} from "node:url";
import {dirname,resolve} from "node:path";
import {birthDeployment,birthEnvironment,birthRequest} from "../genesis/birth-remote.mjs";
import {rehearseBirthSnapshot} from "../../services/birth-center/src/birth-preflight.mjs";
import {probeBirthModelSchemas} from "../../infra/deployments/birth-center/cloudflare/birth-schema-probe.mjs";
import {BIRTH_RESPONSE_SCHEMAS} from "../../services/birth-center/src/model-response-schemas.mjs";
import {loadDeploymentManifest,resolveServiceDeployment} from "./deployment-manifest.mjs";

// What the provider probe proves: these exact response schemas, sent with
// these model profiles, are accepted. Anything else in the repository can
// change without touching it.
export function birthSchemaFingerprint({creative,repair}){
  return createHash("sha256").update(JSON.stringify({
    schemas:BIRTH_RESPONSE_SCHEMAS,creative:creative?.config??null,repair:repair?.config??null,
  })).digest("hex");
}

// The operator's record of the last fingerprint the provider accepted, per
// environment, beside the other deployment evidence.
export function fileSchemaAcceptance(repoRoot,environment){
  const path=resolve(repoRoot,".fibre","cloudflare",environment,"birth-schema-acceptance.json");
  return {
    async read(){
      try{return JSON.parse(await readFile(path,"utf8"));}
      catch(error){if(error?.code==="ENOENT")return null;throw error;}
    },
    async write(record){
      await mkdir(dirname(path),{recursive:true});
      await writeFile(path,JSON.stringify(record,null,2)+"\n",{mode:0o600});
    },
  };
}

// Fail closed before any upload. The old Worker supplies only pinned records;
// all composition/World validation and provider schema transport run locally.
// The provider is probed only when the schemas or model profiles changed
// since it last accepted them, so an unrelated deploy never depends on the
// provider being reachable or paid for.
export async function runLocalBirthPreflight({
  repoRoot,environment,place="United States/Hilo",bootstrapPreflight=false,
  deployment=birthDeployment,fetchMaterial=null,
  probeSchemas=probeBirthModelSchemas,log=console.log,
  acceptance=fileSchemaAcceptance(repoRoot,environment),now=()=>new Date().toISOString(),
}={}){
  const remote=deployment(environment);
  let rehearsal=null;
  try{
    const material=fetchMaterial
      ?await fetchMaterial(remote,place)
      :(await birthRequest(remote,"/internal/births/preflight/material?place="+
          encodeURIComponent(place),{timeoutMs:30_000})).material;
    if(bootstrapPreflight)
      throw new Error("BIRTH PREFLIGHT: --bootstrap-preflight refused; snapshot route already exists");
    if(!Array.isArray(material?.places)||!material.places.length)
      throw new Error("BIRTH PREFLIGHT no pinned Place/naming material from serving Birth Center");
    rehearsal=rehearseBirthSnapshot(material);
  }catch(error){
    if(!bootstrapPreflight||error?.status!==404)throw error;
    log("BIRTH PREFLIGHT WARNING: snapshot route returned 404; skipping local rehearsal for this bootstrap only");
  }
  const manifest=await loadDeploymentManifest(resolve(repoRoot,
    "infra/deployments/environments/cloudflare.yaml"));
  const integrations=resolveServiceDeployment(manifest,"birth-center").integrations;
  const fingerprint=birthSchemaFingerprint(integrations);
  const accepted=await acceptance.read();
  let schemas=BIRTH_RESPONSE_SCHEMAS.length,probed=false;
  if(accepted?.fingerprint===fingerprint){
    log("BIRTH SCHEMAS unchanged since the provider accepted them ("+accepted.acceptedAt+"); probe skipped");
  }else{
    schemas=await probeSchemas(process.env,{
      creative:integrations.creative,repair:integrations.repair,
    });
    probed=true;
    await acceptance.write({fingerprint,acceptedAt:now(),schemas});
  }
  log("BIRTH LOCAL PREFLIGHT ok ("+schemas+" schemas"+
    (rehearsal?", place "+rehearsal.place:", bootstrap snapshot unavailable")+")");
  return {schemas,rehearsal,probed};
}

export async function runBirthPreflight({
  baseUrl,privateToken,place="United States/Hilo",expectedSha=null,probeSchemas=true,
  fetchImpl=fetch,log=console.log,
}={}){
  if(!baseUrl||!privateToken)
    throw new Error("BIRTH PREFLIGHT requires the deployed Birth Center URL and FIBRE_PRIVATE_TOKEN");
  const response=await fetchImpl(baseUrl.replace(/\/$/u,"")+"/internal/births/preflight",{
    method:"POST",
    headers:{"content-type":"application/json","x-fibre-private-token":privateToken},
    body:JSON.stringify({place,...(probeSchemas?{}:{probeSchemas:false})}),
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
  log("BIRTH PREFLIGHT ok ("+result.schemas+" schemas"+(probeSchemas?"":", unchanged, probe skipped")+
    ", place "+result.place+")");
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
