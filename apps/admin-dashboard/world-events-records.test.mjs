import assert from "node:assert/strict";
import test from "node:test";
import {worldEventPlaceDayRecord,worldVenueCoPresence} from "./world-events-records.js";

test("a venue day export preserves only its actual World events and source limits",()=>{
  const asOf="2026-10-21T00:00:00.000Z";
  const overview={
    contract:"fibre-world-event-observatory-v0.1",asOf,hours:24,
    coverage:{situationsTruncated:true,storiesTruncated:false,sourceLimit:240},
    events:[
      {eventRef:"sit_park",placeRef:"wpl_park",occurredAt:"2026-10-20T20:00:00Z",kind:"arrival"},
      {eventRef:"sit_cafe",placeRef:"wpl_cafe",occurredAt:"2026-10-20T21:00:00Z",kind:"arrival"},
      {eventRef:"story_park",placeRef:"wpl_park",occurredAt:"2026-10-20T22:00:00Z",kind:"ambient"},
    ],unmappedEvents:[{eventRef:"story_unmapped",placeRef:null}],
  };
  const result=worldEventPlaceDayRecord(overview,{
    placeRef:"wpl_park",name:"Dedaena Park",city:"Tbilisi",country:"Georgia",
    timeZone:"Asia/Tbilisi",
  });
  assert.deepEqual(result.events.map(x=>x.eventRef),["story_park","sit_park"],
    "the park day mixed in another venue's events");
  assert.equal(result.eventCount,2,"venue day count diverged from actual exported events");
  assert.equal(result.coverage.situationsTruncated,true,
    "the venue export silently claimed complete World history");
  assert.equal(result.since,"2026-10-20T00:00:00.000Z",
    "the venue export used the wrong 24-hour boundary");
  assert.equal(result.place.placeRef,"wpl_park",
    "venue identity was lost from its event export");
  assert.equal(result.place.timeZone,"Asia/Tbilisi",
    "a World venue day export lost its grounded local clock");
});

test("two enacted visits yield their true hour of shared presence, not an invented meeting",()=>{
  const placeRef="wpl_dedaena",first="thr_ioseb",second="thr_giorgi";
  const move=(kind,threadId,occurredAt,ref)=>({
    eventRef:ref,kind,occurredAt,placeRef,source:"world_enacted",
    actorThreadId:threadId,
  });
  const overview={
    coverage:{situationsTruncated:true},
    events:[
      move("departure",first,"2026-10-20T13:00:00.002Z","sit_ioseb_leave"),
      move("departure",second,"2026-10-20T12:35:00.061Z","sit_giorgi_leave"),
      move("arrival",second,"2026-10-20T11:35:00.001Z","sit_giorgi_arrive"),
      move("arrival",first,"2026-10-20T11:30:00.002Z","sit_ioseb_arrive"),
      {eventRef:"story_observation",placeRef,kind:"ambient",
        occurredAt:"2026-10-20T11:35:00.002Z",source:"encounter_story"},
    ],
  };
  const result=worldVenueCoPresence(overview,placeRef);
  assert.equal(result.stays.length,2,"one enacted stay was lost");
  assert.equal(result.overlaps.length,1,"shared venue became false or duplicate co-presence");
  assert.deepEqual(result.overlaps[0].threadIds,[first,second],
    "overlap attributed the wrong people");
  assert.equal(result.overlaps[0].from,"2026-10-20T11:35:00.001Z");
  assert.equal(result.overlaps[0].until,"2026-10-20T12:35:00.061Z");
  assert.ok(Math.abs(result.overlaps[0].durationMinutes-60)<0.01,
    "the shared hour was miscomputed");
  assert.equal(result.sourceCapped,true,
    "a source-limited window was presented as complete");
});

test("unpaired movement never becomes an imaginary visit or social overlap",()=>{
  const placeRef="wpl_cafe";
  const result=worldVenueCoPresence({
    coverage:{situationsTruncated:true},
    events:[
      {eventRef:"sit_depart_without_arrival",kind:"departure",
        actorThreadId:"thr_a",source:"world_enacted",
        occurredAt:"2026-10-20T13:00:00.000Z",placeRef},
      {eventRef:"sit_arrival_without_departure",kind:"arrival",
        actorThreadId:"thr_b",source:"world_enacted",
        occurredAt:"2026-10-20T13:30:00.000Z",placeRef},
    ],
  },placeRef);
  assert.equal(result.stays.length,0,"unpaired movement invented a completed stay");
  assert.equal(result.overlaps.length,0,"unpaired movement invented co-presence");
  assert.equal(result.unmatchedMovements,2,
    "unknown pre/post-window life was silently erased");
});
