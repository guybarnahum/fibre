import assert from "node:assert/strict";
import test from "node:test";

import {
  projectInsideFibreLivedScene,
} from "../src/inside-fibre-lived-scene.mjs";

function present() {
  return {
    situationId:"sit_lived_scene_001",
    establishedAt:"2026-09-24T18:20:00Z",
    phase:"at_place",
    location:{ kind:"place", place:{ displayName:"Home", region:"Tucson" } },
    mediatedContext:null,
    activity:"Finishing a design sketch.",
    reason:null,
    participants:["Mara"],
    depictionMediaId:"media_present_lived_scene_001",
  };
}

function availability(overrides = {}) {
  return {
    threadId:"thr_lived_scene_001",
    commitmentId:"work_private_001",
    startAt:"2026-09-24T18:00:00Z",
    endAt:"2026-09-24T19:00:00Z",
    mediatedContext:"insidefibre:visitor-work",
    situationId:"sit_lived_scene_001",
    planId:"lplan_private_001",
    compensation:{ fibreCredits:12 },
    ...overrides,
  };
}

test("Inside Fibre lived scene binds public current life to bounded visitor availability", () => {
  const scene = projectInsideFibreLivedScene({
    present:present(),
    availability:availability(),
  });

  assert.deepEqual(scene, {
    sceneVersion:"inside-fibre-lived-scene-v0.1",
    situationId:"sit_lived_scene_001",
    establishedAt:"2026-09-24T18:20:00Z",
    phase:"at_place",
    location:{ kind:"place", place:{ displayName:"Home", region:"Tucson" } },
    activity:"Finishing a design sketch.",
    participants:["Mara"],
    depictionMediaId:"media_present_lived_scene_001",
    encounterAvailability:{
      kind:"inside_fibre_visitor_availability",
      startAt:"2026-09-24T18:00:00Z",
      endAt:"2026-09-24T19:00:00Z",
    },
  });

  const publicJson = JSON.stringify(scene);
  for (const privateValue of ["work_private_001", "lplan_private_001", "fibreCredits"]) {
    assert.equal(publicJson.includes(privateValue), false);
  }
});

test("Inside Fibre lived scene refuses to bind another situation or inactive window", () => {
  assert.throws(() => projectInsideFibreLivedScene({
    present:present(),
    availability:availability({ situationId:"sit_other_001" }),
  }), TypeError);

  assert.throws(() => projectInsideFibreLivedScene({
    present:present(),
    availability:availability({
      startAt:"2026-09-24T19:00:00Z",
      endAt:"2026-09-24T20:00:00Z",
    }),
  }), TypeError);
});
