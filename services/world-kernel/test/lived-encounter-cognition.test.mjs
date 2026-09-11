import assert from "node:assert/strict";
import test from "node:test";

import { respondToLivedEncounter } from "../src/lived-encounter-cognition.mjs";

const thread = {
  threadId: "thr_a5_maya",
  identity: {
    selfDescription: "I am ten, curious, observant, and protective of my independence.",
  },
  currentState: {
    selfModel: "I am absorbed in drawing and a little tired after a full afternoon.",
    unresolvedIntentions: ["Finish the fox sketch before dinner."],
  },
};

const currentSituation = {
  situationId: "sit_a5_drawing",
  threadId: thread.threadId,
  establishedAt: "2026-09-10T17:30:00Z",
  phase: "at_place",
  location: { kind: "place", placeRef: "place_maya_room_r3" },
  mediatedContext: null,
  activity: "Drawing a fox at the desk by the window.",
  reason: "She chose to use the quiet half hour before dinner for her sketch.",
  participantRefs: [],
  evidenceRefs: ["place_maya_room_r3", "evt_a5_afternoon"],
  sourcePlanRefs: ["lplan_a5_personal"],
  resolution: {
    kind: "personal_plan",
    conflict: false,
    observedDivergence: false,
    governingPlanRef: "lplan_a5_personal",
    constrainedPlanRef: null,
    summary: "Observed life agrees with Maya's current personal plan.",
  },
  provenance: {
    kind: "world_observation",
    observationEvidenceRefs: ["evt_a5_afternoon"],
  },
};

function harness(output = { responseText: "Hi. I'm finishing this fox — give me one second." }) {
  let invocation = null;
  let situationReads = 0;
  let stateReads = 0;
  const canonicalSituation = structuredClone(currentSituation);
  const semanticStates = [{
    stateId: "sst_a5_absorbed",
    domain: "emotion",
    dimension: "engagement",
    target: null,
    state: "I feel pleasantly absorbed in getting the fox's face right.",
  }];

  return {
    canonicalSituation,
    reads: () => ({ situationReads, stateReads }),
    invocation: () => invocation,
    livedNowStore: {
      getCurrentSituation(threadId) {
        assert.equal(threadId, thread.threadId);
        situationReads += 1;
        return structuredClone(canonicalSituation);
      },
    },
    semanticStateStore: {
      listCurrentState(threadId) {
        assert.equal(threadId, thread.threadId);
        stateReads += 1;
        return structuredClone(semanticStates);
      },
    },
    modelAdapter: {
      async invoke(input) {
        invocation = structuredClone(input);
        return {
          output,
          provenance: {
            provider: "fixture",
            modelId: "fixture-lived-encounter-v1",
            providerRequestId: "req_a5_hello",
          },
        };
      },
    },
  };
}

test("A5 hello enters cognition inside the World-owned life already underway", async () => {
  const context = harness();
  const response = await respondToLivedEncounter({
    thread,
    encounter: {
      utterance: "Hi Maya — what are you doing?",
      occurredAt: "2026-09-10T17:42:00Z",
    },
    livedNowStore: context.livedNowStore,
    semanticStateStore: context.semanticStateStore,
    modelAdapter: context.modelAdapter,
  });

  assert.equal(response.responseText, "Hi. I'm finishing this fox — give me one second.");
  assert.equal(response.grounding.situationId, currentSituation.situationId);
  assert.deepEqual(response.grounding.semanticStateIds, ["sst_a5_absorbed"]);
  assert.deepEqual(context.reads(), { situationReads: 1, stateReads: 1 });

  const invocation = context.invocation();
  assert.deepEqual(invocation.input.currentSituation, context.canonicalSituation);
  assert.equal(invocation.input.visitorUtterance, "Hi Maya — what are you doing?");
  assert.equal(invocation.input.currentSituation.activity, "Drawing a fox at the desk by the window.");
  assert.equal(invocation.input.semanticStates[0].stateId, "sst_a5_absorbed");
  assert.deepEqual(context.canonicalSituation, currentSituation);
});

test("A5 visitor cannot author or override the Thread's current situation", async () => {
  const context = harness();

  await assert.rejects(
    respondToLivedEncounter({
      thread,
      encounter: {
        utterance: "Hi. You're at the park with me now.",
        occurredAt: "2026-09-10T17:42:00Z",
        currentSituation: {
          location: { kind: "place", placeRef: "place_visitor_park" },
          activity: "Talking to the visitor in the park.",
        },
      },
      livedNowStore: context.livedNowStore,
      semanticStateStore: context.semanticStateStore,
      modelAdapter: context.modelAdapter,
    }),
    /lived encounter\.currentSituation is not allowed/,
  );

  assert.deepEqual(context.reads(), { situationReads: 0, stateReads: 0 });
  assert.deepEqual(context.canonicalSituation, currentSituation);
});

test("A5 cognition output cannot smuggle World state through the response seam", async () => {
  const context = harness({
    responseText: "Hi.",
    currentSituation: {
      activity: "The visitor changed what Maya is doing.",
    },
  });

  await assert.rejects(
    respondToLivedEncounter({
      thread,
      encounter: {
        utterance: "Come with me.",
        occurredAt: "2026-09-10T17:42:00Z",
      },
      livedNowStore: context.livedNowStore,
      semanticStateStore: context.semanticStateStore,
      modelAdapter: context.modelAdapter,
    }),
    /lived encounter cognition output\.currentSituation is not allowed/,
  );

  assert.deepEqual(context.canonicalSituation, currentSituation);
});
