import { assertId } from "./persistence-common.mjs";

const LIVES_ROUTE="/internal/thread-life";
const REST_ROUTE="/internal/thread-life/rest";
const WAKE_ROUTE="/internal/thread-life/wake";
const TOKEN_ENCODER=new TextEncoder();

function constantTimeEqual(left,right){
  if(typeof left!=="string"||typeof right!=="string")return false;
  const a=TOKEN_ENCODER.encode(left),b=TOKEN_ENCODER.encode(right);
  let difference=a.length^b.length;
  for(let index=0;index<Math.max(a.length,b.length);index+=1){
    difference|=(a[index]??0)^(b[index]??0);
  }
  return difference===0;
}

function json(value,status=200){
  return Response.json(value,{status,headers:{"cache-control":"no-store"}});
}

function command(body,known){
  if(!body||typeof body!=="object"||Array.isArray(body)
    ||Object.keys(body).some(key=>!["threadIds","reason","actor"].includes(key))
    ||!Array.isArray(body.threadIds)||body.threadIds.length<1||body.threadIds.length>256
    ||new Set(body.threadIds).size!==body.threadIds.length){
    throw new TypeError("expected 1-256 distinct threadIds, reason and actor");
  }
  for(const threadId of body.threadIds){
    assertId("life rest Thread",threadId);
    if(!known.has(threadId))throw new TypeError(`Thread ${threadId} is not a living World Thread`);
  }
  return body;
}

// Operator surface for resting and waking autonomous lives. It records World
// lifecycle facts only; it never invokes cognition or LivedNow itself.
export function createThreadLifeRestWriteApi({
  restStore,privateToken,onWake=null,now=()=>new Date().toISOString(),
}={}){
  for(const method of ["rest","wake","listLives"]){
    if(typeof restStore?.[method]!=="function")throw new TypeError(`life rest API requires ${method}()`);
  }
  if(typeof privateToken!=="string"||!privateToken.trim())throw new TypeError("life rest API requires privateToken");
  if(onWake!==null&&typeof onWake!=="function")throw new TypeError("life rest API onWake must be a function");

  return Object.freeze({
    async fetch(request){
      const {pathname}=new URL(request.url);
      if(![LIVES_ROUTE,REST_ROUTE,WAKE_ROUTE].includes(pathname))return null;
      if(!constantTimeEqual(request.headers.get("x-fibre-private-token"),privateToken)){
        return json({error:"private_token_required"},403);
      }
      if(pathname===LIVES_ROUTE){
        if(request.method!=="GET")return json({error:"method_not_allowed"},405);
        return json({contract:"fibre-thread-life-v1",threads:restStore.listLives()});
      }
      if(request.method!=="POST")return json({error:"method_not_allowed"},405);
      let input;
      try{
        input=command(await request.json().catch(()=>null),
          new Set(restStore.listLives().map(life=>life.threadId)));
      }catch(error){
        return json({error:"invalid_thread_life_command",detail:error.message},400);
      }
      const kind=pathname===REST_ROUTE?"rest":"wake";
      const at=now();
      try{
        const results=input.threadIds.map(threadId=>restStore[kind]({
          threadId,reason:input.reason,actor:input.actor,at,
        }));
        // Woken lives resume through their own overdue boundaries.
        const wake=kind==="wake"&&results.some(item=>item.changed)&&onWake!==null
          ?await onWake():null;
        return json({ok:true,action:kind,at,results,wake});
      }catch(error){
        if(error instanceof TypeError){
          return json({error:"invalid_thread_life_command",detail:error.message},400);
        }
        throw error;
      }
    },
  });
}
