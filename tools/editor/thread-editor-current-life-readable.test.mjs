import assert from "node:assert/strict";
import test from "node:test";

import { explainCurrentLife } from "../../apps/thread-editor/current-life-readable.js";

test("A3 Thread Editor explains lived now without collapsing care into personal will", () => {
  const explanation = explainCurrentLife({
    asOf: "2026-09-10T09:40:00Z",
    now: {
      activity: "Ride with Mom toward the dentist.",
      reason: "World observation records actual movement.",
      location: { kind: "transit", fromPlaceRef: "place_home", toPlaceRef: "place_dentist", progress: 0.35 },
      mediatedContext: null,
      resolution: { observedDivergence: false },
    },
    flightPlan: {
      stops: [{
        startAt: "2026-09-10T10:30:00Z",
        activity: "Return to the octopus sketch.",
      }],
    },
    planVsLived: {
      personal: { status: "delayed" },
      careRequirement: {
        status: "moving",
        authority: { constraint: "required" },
      },
    },
    semanticStates: [{
      dimension: "connection",
      state: "I want some familiar calm while this morning changes around me.",
    }],
    organismTrace: { attention: { family: "presence" } },
  });

  assert.equal(explanation.title, "Ride with Mom toward the dentist.");
  assert.match(explanation.summary, /Thread's own Flight Plan/);
  assert.match(explanation.summary, /caregiver requirement is moving/);
  assert.ok(explanation.facts.some((fact) => fact.label === "Personal plan" && fact.value === "delayed"));
  assert.ok(explanation.facts.some((fact) => fact.label === "Care" && fact.value === "moving · required"));
  assert.ok(explanation.notes.some((note) => /causal organism trace/.test(note)));
});
