import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { normalizeCloudflareEnvironment } from "../deployment/cloudflare-operator.mjs";

const REPO_ROOT=fileURLToPath(new URL("../../",import.meta.url));
const READ_TIMEOUT_MS=15_000;
const MUTATION_TIMEOUT_MS=120_000;
const SCAN_LIMIT=40;
const GIT_SHA=/^[0-9a-f]{40}$/u;

function nonEmpty(name,value){
  if(typeof value!=="string"||value.trim()==="")throw new TypeError(`${name} is required`);
  return value.trim();
}

function parseArgs(argv){
  let environment=null;
  for(let i=0;i<argv.length;i+=1){
    if(argv[i]==="--env")environment=argv[++i]??null;
    else throw new TypeError(`unsupported argument ${argv[i]}`);
  }
  const env=normalizeCloudflareEnvironment(environment);
  if(env==="production"){
    throw new TypeError("encounter-autonomy probe mutates lived World state and is not permitted against production");
  }
  return Object.freeze({environment:env});
}

export function validatorGitSha(){
  const sha=execFileSync("git",["rev-parse","HEAD"],{cwd:REPO_ROOT,encoding:"utf8"}).trim().toLowerCase();
  const status=execFileSync("git",["status","--porcelain","--untracked-files=all"],{
    cwd:REPO_ROOT,encoding:"utf8",
  }).trim();
  if(status!=="")throw new Error("encounter-autonomy probe requires a clean checkout");
  if(!GIT_SHA.test(sha))throw new Error("encounter-autonomy probe requires an exact Git SHA");
  return sha;
}

export function requireRuntimeAncestor(runtimeSha,validatorSha){
  if(!GIT_SHA.test(runtimeSha??""))throw new Error("deployed world-kernel did not expose an exact Git SHA");
  try{
    execFileSync("git",["merge-base","--is-ancestor",runtimeSha,validatorSha],{
      cwd:REPO_ROOT,stdio:"ignore",
    });
  }catch{
    throw new Error(`deployed world-kernel ${runtimeSha} is not in validator checkout history ${validatorSha}`);
  }
}

export function topology(environment){
  const path=resolve(REPO_ROOT,".fibre","cloudflare",environment,"deployment.json");
  const record=JSON.parse(readFileSync(path,"utf8"));
  if(record.environment!==environment)throw new Error("deployment topology environment mismatch");
  const service=(id)=>{
    const match=(record.deployments??[]).find((entry)=>entry?.serviceId===id);
    if(!match?.baseUrl)throw new Error(`deployment topology lacks ${id}`);
    return String(match.baseUrl).replace(/\/$/u,"");
  };
  return Object.freeze({
    worldBaseUrl:service("world-kernel"),
    presentationBaseUrl:service("thread-presentation"),
    viewerOrigin:nonEmpty("viewer origin",record.externalViewerOrigin),
    topologyGitSha:record.sourceGitSha??null,
  });
}

function endpoint(base,path){
  const url=new URL(base);
  url.pathname=path;
  url.search="";
  url.hash="";
  return url;
}

async function json(response,label){
  const payload=await response.json().catch(()=>null);
  if(payload===null)throw new Error(`${label} returned non-JSON HTTP ${response.status}`);
  return payload;
}

export async function privateGet(base,path,token,label){
  const response=await fetch(endpoint(base,path),{
    headers:{Accept:"application/json","x-fibre-private-token":token},
    signal:AbortSignal.timeout(READ_TIMEOUT_MS),
  });
  const payload=await json(response,label);
  if(!response.ok)throw new Error(`${label} failed HTTP ${response.status}`);
  return payload;
}

async function privatePost(base,path,token,body,label){
  const response=await fetch(endpoint(base,path),{
    method:"POST",
    headers:{
      Accept:"application/json",
      "content-type":"application/json",
      "x-fibre-private-token":token,
    },
    body:JSON.stringify(body),
    signal:AbortSignal.timeout(MUTATION_TIMEOUT_MS),
  });
  const payload=await json(response,label);
  if(!response.ok||payload?.ok!==true){
    throw new Error(`${label} failed HTTP ${response.status}: ${payload?.error??"unknown"} ${payload?.detail??""}`.trim());
  }
  return payload.result;
}

