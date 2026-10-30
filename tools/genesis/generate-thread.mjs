import { setTimeout as delay } from "node:timers/promises";
import { shortSha } from "../shared/repo-root.mjs";
import {
  parseGenesisArgs,normalizeGenesisWorldSelector,
} from "#services/birth-center/src/genesis-world-selection.mjs";
import { birthEnvironment,birthDeployment,birthRequest } from "./birth-remote.mjs";

function usage(){
  return [
    "Genesis remote birth — Birth Center owns authoring, admission and first life",
    "",
    "  npm run genesis:birth -- --env staging --sex=female --place=Israel/Jerusalem --heritage=\"Yemeni Jewish\"",
    "  npm run genesis:birth -- --env staging --resume genesis-birth-...",
    "  npm run genesis:birth -- --env staging --follow genesis-birth-...",
    "  npm run genesis:birth -- --env staging --abandon genesis-birth-... --reason \"Operator cancellation\"",
    "",
    "Options: --sex=female|male, --place=Country/City, --heritage=..., --new-world,",
    "         --resume REQUEST_ID, --follow REQUEST_ID, --abandon REQUEST_ID --reason TEXT, --env ENV.",
    "A new birth without an explicit place samples a globally distributed birthplace.",
    "A new-model place is authored once by the Birth Center and reused by decade.",
    "Birth Center requires GEONAMES_USERNAME; this CLI needs only FIBRE_PRIVATE_TOKEN.",
  ].join("\n");
}
function parse(argv){
  const remote=birthEnvironment(argv);
  let resume=null,follow=null,abandon=null,reason=null;
  const remaining=[];
  for(let i=0;i<remote.args.length;i++){
    const arg=remote.args[i];
    if(arg==="--follow")follow=remote.args[++i]??null;
    else if(arg.startsWith("--follow="))follow=arg.slice(9);
    else if(arg==="--resume")resume=remote.args[++i]??null;
    else if(arg.startsWith("--resume="))resume=arg.slice(9);
    else if(arg==="--abandon")abandon=remote.args[++i]??null;
    else if(arg.startsWith("--abandon="))abandon=arg.slice(10);
    else if(arg==="--reason")reason=remote.args[++i]??null;
    else if(arg.startsWith("--reason="))reason=arg.slice(9);
    else remaining.push(arg);
  }
  if([resume,follow,abandon].filter(x=>x!==null).length>1)
    throw new TypeError("Choose only one of --resume, --follow, --abandon");
  if((resume!==null&&!resume)||(follow!==null&&!follow)||(abandon!==null&&!abandon))
    throw new TypeError("Birth requestId is required");
  if(abandon!==null&&(!reason||!reason.trim()))
    throw new TypeError("--abandon requires --reason");
  if(abandon===null&&reason!==null)throw new TypeError("--reason requires --abandon");
  const options=parseGenesisArgs(remaining);
  if((resume!==null||follow!==null||abandon!==null)&&
    (options.sex!==null||options.world!==null||options.heritage!==null||options.forceNewWorld))
    throw new TypeError("Resume/abandon cannot change birth inputs");
  return {environment:remote.environment,options,resume,follow,abandon,reason};
}
function heartbeat(current,startedAt,stageSince,deployed,requestId){
  const age=Math.floor((Date.now()-startedAt)/1000);
  const elapsed=Math.floor((Date.now()-stageSince)/1000);
  const text="BIRTH "+current+" · "+elapsed+"s in stage, "+age+"s total · "+
    requestId+" · deployed "+shortSha(deployed);
  if(process.stderr.isTTY){
    const width=Number.isSafeInteger(process.stderr.columns)?Math.max(10,process.stderr.columns-2):null;
    const chars=[...text];
    const line=width!==null&&chars.length>width?chars.slice(0,width-1).join("")+"…":text;
    process.stderr.write("\r\u001b[2K"+line);
  }
}
function clearLine(){
  if(process.stderr.isTTY)process.stderr.write("\r\u001b[2K");
}
export async function runGenesisBirth(argv=process.argv.slice(2),{
  readRemote=birthRequest, now=Date.now, sleep=delay,
}={}){
  const parsed=parse(argv);
  if(parsed.options.help){
    process.stdout.write(usage()+"\n");
    return;
  }
  const remote=birthDeployment(parsed.environment);
  const startedAt=now();
  let requestId=parsed.follow??parsed.resume??parsed.abandon;
  const mode=parsed.follow!==null?"follow":parsed.resume===null?"new":"resume";
  let outcomeObserved=false;
  if(parsed.abandon!==null){
    const result=await readRemote(remote,"/births/"+encodeURIComponent(requestId)+"/abandon",{
      method:"POST",body:{reason:parsed.reason},
    });
    process.stdout.write(JSON.stringify({
      event:"thread-birth-abandoned",requestId,birth:result.birth,
    })+"\n");
    return;
  }
  try{
  if(parsed.resume!==null){
    await readRemote(remote,"/births/"+encodeURIComponent(requestId)+"/resume",{method:"POST"});
  }else if(parsed.follow===null){
    requestId="genesis-birth-"+now().toString(36);
    const options=parsed.options;
    await readRemote(remote,"/births",{method:"POST",body:{
      requestId,requestedAt:new Date(now()).toISOString(),
      place:options.world?.display??null,sex:options.sex,
      heritage:options.heritage?.display??null,
      forceNewWorld:options.forceNewWorld,
    }});
  }
  }catch(error){
    if(requestId)process.stderr.write("FOLLOW npm run genesis:birth -- --env "+
      parsed.environment+" --follow "+requestId+"\n");
    throw error;
  }
  let currentStage=null,stageSince=now();
  const tick=setInterval(()=>{
    if(currentStage!==null)heartbeat(currentStage,startedAt,stageSince,remote.sourceGitSha,requestId);
  },10_000);
  tick.unref?.();
  try{
    let failedPolls=0;
    for(;;){
      let data;
      try{
        data=await readRemote(remote,"/births/"+encodeURIComponent(requestId));
        failedPolls=0;
      }catch(error){
        failedPolls++;
        if(failedPolls>5)throw error;
        process.stderr.write("BIRTH status poll failed "+failedPolls+"/5 requestId="+requestId+
          ": "+String(error?.message??error)+"\n");
        await sleep(Math.min(60_000,5_000*2**(failedPolls-1)));
        continue;
      }
      const birth=data.birth;
      if(birth.stage!==currentStage){
        clearLine();
        currentStage=birth.stage;
        stageSince=now();
        process.stderr.write("BIRTH "+currentStage+" requestId="+requestId+
          " deployed="+shortSha(remote.sourceGitSha)+
          (birth.threadId?" threadId="+birth.threadId:"")+"\n");
      }
      if(birth.stage==="complete"&&birth.result?.event==="thread-birth-complete"){
        clearLine();
        process.stdout.write(JSON.stringify({...birth.result,requestMode:mode})+"\n");
        outcomeObserved=true;
        return;
      }
      if(birth.stage==="unpresented"){
        clearLine();
        process.stdout.write(JSON.stringify(birth.result??{
          event:"thread-birth-unpresented",requestId,threadId:birth.threadId,
        })+"\n");
        outcomeObserved=true;
        return;
      }
      if(birth.stage==="unlocated"){
        clearLine();
        process.stdout.write(JSON.stringify(birth.result??{
          event:"thread-birth-unlocated",requestId,threadId:birth.threadId,
        })+"\n");
        outcomeObserved=true;
        const error=new Error("Newborn has no located current life");
        error.code="THREAD_BIRTH_UNLOCATED";
        throw error;
      }
      if(birth.status==="failed"&&birth.failureRetryable===true&&birth.nextAttemptAt==null){
        process.stderr.write("RESUME npm run genesis:birth -- --env "+
          parsed.environment+" --resume "+requestId+"\n");
        const error=new Error(birth.error??"Birth paused for operator Resume");
        error.code="THREAD_BIRTH_PAUSED";
        error.retryable=true;
        throw error;
      }
      if(["cancelled","stillborn"].includes(birth.stage) ||
        (birth.status==="failed"&&birth.failureRetryable===false)){
        const error=new Error(birth.error??"Birth ended without admission");
        error.code=birth.stage==="stillborn"?"THREAD_BIRTH_STILLBORN":"THREAD_BIRTH_TERMINAL";
        error.retryable=false;
        throw error;
      }
      const next=Number(birth.nextAttemptAt);
      const sleepMs=Number.isFinite(next)&&next>now()
        ?Math.min(60_000,Math.max(5_000,next-now())):5_000;
      await sleep(sleepMs);
    }
  }finally{
    clearInterval(tick);
    clearLine();
    if(!outcomeObserved&&requestId){
      process.stderr.write("FOLLOW npm run genesis:birth -- --env "+
        parsed.environment+" --follow "+requestId+"\n");
    }
  }
}
runGenesisBirth().catch(error=>{
  process.stderr.write(JSON.stringify({
    event:error?.code==="THREAD_BIRTH_PAUSED"?"thread-birth-paused":"thread-birth-failed",
    errorName:error?.constructor?.name??"Error",
    errorCode:error?.code??null,
    retryable:error?.retryable??null,
    message:error?.message??String(error),
  })+"\n");
  process.exitCode=1;
});
