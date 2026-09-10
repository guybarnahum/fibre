import assert from "node:assert/strict";
import test from "node:test";

import { explainOrganismTrace } from "../../apps/thread-editor/organism-readable.js";
import { regulationOrganismTrace } from "../../services/world-kernel/src/regulation-cycle.mjs";

test("R4 Thread Editor projection keeps regulator, meaning, and next desire distinct", () => {
  const trace = regulationOrganismTrace({
    currentFrame: {
      asOf: "2026-09-10T18:25:00Z",
      species: "thread",
      drives: [{
        family: "sensory_load",
        targetRef: "environment:sensory-load",
        orientation: "avoid",
        pressure: 0.82,
        urgency: 0.82,
        progressError: 0,
        predictionError: 0,
        attained: false,
        evidenceRefs: ["world:overloaded-room"],
      }],
      intrinsicAffect: {
        activation: 0.82,
        sensoryLoad: 0.82,
        approachPull: 0,
        avoidancePush: 0.82,
        attainment: 0,
        socialResonance: { activation: 0, affiliative: 0, distress: 0, evidenceRefs: [] },
      },
    },
    attention: {
      family: "sensory_load",
      reason: "threshold",
      pressure: 0.82,
      previousPressure: 0.1,
    },
    interpretation: {
      interoception: { evidenceRefs: ["world:overloaded-room"] },
      states: [{
        stateId: "sst_r4_connection",
        domain: "need",
        dimension: "connection",
        state: "I want a familiar, calmer person near me after all this noise.",
        evidenceReferences: ["world:overloaded-room"],
      }],
      cognition: { provider: "fixture", modelId: "fixture-r4", providerRequestId: "req_r4_interoception" },
    },
    socialPresence: {
      target: { relation: "with", targetRef: "human_maya_mother" },
      cognition: { provider: "fixture", modelId: "fixture-r4", providerRequestId: "req_r4_presence" },
    },
  });

  assert.equal(trace.attention.family, "sensory_load");
  assert.equal(trace.semanticStates[0].dimension, "connection");
  assert.equal(trace.nextPresence.relation, "with");

  const readable = explainOrganismTrace(trace);
  assert.match(readable.title, /sensory_load regulation reached attention/);
  assert.match(readable.summary, /Thread authored 1 semantic state/);
  assert.ok(readable.facts.some((fact) => fact.label === "Next presence" && fact.value === "with human_maya_mother"));
  assert.ok(readable.notes.some((note) => note.includes("not a named emotion")));
});

test("R4 Thread Editor does not invent a causal episode when no trace exists", () => {
  const readable = explainOrganismTrace(null);
  assert.match(readable.title, /No consequential regulation cycle projected/);
  assert.equal(readable.facts.length, 0);
});
