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

function createTrace(output,verbosity){
  function log(level,message){
    if(verbosity>=level)output.write(`[meet:v${level}] ${message}\n`);
  }

  async function request(url,init={},summary=null){
    const method=init.method??"GET";
    const started=Date.now();
    log(2,`-> ${method} ${url.pathname}${url.search}`);
    if(summary!==null)log(3,`request ${summary}`);
    const heartbeat=verbosity>=3
      ?setInterval(()=>log(3,`waiting ${method} ${url.pathname} · ${Math.round((Date.now()-started)/1000)}s`),10_000)
      :null;
    heartbeat?.unref?.();
    try{
      const response=await fetch(url,init);
      log(2,`<- ${response.status} ${method} ${url.pathname} · ${Date.now()-started}ms`);
      return response;
    }finally{
      if(heartbeat!==null)clearInterval(heartbeat);
    }
  }

  return Object.freeze({log,request});
}

async function privateGet(baseUrl,pathname,privateToken,query,label,trace){
  const url=endpoint(baseUrl,pathname);
  for(const [key,value] of Object.entries(query??{}))url.searchParams.set(key,String(value));
  return responseJson(await trace.request(url,{
    headers:{Accept:"application/json","x-fibre-private-token":privateToken},
    signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }),label);
}

async function privatePost(baseUrl,pathname,privateToken,body,label,trace,summary=null){
  return responseJson(await trace.request(endpoint(baseUrl,pathname),{
    method:"POST",
    headers:{
      Accept:"application/json",
      "content-type":"application/json",
      "x-fibre-private-token":privateToken,
    },
    body:JSON.stringify(body),
    signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  },summary),label);
}

