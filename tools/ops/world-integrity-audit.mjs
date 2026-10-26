import {readFileSync,mkdirSync,writeFileSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {createSqliteStateInfraDriver} from "../../infra/providers/local/sqlite-state.mjs";
import {
  auditWorldIntegrityBatch,WORLD_INTEGRITY_AUDIT_FAMILIES,
} from "../../services/world-kernel/src/world-integrity-audit.mjs";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));

function argumentsFor(argv){
  let env=null,family=null;
  for(let i=0;i<argv.length;i++){
    if(argv[i]==="--env")env=argv[++i];
    else if(argv[i]==="--family")family=argv[++i];
    else throw new TypeError("unsupported World integrity-audit argument");
  }
  if(!["local","staging","production"].includes(env))
    throw new TypeError("--env local|staging|production is required");
  if(family!==null&&!WORLD_INTEGRITY_AUDIT_FAMILIES.includes(family))
    throw new TypeError("unsupported integrity family");
  return {env,families:family===null?WORLD_INTEGRITY_AUDIT_FAMILIES:[family]};
}

function deployedWorldUrl(env){
  const file=resolve(ROOT,".fibre","cloudflare",env,"deployment.json");
  const topology=JSON.parse(readFileSync(file,"utf8"));
  const deployment=topology.deployments?.find(x=>x.serviceId==="world-kernel");
  if(!deployment?.baseUrl)throw new Error("World deployment URL is unavailable");
  return deployment.baseUrl.replace(/\/$/u,"")+"/internal/integrity/audit";
}

async function remoteBatch(url,token,input){
  const response=await fetch(url,{
    method:"POST",
    headers:{"content-type":"application/json","x-fibre-private-token":token},
    body:JSON.stringify(input),
    signal:AbortSignal.timeout(120_000),
  });
  const data=await response.json();
  if(!response.ok)throw new Error("World integrity audit failed: "+
    JSON.stringify(data?.error??data).slice(0,250));
  return {
    batch:data,
    rowsRead:Number(response.headers.get("x-fibre-state-rows-read")??0),
  };
}

export async function runWorldIntegrityAudit({env,families}){
  console.error("WARNING: a full integrity audit deliberately reads the entire World once.");
  const local=env==="local";
  const databasePath=resolve(ROOT,process.env.FIBRE_WORLD_DATABASE??".fibre/world.sqlite");
  const storage=local?{
    infraDriver:createSqliteStateInfraDriver({scopes:{world:databasePath}}),
    stateScopeId:"world",schemaReady:true,
  }:null;
  const url=local?null:deployedWorldUrl(env);
  const token=local?null:process.env.FIBRE_PRIVATE_TOKEN;
  if(!local&&!token)throw new TypeError("FIBRE_PRIVATE_TOKEN is required");
  const results=[];
  for(const family of families){
    let cursor=null,checked=0,rowsRead=0,findings=[];
    const seen=new Set();
    do{
      const input={family,cursor,limit:500};
      const result=local?{batch:auditWorldIntegrityBatch(storage,input),rowsRead:null}
        :await remoteBatch(url,token,input);
      checked+=result.batch.checked;
      if(result.rowsRead!==null)rowsRead+=result.rowsRead;
      findings.push(...result.batch.findings);
      cursor=result.batch.nextCursor;
      if(cursor!==null){
        if(seen.has(cursor))throw new Error("integrity audit cursor did not advance");
        seen.add(cursor);
      }
    }while(cursor!==null);
    results.push({family,checked,findings,rowsRead:local?null:rowsRead});
    console.log(family+": "+checked+" checked, "+findings.length+" findings"+
      (local?"":", "+rowsRead+" rows read"));
  }
  const runId=new Date().toISOString().replace(/[:.]/gu,"-");
  const output=resolve(ROOT,".fibre","integrity",env,runId+".json");
  mkdirSync(dirname(output),{recursive:true});
  writeFileSync(output,JSON.stringify({environment:env,runId,results},null,2)+"\n");
  console.log("Saved "+output);
  return {output,results};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  const input=argumentsFor(process.argv.slice(2));
  runWorldIntegrityAudit(input).catch(error=>{
    console.error(String(error?.message??error));
    process.exitCode=1;
  });
}