export async function publicThreads(base,origin){
  const url=endpoint(base,"/api/threads");
  url.searchParams.set("limit","200");
  const response=await fetch(url,{
    headers:{Accept:"application/json",Origin:origin},
    signal:AbortSignal.timeout(READ_TIMEOUT_MS),
  });
  const payload=await json(response,"Thread discovery");
  if(!response.ok||!Array.isArray(payload?.threads))throw new Error("Thread discovery failed");
  return payload.threads;
}

function worldPresenceKeys(observatory){
  const livedNow=observatory?.livedNow;
  const situation=livedNow?.currentSituation;
  if(!situation)return Object.freeze([]);
  const keys=[];
  if(typeof situation.mediatedContext==="string"&&situation.mediatedContext.trim()!==""){
    keys.push(`mediated:${situation.mediatedContext.trim()}`);
  }
  if(situation.location?.kind==="place"){
    const worldPlace=(livedNow.worldPlaces??[]).find((candidate)=>candidate.ref===situation.location.placeRef);
    if(worldPlace)keys.push(`world-place:${worldPlace.ref}`);
  }
  return Object.freeze(keys);
}

function sharedPlanStops(observatory){
  const plan=observatory?.livedNow?.currentPersonalPlan;
  if(!Array.isArray(plan?.stops))return Object.freeze([]);
  return Object.freeze(plan.stops.flatMap((stop)=>{
    const ref=stop?.physicalPlaceRef;
    const start=Date.parse(stop?.startAt??"");
    const end=Date.parse(stop?.endAt??"");
    if(typeof ref!=="string"||!ref.startsWith("wpl_")||!Number.isFinite(start)||!Number.isFinite(end)||end<=start){
      return [];
    }
    return [Object.freeze({placeRef:ref,start,end})];
  }));
}

function coPresentGroups(threads,minimum=3){
  const byKey=new Map();
  for(const thread of threads){
    for(const key of thread.presenceKeys){
      if(!byKey.has(key))byKey.set(key,[]);
      byKey.get(key).push(thread);
    }
  }
  return [...byKey.entries()]
    .filter(([,group])=>group.length>=minimum)
    .map(([presenceKey,group])=>Object.freeze({presenceKey,threads:Object.freeze(group)}));
}

function nextSharedPlanWindow(threads,minimum=3,after=Date.now()){
  const eventsByPlace=new Map();
  for(const thread of threads){
    for(const stop of thread.sharedPlanStops){
      if(stop.end<=after)continue;
      if(!eventsByPlace.has(stop.placeRef))eventsByPlace.set(stop.placeRef,[]);
      eventsByPlace.get(stop.placeRef).push(
        {time:stop.start,type:"start",threadId:thread.threadId},
        {time:stop.end,type:"end",threadId:thread.threadId},
      );
    }
  }

  let best=null;
  for(const [placeRef,events] of eventsByPlace){
    events.sort((a,b)=>a.time-b.time||(a.type==="end"?-1:1));
    const active=new Map();
    let index=0;
    while(index<events.length){
      const time=events[index].time;
      const same=[];
      while(index<events.length&&events[index].time===time)same.push(events[index++]);
      for(const event of same.filter((entry)=>entry.type==="end")){
        const count=(active.get(event.threadId)??0)-1;
        if(count<=0)active.delete(event.threadId);else active.set(event.threadId,count);
      }
      for(const event of same.filter((entry)=>entry.type==="start")){
        active.set(event.threadId,(active.get(event.threadId)??0)+1);
      }
      const next=index<events.length?events[index].time:null;
      const start=Math.max(time,after);
      if(next!==null&&next>start&&active.size>=minimum){
        const candidate={
          placeRef,
          start,
          end:next,
          threadIds:[...active.keys()].slice(0,minimum),
        };
        if(best===null||candidate.start<best.start)best=candidate;
      }
    }
  }
  return best===null?null:Object.freeze({
    placeRef:best.placeRef,
    startAt:new Date(best.start).toISOString(),
    endAt:new Date(best.end).toISOString(),
    threadIds:Object.freeze(best.threadIds),
  });
}

