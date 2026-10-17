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
  assert.equal(decision.place.evidenceRef,situation.location.placeRef);
});

test("missing First Life cannot be replaced by fictional birthplace presence",()=>{
  assert.equal(planThreadLocation(thread,{currentSituation:null}).state,"awaiting_first_life");
  assert.equal(planThreadLocation(thread,life({locality:"Chengdu",countryCode:"CN"})).state,
    "review_time_zone","different-country life must not inherit Lisbon's time zone");
  assert.equal(planThreadLocation(thread,{
    ...life({}),privatelyKnownCurrentPlace:{locality:"Tbilisi"},
  }).state,"already_located","prior World location must be preserved");
});

test("a grounded current city outranks the Thread's birth city",()=>{
  const moved={...thread,birthLocation:{city:"Oslo",country:"Norway",countryCode:"NO"}};
  const result=planThreadLocation(moved,life({
    locality:"Lisbon",countryCode:"PT",displayName:"Reading room",
  }));
  assert.equal(result.state,"review_time_zone","World timezone must not be reused after a move");
});
