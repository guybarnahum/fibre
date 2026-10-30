const ITEM=/^\/births\/([A-Za-z0-9][A-Za-z0-9._:-]{0,127})(?:\/(resume|abandon|place))?$/u;

function json(status,payload){
  return Response.json(payload,{status,headers:{"cache-control":"no-store"}});
}
function cursor(value){
  if(value===null)return null;
  const split=value.indexOf("|");
  if(split<1)throw new TypeError("Invalid birth list cursor");
  const createdAt=value.slice(0,split),requestId=value.slice(split+1);
  if(!Number.isFinite(Date.parse(createdAt))||!requestId)throw new TypeError("Invalid birth list cursor");
  return {createdAt,requestId};
}
export function createBirthLifecycleApi({lifecycle,privateToken}={}){
  if(!lifecycle||typeof lifecycle.enqueue!=="function")
    throw new TypeError("Birth lifecycle API requires a lifecycle service");
  if(typeof privateToken!=="string"||!privateToken.trim())
    throw new TypeError("Birth lifecycle API requires private token");
  return Object.freeze({
    async fetch(request){
      const url=new URL(request.url);
      const match=ITEM.exec(url.pathname);
      if(url.pathname!=="/births"&&!match)return null;
      if(request.headers.get("x-fibre-private-token")!==privateToken)
        return json(403,{error:"private_token_required"});
      try{
        if(url.pathname==="/births"){
          if(request.method==="GET"){
            if([...url.searchParams.keys()].some(key=>!["limit","after"].includes(key)))
              return json(400,{error:"invalid_birth_list_query"});
            const limit=url.searchParams.has("limit")?Number(url.searchParams.get("limit")):32;
            if(!Number.isSafeInteger(limit)||limit<1||limit>40)
              return json(400,{error:"invalid_birth_list_limit"});
            const result=lifecycle.list({limit,after:cursor(url.searchParams.get("after"))});
            return json(200,{ok:true,...result,
              nextCursor:result.nextCursor===null?null:
                result.nextCursor.createdAt+"|"+result.nextCursor.requestId});
          }
          if(request.method!=="POST")return json(405,{error:"method_not_allowed"});
          if(url.search)return json(400,{error:"query_not_supported"});
          const body=await request.json();
          const allowed=new Set(["requestId","requestedAt","place","sex","heritage","forceNewWorld"]);
          if(!body||typeof body!=="object"||Array.isArray(body) ||
            Object.keys(body).some(key=>!allowed.has(key)))
            throw new TypeError("Birth request fields are invalid");
          const birth=await (lifecycle.enqueueValidated??lifecycle.enqueue)({
            ...body,forceNewWorld:body.forceNewWorld??false,
          });
          return json(202,{ok:true,birth});
        }
        if(url.search)return json(400,{error:"query_not_supported"});
        const [,id,action]=match;
        if(action===undefined){
          if(request.method!=="GET")return json(405,{error:"method_not_allowed"});
          const birth=lifecycle.get(id);
          return birth?json(200,{ok:true,birth}):json(404,{error:"birth_not_found"});
        }
        if(action==="place"){
          if(request.method!=="GET")return json(405,{error:"method_not_allowed"});
          if(!lifecycle.get(id))return json(404,{error:"birth_not_found"});
          const place=lifecycle.place(id);
          return place?json(200,{ok:true,place}):json(404,{error:"birth_place_not_found"});
        }
        if(request.method!=="POST")return json(405,{error:"method_not_allowed"});
        if(!lifecycle.get(id))return json(404,{error:"birth_not_found"});
        if(action==="resume")return json(200,{ok:true,birth:lifecycle.resume(id)});
        const body=await request.json();
        if(!body||typeof body!=="object"||Array.isArray(body) ||
          Object.keys(body).some(key=>key!=="reason") ||
          typeof body.reason!=="string"||!body.reason.trim())
          throw new TypeError("Abandon requires a reason");
        const birth=await lifecycle.abandon(id,body.reason);
        return json(200,{ok:true,birth});
      }catch(error){
        const status=["BIRTH_INPUT_CONFLICT","BIRTH_IN_FLIGHT"].includes(error?.code)?409
          :error?.retryable===false||error instanceof TypeError?400:500;
        return json(status,{error:status===409?(error.code==="BIRTH_IN_FLIGHT"?"birth_in_flight":"birth_input_conflict"):
          status===400?"invalid_birth_request":"birth_lifecycle_failed",
          detail:String(error?.message??error)});
      }
    },
  });
}
