import assert from "node:assert/strict";
import test from "node:test";
import {enactedActorOccurrence} from "../src/world-occurrence.mjs";

const threadId="thr_event_witness";
const home="per:real_home:1",library="wpl_verified_library";
const earlier={
  threadId,situationId:"sit_at_home",
  establishedAt:"2026-10-18T09:00:00.000Z",
  provenance:"world_enacted",phase:"at_place",
  location:{kind:"place",placeRef:home},
};
const transit={
  ...earlier,situationId:"sit_transit",
  establishedAt:"2026-10-18T09:45:00.010Z",
  phase:"in_transit",
  location:{kind:"transit",fromPlaceRef:home,toPlaceRef:library,progress:0},
};
const arrived={
  ...earlier,situationId:"sit_library_arrival",
  establishedAt:"2026-10-18T10:15:00.201Z",
  location:{kind:"place",placeRef:library},
};

test("the World owns actual arrival and departure times, not plans or observer delays",()=>{
  assert.equal(enactedActorOccurrence(null,earlier),null,
    "being born in a place became an arrival");
  const departure=enactedActorOccurrence(earlier,transit);
  assert.deepEqual(departure,{
    occurrenceRef:transit.situationId,sourceAuthority:"world-enacted-current-situation",
    occurredAt:transit.establishedAt,kind:"departure",actorThreadId:threadId,
    placeRef:home,destinationPlaceRef:library,
  },"World lost the enacted departure");
  const arrival=enactedActorOccurrence(transit,arrived);
  assert.deepEqual(arrival,{
    occurrenceRef:arrived.situationId,sourceAuthority:"world-enacted-current-situation",
    occurredAt:arrived.establishedAt,kind:"arrival",actorThreadId:threadId,
    placeRef:library,destinationPlaceRef:null,
  },"World delayed or invented the arrival");
  assert.equal(enactedActorOccurrence(arrived,{
    ...arrived,situationId:"sit_new_plan",establishedAt:"2026-10-18T10:15:02.000Z",
    activity:"Reading quietly.",
  }),null,"a new plan or activity was mistaken for entering a venue");
  assert.equal(enactedActorOccurrence(earlier,{
    ...arrived,situationId:"sit_historical_teleport",
  }),null,"an ungrounded instantaneous change was called physical arrival");
  assert.equal(enactedActorOccurrence(transit,{
    ...arrived,provenance:"fixture_planned",
  }),null,"unenacted fiction became a World event");
});
