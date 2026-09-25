import test from "node:test";
import assert from "node:assert/strict";

import {
  catalogPlaceForLocation,
  groupThreadsByCurrentLocation,
} from "./world-map-ui.js";

test("Threads map includes every mappable living Thread without calling birthplace current", () => {
  const threads = [
    {
      threadId:"thr_a",
      identity:{
        birthPlace:"Tbilisi, Georgia",
        birthLocation:{ displayName:"Tbilisi, Georgia", city:"Tbilisi", country:"Georgia", lat:41.69143, long:44.83412 },
      },
      currentLocation:{ current:true, locality:"Jerusalem", country:"Israel", lat:31.76904, long:35.21633 },
    },
    {
      threadId:"thr_b",
      identity:{
        birthPlace:"Kaohsiung, Taiwan",
        birthLocation:{ displayName:"Kaohsiung, Taiwan", city:"Kaohsiung", country:"Taiwan", lat:22.62728, long:120.30144 },
      },
      currentLocation:{ current:true, locality:"Jerusalem", country:"Israel", lat:31.76904, long:35.21633 },
    },
    {
      threadId:"thr_c",
      identity:{
        birthPlace:"Jerusalem, Israel",
        birthLocation:{ displayName:"Jerusalem, Israel", city:"Jerusalem", country:"Israel", lat:31.76904, long:35.21633 },
      },
      currentLocation:{ current:true, locality:"Tbilisi", country:"Georgia", lat:41.69143, long:44.83412 },
    },
    {
      threadId:"thr_waiting",
      identity:{
        birthPlace:"Tbilisi, Georgia",
        birthLocation:{ displayName:"Tbilisi, Georgia", city:"Tbilisi", country:"Georgia", lat:41.69143, long:44.83412 },
      },
      currentLocation:null,
    },
    { threadId:"thr_unmapped", identity:{ birthPlace:null, birthLocation:null }, currentLocation:null },
  ];

  const grouped = groupThreadsByCurrentLocation(threads);

  assert.deepEqual(
    grouped.locations.map((entry) => [entry.place.city, entry.count, entry.currentCount, entry.awaitingLivedNowCount]),
    [["Jerusalem", 2, 2, 0], ["Tbilisi", 2, 1, 1]],
    "map lost enacted or awaiting-LivedNow Threads",
  );
  assert.equal(grouped.mapped, 4, "mappable living Thread disappeared");
  assert.equal(grouped.authoritative, 3, "authoritative current-location count changed");
  assert.equal(grouped.awaitingLivedNow, 1, "birthplace placeholder was not explicitly marked");
  assert.equal(grouped.unmapped, 1, "truly unmappable Thread was hidden");
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
