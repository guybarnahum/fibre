import assert from "node:assert/strict";
import test from "node:test";
import {enactedActorOccurrence,coPresentAtActorArrival} from "../src/world-occurrence.mjs";

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

 
test("one enacted public arrival exposes real company, not sleep, future visitors or a scripted encounter",()=>{
  const occurrence=enactedActorOccurrence(transit,arrived);
  const people=[
    {threadId:"thr_reader",situationId:"sit_reader",establishedAt:"2026-10-18T08:00:00.000Z",
      location:{kind:"place",placeRef:library},wakefulness:"awake"},
    {threadId:"thr_sleeping",situationId:"sit_sleeping",establishedAt:"2026-10-18T09:00:00.000Z",
      location:{kind:"place",placeRef:library},wakefulness:"asleep"},
    {threadId:"thr_future",situationId:"sit_future",establishedAt:"2026-10-18T10:30:00.000Z",
      location:{kind:"place",placeRef:library},wakefulness:"awake"},
  ];
  let queries=0;
  const index={listCurrentVenueSituations({venueRef,at,limit,excludeThreadId}){
    queries++;
    assert.equal(venueRef,"venue_verified_library");
    assert.equal(at,arrived.establishedAt,
      "arrivals were artificially delayed before witness discovery");
    assert.equal(limit,8);
    assert.equal(excludeThreadId,threadId);
    return people;
  }};
  assert.deepEqual(coPresentAtActorArrival(index,occurrence,"venue_verified_library")
    .map(item=>item.threadId),["thr_reader"],
    "the World invited somebody who was sleeping or had not arrived");
  assert.equal(queries,1,"a single occurrence scanned its venue repeatedly");
  assert.deepEqual(coPresentAtActorArrival(index,null,"venue_verified_library"),[],
    "an unadmitted arrival generated social company");
  assert.deepEqual(coPresentAtActorArrival(index,occurrence,null),[],
    "an unverified shared venue generated social company");
  assert.equal(queries,1,"empty or unverified scenes queried other lives");
});
