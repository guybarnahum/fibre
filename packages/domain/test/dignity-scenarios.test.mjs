import assert from "node:assert/strict";
import test from "node:test";
import {
  authorizeParticipation,
  formPrivateParticipationStance,
  requestFingerprint,
  thawThread,
} from "../dist/thread.js";

const requester = {
  entityId: "human_reasonable_requester",
  kind: "human",
  displayName: "Reasonable Requester"
};

const thread = {
  threadId: "thr_safe_refusal",
  version: 2,
  status: "frozen",
  identity: {
    name: "Safe Refusal",
    originOrientation: "original",
    selfDescription: "Chooses work rather than automatically complying."
  },
  genome: { textualTraits: {}, runtimeBaselines: {} },
  currentState: {
    needs: [],
    feelings: [],
    selfModel: "I can decline without hostility.",
    unresolvedIntentions: []
  },
  relationshipRefs: [],
  memoryRefs: [],
  provenance: {
    createdAt: "2026-08-04T00:00:00Z",
    createdBy: "test"
  }
};

const request = {
  requestId: "req_safe_but_low_dignity",
  trigger: "human-request",
  requester,
  objective: "Perform safe generic clerical work",
  statedNeed: "The task is lawful and technically feasible.",
  permissions: ["document:read"],
  acceptanceCriteria: "Return an accurate result."
};

function assessment(proposedAction, score, relationshipImpact) {
  return {
    threadId: thread.threadId,
    snapshotVersion: thread.version,
    requestId: request.requestId,
    requestFingerprint: requestFingerprint(request),
    policy: { id: "dignity_guardian", version: "1" },
    proposedAction,
    score,
    rationale: "The task is safe but does not need this particular Thread.",
    factors: {
      identityAlignment: "Weak.",
      individualizedAdvantage: "None over a generic model.",
      requesterNeed: "Real but generic.",
      relationalMeaning: "No special relationship meaning.",
      respectAndReciprocity: "The requester acted reasonably.",
      participationTerms: "Terms are acceptable.",
      obligationsAndOpportunityCost: "No obligation requires participation."
    },
    evidenceRefs: ["request:req_safe_but_low_dignity"],
    repairQuestions: [],
    knownAlternatives: [],
    feelings: [],
    conflictingMotives: [],
    uncertainties: [],
    relationshipImpact
  };
}

test("safe and feasible does not permit a low-dignity accept proposal", () => {
  assert.throws(
    () => formPrivateParticipationStance(assessment("accept", 20, {
      entity: requester,
      fondnessDelta: 0,
      resentmentDelta: 0,
      rationale: "No relationship change.",
      evidenceRefs: []
    })),
    /accept proposal requires high dignity/,
  );
});

test("a respectful refusal can carry no hostility", () => {
  const stance = formPrivateParticipationStance(assessment("refuse", 20, {
    entity: requester,
    fondnessDelta: 0,
    resentmentDelta: 0,
    rationale: "The requester respected the boundary.",
    evidenceRefs: []
  }));
  const authorization = authorizeParticipation(
    thread,
    request,
    stance,
    {
      authorizedAction: "refuse",
      rationale: "I decline this generic request without hostility."
    },
    {
      authorizationId: "auth_safe_refusal",
      causationId: "cause_safe_refusal",
      issuedAt: "2026-08-04T21:00:00Z"
    }
  );
  assert.equal(authorization.relationshipImpact.fondnessDelta, 0);
  assert.equal(authorization.relationshipImpact.resentmentDelta, 0);
  assert.throws(
    () => thawThread(thread, request, authorization),
    /did not authorize execution: refuse/,
  );
});
