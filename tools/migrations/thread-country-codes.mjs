import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT=fileURLToPath(new URL("../../",import.meta.url));

function required(name,value){
  if(typeof value!=="string"||value.trim()==="")throw new TypeError(name+" is required");
  return value.trim();
}

export function normalizeCountryCode(value){
  const code=String(value??"").trim().toUpperCase();
  if(!/^[A-Z]{2}$/u.test(code))throw new TypeError("countryCode must be a two-letter ISO code");
  return code;
}

export function migrationEntries(value){
  const entries=Array.isArray(value)?value:Array.isArray(value?.threads)?value.threads:null;
  if(entries===null)throw new TypeError("mapping file must be an array or { threads:[...] }");
  const seen=new Set();
  return entries.map((entry,index)=>{
    const threadId=required("threads["+index+"].threadId",entry?.threadId);
    if(seen.has(threadId))throw new TypeError("duplicate Thread in mapping: "+threadId);
    seen.add(threadId);
    return Object.freeze({threadId,countryCode:normalizeCountryCode(entry?.countryCode)});
  });
}

function options(argv){
  let plan=false;
  let mappingFile=null;
  let apply=false;
  for(const arg of argv){
    if(arg==="--plan")plan=true;
    else if(arg==="--apply")apply=true;
    else if(arg.startsWith("--mapping-file="))mappingFile=arg.slice("--mapping-file=".length);
    else throw new TypeError("unsupported country-code migration option "+arg);
  }
  if(plan===(mappingFile!==null))throw new TypeError("choose exactly one: --plan or --mapping-file=<path>");
  if(apply&&plan)throw new TypeError("--apply requires --mapping-file");
  return {plan,mappingFile,apply};
}

function deployment(){
  const path=resolve(REPO_ROOT,".fibre","cloudflare","staging","deployment.json");
  const record=JSON.parse(readFileSync(path,"utf8"));
  if(record?.environment!=="staging")throw new Error("deployment evidence is not staging");
  const head=execFileSync("git",["rev-parse","HEAD"],{cwd:REPO_ROOT,encoding:"utf8"}).trim();
  const status=execFileSync("git",["status","--porcelain","--untracked-files=all"],{cwd:REPO_ROOT,encoding:"utf8"}).trim();
  if(status!=="")throw new Error("country-code migration requires a clean working tree");
  if(record.sourceTreeClean!==true||record.sourceGitSha!==head){
    throw new Error("staging deployment "+(record.sourceGitSha??"unknown")+" does not match current clean checkout "+head);
  }
  return record;
}

function serviceBase(record,serviceId){
  const matches=(record.deployments??[]).filter((entry)=>entry?.serviceId===serviceId);
  if(matches.length!==1)throw new Error("deployment evidence must contain exactly one "+serviceId);
  return required(serviceId+" baseUrl",matches[0].baseUrl).replace(/\/$/u,"");
}

async function json(response,label){
  const body=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(label+" failed: HTTP "+response.status+" "+JSON.stringify(body));
  if(body===null)throw new Error(label+" returned non-JSON HTTP "+response.status);
  return body;
}

function headers(token,write=false){
  return {
    Accept:"application/json",
    "x-fibre-private-token":token,
    ...(write?{"content-type":"application/json"}:{}),
  };
}

async function directory(worldKernel,token){
  const response=await fetch(worldKernel+"/internal/thread-directory/search?limit=5000",{
    headers:headers(token),
    cache:"no-store",
  });
  const body=await json(response,"Thread directory");
  return Array.isArray(body.threads)?body.threads:[];
}

async function observatory(worldKernel,token,threadId){
  const response=await fetch(
    worldKernel+"/internal/threads/"+encodeURIComponent(threadId)+"/observatory",
    {headers:headers(token),cache:"no-store"},
  );
  return json(response,"Thread observatory "+threadId);
}

function storedBirthPlace(body){
  const place=body?.observatory?.thread?.identity?.birthPlace;
  return place&&typeof place==="object"&&!Array.isArray(place)?place:null;
}

