import assert from "node:assert/strict";
import test from "node:test";

import { planThreadLocation } from "./thread-locations.mjs";

const thread={
  threadId:"thr_person",displayName:"Someone",
  birthLocation:{city:"Lisbon",country:"Portugal",countryCode:"PT"},
  currentLocation:null,
};
const situation={
  situationId:"sit_present",
  phase:"at_place",location:{kind:"place",placeRef:"per:plce_home:1"},
};
function life(place){
  return {
    currentSituation:situation,worldContext:{timeZone:"Europe/Lisbon"},
    placeEpisodes:[{
      episodeId:"plce_home",revision:1,threadId:thread.threadId,
      episodeKind:"formative_presence",
      place:{placeId:"plc_home",displayName:"Quiet apartment",countryCode:null,
        locality:null,region:null,precision:"unspecified",...place},
      startAt:"2026-10-16T00:00:00.000Z",endAt:null,
      sourceReferences:["evt_home"],visibility:"private",status:"current",
      provenance:"genesis_created",recordedAt:"2026-10-16T00:00:00.000Z",
    }],
  };
}

test("repair locates the enacted place without inventing a home, journey or new life",()=>{
  const decision=planThreadLocation(thread,life({}));
  assert.equal(decision.state,"ready");
  assert.equal(decision.basis,"birth_city_operator_default");
  assert.equal(decision.place.placeRef,situation.location.placeRef);
  assert.equal(decision.place.locality,"Lisbon");
  assert.equal(decision.place.streetAddress,null);
  assert.equal(decision.place.lat,null);
  assert.equal(decision.place.long,null);
  assert.equal(decision.place.evidenceRef,"operator_birth_city_default:"+thread.threadId,
    "birth city placement lost its operator-default provenance");
});

test("missing First Life cannot be replaced by fictional birthplace presence",()=>{
  assert.equal(planThreadLocation(thread,{currentSituation:null}).state,"awaiting_first_life");
  assert.equal(planThreadLocation(thread,life({locality:"Chengdu",countryCode:"CN"})).state,
    "review_time_zone","different-country life must not inherit Lisbon's time zone");
  assert.equal(planThreadLocation(thread,{
    ...life({}),privatelyKnownCurrentPlace:{locality:"Tbilisi"},
  }).state,"already_located","prior World location must be preserved");
});

test("current situated geography outranks birthplace without changing its history",()=>{
  const result=planThreadLocation(thread,life({
    locality:"Braga",countryCode:"PT",displayName:"Reading room",
  }));
  assert.equal(result.state,"ready");
  assert.equal(result.basis,"situated_place_evidence");
  assert.equal(result.place.locality,"Braga");
  assert.equal(result.place.countryCode,"PT");
  assert.equal(result.place.evidenceRef,situation.location.placeRef);
});

test("legacy Genesis learning context may receive city geography without claiming public attendance",()=>{
  const legacy=planThreadLocation({
    ...thread,birthLocation:{city:"Dhaka",country:"Bangladesh",countryCode:"BD"},
  },{
    currentSituation:{
      phase:"at_place",location:{kind:"place",placeRef:"wpl_genesis_learning"},
    },
    worldContext:{timeZone:"Asia/Dhaka"},
    worldPlaces:[{
      ref:"wpl_genesis_learning",authority:"live-world-place-admission-v1",
      placeKind:"library_or_learning",displayName:"Learning in the household",
    }],
    placeEpisodes:[],
  });
  assert.equal(legacy.state,"ready");
  assert.equal(legacy.place.locality,"Dhaka");
  assert.equal(legacy.place.lat,null);
  assert.equal(legacy.place.specificPlace,"Genesis library_or_learning context");
  assert.equal(legacy.basis,"birth_city_operator_default");

  const publicVenue=planThreadLocation({
    ...thread,birthLocation:{city:"Dhaka",country:"Bangladesh",countryCode:"BD"},
  },{
    currentSituation:{
      phase:"at_place",location:{kind:"place",placeRef:"wpl_public_library"},
    },
    worldContext:{timeZone:"Asia/Dhaka"},
    worldPlaces:[{
      ref:"wpl_public_library",authority:"world-public-place-v1",
      physicalVenue:{ref:"venue_actual"},displayName:"Actual public library",
    }],
    placeEpisodes:[],
  });
  assert.equal(publicVenue.state,"unresolved_shared_world_place",
    "a real public venue must not be rewritten as a private Genesis context");
});
