import test from "node:test";
import assert from "node:assert/strict";

import {
  catalogPlaceForLocation,
  groupThreadsByCurrentLocation,
  solarClockForLongitude,
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


test("Map longitude clock uses minute-resolution solar time relative to the visitor", () => {
  const at = new Date("2026-10-12T04:00:00Z");
  const localOffset = -7 * 60; // Phoenix on October 11.
  const east = solarClockForLongitude(30, at, localOffset);
  assert.equal(east.time.toISOString(), "2026-10-12T06:00:00.000Z", "east solar time is wrong");
  assert.equal(east.differenceMinutes, 9 * 60, "east solar offset from visitor is wrong");
  const west = solarClockForLongitude(-120, at, localOffset);
  assert.equal(west.time.toISOString(), "2026-10-11T20:00:00.000Z", "west solar time is wrong");
  assert.equal(west.differenceMinutes, -60, "west solar offset from visitor is wrong");
});
