import {
  assertExactKeys,assertId,assertPlainObject,
} from "./persistence-common.mjs";
import {createGuySocialDiscovery} from "./guy-social-discovery.mjs";

// Admission establishes World facts, not visits, consent, meetings or plans.
const ROUTES=Object.freeze({
  "/internal/world-venues/bind":"legacy_context_binding",
  "/internal/world-venues/admit-public":"public",
  "/internal/world-venues/locate-private":"private",
  "/internal/world-venues/places":"list_public",
  "/internal/guy/ask":"guy",
});
const PUBLIC_FIELDS=[
  "venueIdentity","displayName","streetAddress","locality","country",
  "countryCode","lat","long","timeZone","evidenceRef","affordances",
];
const PRIVATE_FIELDS=[
  "threadId","placeRef","specificPlace","streetAddress","locality",
  "country","countryCode","lat","long","timeZone","evidenceRef",
  "publicGranularity",
];

export function createWorldVenueWriteApi({livedNowStore,privateToken}={}){
  for(const method of [
    "bindPhysicalVenue","admitPublicPlace","admitPrivatePlace",
    "listPublicPlacesByLocality",
  ]){
    if(typeof livedNowStore?.[method]!=="function"){
      throw new TypeError(`World geography requires ${method}()`);
    }
  }
  if(typeof privateToken!=="string"||!privateToken){
    throw new TypeError("World venue admission requires private token");
  }
  const guy=createGuySocialDiscovery({
    listPublicPlaces:query=>livedNowStore.listPublicPlacesByLocality(query),
  });
  return Object.freeze({
    async fetch(request){
      const route=ROUTES[new URL(request.url).pathname];
      if(route===undefined)return null;
      if((route==="list_public"&&request.method!=="GET")
        ||(route!=="list_public"&&request.method!=="POST")){
        return Response.json({error:"method_not_allowed"},{status:405});
      }
      if(request.headers.get("x-fibre-private-token")!==privateToken){
        return Response.json({error:"private_token_required"},{status:403});
      }
      try{
        if(route==="list_public"){
          const url=new URL(request.url);
          const places=livedNowStore.listPublicPlacesByLocality({
            locality:url.searchParams.get("locality"),
            countryCode:url.searchParams.get("countryCode"),
            limit:12,
          });
          return Response.json({ok:true,places});
        }
        const body=await request.json();
        if(route==="guy"){
          assertPlainObject("Guy question",body);
          assertExactKeys("Guy question",body,["question","asker","location"]);
          return Response.json({ok:true,result:guy.ask(body)});
        }
        assertPlainObject("World place admission",body);
        if(route==="public"){
          assertExactKeys("public World venue",body,PUBLIC_FIELDS);
          const place=livedNowStore.admitPublicPlace(body);
          return Response.json({ok:true,place});
        }
        if(route==="private"){
          assertExactKeys("private World place",body,PRIVATE_FIELDS);
          assertId("private World place threadId",body.threadId);
          assertId("private World place placeRef",body.placeRef);
          const place=livedNowStore.admitPrivatePlace(body);
          return Response.json({ok:true,place});
        }
        assertExactKeys("World venue binding",body,[
          "threadId","contextPlaceRef","venueIdentity","displayName",
          "locality","country","evidenceRef",
        ]);
        assertId("World venue threadId",body.threadId);
        assertId("World venue context",body.contextPlaceRef);
        const venue=livedNowStore.bindPhysicalVenue(body);
        return Response.json({ok:true,venue});
      }catch(error){
        return Response.json({
          error:route==="guy"?"invalid_guy_question":"invalid_world_place",
          detail:String(error?.message??error).slice(0,250),
        },{status:400});
      }
    },
  });
}