function operationKey(threadId,countryCode){
  const digest=createHash("sha256").update(threadId+"\n"+countryCode).digest("hex").slice(0,20);
  return "country_code_backfill_"+digest;
}

async function updateCountryCode(worldKernel,token,threadId,birthPlace,countryCode){
  const response=await fetch(
    worldKernel+"/internal/threads/"+encodeURIComponent(threadId)+"/repair",
    {
      method:"POST",
      headers:headers(token,true),
      body:JSON.stringify({
        action:"identity",
        operationKey:operationKey(threadId,countryCode),
        birthPlace:{...birthPlace,countryCode},
      }),
    },
  );
  return json(response,"country-code migration "+threadId);
}

export function planEntry(thread,observatoryBody){
  const place=storedBirthPlace(observatoryBody);
  if(place===null||typeof place.countryCode==="string"&&place.countryCode.trim()!=="")return null;
  return Object.freeze({
    threadId:thread.threadId,
    name:thread.displayName??null,
    birthPlace:Object.freeze({
      displayName:place.displayName??null,
      country:place.country??null,
      city:place.city??null,
    }),
    countryCode:"",
  });
}

async function main(){
  const parsed=options(process.argv.slice(2));
  const token=required("FIBRE_PRIVATE_TOKEN",process.env.FIBRE_PRIVATE_TOKEN);
  const deployed=deployment();
  const worldKernel=serviceBase(deployed,"world-kernel");

  if(parsed.plan){
    const threads=await directory(worldKernel,token);
    const planned=[];
    for(const thread of threads){
      const body=await observatory(worldKernel,token,thread.threadId);
      const entry=planEntry(thread,body);
      if(entry!==null)planned.push(entry);
    }
    process.stdout.write(JSON.stringify({
      contract:"fibre-thread-country-code-migration-plan-v0.1",
      sourceGitSha:deployed.sourceGitSha,
      threads:planned,
    },null,2)+"\n");
    return;
  }

  const mapping=migrationEntries(JSON.parse(readFileSync(resolve(parsed.mappingFile),"utf8")));
  const results=[];
  for(const entry of mapping){
    const before=await observatory(worldKernel,token,entry.threadId);
    const birthPlace=storedBirthPlace(before);
    if(birthPlace===null)throw new Error(entry.threadId+" has no authoritative birthPlace");
    const existing=typeof birthPlace.countryCode==="string"?birthPlace.countryCode.trim().toUpperCase():null;
    if(existing!==null&&existing!==entry.countryCode){
      throw new Error(entry.threadId+" already has countryCode "+existing+"; refusing to overwrite with "+entry.countryCode);
    }
    if(existing===entry.countryCode){
      results.push({threadId:entry.threadId,countryCode:entry.countryCode,state:"already_current"});
      continue;
    }
    if(!parsed.apply){
      results.push({threadId:entry.threadId,countryCode:entry.countryCode,state:"would_apply",birthPlace:birthPlace.displayName??null});
      continue;
    }

    await updateCountryCode(worldKernel,token,entry.threadId,birthPlace,entry.countryCode);
    const after=await observatory(worldKernel,token,entry.threadId);
    const written=storedBirthPlace(after)?.countryCode??null;
    if(written!==entry.countryCode)throw new Error(entry.threadId+" countryCode did not persist");
    results.push({threadId:entry.threadId,countryCode:entry.countryCode,state:"applied"});
  }

  process.stdout.write(JSON.stringify({
    event:parsed.apply?"thread-country-code-migration-complete":"thread-country-code-migration-dry-run",
    sourceGitSha:deployed.sourceGitSha,
    results,
  },null,2)+"\n");
}

if(import.meta.url===new URL(process.argv[1],"file:").href){
  main().catch((error)=>{
    process.stderr.write((error instanceof Error?error.stack:String(error))+"\n");
    process.exitCode=1;
  });
}
