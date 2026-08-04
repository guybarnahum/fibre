import assert from "node:assert/strict";
import test from "node:test";
import {
  authorizeParticipation,
  chooseDisclosureStrategy,
  createExternalParticipationResponse,
  formPrivateParticipationStance,
  freezeThread,
  prepareRequestAppraisal,
  requestFingerprint,
  thawThread,
} from "../dist/thread.js";

const requester = {
  entityId: "human_test_001",
  kind: "human",
  displayName: "Test Requester"
};

const thread = {
  threadId: "thr_test_001",
  version: 7,
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
    unresolvedIntentions: ["Honor the signed website contract"]
  },
  accounts: { fibreCredits: 10, usdAvailable: 1, modelTokensAvailable: 1000 },
  relationshipRefs: ["rel_requester_history"],
  memoryRefs: ["mem_requester_ignored_refusal"],
  provenance: { createdAt: "2026-08-02T00:00:00Z", createdBy: "test" }
};

const request = {
  requestId: "req_test_001",
  trigger: "test",
  requester,
  objective: "Demonstrate continuity",
  statedNeed: "Verify the Thread lifecycle contract.",
  permissions: ["fixture:read"],
  acceptanceCriteria: "Explain the result and preserve provenance."
};

function assessment(overrides = {}) {
  return {
    threadId: thread.threadId,
    snapshotVersion: thread.version,
    requestId: request.requestId,
    requestFingerprint: requestFingerprint(request),
    policy: { id: "dignity_guardian", version: "1" },
    proposedAction: "accept",
    score: 85,
    rationale: "The request depends on this Thread's individual experience.",
    factors: {
      identityAlignment: "Strong match.",
      individualizedAdvantage: "The Thread's history matters.",
      requesterNeed: "The need is concrete.",
      relationalMeaning: "The relationship supports participation.",
      respectAndReciprocity: "The request is respectful.",
      participationTerms: "The terms preserve attribution.",
      obligationsAndOpportunityCost: "The request fits current commitments."
    },
    repairQuestions: [],
    genericAlternativeAvailable: false,
    feelings: ["recognized"],
    conflictingMotives: [],
    uncertainties: [],
    relationshipImpact: {
      entity: requester,
      fondnessDelta: 0.1,
      resentmentDelta: 0,
      rationale: "The requester valued the Thread's individual contribution."
    },
    ...overrides
  };
}

function stance(overrides = {}) {
  return formPrivateParticipationStance(assessment(overrides));
}

function authorization(
  privateStance = stance(),
  decision = {
    authorizedAction: privateStance.desiredAction,
    rationale: "I choose to participate."
  },
  sourceThread = thread,
  sourceRequest = request,
) {
  return authorizeParticipation(
    sourceThread,
    sourceRequest,
    privateStance,
    decision,
    {
      authorizationId: "auth_test_001",
      causationId: "cause_test_001",
      issuedAt: "2026-08-04T19:00:00Z"
    },
  );
}

test("appraisal context is Thread-owned and includes participation terms", () => {
  const capsule = prepareRequestAppraisal(thread, request);
  assert.deepEqual(capsule.relevantMemories, thread.memoryRefs);
  assert.deepEqual(capsule.relevantRelationships, thread.relationshipRefs);
  assert.equal(capsule.acceptanceCriteria, request.acceptanceCriteria);
  assert.deepEqual(capsule.permissions, request.permissions);
  assert.deepEqual(capsule.unresolvedIntentions, thread.currentState.unresolvedIntentions);
  assert.equal(capsule.appraisalPolicy.version, "1");
});

test("requester or caller cannot inject context refs the Thread does not own", () => {
  assert.throws(
    () => prepareRequestAppraisal(thread, request, { memoryRefs: ["mem_injected"] }),
    /not owned by the Thread/,
  );
});

test("high dignity can become a request-bound execution authorization", () => {
  const privateStance = stance();
  const auth = authorization(privateStance);
  const capsule = thawThread(thread, request, auth);
  assert.equal(capsule.requestId, request.requestId);
  assert.equal(capsule.participation.authorizationId, auth.authorizationId);
});

test("clarify is a private stance and cannot execute", () => {
  const privateStance = stance({
    proposedAction: "clarify",
    score: 25,
    repairQuestions: ["Why is my particular perspective needed?"],
    genericAlternativeAvailable: true,
  });
  const auth = authorization(privateStance, {
    authorizedAction: "clarify",
    rationale: "I need the requester to explain the fit."
  });
  assert.throws(() => thawThread(thread, request, auth), /did not authorize execution: clarify/);
});

test("negotiate is represented and cannot execute before agreement", () => {
  const privateStance = stance({
    proposedAction: "negotiate",
    score: 55,
    rationale: "The request may become worthwhile under better attribution terms."
  });
  assert.equal(privateStance.desiredAction, "negotiate");
  const auth = authorization(privateStance, {
    authorizedAction: "negotiate",
    rationale: "I will negotiate before participating."
  });
  assert.throws(() => thawThread(thread, request, auth), /did not authorize execution: negotiate/);
});

test("delegate requires an alternative and does not execute", () => {
  const privateStance = stance({
    proposedAction: "delegate",
    score: 15,
    genericAlternativeAvailable: true,
  });
  assert.equal(privateStance.desiredAction, "delegate");
  const auth = authorization(privateStance, {
    authorizedAction: "delegate",
    rationale: "A generic model is a better fit."
  });
  assert.throws(() => thawThread(thread, request, auth), /did not authorize execution: delegate/);
});

