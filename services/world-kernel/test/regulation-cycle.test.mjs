import assert from "node:assert/strict";
import test from "node:test";

import { evaluateIntrinsicRegulation } from "../../../core/src/intrinsic-regulation.mjs";
import { runIntrinsicRegulationCycle } from "../src/regulation-cycle.mjs";
import {
  normalizeSemanticStateRecord,
  semanticStateIdFor,
} from "../src/semantic-state.mjs";

const thread = {
  threadId: "thr_r4_maya",
  identity: {
    name: "Maya Vale",
    selfDescription: "I am ten, curious, independent, and close to the people I trust.",
  },
  currentState: {
    selfModel: "Crowded noisy stretches wear me down; familiar quiet company can help me settle without taking over.",
    unresolvedIntentions: [],
  },
};

function percept({ asOf, soundLoad = 0.2, crowding = 0.2, social = [] }) {
  return {
    asOf,
    internal: { energy: 0.75, fatigue: 0.25 },
    environment: {
      temperatureC: 22,
      lightLevel: 0.5,
      soundLoad,
      crowding,
      openness: 0.7,
    },
    social,
    evidenceRefs: [soundLoad > 0.8 ? "world:overloaded-room" : "world:settled-room"],
  };
}

function semanticStore() {
  let current = [];
  return {
    listCurrentState() {
      return structuredClone(current);
    },
    recordState(candidate) {
      const state = normalizeSemanticStateRecord({
        ...candidate,
        stateId: semanticStateIdFor(candidate),
      });
      if (state.supersedes !== null) {
        current = current.filter((item) => item.stateId !== state.supersedes);
      }
      current.push(state);
      return { state, created: true };
    },
  };
}

function motherRelation() {
  return {
    relationId: "lrel_human_maya_mother",
    revision: 1,
    threadId: thread.threadId,
    relatedParty: {
      partyId: "human_maya_mother",
      kind: "human_source",
      displayName: "Maya's mother",
    },
    relationKind: "social_parent",
    geneticContributionRole: "none",
    relationshipFacts: [
      "She has been a steady source of care and calm across Maya's childhood.",
    ],
    sourceReferences: ["evt_r4_birth"],
    validFrom: "2016-02-08T00:00:00Z",
    validTo: null,
    visibility: "private",
    provenance: "thread_history",
    recordedAt: "2026-09-10T18:00:00Z",
  };
}

function cognition() {
  const invocations = [];
  return {
    invocations,
    adapter: {
      async invoke(request) {
        invocations.push(structuredClone(request));
        if (request.input.interoception) {
          return {
            output: {
              states: [{
                domain: "need",
                dimension: "connection",
                state: "I want a familiar, calmer person near me after all this noise.",
              }],
            },
            provenance: {
              provider: "fixture",
              modelId: "fixture-r4-cognition",
              providerRequestId: "req_r4_interoception",
            },
          };
        }
        if (request.input.relationships) {
          return {
            output: { targetRef: "human_maya_mother", relation: "with" },
            provenance: {
              provider: "fixture",
              modelId: "fixture-r4-cognition",
              providerRequestId: "req_r4_presence",
            },
          };
        }
        throw new Error("unexpected R4 cognition input");
      },
    },
  };
}

function presence(frame) {
  return frame.drives.find((drive) => drive.family === "presence");
}

test("R4 a consequential drive transition earns attention and changes the Thread's next ordinary presence choice", async () => {
  const before = evaluateIntrinsicRegulation({
    perceptFrame: percept({ asOf: "2026-09-10T18:20:00Z" }),
  });
  const overloaded = evaluateIntrinsicRegulation({
    perceptFrame: percept({
      asOf: "2026-09-10T18:25:00Z",
      soundLoad: 0.95,
      crowding: 0.9,
    }),
  });
  const states = semanticStore();
  const model = cognition();
  const situatedLifeStore = {
    listCurrentLifeRelations(threadId) {
      assert.equal(threadId, thread.threadId);
      return [motherRelation()];
    },
  };

  const cycle = await runIntrinsicRegulationCycle({
    thread,
    previousFrame: before,
    currentFrame: overloaded,
    semanticStateStore: states,
    situatedLifeStore,
    modelAdapter: model.adapter,
  });

  assert.equal(cycle.attention.reason, "threshold");
  assert.equal(cycle.attention.family, "sensory_load");
  assert.ok(cycle.attention.pressure > cycle.attention.previousPressure);
  assert.equal(cycle.interpretation.states[0].dimension, "connection");
  assert.equal(cycle.socialPresence.target.targetRef, "human_maya_mother");
  assert.equal(cycle.socialPresence.target.relation, "with");
  assert.equal(model.invocations.length, 2);
  assert.ok(
    model.invocations[1].input.semanticStates.some((state) =>
      state.dimension === "connection" && state.state.includes("familiar, calmer person")),
  );

  const motherAbsent = evaluateIntrinsicRegulation({
    perceptFrame: percept({
      asOf: "2026-09-10T18:26:00Z",
      soundLoad: 0.4,
      crowding: 0.3,
    }),
    targets: [cycle.socialPresence.target],
  });
  const motherPresent = evaluateIntrinsicRegulation({
    perceptFrame: percept({
      asOf: "2026-09-10T18:27:00Z",
      social: [{
        entityRef: "human_maya_mother",
        proximity: 1,
        familiarity: 1,
        calm: 0.9,
        contact: 1,
        evidenceRefs: ["world:mother-beside-maya"],
      }],
    }),
    targets: [cycle.socialPresence.target],
  });

  assert.ok(presence(motherAbsent).pressure > presence(motherPresent).pressure);
  assert.equal(presence(motherPresent).attained, true);
});

test("R4 ordinary regulation that does not cross a meaningful boundary does not wake cognition", async () => {
  const frame = evaluateIntrinsicRegulation({
    perceptFrame: percept({ asOf: "2026-09-10T18:20:00Z" }),
  });
  const model = cognition();

  const cycle = await runIntrinsicRegulationCycle({
    thread,
    previousFrame: frame,
    currentFrame: structuredClone(frame),
    semanticStateStore: semanticStore(),
    situatedLifeStore: { listCurrentLifeRelations: () => [motherRelation()] },
    modelAdapter: model.adapter,
  });

  assert.equal(cycle.attention, null);
  assert.equal(cycle.interpretation, null);
  assert.equal(cycle.socialPresence, null);
  assert.equal(model.invocations.length, 0);
});
