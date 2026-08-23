import assert from "node:assert/strict";
import test from "node:test";

import { canonicalJson } from "../src/persistence-common.mjs";
import { GENESIS_EVENT_STRUCTURE_POOL_V2 } from "../src/genesis-event-structure-pool-v2.mjs";
import {
  GENESIS_EVENT_STRUCTURE_POOL_V3,
  GENESIS_YOUNG_ADULT_EVENT_STRUCTURES_V3,
  eventStructurePoolV3Digest,
  normalizeEventStructurePoolV3,
  sampleEventStructuresV3,
} from "../src/genesis-event-structure-pool-v3.mjs";

test("EventStructurePool v3 preserves every v2 entry and adds reviewed young-adult coverage", () => {
  const pool = normalizeEventStructurePoolV3();
  assert.equal(pool.length, GENESIS_EVENT_STRUCTURE_POOL_V2.length + GENESIS_YOUNG_ADULT_EVENT_STRUCTURES_V3.length);
  for (const inherited of GENESIS_EVENT_STRUCTURE_POOL_V2) {
    const current = pool.find((item) => item.structure.structureId === inherited.structure.structureId);
    assert.ok(current);
    assert.equal(canonicalJson(current), canonicalJson(inherited));
  }
  assert.equal(GENESIS_YOUNG_ADULT_EVENT_STRUCTURES_V3.length >= 8, true);
  assert.match(eventStructurePoolV3Digest(), /^sha256:[0-9a-f]{64}$/);
});

test("EventStructurePool v3 can offer nine low-floor-compliant structures across ages 18-22", () => {
  const offered = sampleEventStructuresV3(
    GENESIS_EVENT_STRUCTURE_POOL_V3,
    { minAge: 20.1, maxAge: 21.2 },
    { seed: "test-young-adult-v3", count: 9 },
  );
  assert.equal(offered.length, 9);
  assert.equal(offered.every((item) => item.structure.developmentalRange.minAge <= 20.1 && item.structure.developmentalRange.maxAge >= 21.2), true);
  assert.equal(offered.filter((item) => item.structure.consequenceClass === "low").length >= 4, true);
});
