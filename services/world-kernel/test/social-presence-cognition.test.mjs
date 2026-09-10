import assert from "node:assert/strict";
import test from "node:test";

import { evaluateIntrinsicRegulation } from "../../../core/src/intrinsic-regulation.mjs";
import { formSocialPresenceTarget } from "../src/social-presence-cognition.mjs";

const thread = {
  threadId: "thr_r2_maya",
  identity: {
    selfDescription: "I am ten, curious, independent, and close to the people I trust.",
  },
  currentState: {
    selfModel: "I like exploring on my own, but when I am unsettled I want familiar people nearby.",
    unresolvedIntentions: [],
  },
};

function relation(partyId, displayName, relationKind, fact) {
  return {
    relationId: `lrel_${partyId}`,
    revision: 1,
    threadId: thread.threadId,
    relatedParty: { partyId, kind: "human_source", displayName },
    relationKind,
    geneticContributionRole: "none",
    relationshipFacts: [fact],
    sourceReferences: ["evt_r2_birth"],
    validFrom: "2016-02-08T00:00:00Z",
    validTo: null,
    visibility: "private",
    provenance: "thread_history",
    recordedAt: "2026-09-10T17:00:00Z",
  };
}

function semanticState({ stateId, domain, dimension, target = null, state }) {
  return { stateId, domain, dimension, target, state };
}

function stores(states) {
  const relations = [
    relation(
      "human_maya_mother",
      "Maya's mother",
      "social_parent",
      "She has been a steady source of care and practical comfort across Maya's childhood.",
    ),
    relation(
      "human_art_teacher",
      "Maya's art teacher",
      "social_contact",
      "They know each other through weekly drawing sessions.",
    ),
  ];
  relations[1].factualRoleRefs = ["role_art_teacher"];
  return {
    situatedLifeStore: {
      listCurrentLifeRelations(threadId) {
        assert.equal(threadId, thread.threadId);
        return structuredClone(relations);
      },
    },
    semanticStateStore: {
      listCurrentState(threadId) {
        assert.equal(threadId, thread.threadId);
        return structuredClone(states);
      },
    },
  };
}

function model(output) {
  let invocation = null;
  return {
    invocation: () => invocation,
    adapter: {
      async invoke(input) {
        invocation = structuredClone(input);
        return {
          output,
          provenance: {
            provider: "fixture",
            modelId: "fixture-social-presence-v1",
            providerRequestId: "req_r2_social_presence",
          },
        };
      },
    },
  };
}

function percept(proximity) {
  return {
    asOf: "2026-09-10T17:30:00Z",
    internal: { energy: 0.8, fatigue: 0.2 },
    environment: {
      temperatureC: 22,
      lightLevel: 0.5,
      soundLoad: 0.2,
      crowding: 0.2,
      openness: 0.8,
    },
    social: [{
      entityRef: "human_maya_mother",
      proximity,
      familiarity: 1,
      calm: 0.8,
      contact: proximity > 0.9 ? 1 : 0,
      evidenceRefs: ["world:mother-presence"],
    }],
    evidenceRefs: ["world:r2-room"],
  };
}

function presence(frame) {
  return frame.drives.find((drive) => drive.family === "presence");
}

test("R2 Thread cognition chooses person-as-place from Fibre-owned current relationship and semantic context", async () => {
  const states = [
    semanticState({
      stateId: "sst_maya_connection",
      domain: "need",
      dimension: "connection",
      state: "Right now familiar company would make it easier to settle after a demanding afternoon.",
    }),
    semanticState({
      stateId: "sst_maya_mother_attachment",
      domain: "relationship_attitude",
      dimension: "attachment",
      target: { targetId: "human_maya_mother", kind: "human", displayName: "Maya's mother" },
      state: "Her presence is personally important to me, especially when the day has felt unsettled.",
    }),
    semanticState({
      stateId: "sst_unrelated_project",
      domain: "situation_attitude",
      dimension: "interest",
      target: { targetId: "project_other", kind: "project", displayName: "Other project" },
      state: "This unrelated project is interesting.",
    }),
  ];
  const context = stores(states);
  const chooser = model({ targetRef: "human_maya_mother", relation: "with" });

  const formed = await formSocialPresenceTarget({
    thread,
    asOf: "2026-09-10T17:30:00Z",
    ...context,
    modelAdapter: chooser.adapter,
  });

  assert.equal(formed.target.targetRef, "human_maya_mother");
  assert.equal(formed.target.relation, "with");
  assert.equal(formed.target.orientation, "approach");
  assert.equal(formed.target.actualSatisfaction, null);
  assert.equal(formed.target.predictedSatisfaction, null);
  assert.ok(formed.target.evidenceRefs.some((ref) => ref.startsWith("lrr:lrel_human_maya_mother:1")));
  assert.ok(formed.target.evidenceRefs.includes("sst_maya_connection"));
  assert.ok(formed.target.evidenceRefs.includes("sst_maya_mother_attachment"));

  const invocation = chooser.invocation();
  assert.equal(invocation.input.relationships.length, 2);
  assert.deepEqual(
    invocation.input.semanticStates.map((state) => state.stateId).sort(),
    ["sst_maya_connection", "sst_maya_mother_attachment"],
  );

  const separated = evaluateIntrinsicRegulation({
    perceptFrame: percept(0.05),
    targets: [formed.target],
  });
  const together = evaluateIntrinsicRegulation({
    perceptFrame: percept(1),
    targets: [formed.target],
  });
  assert.ok(presence(separated).pressure > presence(together).pressure);
  assert.equal(presence(together).attained, true);
});

test("R2 relationship role does not dictate proximity: the same cognition seam can author distance", async () => {
  const states = [
    semanticState({
      stateId: "sst_maya_mother_guarded",
      domain: "relationship_attitude",
      dimension: "guardedness",
      target: { targetId: "human_maya_mother", kind: "human", displayName: "Maya's mother" },
      state: "I want some space before talking because our last exchange still feels too intense.",
    }),
  ];
  const context = stores(states);
  const chooser = model({ targetRef: "human_maya_mother", relation: "away_from" });

  const formed = await formSocialPresenceTarget({
    thread,
    asOf: "2026-09-10T17:30:00Z",
    ...context,
    modelAdapter: chooser.adapter,
  });
  assert.equal(formed.target.orientation, "avoid");

  const tooClose = evaluateIntrinsicRegulation({
    perceptFrame: percept(0.95),
    targets: [formed.target],
  });
  const enoughSpace = evaluateIntrinsicRegulation({
    perceptFrame: percept(0.02),
    targets: [formed.target],
  });
  assert.ok(presence(tooClose).pressure > presence(enoughSpace).pressure);
  assert.equal(presence(enoughSpace).attained, true);
});
