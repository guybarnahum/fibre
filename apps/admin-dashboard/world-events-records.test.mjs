import assert from "node:assert/strict";
import test from "node:test";
import {
  worldEventPlaceDayRecord,worldVenueCoPresence,
  worldPresencePair,formatSharedPresenceDuration,
} from "./world-events-records.js";

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

test("verified library stay shows the exact shared interval with a common time axis",()=>{
  const placeRef="wpl_library";
  const movement=(kind,threadId,occurredAt,eventRef)=>({
    kind,threadId,actorThreadId:threadId,occurredAt,eventRef,placeRef,
    source:"world_enacted",
  });
  const overview={events:[
    movement("departure","thr_ioseb","2026-10-21T11:00:00.091Z","sit_ioseb_out"),
    movement("departure","thr_giorgi","2026-10-21T09:00:00.125Z","sit_giorgi_out"),
    movement("arrival","thr_ioseb","2026-10-21T07:30:02.664Z","sit_ioseb_in"),
    movement("arrival","thr_giorgi","2026-10-21T05:40:00.002Z","sit_giorgi_in"),
  ],coverage:{situationsTruncated:true}};
  const presence=worldVenueCoPresence(overview,placeRef);
  const pair=worldPresencePair(presence.overlaps[0],presence.stays);
  assert.deepEqual(pair.stays.map(stay=>stay.threadId),["thr_giorgi","thr_ioseb"],
    "aligned presence bars joined the wrong attendees");
  assert.equal(new Date(pair.from).toISOString(),"2026-10-21T05:40:00.002Z");
  assert.equal(new Date(pair.overlapFrom).toISOString(),"2026-10-21T07:30:02.664Z");
  assert.equal(new Date(pair.overlapUntil).toISOString(),"2026-10-21T09:00:00.125Z");
  assert.equal(new Date(pair.until).toISOString(),"2026-10-21T11:00:00.091Z");
  assert.equal(formatSharedPresenceDuration(pair.overlapUntil-pair.overlapFrom),
    "1h 29m 57s","a genuine long overlap lost its seconds");
});

test("subminute shared presence keeps its real duration and its own visit identity",()=>{
  const overlap={
    threadIds:["thr_giorgi","thr_ioseb"],
    arrivalRefs:["sit_giorgi_in_today","sit_ioseb_in_today"],
    from:"2026-10-21T11:15:00.063Z",
    until:"2026-10-21T11:15:04.841Z",
  };
  const stays=[
    {threadId:"thr_giorgi",arrivalRef:"sit_giorgi_in_yesterday",
      enteredAt:"2026-10-20T09:00:00Z",leftAt:"2026-10-20T09:30:00Z"},
    {threadId:"thr_giorgi",arrivalRef:"sit_giorgi_in_today",
      enteredAt:"2026-10-21T09:15:00.005Z",leftAt:overlap.until},
    {threadId:"thr_ioseb",arrivalRef:"sit_ioseb_in_today",
      enteredAt:overlap.from,leftAt:"2026-10-21T12:30:00.071Z"},
  ];
  const pair=worldPresencePair(overlap,stays);
  assert.equal(pair.stays[0].arrivalRef,"sit_giorgi_in_today",
    "a previous visit was silently stitched to today's visitor");
  assert.equal(formatSharedPresenceDuration(pair.overlapUntil-pair.overlapFrom),
    "4.8s","short genuine co-presence was shown as zero minutes");
});
