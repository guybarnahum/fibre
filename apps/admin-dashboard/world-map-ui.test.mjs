import test from "node:test";
import assert from "node:assert/strict";

import { groupThreadsByBirthplace } from "./world-map-ui.js";

test("Threads map groups admitted people by authoritative birthplace", () => {
  const catalog = [
    { place:"Georgia/Tbilisi", country:"Georgia", city:"Tbilisi", lat:41.7151, long:44.8271 },
    { place:"China/Shanghai", country:"China", city:"Shanghai", lat:31.2304, long:121.4737 },
  ];
  const threads = [
    { threadId:"thr_a", identity:{ birthPlace:"Tbilisi, Georgia" } },
    { threadId:"thr_b", identity:{ birthPlace:"Georgia/Tbilisi" } },
    { threadId:"thr_city_only", identity:{ birthPlace:"Tbilisi" } },
    { threadId:"thr_c", identity:{ birthPlace:"Shanghai, China" } },
    { threadId:"thr_legacy", identity:{ birthPlace:"Unknown Place" } },
  ];

  const grouped = groupThreadsByBirthplace(threads, catalog);

  assert.deepEqual(
    grouped.locations.map((entry) => [entry.place.place, entry.count]),
    [["Georgia/Tbilisi", 3], ["China/Shanghai", 1]],
    "birthplace clusters changed",
  );
  assert.equal(grouped.mapped, 4, "mapped Thread count changed");
  assert.equal(grouped.unmapped, 1, "unmapped Threads must stay explicit");
});

test("city-only birthplace stays unmapped when the catalog is ambiguous", () => {
  const catalog = [
    { place:"US/Springfield, Illinois", country:"US", city:"Springfield", lat:39.78, long:-89.64 },
    { place:"US/Springfield, Missouri", country:"US", city:"Springfield", lat:37.21, long:-93.29 },
  ];
  const grouped = groupThreadsByBirthplace([
    { threadId:"thr_ambiguous", identity:{ birthPlace:"Springfield" } },
  ], catalog);
  assert.equal(grouped.mapped, 0, "ambiguous city was guessed");
  assert.equal(grouped.unmapped, 1, "ambiguous city must remain explicit");
});
