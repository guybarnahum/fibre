import assert from "node:assert/strict";
import test from "node:test";

import { canonicalJson, sha256 } from "../services/world-kernel/src/persistence-common.mjs";
import { E2_A0_DEFAULT_SEEDS, buildE2A0Plan } from "./genesis-rich-life-e2-a0.mjs";
import {
  buildE2A2bSelectorInput,
  normalizeE2A2bPlausibility,
  plausibleRoutes,
  seededUniformRouteDraw,
} from "./genesis-rich-life-e2-a2b.mjs";
import { rehydrateE2A2bSchedule } from "./genesis-rich-life-e2-a2b-driver.mjs";
import { E2_DIAGNOSTIC_WORLDS } from "./genesis-rich-life-e2-worlds.mjs";

const digest = (value) => `sha256:${sha256(canonicalJson(value))}`;

function allRoutesScheduleEvidence(worldFixture, seed) {
  const plan = buildE2A0Plan(worldFixture, seed);
  const evidence = plan.map(({ developmentalWindow, offeredEntries }, index) => {
    const ordinal = index + 1;
    const input = buildE2A2bSelectorInput({ worldFixture, developmentalWindow, offeredEntries, ordinal, total: plan.length });
    const plausibility = normalizeE2A2bPlausibility({
      plausibleStructureRefs: offeredEntries.map((entry) => entry.structure.structureId),
      worldEmergentPlausible: true,
    }, offeredEntries);
    const routes = plausibleRoutes(plausibility);
    const draw = seededUniformRouteDraw({ worldId: worldFixture.id, seed, ordinal, routes });
    return Object.freeze({
      ordinal,
      developmentalWindow: structuredClone(developmentalWindow),
      offeredStructureIds: offeredEntries.map((entry) => entry.structure.structureId).sort(),
      selectorInputDigest: digest(input),
      selectorOutputDigest: digest({
        plausibleStructureRefs: offeredEntries.map((entry) => entry.structure.structureId),
        worldEmergentPlausible: true,
      }),
      plausibility: structuredClone(plausibility),
      routes: structuredClone(routes),
      draw: structuredClone(draw),
      selection: structuredClone(draw.chosenRoute),
      provenance: { provider: "fixture", modelId: "a2b-resume-fixture" },
    });
  });
  const selections = evidence.map((item) => item.selection);
  return Object.freeze({
    worldId: worldFixture.id,
    seed,
    runOrdinal: 1,
    scheduleDigest: digest({ selections, evidence: evidence.map(({ plausibility, draw }) => ({ plausibility, draw })) }),
    evidence,
  });
}

test("A2b resume reuses an exact frozen plausibility/draw schedule and rejects tampering", () => {
  const worldFixture = E2_DIAGNOSTIC_WORLDS[0];
  const seed = E2_A0_DEFAULT_SEEDS[0];
  const scheduleEvidence = allRoutesScheduleEvidence(worldFixture, seed);
  const restored = rehydrateE2A2bSchedule({ worldFixture, seed, scheduleEvidence });
  assert.equal(restored.plan.length, 10);
  assert.equal(restored.scheduleDigest, scheduleEvidence.scheduleDigest);
  assert.deepEqual(restored.selections, scheduleEvidence.evidence.map((item) => item.selection));

  const tampered = structuredClone(scheduleEvidence);
  tampered.evidence[3].selectorInputDigest = "sha256:tampered";
  assert.throws(
    () => rehydrateE2A2bSchedule({ worldFixture, seed, scheduleEvidence: tampered }),
    /selector input digest changed/,
  );
});
