import {
  assertExactKeys,assertId,assertPlainObject,
} from "./persistence-common.mjs";

export function createWorldVenueWriteApi({livedNowStore,privateToken}={}){
  if(typeof livedNowStore?.bindPhysicalVenue!=="function"){
    throw new TypeError("World venue admission requires the lived World authority");
  }
  if(typeof privateToken!=="string"||!privateToken){
    throw new TypeError("World venue admission requires private token");
  }
  return Object.freeze({
    async fetch(request){
      if(new URL(request.url).pathname!=="/internal/world-venues/bind")return null;
      if(request.method!=="POST")return Response.json({error:"method_not_allowed"},{status:405});
      if(request.headers.get("x-fibre-private-token")!==privateToken){
        return Response.json({error:"private_token_required"},{status:403});
      }
      try{
        const body=await request.json();
        assertPlainObject("World venue binding",body);
        assertExactKeys("World venue binding",body,[
          "threadId","contextPlaceRef","venueIdentity","displayName",
          "locality","country","evidenceRef",
        ]);
        assertId("World venue threadId",body.threadId);
        assertId("World venue context",body.contextPlaceRef);
        const venue=livedNowStore.bindPhysicalVenue(body);
        return Response.json({ok:true,venue});
      }catch(error){
        return Response.json({error:"invalid_world_venue",
          detail:String(error?.message??error).slice(0,250)},{status:400});
      }
    },
  });
}
