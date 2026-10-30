import {randomUUID} from "node:crypto";
import {setTimeout as delay} from "node:timers/promises";

// A wave is only a client of the existing Birth Center lifecycle.
// POST at the door, then one cursor-paged list GET per monitoring interval.
export async function runGenesisBirthWave({
  remote,environment,options,count,readRemote,
  now=Date.now,sleep=delay,idFactory=randomUUID,
  stdout=process.stdout,stderr=process.stderr,
}){
  const births=new Map();
  const follow=id=>"npm run genesis:birth -- --env "+environment+" --follow "+id;
  const resume=id=>"npm run genesis:birth -- --env "+environment+" --resume "+id;
  try{
    for(let index=0;index<count;index++){
      const requestId="genesis-birth-"+now().toString(36)+"-"+idFactory().replace(/-/gu,"").slice(0,12);
      const requestedAt=new Date(now()).toISOString();
      const result=await readRemote(remote,"/births",{method:"POST",body:{
        requestId,requestedAt,place:options.world?.display??null,
        sex:options.sex,heritage:options.heritage?.display??null,
        forceNewWorld:options.forceNewWorld,
      }});
      if(result.birth?.requestId!==requestId)
        throw new Error("Birth Center did not acknowledge wave request "+requestId);
      births.set(requestId,{stage:"queued",done:false,observed:false});
    }
    let cursor=null,failedPolls=0,lastLine="";
    while([...births.values()].some(item=>!item.done)){
      let page;
      try{
        page=await readRemote(remote,"/births?limit=40"+
          (cursor?"&after="+encodeURIComponent(cursor):""));
        if(!Array.isArray(page.births))throw new Error("Birth page is missing births");
        failedPolls=0;
      }catch(error){
        if(++failedPolls>5)throw error;
        stderr.write("BIRTH wave status page failed "+failedPolls+"/5: "+
          String(error?.message??error)+"\n");
        await sleep(Math.min(60_000,5_000*2**(failedPolls-1)));
        continue;
      }
      for(const birth of page.births){
        const state=births.get(birth.requestId);
        if(!state||state.done)continue;
        state.stage=birth.stage;
        state.observed=true;
        const outcome=["complete","unpresented","unlocated"].includes(birth.stage);
        if(outcome){
          state.done=true;
          stdout.write(JSON.stringify({...birth.result,requestMode:"new"})+"\n");
        }else if(birth.status==="failed"&&(
          birth.failureRetryable===false||birth.nextAttemptAt==null||
          Number(birth.nextAttemptAt)-now()>5*60_000)){
          state.done=true;
          if(birth.failureRetryable)stderr.write("RESUME "+resume(birth.requestId)+"\n");
          else stderr.write("BIRTH terminal "+birth.requestId+" "+(birth.error??"") +"\n");
        }
      }
      const states=[...births.values()];
      const complete=states.filter(s=>s.done&&
        ["complete","unpresented","unlocated"].includes(s.stage)).length;
      const failures=states.filter(s=>s.done&&
        !["complete","unpresented","unlocated"].includes(s.stage)).length;
      const developing=states.filter(s=>!s.done&&
        ["developing","genome_selected"].includes(s.stage)).length;
      const publishing=states.filter(s=>!s.done&&
        ["publishing","admitted","presented","located"].includes(s.stage)).length;
      const queued=count-complete-failures-developing-publishing;
      const line=complete+"/"+count+" complete · "+developing+" developing"+
        (publishing?" · "+publishing+" publishing":"")+
        " · "+queued+" queued"+(failures?" · "+failures+" failed":"");
      if(line!==lastLine){
        stderr.write((stderr.isTTY?"\r\u001b[2K":"")+"BIRTH "+line+(stderr.isTTY?"":"\n"));
        lastLine=line;
      }
      if(states.every(s=>s.done))break;
      // One page per interval, even if the wave has shifted beyond page 1.
      // Cycle the cursor to discover displaced births without per-birth reads.
      cursor=states.every(s=>s.observed)?null:page.nextCursor??null;
      await sleep(5_000);
    }
    if(stderr.isTTY)stderr.write("\n");
    return {complete:[...births.values()].filter(s=>s.done&&
      ["complete","unpresented","unlocated"].includes(s.stage)).length,count};
  }finally{
    for(const [id,state] of births)if(!state.done)stderr.write("FOLLOW "+follow(id)+"\n");
  }
}
