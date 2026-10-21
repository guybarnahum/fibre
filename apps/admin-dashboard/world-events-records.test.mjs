import assert from "node:assert/strict";
import test from "node:test";
import {worldEventPlaceDayRecord} from "./world-events-records.js";

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
});
