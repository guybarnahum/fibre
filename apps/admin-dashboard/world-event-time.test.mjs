import assert from "node:assert/strict";
import test from "node:test";
import {
  formatWorldEventTime,formatWorldTimeRange,worldCityTimeZone,
} from "./world-event-time.js";

const normalized=value=>value.replace(/\u202f/gu," ");

test("World events and shared presence use their attested venue clock, never the Admin browser clock",()=>{
  const instant="2026-10-20T11:35:00.001Z";
  const tbilisi=normalized(formatWorldEventTime(instant,"Asia/Tbilisi"));
  assert.match(tbilisi,/Oct 20, 3:35 PM/u,
    "a Tbilisi arrival displayed a different locality's clock");
  assert.match(tbilisi,/GMT\+4/u,
    "venue-local clock lost its offset");
  assert.match(normalized(formatWorldEventTime(instant,"Asia/Tbilisi",{clockOnly:true})),
    /3:35 PM/u,"shared-presence bars disagreed with World event time");
  assert.match(normalized(formatWorldEventTime(instant)),/11:35 AM UTC/u,
    "unlocated events invented a local time zone");
  assert.match(normalized(formatWorldTimeRange({
    asOf:"2026-10-20T12:00:00.000Z",hours:1,
  },"Asia/Tbilisi")),/3:00 PM.*4:00 PM/u,
    "the venue's history window showed Admin-local dates");
});

test("World time respects daylight-saving changes and does not infer one clock for mixed cities",()=>{
  const before=normalized(formatWorldEventTime("2026-10-24T11:35:00.000Z","Europe/London"));
  const after=normalized(formatWorldEventTime("2026-10-26T11:35:00.000Z","Europe/London"));
  assert.match(before,/12:35 PM/u,"the World clock ignored summer offset");
  assert.match(after,/11:35 AM/u,"the World clock ignored winter offset");
  assert.equal(worldCityTimeZone({places:[
    {countryCode:"GE",city:"Tbilisi",timeZone:"Asia/Tbilisi"},
    {countryCode:"GE",city:"Tbilisi",timeZone:"Asia/Tbilisi"},
  ]},"GE:Tbilisi"),"Asia/Tbilisi");
  assert.equal(worldCityTimeZone({places:[
    {countryCode:"XX",city:"Boundary",timeZone:"Europe/London"},
    {countryCode:"XX",city:"Boundary",timeZone:"Europe/Paris"},
  ]},"XX:Boundary"),null,
  "a multi-zone locality was assigned an unsupported shared clock");
});
