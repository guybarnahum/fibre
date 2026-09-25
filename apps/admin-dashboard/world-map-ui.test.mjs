import test from "node:test";
import assert from "node:assert/strict";

import {
  catalogPlaceForLocation,
  groupThreadsByCurrentLocation,
} from "./world-map-ui.js";

test("Threads map groups admitted people by current World location, not birthplace", () => {
  const threads = [
    {
      threadId:"thr_a",
      identity:{ birthPlace:"Tbilisi, Georgia" },
      currentLocation:{ current:true, locality:"Jerusalem", country:"Israel", lat:31.76904, long:35.21633 },
    },
    {
      threadId:"thr_b",
      identity:{ birthPlace:"Kaohsiung, Taiwan" },
      currentLocation:{ current:true, locality:"Jerusalem", country:"Israel", lat:31.76904, long:35.21633 },
    },
    {
      threadId:"thr_c",
      identity:{ birthPlace:"Jerusalem, Israel" },
      currentLocation:{ current:true, locality:"Tbilisi", country:"Georgia", lat:41.69143, long:44.83412 },
    },
    { threadId:"thr_unmapped", identity:{ birthPlace:"Tbilisi, Georgia" }, currentLocation:null },
  ];

  const grouped = groupThreadsByCurrentLocation(threads);

  assert.deepEqual(
    grouped.locations.map((entry) => [entry.place.city, entry.count]),
    [["Jerusalem", 2], ["Tbilisi", 1]],
    "current World clusters changed",
  );
  assert.equal(grouped.mapped, 3, "mapped Thread count changed");
  assert.equal(grouped.authoritative, 3, "authoritative current-location count changed");
  assert.equal(grouped.unmapped, 1, "missing current location must stay explicit");
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