async function scanWorld({worldBaseUrl,presentationBaseUrl,viewerOrigin,privateToken,validatorSha}){
  const cards=(await publicThreads(presentationBaseUrl,viewerOrigin))
    .filter((thread)=>!["genesis_candidate","retired"].includes(thread?.lifecycleStatus))
    .slice(0,SCAN_LIMIT);
  const threads=[];
  let worldKernelGitSha=null;
  for(const card of cards){
    try{
      const payload=await privateGet(
        worldBaseUrl,
        `/internal/threads/${encodeURIComponent(card.threadId)}/observatory`,
        privateToken,
        `World Observatory ${card.threadId}`,
      );
      if(worldKernelGitSha===null){
        worldKernelGitSha=payload?.deploymentGitSha??null;
        requireRuntimeAncestor(worldKernelGitSha,validatorSha);
      }
      const observatory=payload?.observatory;
      if(!observatory?.livedNow?.currentSituation)continue;
      threads.push(Object.freeze({
        threadId:card.threadId,
        displayName:observatory?.thread?.identity?.name??card.displayName??null,
        establishedAt:observatory.livedNow.currentSituation.establishedAt,
        presenceKeys:worldPresenceKeys(observatory),
        sharedPlanStops:sharedPlanStops(observatory),
      }));
    }catch{
      // A broken/unavailable Thread does not invalidate bounded population inspection.
    }
  }
  if(worldKernelGitSha===null)throw new Error("encounter-autonomy probe could not read World runtime evidence");
  if(threads.length===0)throw new Error("encounter-autonomy probe found no enacted current life");
  threads.sort((a,b)=>Date.parse(b.establishedAt)-Date.parse(a.establishedAt));
  return Object.freeze({threads:Object.freeze(threads),worldKernelGitSha});
}

async function environmentalProbe({worldBaseUrl,privateToken,candidate}){
  const result=await privatePost(
    worldBaseUrl,
    "/internal/environmental-encounter",
    privateToken,
    {threadId:candidate.threadId},
    "environmental encounter",
  );
  const story=result?.encounterStory;
  const beat=story?.story?.beats?.[0]??null;
  if(!story?.encounterId||story.story?.beats?.length!==1||beat?.kind!=="occurrence"||beat?.actorThreadId!==null){
    throw new Error("E6a did not admit one objective occurrence Encounter Story");
  }
  if(!["noticed","not_noticed"].includes(result?.attention?.outcome)){
    throw new Error("E6a did not preserve selective attention");
  }
  const durable=await privateGet(
    worldBaseUrl,
    `/internal/threads/${encodeURIComponent(candidate.threadId)}/observatory`,
    privateToken,
    "environmental observatory",
  );
  const recorded=(durable?.observatory?.encounterStories??[])
    .find((entry)=>entry.encounterId===story.encounterId);
  if(!recorded||recorded.attention?.outcome!==result.attention.outcome){
    throw new Error("E6a Encounter Story/attention was not durable");
  }
  return Object.freeze({
    status:"proven",
    threadId:candidate.threadId,
    encounterId:story.encounterId,
    attention:result.attention.outcome,
    journal:result.aftermath?.journalEntry?"written":"none",
    memory:result.aftermath?.memory?.outcome??"none",
  });
}

async function witnessProbe({worldBaseUrl,privateToken,group}){
  if(group===null){
    return Object.freeze({status:"blocked_by_world_state"});
  }
  const initiator=group.threads[0];
  const result=await privatePost(
    worldBaseUrl,
    "/internal/social-meeting",
    privateToken,
    {initiatorThreadId:initiator.threadId},
    "social witness scene",
  );
  for(const attempt of result?.attempts??[]){
    if(attempt?.outcome!=="met"||!attempt?.encounterStory)continue;
    const actors=new Set([
      initiator.threadId,
      attempt.counterpartyThreadId,
    ]);
    const witnesses=(attempt.encounterStory.threadPresence??[])
      .map((entry)=>entry.threadId)
      .filter((threadId)=>!actors.has(threadId));
    if(witnesses.length===0)continue;

    const durableWitnesses=[];
    for(const threadId of witnesses){
      const payload=await privateGet(
        worldBaseUrl,
        `/internal/threads/${encodeURIComponent(threadId)}/observatory`,
        privateToken,
        `witness observatory ${threadId}`,
      );
      const story=(payload?.observatory?.encounterStories??[])
        .find((entry)=>entry.encounterId===attempt.encounterStory.encounterId);
      if(story?.attention?.outcome==="noticed"||story?.attention?.outcome==="not_noticed"){
        durableWitnesses.push(Object.freeze({
          threadId,
          attention:story.attention.outcome,
        }));
      }
    }
    if(durableWitnesses.length>0){
      return Object.freeze({
        status:"proven",
        encounterId:attempt.encounterStory.encounterId,
        initiatorThreadId:initiator.threadId,
        counterpartyThreadId:attempt.counterpartyThreadId,
        witnesses:Object.freeze(durableWitnesses),
      });
    }
  }
  return Object.freeze({
    status:"not_observed_in_bounded_scene",
    initiatorThreadId:initiator.threadId,
    discoveredThreadIds:Object.freeze(result?.discoveredThreadIds??[]),
    attemptCount:(result?.attempts??[]).length,
  });
}

