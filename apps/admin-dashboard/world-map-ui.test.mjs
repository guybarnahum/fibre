import test from "node:test";
import assert from "node:assert/strict";

import {
  catalogPlaceForLocation,
  groupThreadsByCurrentLocation,
  worldClockForLongitude,
  threadMapState,
} from "./world-map-ui.js";

test("Threads map exposes active, frozen-situated and awaiting-LivedNow states without inventing presence", () => {
  const threads = [
    {
      threadId:"thr_active",
      identity:{
        lifecycleStatus:"active",
        birthPlace:"Tbilisi, Georgia",
        birthLocation:{ displayName:"Tbilisi, Georgia", city:"Tbilisi", country:"Georgia", lat:41.69143, long:44.83412 },
      },
      currentLocation:{ current:true, establishedAt:"2026-09-25T20:00:00Z", locality:"Jerusalem", country:"Israel", countryCode:"IL", lat:31.76904, long:35.21633 },
      runtime:{ state:"active", expiresAt:"2099-01-01T00:00:00Z" },
    },
    {
      threadId:"thr_frozen",
      identity:{
        lifecycleStatus:"frozen",
        birthPlace:"Kaohsiung, Taiwan",
        birthLocation:{ displayName:"Kaohsiung, Taiwan", city:"Kaohsiung", country:"Taiwan", countryCode:"TW", lat:22.62728, long:120.30144 },
      },
      currentLocation:{ current:true, establishedAt:"2026-09-25T18:00:00Z", locality:"Jerusalem", country:"Israel", lat:31.76904, long:35.21633 },
    },
    {
      threadId:"thr_transition",
      identity:{
        lifecycleStatus:"freezing",
        birthPlace:"Jerusalem, Israel",
        birthLocation:{ displayName:"Jerusalem, Israel", city:"Jerusalem", country:"Israel", lat:31.76904, long:35.21633 },
      },
      currentLocation:{ current:true, establishedAt:"2026-09-25T19:00:00Z", locality:"Tbilisi", country:"Georgia", lat:41.69143, long:44.83412 },
    },
    {
      threadId:"thr_waiting",
      identity:{
        lifecycleStatus:"dormant",
        birthPlace:"Tbilisi, Georgia",
        birthLocation:{ displayName:"Tbilisi, Georgia", city:"Tbilisi", country:"Georgia", lat:41.69143, long:44.83412 },
      },
      currentLocation:null,
    },
    {
      threadId:"thr_active_unsituated",
      identity:{
        lifecycleStatus:"active",
        birthPlace:"Kaohsiung, Taiwan",
        birthLocation:{ displayName:"Kaohsiung, Taiwan", city:"Kaohsiung", country:"Taiwan", countryCode:"TW", lat:22.62728, long:120.30144 },
      },
      currentLocation:null,
      runtime:{ state:"active", expiresAt:"2099-01-01T00:00:00Z" },
    },
    {
      threadId:"thr_retired",
      identity:{
        lifecycleStatus:"retired",
        birthPlace:"Jerusalem, Israel",
        birthLocation:{ displayName:"Jerusalem, Israel", city:"Jerusalem", country:"Israel", lat:31.76904, long:35.21633 },
      },
      currentLocation:{ current:true, locality:"Jerusalem", country:"Israel", lat:31.76904, long:35.21633 },
    },
    {
      threadId:"thr_unmapped",
      identity:{ lifecycleStatus:"frozen", birthPlace:null, birthLocation:null },
      currentLocation:null,
    },
  ];

  const grouped = groupThreadsByCurrentLocation(threads);

  assert.deepEqual(
    Object.fromEntries(grouped.locations.map((entry) => [
      entry.place.city,
      {
        count:entry.count,
        active:entry.activeCount,
        frozenSituated:entry.frozenSituatedCount,
        transitioning:entry.transitionCount,
        awaitingLivedNow:entry.awaitingLivedNowCount,
      },
    ])),
    {
      Jerusalem:{ count:2, active:1, frozenSituated:1, transitioning:0, awaitingLivedNow:0 },
      Tbilisi:{ count:2, active:0, frozenSituated:0, transitioning:1, awaitingLivedNow:1 },
      Kaohsiung:{ count:1, active:1, frozenSituated:0, transitioning:0, awaitingLivedNow:1 },
    },
    "map lifecycle states lost their lived meaning",
  );
  assert.equal(grouped.locations.find((entry) => entry.place.city === "Jerusalem")?.place.countryCode, "IL", "situated country code was lost");
  assert.equal(grouped.locations.find((entry) => entry.place.city === "Kaohsiung")?.place.countryCode, "TW", "birthplace country code was lost");
  assert.equal(grouped.mapped, 5, "mappable living Thread disappeared");
  assert.equal(grouped.situated, 3, "situated-life evidence was miscounted");
  assert.equal(grouped.active, 2, "active Thread count changed");
  assert.equal(grouped.frozenSituated, 1, "frozen situated Thread was lost");
  assert.equal(grouped.transitioning, 1, "runtime transition was lost");
  assert.equal(grouped.awaitingLivedNow, 2, "unsituated living Thread was not explicit");
  assert.equal(grouped.activeUnsituated, 1, "active-without-situation anomaly was hidden");
  assert.equal(grouped.retired, 1, "retired Thread was not excluded from living map");
  assert.equal(grouped.unmapped, 1, "truly unmappable living Thread was hidden");

  assert.equal(threadMapState(threads[0]).kind, "active");
  assert.equal(threadMapState(threads[1]).kind, "frozen_situated");
  assert.equal(threadMapState(threads[3]).kind, "awaiting_lived_now");
});