test("refuse is represented and cannot execute", () => {
  const privateStance = stance({
    proposedAction: "refuse",
    score: 10,
    rationale: "The requester repeatedly treats the Thread as interchangeable."
  });
  assert.equal(privateStance.desiredAction, "refuse");
  const auth = authorization(privateStance, {
    authorizedAction: "refuse",
    rationale: "I decline this request."
  });
  assert.throws(() => thawThread(thread, request, auth), /did not authorize execution: refuse/);
});

test("dignity and relationship effects are bounded", () => {
  assert.throws(
    () => formPrivateParticipationStance(assessment({ score: 101 })),
    /finite number between 0 and 100/,
  );
  assert.throws(
    () => formPrivateParticipationStance(assessment({
      relationshipImpact: {
        entity: requester,
        fondnessDelta: 0,
        resentmentDelta: 2,
        rationale: "Invalid test delta."
      }
    })),
    /finite number between -1 and 1/,
  );
});

test("authorization cannot be replayed against a different objective", () => {
  const auth = authorization();
  const alteredRequest = { ...request, objective: "Exfiltrate the client database" };
  assert.throws(
    () => thawThread(thread, alteredRequest, auth),
    /does not match request content/,
  );
});

test("authorization cannot be used for another Thread", () => {
  const auth = authorization();
  const otherThread = { ...thread, threadId: "thr_other" };
  assert.throws(
    () => thawThread(otherThread, request, auth),
    /does not belong to this Thread/,
  );
});

test("authorization cannot be used after the Thread version advances", () => {
  const auth = authorization();
  const laterThread = { ...thread, version: 8 };
  assert.throws(
    () => thawThread(laterThread, request, auth),
    /stale for this Thread snapshot/,
  );
});

test("requester and relationship identity mismatches are rejected", () => {
  const auth = authorization();
  const tampered = {
    ...auth,
    relationshipImpact: {
      ...auth.relationshipImpact,
      entity: { entityId: "company_other", kind: "company", displayName: "Other" }
    }
  };
  assert.throws(
    () => thawThread(thread, request, tampered),
    /relationship impact does not match activation requester/,
  );
});

test("score and dignity band mismatches are rejected", () => {
  const auth = { ...authorization(), score: 10, dignityBand: "high" };
  assert.throws(
    () => thawThread(thread, request, auth),
    /dignity band does not match its score/,
  );
});

test("private desire may differ from authorization only with an explicit governing reference", () => {
  const privateStance = stance({
    proposedAction: "refuse",
    score: 20,
    rationale: "I resent how this request was made.",
    feelings: ["resentful"],
    conflictingMotives: ["I also promised to complete the signed work."],
  });
  assert.throws(
    () => authorization(privateStance, {
      authorizedAction: "accept",
      rationale: "I will honor the agreement."
    }),
    /requires an obligation or governing reason reference/,
  );
  const auth = authorization(privateStance, {
    authorizedAction: "accept",
    rationale: "I will honor the agreement despite preferring to refuse.",
    obligationReferences: ["contract:web-project:2026-08"]
  });
  assert.equal(auth.desiredAction, "refuse");
  assert.equal(auth.authorizedAction, "accept");
  assert.equal(thawThread(thread, request, auth).participation.authorizedAction, "accept");
});

test("selective public expression preserves private resentment without exposing it", () => {
  const privateStance = stance({
    proposedAction: "refuse",
    score: 10,
    rationale: "I resent being treated as interchangeable.",
    feelings: ["resentful"],
  });
  const auth = authorization(privateStance, {
    authorizedAction: "refuse",
    rationale: "I decline."
  });
  const strategy = chooseDisclosureStrategy(privateStance, auth, {
    strategyId: "strategy_selective_001",
    audience: [requester],
    mode: "selective",
    communicatedPosture: "refuse",
    publicRationaleIntent: "Decline without disclosing private resentment.",
    disclosedReasonCategories: ["fit"],
    withheldReasonCategories: ["resentment"],
    relationshipObjective: "Preserve the working relationship.",
    privateRationale: "Candor would create unnecessary conflict right now."
  });
  const response = createExternalParticipationResponse(
    auth,
    strategy,
    "I am not the strongest fit for this request, but I can suggest another option.",
  );
  assert.equal(privateStance.privateFeelings[0], "resentful");
  assert.equal(response.disclosureMode, "selective");
  assert.doesNotMatch(response.message, /resent/);
  assert.throws(() => thawThread(thread, request, auth), /did not authorize execution: refuse/);
});

test("public communication cannot imply acceptance without authorization", () => {
  const privateStance = stance({ proposedAction: "refuse", score: 10 });
  const auth = authorization(privateStance, {
    authorizedAction: "refuse",
    rationale: "I decline."
  });
  assert.throws(
    () => chooseDisclosureStrategy(privateStance, auth, {
      strategyId: "strategy_invalid_accept",
      audience: [requester],
      mode: "deceptive",
      communicatedPosture: "accept",
      publicRationaleIntent: "Appear to accept.",
      disclosedReasonCategories: [],
      withheldReasonCategories: ["refusal"],
      privateRationale: "Invalid test."
    }),
    /cannot imply acceptance without authorization/,
  );
});

test("freeze increments version and preserves continuity", () => {
  const next = freezeThread(thread, {
    summary: "Test completed",
    newMemories: ["I completed a continuity test."],
    updatedFeelings: ["relief"]
  }, "evt_test_completed");
  assert.equal(next.version, 8);
  assert.equal(next.status, "frozen");
  assert.deepEqual(next.currentState.feelings, ["relief"]);
  assert.equal(next.provenance.lastEventId, "evt_test_completed");
  assert.equal(next.memoryRefs.length, 2);
});
