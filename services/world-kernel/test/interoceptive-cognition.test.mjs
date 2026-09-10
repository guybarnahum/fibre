import assert from "node:assert/strict";
import test from "node:test";

import { evaluateIntrinsicRegulation } from "../../../core/src/intrinsic-regulation.mjs";
import {
  interpretIntrinsicRegulation,
  projectInteroception,
} from "../src/interoceptive-cognition.mjs";
import {
  normalizeSemanticStateRecord,
  semanticStateIdFor,
} from "../src/semantic-state.mjs";

function thread(threadId, selfModel) {
  return {
    threadId,
    identity: {
      selfDescription: "I am a persistent Fibre Thread with my own history and relationships.",
    },
    currentState: {
      selfModel,
      unresolvedIntentions: [],
    },
  };
}

function semanticStore(initial = []) {
  let current = structuredClone(initial);
  const recorded = [];
  return {
    recorded,
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
      recorded.push(state);
      return { state, created: true };
    },
  };
}

function model(interpret) {
  const invocations = [];
  return {
    invocations,
    adapter: {
      async invoke(input) {
        invocations.push(structuredClone(input));
        return {
          output: interpret(input.input),
          provenance: {
            provider: "fixture",
            modelId: "fixture-interoception-v1",
            providerRequestId: `req_interoception_${invocations.length}`,
          },
        };
      },
    },
  };
}

function separatedFromCaregiver() {
  return evaluateIntrinsicRegulation({
    perceptFrame: {
      asOf: "2026-09-10T18:10:00Z",
      internal: { energy: 0.75, fatigue: 0.25 },
      environment: {
        temperatureC: 22,
        lightLevel: 0.5,
        soundLoad: 0.2,
        crowding: 0.2,
        openness: 0.8,
      },
      social: [{
        entityRef: "human_caregiver",
        proximity: 0.08,
        familiarity: 1,
        calm: 0.4,
        evidenceRefs: ["world:caregiver-across-space"],
      }],
      evidenceRefs: ["world:room-now"],
    },
    targets: [{
      targetId: "social_presence_caregiver",
      targetKind: "entity",
      targetRef: "human_caregiver",
      relation: "with",
      orientation: "approach",
      actualSatisfaction: null,
      expectedSatisfaction: 0.8,
      predictedSatisfaction: null,
      urgency: 0.5,
      evidenceRefs: ["lrr:caregiver:1", "sst:connection-context"],
    }],
  });
}

test("R3 low-level regulation reaches cognition as evidence, then Thread cognition authors semantic state", async () => {
  const maya = thread(
    "thr_r3_maya",
    "When a demanding day unsettles me, familiar company helps me settle, though I still want room to decide what happens next.",
  );
  const store = semanticStore([{
    stateId: "sst_existing_attachment",
    domain: "relationship_attitude",
    dimension: "attachment",
    target: { targetId: "human_caregiver", kind: "human", displayName: "Caregiver" },
    state: "This person is important to me and has often been a steady presence.",
  }]);
  const cognition = model(() => ({
    states: [
      {
        domain: "emotion",
        dimension: "worry",
        state: "I feel unsettled while someone I expected nearby still feels out of reach.",
      },
      {
        domain: "need",
        dimension: "connection",
        state: "I want familiar company more than usual right now.",
      },
    ],
  }));
  const frame = separatedFromCaregiver();

  const result = await interpretIntrinsicRegulation({
    thread: maya,
    regulationFrame: frame,
    semanticStateStore: store,
    modelAdapter: cognition.adapter,
  });

  assert.deepEqual(result.states.map((state) => state.dimension), ["worry", "connection"]);
  assert.equal(result.states.every((state) => state.provenance.author === maya.threadId), true);
  assert.equal(result.states.every((state) => state.provenance.authorType === "thread_cognition"), true);
  assert.ok(result.states.every((state) => state.evidenceReferences.includes("world:caregiver-across-space")));
  assert.ok(result.states.every((state) => state.evidenceReferences.includes("lrr:caregiver:1")));

  const invocation = cognition.invocations[0].input;
  assert.equal(invocation.currentSemanticState[0].stateId, "sst_existing_attachment");
  assert.equal(invocation.interoception.drives.some((drive) => drive.family === "presence"), true);
  const rawInteroception = JSON.stringify(invocation.interoception);
  assert.equal(rawInteroception.includes("worry"), false);
  assert.equal(rawInteroception.includes("lonely"), false);
  assert.equal(rawInteroception.includes("love"), false);
});

test("R3 the same regulation can become different semantic experience for different Threads", async () => {
  const frame = separatedFromCaregiver();
  const interpreter = model((input) => {
    if (input.thread.selfModel.includes("separation becomes uncertainty")) {
      return {
        states: [{
          domain: "emotion",
          dimension: "worry",
          state: "I keep wondering whether the separation means something has gone wrong.",
        }],
      };
    }
    return {
      states: [{
        domain: "emotion",
        dimension: "frustration",
        state: "I dislike being stuck waiting for someone else when I was ready to move on.",
      }],
    };
  });

  const uncertain = await interpretIntrinsicRegulation({
    thread: thread(
      "thr_r3_uncertain",
      "Unexpected separation becomes uncertainty for me until I understand what changed.",
    ),
    regulationFrame: structuredClone(frame),
    semanticStateStore: semanticStore(),
    modelAdapter: interpreter.adapter,
  });
  const independent = await interpretIntrinsicRegulation({
    thread: thread(
      "thr_r3_independent",
      "I value closeness, but waiting around when I am ready to act tends to feel like blocked momentum.",
    ),
    regulationFrame: structuredClone(frame),
    semanticStateStore: semanticStore(),
    modelAdapter: interpreter.adapter,
  });

  assert.equal(uncertain.states[0].dimension, "worry");
  assert.equal(independent.states[0].dimension, "frustration");
  assert.deepEqual(
    projectInteroception(frame),
    projectInteroception(structuredClone(frame)),
  );
});