function writeEvidence(environment,runId,evidence){
  const path=resolve(REPO_ROOT,".fibre","encounter-autonomy",environment,runId,"evidence.json");
  mkdirSync(dirname(path),{recursive:true});
  writeFileSync(path,`${JSON.stringify(evidence,null,2)}\n`,"utf8");
  return path;
}

export async function runEncounterAutonomyProbe({
  targetEnvironment,
  environment=process.env,
  emit=(event)=>process.stdout.write(`${JSON.stringify(event)}\n`),
}={}){
  const privateToken=nonEmpty("FIBRE_PRIVATE_TOKEN",environment.FIBRE_PRIVATE_TOKEN);
  const validatorSha=validatorGitSha();
  const target=normalizeCloudflareEnvironment(targetEnvironment);
  if(target==="production"){
    throw new TypeError("encounter-autonomy probe mutates lived World state and is not permitted against production");
  }
  const deployment=topology(target);
  const runId=`encounter-autonomy-${Date.now().toString(36)}`;
  emit({event:"encounter-autonomy-probe-start",environment:target,runId,validatorGitSha:validatorSha});

  const scan=await scanWorld({
    ...deployment,
    privateToken,
    validatorSha,
  });
  const groups=coPresentGroups(scan.threads,3);
  const nextWindow=groups.length===0?nextSharedPlanWindow(scan.threads,3):null;
  emit({
    event:"encounter-autonomy-world-state",
    scannedThreadCount:scan.threads.length,
    threeWayCoPresentGroupCount:groups.length,
    nextThreeWaySharedPlanWindow:nextWindow,
  });

  const witness=await witnessProbe({
    worldBaseUrl:deployment.worldBaseUrl,
    privateToken,
    group:groups[0]??null,
  });
  emit({event:"encounter-autonomy-witness-result",...witness});

  // E6a is independently proven. Re-prove it only when a live witness
  // makes full E6 closure possible; an unavailable witness scene is read-only.
  const environmental=witness.status==="proven"
    ?await environmentalProbe({
      worldBaseUrl:deployment.worldBaseUrl,
      privateToken,
      candidate:scan.threads[0],
    })
    :Object.freeze({status:"not_run",reason:"witness_not_proven"});
  emit({
    event:environmental.status==="proven"
      ?"encounter-autonomy-environmental-proven"
      :"encounter-autonomy-environmental-skipped",
    ...environmental,
  });

  const complete=environmental.status==="proven"&&witness.status==="proven";
  const evidence=Object.freeze({
    contract:"fibre-encounter-autonomy-probe-v0.1",
    environment:target,
    runId,
    validatorGitSha:validatorSha,
    worldKernelGitSha:scan.worldKernelGitSha,
    topologyGitSha:deployment.topologyGitSha,
    completedAt:new Date().toISOString(),
    complete,
    environmental,
    witness,
    worldState:Object.freeze({
      scannedThreadCount:scan.threads.length,
      threeWayCoPresentGroupCount:groups.length,
      nextThreeWaySharedPlanWindow:nextWindow,
    }),
  });
  const evidencePath=writeEvidence(target,runId,evidence);
  emit({
    event:"encounter-autonomy-probe-complete",
    complete,
    environmentalStatus:environmental.status,
    witnessStatus:witness.status,
    evidencePath,
  });
  return Object.freeze({evidence,evidencePath});
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  let args;
  try{
    args=parseArgs(process.argv.slice(2));
  }catch(error){
    process.stderr.write(`${JSON.stringify({
      event:"encounter-autonomy-probe-failed",
      errorName:error?.constructor?.name??"Error",
      message:String(error?.message??error).slice(0,1200),
    })}\n`);
    process.exitCode=1;
  }
  if(args!==undefined){
    runEncounterAutonomyProbe({targetEnvironment:args.environment}).catch((error)=>{
      process.stderr.write(`${JSON.stringify({
        event:"encounter-autonomy-probe-failed",
        errorName:error?.constructor?.name??"Error",
        message:String(error?.message??error).slice(0,1200),
      })}\n`);
      process.exitCode=1;
    });
  }
}
