const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;

function id(name, value) {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) throw new TypeError(`${name} is invalid`);
  return value;
}

function allowedOrigin(request, viewerOrigin) {
  const origin = request.headers.get("Origin");
  if (origin === null) return null;
  return viewerOrigin && origin === viewerOrigin ? origin : false;
}

function cors(request, viewerOrigin) {
  const origin = allowedOrigin(request, viewerOrigin);
  if (!origin) return {};
  return {
    "Access-Control-Allow-Origin":origin,
    "Access-Control-Allow-Methods":"GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":"Content-Type",
    "Vary":"Origin",
  };
}

function json(value, request, viewerOrigin, status = 200) {
  return Response.json(value, {
    status,
    headers:{ ...cors(request, viewerOrigin), "Cache-Control":"no-store" },
  });
}

function safeDetail(error) {
  const value=error?.body?.detail ?? error?.message;
  return typeof value==="string"&&value.trim()!==""?value.trim():null;
}

export function createPublicCurrentLifeApi({
  isPublicThread,
  ensureCurrentPresent,
  submitEncounter,
  viewerOrigin = null,
} = {}) {
  if (typeof isPublicThread !== "function") throw new TypeError("public current-life API requires isPublicThread");
  if (typeof ensureCurrentPresent !== "function") throw new TypeError("public current-life API requires ensureCurrentPresent");
  if (typeof submitEncounter !== "function") throw new TypeError("public current-life API requires submitEncounter");

  return Object.freeze({
    async fetch(request) {
      const url=new URL(request.url);
      const presentMatch=/^\/api\/threads\/([^/]+)\/present$/.exec(url.pathname);
      const encounterMatch=/^\/api\/threads\/([^/]+)\/encounter$/.exec(url.pathname);
      if(presentMatch===null&&encounterMatch===null)return null;
      const encounter=encounterMatch!==null;
      const match=encounterMatch??presentMatch;

      if(request.headers.get("Origin")!==null&&allowedOrigin(request,viewerOrigin)===false){
        return json({ error:"origin_not_allowed" },request,viewerOrigin,403);
      }
      if(request.method==="OPTIONS")return new Response(null,{ status:204,headers:cors(request,viewerOrigin) });
      if(request.method!==(encounter?"POST":"GET")){
        return json({ error:"method_not_allowed" },request,viewerOrigin,405);
      }
      if(url.search!==""){
        return json({
          error:encounter?"invalid_public_encounter":"invalid_public_visit",
          detail:encounter
            ?"public encounter does not accept caller-authored time or scene parameters"
            :"public visit does not accept caller-authored time or scene parameters",
        },request,viewerOrigin,400);
      }

      let threadId;
      try{
        threadId=id("threadId",decodeURIComponent(match[1]));
      }catch(error){
        return json({
          error:encounter?"invalid_public_encounter":"invalid_public_visit",
          detail:error.message,
        },request,viewerOrigin,400);
      }

      let visible;
      try{
        visible=await isPublicThread(threadId,request);
      }catch(error){
        return json({
          error:"public_thread_unavailable",
          ...(safeDetail(error)===null?{}:{ detail:safeDetail(error) }),
        },request,viewerOrigin,503);
      }
      if(visible!==true)return json({ error:"not_found" },request,viewerOrigin,404);

      if(encounter){
        let body;
        try{
          body=await request.json();
          if(!body||typeof body!=="object"||Array.isArray(body))throw new TypeError("encounter body must be an object");
          const keys=Object.keys(body).sort();
          if(keys.length!==2||keys[0]!=="situationId"||keys[1]!=="utterance"){
            throw new TypeError("encounter body must contain only situationId and utterance");
          }
          id("situationId",body.situationId);
          if(typeof body.utterance!=="string"||body.utterance.trim()===""){
            throw new TypeError("utterance is required");
          }
          body={ situationId:body.situationId,utterance:body.utterance.trim() };
        }catch(error){
          return json({ error:"invalid_public_encounter",detail:error.message },request,viewerOrigin,400);
        }

        let result;
        try{
          result=await submitEncounter(threadId,body,request);
        }catch(error){
          const detail=safeDetail(error);
          if(error?.status===409&&error?.body?.error==="encounter_scene_changed"){
            return json({
              error:"encounter_scene_changed",
              ...(typeof error.body.currentSituationId==="string"
                ?{ currentSituationId:error.body.currentSituationId }
                :{}),
            },request,viewerOrigin,409);
          }
          return json({
            error:"public_encounter_unavailable",
            ...(detail===null?{}:{ detail }),
          },request,viewerOrigin,503);
        }

        if(result?.outcome==="accepted"
          && typeof result.situationId==="string"
          && typeof result.responseText==="string"
          && typeof result.encounterStoryId==="string"){
          return json({
            outcome:"accepted",
            situationId:result.situationId,
            responseText:result.responseText,
            encounterStoryId:result.encounterStoryId,
          },request,viewerOrigin);
        }
        if((result?.outcome==="decline"||result?.outcome==="defer")
          && typeof result.situationId==="string"){
          return json({
            outcome:result.outcome==="decline"?"declined":"deferred",
            situationId:result.situationId,
            expression:typeof result.expression==="string"?result.expression:null,
            ...(result.outcome==="defer"&&typeof result.suggestedAt==="string"
              ?{ suggestedAt:result.suggestedAt }
              :{}),
          },request,viewerOrigin);
        }
        return json({ error:"public_encounter_unavailable" },request,viewerOrigin,503);
      }

      let admitted;
      try{
        admitted=await ensureCurrentPresent(threadId,request);
      }catch(error){
        const detail=safeDetail(error);
        if(error?.status===409){
          return json({
            error:"lived_now_unavailable",
            ...(detail===null?{}:{ detail }),
          },request,viewerOrigin,409);
        }
        return json({
          error:"lived_now_unavailable",
          ...(detail===null?{}:{ detail }),
        },request,viewerOrigin,503);
      }

      const present=admitted?.present??admitted;
      if(!present||typeof present!=="object"||Array.isArray(present)||typeof present.situationId!=="string"){
        return json({ error:"public_present_unavailable" },request,viewerOrigin,503);
      }

      return json({ currentPresent:{ payload:present } },request,viewerOrigin);
    },
  });
}