test("World place lookup does not guess an ambiguous city", () => {
  const catalog = [
    { place:"US/Springfield, Illinois", country:"US", city:"Springfield", lat:39.78, long:-89.64 },
    { place:"US/Springfield, Missouri", country:"US", city:"Springfield", lat:37.21, long:-93.29 },
  ];
  assert.equal(
    catalogPlaceForLocation(catalog, "Springfield"),
    null,
    "ambiguous city was guessed",
  );
});


test("Map world clock changes in whole hours while retaining visitor minutes", () => {
  const at = new Date("2026-10-12T04:51:00Z"); // 21:51 in Phoenix (UTC−7).
  const localOffset = -7 * 60;
  const check = (longitude, expectedClock, expectedHours) => {
    const clock = worldClockForLongitude(longitude, at, localOffset);
    assert.equal(clock.time.toISOString().slice(11, 16), expectedClock, "world clock hour band is wrong");
    assert.equal(clock.differenceHours, expectedHours, "visitor offset must be whole hours");
  };

  check(-120, "20:51", -1);
  check(-105, "21:51", 0);
  check(-90, "22:51", 1);
  check(0, "04:51", 7);
  check(180, "16:51", 19);
  // A fractional-offset home zone still preserves its local minutes.
  const halfHourHome = worldClockForLongitude(90, at, 330);
  assert.equal(halfHourHome.time.toISOString().slice(11, 16), "11:21", "visitor minutes should not drift");
  // Cross one 15° band boundary: the displayed hour, not minutes, changes.
  check(-97.6, "21:51", 0);
  check(-97.4, "22:51", 1);
});

test("Pacific coast clock follows daylight saving without shifting Arizona", () => {
  const summer = "2026-10-12T04:54:00Z";
  const winter = "2026-12-12T04:54:00Z";
  const phoenixOffset = -7 * 60;
  const california = (at) => worldClockForLongitude(-122.4, at, phoenixOffset, 37.8);
  assert.equal(california(summer).time.toISOString().slice(11, 16), "21:54",
    "California daylight time should match Phoenix");
  assert.equal(california(summer).differenceHours, 0,
    "California daylight offset should match Phoenix");
  assert.equal(california(winter).time.toISOString().slice(11, 16), "20:54",
    "California standard time should be one hour behind Phoenix");
  assert.equal(worldClockForLongitude(-112, summer, phoenixOffset, 33.5).time.toISOString().slice(11, 16),
    "21:54", "Arizona must not inherit Pacific daylight saving");
});

test("God-view maps a known current home without pretending the birthplace or another home is the same venue",()=>{
  const threads=["thr_ioseb","thr_giorgi","thr_luka"].map((threadId,index)=>({
    threadId,
    identity:{lifecycleStatus:"frozen",birthLocation:{
      city:"London",country:"United Kingdom",lat:51.5,long:-0.12,
    }},
    currentLocation:null,
    operatorCurrentPlace:{
      kind:"place",current:true,placeRef:"per:home_"+index+":1",
      locality:"Tbilisi",country:"Georgia",countryCode:"GE",
      lat:41.69143,long:44.83412,mapPrecision:"city",
    },
  }));
  const grouped=groupThreadsByCurrentLocation(threads);
  assert.equal(grouped.situated,3,
    "God-view treated World-known home locations as absent");
  assert.equal(grouped.awaitingLivedNow,0,
    "World-known current homes were plotted as birth-place placeholders");
  assert.equal(grouped.locations.length,1,
    "city-level map projection must group residents without implying a shared home");
  assert.equal(grouped.locations[0].place.city,"Tbilisi");
  assert.equal(grouped.locations[0].count,3);
  assert.equal(new Set(threads.map(t=>t.operatorCurrentPlace.placeRef)).size,3,
    "a common city is not proof of physical co-presence");
});
