import { randomInt, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

import { normalizeCloudflareEnvironment } from "../deployment/cloudflare-operator.mjs";

const REPO_ROOT=fileURLToPath(new URL("../../",import.meta.url));
const REQUEST_TIMEOUT_MS=180_000;
const DIRECTORY_LIMIT=5000;

function nonEmpty(name,value){
  if(typeof value!=="string"||value.trim()==="")throw new TypeError(`${name} is required`);
  return value.trim();
}

function endpoint(baseUrl,pathname){
  const url=new URL(baseUrl);
  url.pathname=pathname;
  url.search="";
  url.hash="";
  return url;
}

function deploymentByService(record,serviceId){
  const matches=(record.deployments??[]).filter((entry)=>entry?.serviceId===serviceId);
  if(matches.length!==1)throw new Error(`deployment evidence must contain exactly one ${serviceId}`);
  return matches[0];
}

function deploymentEvidence(environment){
  const record=JSON.parse(readFileSync(
    resolve(REPO_ROOT,".fibre","cloudflare",environment,"deployment.json"),
    "utf8",
  ));
  if(record.environment!==environment)throw new Error("Thread meet deployment environment mismatch");
  return record;
}

function remoteBase(name,value){
  const url=new URL(nonEmpty(name,value));
  if(url.protocol!=="https:"||["localhost","127.0.0.1","::1"].includes(url.hostname)||url.hostname.endsWith(".local")){
    throw new Error(`${name} must be a remote HTTPS endpoint`);
  }
  return url.toString().replace(/\/$/u,"");
}

function context(environment,targetEnvironment){
  const deployment=deploymentEvidence(targetEnvironment);
  return Object.freeze({
    privateToken:nonEmpty("FIBRE_PRIVATE_TOKEN",environment.FIBRE_PRIVATE_TOKEN),
    worldBaseUrl:remoteBase(
      `${targetEnvironment} World`,
      deploymentByService(deployment,"world-kernel").baseUrl,
    ),
  });
}

async function responseJson(response,label){
  const payload=await response.json().catch(()=>null);
  if(payload===null)throw new Error(`${label} returned non-JSON HTTP ${response.status}`);
  if(!response.ok){
    throw new Error(`${label} failed HTTP ${response.status}: ${payload?.error?.code??payload?.error??"unknown"} ${payload?.detail??""}`.trim());
  }
  return payload;
}

async function privateGet(baseUrl,pathname,privateToken,query,label){
  const url=endpoint(baseUrl,pathname);
  for(const [key,value] of Object.entries(query??{}))url.searchParams.set(key,String(value));
  return responseJson(await fetch(url,{
    headers:{Accept:"application/json","x-fibre-private-token":privateToken},
    signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }),label);
}

async function privatePost(baseUrl,pathname,privateToken,body,label){
  return responseJson(await fetch(endpoint(baseUrl,pathname),{
    method:"POST",
    headers:{
      Accept:"application/json",
      "content-type":"application/json",
      "x-fibre-private-token":privateToken,
    },
    body:JSON.stringify(body),
    signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }),label);
}

export function parseThreadMeetArgs(argv){
  let targetEnvironment=null;
  let threadId=null;
  for(let index=0;index<argv.length;index+=1){
    if(argv[index]==="--env"){
      targetEnvironment=normalizeCloudflareEnvironment(argv[++index]??null);
    }else if(argv[index]==="--thread"){
      threadId=nonEmpty("--thread",argv[++index]);
    }else{
      throw new TypeError(`unsupported thread:meet argument ${argv[index]}`);
    }
  }
  if(targetEnvironment===null)throw new TypeError("--env <staging|production> is required");
  return Object.freeze({targetEnvironment,threadId});
}

export function selectMeetingThread(entries,randomIndex=(length)=>randomInt(length)){
  const eligible=(entries??[]).filter((entry)=>
    typeof entry?.threadId==="string"
    && entry.threadId!==""
    && !["genesis_candidate","retired"].includes(entry.status));
  if(eligible.length===0)throw new Error("World has no Threads available to meet");
  const index=randomIndex(eligible.length);
  if(!Number.isSafeInteger(index)||index<0||index>=eligible.length){
    throw new TypeError("meeting selection returned an invalid index");
  }
  return Object.freeze(structuredClone(eligible[index]));
}

async function randomThread(ctx){
  const payload=await privateGet(
    ctx.worldBaseUrl,
    "/internal/thread-directory/search",
    ctx.privateToken,
    {limit:DIRECTORY_LIMIT},
    "World Thread directory",
  );
  if(!Array.isArray(payload?.threads))throw new Error("World Thread directory returned no Threads");
  return selectMeetingThread(payload.threads);
}

function worldPresentText(present){
  const location=present?.location??null;
  let place="unknown place";
  if(location?.kind==="place"){
    place=location.place?.displayName??location.placeRef??"unnamed place";
  }else if(location?.kind==="transit"){
    const from=location.from?.displayName??location.fromPlaceRef??"somewhere";
    const to=location.to?.displayName??location.toPlaceRef??"somewhere";
    place=`in transit from ${from} to ${to}`;
  }
  return Object.freeze({
    situationId:present?.situationId??null,
    establishedAt:present?.establishedAt??null,
    place,
    activity:present?.activity??null,
  });
}

function printWorldPresent(output,present){
  const scene=worldPresentText(present);
  output.write(
    "\nCURRENT LIFE\n"
    +`  situation: ${scene.situationId??"unknown"}\n`
    +`  established: ${scene.establishedAt??"unknown"}\n`
    +`  place: ${scene.place}\n`
    +`  activity: ${scene.activity??"unknown"}\n`,
  );
  return scene;
}

async function ensureWorldPresent(ctx,threadId){
  const payload=await privatePost(
    ctx.worldBaseUrl,
    "/internal/lived-now/ensure",
    ctx.privateToken,
    {threadId},
    `LivedNow ${threadId}`,
  );
  if(payload?.ok!==true||payload?.result?.present?.situationId!==payload?.result?.situationId){
    throw new Error("World returned an inconsistent current present");
  }
  return payload.result.present;
}

async function worldEncounter(ctx,{threadId,situationId,utterance,priorEncounterStoryId}){
  const response=await fetch(endpoint(ctx.worldBaseUrl,"/internal/public-visitor-encounter"),{
    method:"POST",
    headers:{
      Accept:"application/json",
      "content-type":"application/json",
      "x-fibre-private-token":ctx.privateToken,
    },
    body:JSON.stringify({
      requestId:`cli_enc_${randomUUID()}`,
      threadId,
      expectedSituationId:situationId,
      utterance,
      ...(priorEncounterStoryId===null?{}:{priorEncounterStoryId}),
    }),
    signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const payload=await response.json().catch(()=>null);
  if(response.status===409&&payload?.error==="encounter_scene_changed"){
    return Object.freeze({
      outcome:"scene_changed",
      currentSituationId:payload.currentSituationId??null,
    });
  }
  if(!response.ok||payload?.ok!==true||payload?.result===undefined){
    throw new Error(
      `World encounter failed HTTP ${response.status}: ${payload?.error??"unknown"} ${payload?.detail??""}`.trim(),
    );
  }
  return Object.freeze(structuredClone(payload.result));
}

export function advanceThreadMeetState(state,result){
  if(result.outcome==="accepted"){
    return Object.freeze({
      situationId:result.situationId,
      priorEncounterStoryId:result.encounterStoryId,
      terminal:false,
    });
  }
  if(["decline","defer","scene_changed"].includes(result.outcome)){
    return Object.freeze({
      situationId:result.situationId??result.currentSituationId??state.situationId,
      priorEncounterStoryId:state.priorEncounterStoryId,
      terminal:true,
    });
  }
  throw new TypeError(`unsupported meet outcome ${result.outcome}`);
}

export async function meetThread({
  environment=process.env,
  argv=process.argv.slice(2),
  input=process.stdin,
  output=process.stdout,
}={}){
  const {targetEnvironment,threadId:requestedThreadId}=parseThreadMeetArgs(argv);
  const ctx=context(environment,targetEnvironment);
  const selected=requestedThreadId===null?await randomThread(ctx):null;
  const threadId=requestedThreadId??selected.threadId;

  if(selected!==null){
    output.write(`Selected ${selected.displayName??threadId} · ${threadId}\n`);
  }

  const present=await ensureWorldPresent(ctx,threadId);
  const scene=printWorldPresent(output,present);
  let state=Object.freeze({
    situationId:scene.situationId,
    priorEncounterStoryId:null,
    terminal:false,
  });

  output.write(
    "\nMeet this Thread in the life already underway.\n"
    +"Commands: /present refreshes actual life · /leave exits\n",
  );

  const terminal=createInterface({input,output,terminal:Boolean(output.isTTY)});
  try{
    while(!state.terminal){
      const utterance=(await terminal.question("\nYou> ")).trim();
      if(utterance==="")continue;
      if(utterance==="/leave")break;
      if(utterance==="/present"){
        const refreshed=await ensureWorldPresent(ctx,threadId);
        const refreshedScene=printWorldPresent(output,refreshed);
        state=Object.freeze({
          situationId:refreshedScene.situationId,
          priorEncounterStoryId:null,
          terminal:false,
        });
        continue;
      }

      const result=await worldEncounter(ctx,{
        threadId,
        situationId:state.situationId,
        utterance,
        priorEncounterStoryId:state.priorEncounterStoryId,
      });

      if(result.outcome==="accepted"){
        output.write(`Thread> ${result.responseText}\n`);
        output.write(`  accepted · situation ${result.situationId} · story ${result.encounterStoryId}\n`);
      }else if(result.outcome==="decline"){
        output.write(`Thread> ${result.expression??"Not right now."}\n  declined\n`);
      }else if(result.outcome==="defer"){
        output.write(`Thread> ${result.expression??"Later."}\n  deferred${result.suggestedAt?` · ${result.suggestedAt}`:""}\n`);
      }else if(result.outcome==="scene_changed"){
        output.write("\nThe Thread's life moved before your utterance entered it.\n");
        printWorldPresent(output,await ensureWorldPresent(ctx,threadId));
      }

      state=advanceThreadMeetState(state,result);
    }
  }finally{
    terminal.close();
  }

  output.write("\nLeft the encounter. Fibre keeps the Thread's life; the CLI keeps no session.\n");
  return state;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  meetThread().catch((error)=>{
    process.stderr.write(`thread:meet failed: ${error instanceof Error?error.message:String(error)}\n`);
    process.exitCode=1;
  });
}
