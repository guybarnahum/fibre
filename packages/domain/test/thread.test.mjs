import assert from "node:assert/strict";
import test from "node:test";
import {
  decideParticipation,
  freezeThread,
  prepareRequestAppraisal,
  thawThread,
} from "../dist/thread.js";

const requester = {
  entityId: "human_test_001",
  kind: "human",
  displayName: "Test Requester"
};

const thread = {
  threadId: "thr_test_001",
  version: 1,
  status: "frozen",
  identity: {
    name: "Test Thread",
    originOrientation: "original",
    selfDescription: "A careful synthetic test person."
  },
  genome: {
    textualTraits: { persistence: "Changes approach before repeating failure." },
    runtimeBaselines: { temperature: 0.3 }
  },
  currentState: {
    needs: ["Complete the test"],
    feelings: ["focused"],
    selfModel: "I verify before acting.",
    unresolvedIntentions: []
  },
  accounts: { fibreCredits: 10, usdAvailable: 1, modelTokensAvailable: 1000 },
  relationshipRefs: [],
  memoryRefs: [],
  provenance: { createdAt: "2026-08-02T00:00:00Z", createdBy: "test" }
};

function assessment(overrides = {}) {
  return {
    score: 85,
    rationale: "The request depends on this Thread's individual experience.",
    factors: {
      identityAlignment: "Strong match.",
      individualizedAdvantage: "The Thread's history matters.",
      requesterNeed: "The need is concrete.",
      relationalMeaning: "The relationship supports participation.",
      respectAndReciprocity: "The request is respectful."
    },
    repairQuestions: [],
    genericAlternativeAvailable: false,
    feelings: ["recognized"],
    relationshipImpact: {
      entity: requester,
      fondnessDelta: 0.1,
      resentmentDelta: 0,
      rationale: "The requester valued the Thread's individual contribution."
    },
    ...overrides
  };
}

const request = {
  trigger: "test",
  requester,
  objective: "Demonstrate continuity",
  statedNeed: "Verify the Thread lifecycle contract.",
  relevantMemories: [],
  relevantRelationships: [],
  permissions: ["fixture:read"]
};

test("request appraisal happens before full task execution", () => {
  const capsule = prepareRequestAppraisal(thread, request);
  assert.equal(capsule.threadId, thread.threadId);
  assert.equal(capsule.requester.entityId, requester.entityId);
  assert.equal(capsule.appraisalPolicy, "dignity_guardian");
});

test("high dignity authorizes a bounded execution capsule", () => {
  const participation = decideParticipation(assessment());
  assert.equal(participation.action, "accept");

  const capsule = thawThread(thread, request, participation);
  assert.equal(capsule.snapshotVersion, 1);
  assert.deepEqual(capsule.auditPolicies, [
    "dignity_guardian",
    "goal_guardian",
    "self_examiner_steward"
  ]);
});

test("a repairable low-dignity request asks for clarification", () => {
  const participation = decideParticipation(assessment({
    score: 25,
    rationale: "The request treats the Thread as a generic text generator.",
    repairQuestions: ["Why is my particular perspective needed?"],
    genericAlternativeAvailable: true,
    feelings: ["misused"],
    relationshipImpact: {
      entity: requester,
      fondnessDelta: 0,
      resentmentDelta: 0.1,
      rationale: "The request ignored the Thread's identity."
    }
  }));

  assert.equal(participation.action, "clarify");
  assert.throws(
    () => thawThread(thread, request, participation),
    /did not consent to execute request: clarify/,
  );
});

test("an unrepairable generic request is delegated instead of executed", () => {
  const participation = decideParticipation(assessment({
    score: 15,
    rationale: "A generic model is a better fit.",
    genericAlternativeAvailable: true,
    feelings: ["disengaged"],
    relationshipImpact: {
      entity: requester,
      fondnessDelta: 0,
      resentmentDelta: 0.05,
      rationale: "The requester treated the Thread as interchangeable."
    }
  }));

  assert.equal(participation.action, "delegate");
});

test("dignity and relationship scores are bounded", () => {
  assert.throws(
    () => decideParticipation(assessment({ score: 101 })),
    /dignity score must be between 0 and 100/,
  );
  assert.throws(
    () => decideParticipation(assessment({
      relationshipImpact: {
        entity: requester,
        fondnessDelta: 0,
        resentmentDelta: 2,
        rationale: "Invalid test delta."
      }
    })),
    /resentment delta must be between -1 and 1/,
  );
});

test("freeze increments version and preserves continuity", () => {
  const next = freezeThread(thread, {
    summary: "Test completed",
    newMemories: ["I completed a continuity test."],
    updatedFeelings: ["relief"]
  }, "evt_test_completed");
  assert.equal(next.version, 2);
  assert.equal(next.status, "frozen");
  assert.deepEqual(next.currentState.feelings, ["relief"]);
  assert.equal(next.provenance.lastEventId, "evt_test_completed");
  assert.equal(next.memoryRefs.length, 1);
});