export function parseThreadMeetArgs(argv){
  let targetEnvironment=null;
  let threadId=null;
  let verbosity=0;
  let live=false;
  for(let index=0;index<argv.length;index+=1){
    if(argv[index]==="--env"){
      targetEnvironment=normalizeCloudflareEnvironment(argv[++index]??null);
    }else if(argv[index]==="--thread"){
      threadId=nonEmpty("--thread",argv[++index]);
    }else if(argv[index]==="--live"){
      live=true;
    }else if(/^-v{1,3}$/u.test(argv[index])){
      verbosity=Math.max(verbosity,argv[index].length-1);
    }else{
      throw new TypeError(`unsupported thread:meet argument ${argv[index]}`);
    }
  }
  if(targetEnvironment===null)throw new TypeError("--env <staging|production> is required");
  return Object.freeze({targetEnvironment,threadId,verbosity,live});
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

async function threadEntry(ctx,threadId,trace){
  const payload=await privateGet(
    ctx.worldBaseUrl,
    `/internal/thread-directory/entry/${encodeURIComponent(threadId)}`,
    ctx.privateToken,
    {},
    `World Thread directory ${threadId}`,
    trace,
  );
  return payload?.thread??null;
}

async function randomThread(ctx,trace){
  trace.log(1,"Selecting a Thread from the World directory");
  const payload=await privateGet(
    ctx.worldBaseUrl,
    "/internal/thread-directory/search",
    ctx.privateToken,
    {limit:DIRECTORY_LIMIT},
    "World Thread directory",
    trace,
  );
  if(!Array.isArray(payload?.threads))throw new Error("World Thread directory returned no Threads");
  const selected=selectMeetingThread(payload.threads);
  trace.log(3,`directory returned ${payload.threads.length} Threads · selected ${selected.threadId}`);
  return selected;
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

async function ensureWorldPresent(ctx,threadId,trace){
  const started=Date.now();
  trace.log(1,`Reconciling current life for ${threadId}`);
  const payload=await privatePost(
    ctx.worldBaseUrl,
    "/internal/lived-now/ensure",
    ctx.privateToken,
    {threadId},
    `LivedNow ${threadId}`,
    trace,
    `thread=${threadId}`,
  );
  if(payload?.ok!==true||payload?.result?.present?.situationId!==payload?.result?.situationId){
    throw new Error("World returned an inconsistent current present");
  }
  trace.log(1,`Current life ready · ${Date.now()-started}ms`);
  trace.log(3,`situation=${payload.result.situationId}`);
  return payload.result.present;
}

async function worldEncounter(ctx,{threadId,situationId,utterance,priorEncounterStoryId},trace){
  const started=Date.now();
  const requestId=`cli_enc_${randomUUID()}`;
  trace.log(1,`Submitting encounter · situation ${situationId}`);
  const response=await trace.request(
    endpoint(ctx.worldBaseUrl,"/internal/public-visitor-encounter"),
    {
      method:"POST",
      headers:{
        Accept:"application/json",
        "content-type":"application/json",
        "x-fibre-private-token":ctx.privateToken,
      },
      body:JSON.stringify({
        requestId,
        threadId,
        expectedSituationId:situationId,
        utterance,
        ...(priorEncounterStoryId===null?{}:{priorEncounterStoryId}),
      }),
      signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
    `thread=${threadId} situation=${situationId} priorStory=${priorEncounterStoryId??"none"} utteranceChars=${utterance.length}`,
  );
  const payload=await response.json().catch(()=>null);
  if(response.status===409&&payload?.error==="encounter_scene_changed"){
    trace.log(1,`Encounter scene changed · ${Date.now()-started}ms`);
    trace.log(3,`currentSituation=${payload.currentSituationId??"unknown"}`);
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
  trace.log(1,`Encounter ${payload.result.outcome} · ${Date.now()-started}ms`);
  trace.log(3,`result situation=${payload.result.situationId??"unknown"} story=${payload.result.encounterStoryId??"none"}`);
  return Object.freeze(structuredClone(payload.result));
}

export async function readLiveEncounterEvents(body,onEvent){
  if(!body)throw new Error("World returned no live encounter stream");
  const decoder=new TextDecoder();
  let buffer="";
  let result=null;
  const consume=(frame)=>{
    const lines=frame.split("\n");
    const kind=lines.find((line)=>line.startsWith("event:"))?.slice(6).trim()??"message";
    const data=lines.filter((line)=>line.startsWith("data:"))
      .map((line)=>line.slice(5).trimStart()).join("\n");
    if(data==="")return;
    const payload=JSON.parse(data);
    onEvent(kind,payload);
    if(kind==="error")throw new Error(`World live encounter failed: ${payload.error??"unknown"}`);
    if(kind==="result")result=payload;
  };
  for await(const chunk of body){
    buffer+=decoder.decode(chunk,{stream:true});
    buffer=buffer.replace(/\r\n/gu,"\n");
    let boundary;
    while((boundary=buffer.indexOf("\n\n"))!==-1){
      consume(buffer.slice(0,boundary));
      buffer=buffer.slice(boundary+2);
    }
  }
  buffer+=decoder.decode();
  if(buffer.trim()!=="")consume(buffer);
  if(result===null)throw new Error("World live encounter ended without a result");
  return result;
}

async function worldLiveEncounter(ctx,{threadId,situationId,utterance,priorEncounterStoryId},trace,{
  output,threadName,terminal,
}){
  const requestId=`cli_enc_${randomUUID()}`;
  trace.log(1,`Streaming encounter · situation ${situationId}`);
  const response=await trace.request(endpoint(ctx.worldBaseUrl,"/internal/public-visitor-encounter"),{
    method:"POST",
    headers:{
      Accept:"text/event-stream",
      "content-type":"application/json",
      "x-fibre-private-token":ctx.privateToken,
    },
    body:JSON.stringify({
      requestId,threadId,expectedSituationId:situationId,utterance,
      ...(priorEncounterStoryId===null?{}:{priorEncounterStoryId}),
    }),
    signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  },`thread=${threadId} situation=${situationId} priorStory=${priorEncounterStoryId??"none"} utteranceChars=${utterance.length}`);
  if(!response.ok){
    const failure=await response.json().catch(()=>null);
    throw new Error(`World live encounter failed HTTP ${response.status}: ${failure?.error??"unknown"}`);
  }
  let spoken=false;
  let speaking=false;
  let interruptRequested=false;
  const interrupt=()=>{
    if(interruptRequested)return;
    interruptRequested=true;
    output.write("\n[Interrupting this speech in World…]\n");
    void privatePost(ctx.worldBaseUrl,"/internal/public-visitor-encounter/interrupt",ctx.privateToken,
      {threadId,requestId},"World encounter interruption",trace)
      .then((reply)=>{
        if(reply.interrupted!==true)trace.log(1,"World speech already ended");
      })
      .catch((error)=>output.write(`[Interrupt failed: ${error.message}]\n`));
  };
  terminal.on("SIGINT",interrupt);
  process.on("SIGINT",interrupt);
  try{
    const result=await readLiveEncounterEvents(response.body,(kind,event)=>{
      if(kind==="speech_delta"&&event.actorId===threadId){
        if(!speaking){
          output.write(`${threadName}> `);
          speaking=true;
        }
        output.write(event.text);
        spoken=true;
      }else if(kind==="speech_end"&&event.actorId===threadId){
        if(speaking)output.write("\n");
        speaking=false;
        if(event.completion==="interrupted")output.write("  speech interrupted\n");
      }else if(kind==="scene_changed"){
        output.write(`\n[World scene changed · ${event.currentSituationId}]\n`);
      }
    });
    if(speaking)output.write("\n");
    trace.log(1,`Encounter ${result.outcome}`);
    return {result,spoken};
  }finally{
    terminal.off("SIGINT",interrupt);
    process.off("SIGINT",interrupt);
  }
}

export function advanceThreadMeetState(state,result){
  if(result.outcome==="accepted"){
    return Object.freeze({
      situationId:result.situationId,
      priorEncounterStoryId:result.encounterStoryId,
      terminal:typeof result.currentSituationId==="string",
    });
  }
  if(["decline","defer","scene_changed","interrupted"].includes(result.outcome)){
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
  const {targetEnvironment,threadId:requestedThreadId,verbosity,live}=parseThreadMeetArgs(argv);
  const trace=createTrace(output,verbosity);
  const ctx=context(environment,targetEnvironment);
  const selected=requestedThreadId===null
    ?await randomThread(ctx,trace)
    :await threadEntry(ctx,requestedThreadId,trace);
  const threadId=requestedThreadId??selected.threadId;
  const threadName=selected?.displayName??threadId;

  output.write(`${requestedThreadId===null?"Selected":"Meeting"} ${threadName} · ${threadId}\n`);

  const present=await ensureWorldPresent(ctx,threadId,trace);
  const scene=printWorldPresent(output,present);
  let state=Object.freeze({
    situationId:scene.situationId,
    priorEncounterStoryId:null,
    terminal:false,
  });

  output.write(
    "\nMeet this Thread in the life already underway.\n"
    +"Commands: /present refreshes actual life · /leave exits"
    +(live?" · Ctrl-C interrupts active Thread speech":"")+"\n",
  );

  const terminal=createInterface({input,output,terminal:Boolean(output.isTTY)});
  try{
    while(!state.terminal){
      const utterance=(await terminal.question("\nYou> ")).trim();
      if(utterance==="")continue;
      if(utterance==="/leave")break;
      if(utterance==="/present"){
        const refreshed=await ensureWorldPresent(ctx,threadId,trace);
        const refreshedScene=printWorldPresent(output,refreshed);
        state=Object.freeze({
          situationId:refreshedScene.situationId,
          priorEncounterStoryId:null,
          terminal:false,
        });
        continue;
      }

      const request={
        threadId,
        situationId:state.situationId,
        utterance,
        priorEncounterStoryId:state.priorEncounterStoryId,
      };
      const delivered=live
        ?await worldLiveEncounter(ctx,request,trace,{output,threadName,terminal})
        :null;
      const result=delivered?.result??await worldEncounter(ctx,request,trace);

      if(result.outcome==="accepted"){
        if(!delivered?.spoken)output.write(`${threadName}> ${result.responseText}\n`);
        output.write(`  accepted${result.completion==="interrupted"?" (speech interrupted)":""} · situation ${result.situationId} · story ${result.encounterStoryId}\n`);
        if(result.currentSituationId)output.write(`  World moved · ${result.currentSituationId}\n`);
      }else if(result.outcome==="decline"){
        output.write(`${threadName}> ${result.expression??"Not right now."}\n  declined\n`);
      }else if(result.outcome==="defer"){
        output.write(`${threadName}> ${result.expression??"Later."}\n  deferred${result.suggestedAt?` · ${result.suggestedAt}`:""}\n`);
      }else if(result.outcome==="interrupted"){
        output.write("  encounter interrupted before outward speech\n");
      }else if(result.outcome==="scene_changed"){
        output.write("\nThe Thread's life moved before your utterance entered it.\n");
        printWorldPresent(output,await ensureWorldPresent(ctx,threadId,trace));
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
