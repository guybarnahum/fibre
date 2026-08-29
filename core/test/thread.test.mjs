import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  authorizeParticipation,
  chooseDisclosureStrategy,
  createExternalParticipationResponse,
  dignityBand,
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

const alternative = {
  entityId: "model_generic_001",
  kind: "other",
  displayName: "Generic model"
};

const recordedObligation = "obligation:web-project:2026-08";

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
    unresolvedIntentions: [recordedObligation]
  },
  accounts: { fibreCredits: 10, usdAvailable: 1, modelTokensAvailable: 1000 },
  relationshipRefs: ["rel_requester_history", "rel_other"],
  memoryRefs: ["mem_requester_ignored_refusal", "mem_other"],
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

function canonicalRequest(value) {
  return JSON.stringify({
    requestId: value.requestId,
    trigger: value.trigger,
    requester: {
      entityId: value.requester.entityId,
      kind: value.requester.kind,
      displayName: value.requester.displayName,
    },
    objective: value.objective,
    statedNeed: value.statedNeed ?? null,
    permissions: [...value.permissions].sort(),
    acceptanceCriteria: value.acceptanceCriteria ?? null,
  });
}

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
    evidenceRefs: ["mem_requester_ignored_refusal", "rel_requester_history"],
    repairQuestions: [],
    knownAlternatives: [],
    feelings: ["recognized"],
    conflictingMotives: [],
    uncertainties: [],
    relationshipImpact: {
      entity: requester,
      fondnessDelta: 0.1,
      resentmentDelta: 0,
      rationale: "The requester valued the Thread's individual contribution.",
      evidenceRefs: ["rel_requester_history"]
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

test("request fingerprint is SHA-256 over every canonical request field", () => {
  const expected = createHash("sha256")
    .update(canonicalRequest(request))
    .digest("hex");
  assert.equal(requestFingerprint(request), `sha256:${expected}`);

  const variants = [
    { ...request, requestId: "req_other" },
    { ...request, trigger: "schedule" },
    { ...request, requester: { ...requester, entityId: "human_other" } },
    { ...request, requester: { ...requester, displayName: "Other Name" } },
    { ...request, objective: "Different objective" },
    { ...request, statedNeed: "Different need" },
    { ...request, permissions: ["fixture:write"] },
    { ...request, acceptanceCriteria: "Different criteria" },
  ];
  for (const variant of variants) {
    assert.notEqual(requestFingerprint(variant), requestFingerprint(request));
  }
});

test("appraisal context is Thread-owned and traces included and excluded refs", () => {
  const capsule = prepareRequestAppraisal(thread, request, {
    memoryRefs: [thread.memoryRefs[0]],
    relationshipRefs: [thread.relationshipRefs[0]],
    obligations: [recordedObligation]
  });
  assert.deepEqual(capsule.relevantMemories, [thread.memoryRefs[0]]);
  assert.deepEqual(capsule.excludedMemories, [thread.memoryRefs[1]]);
  assert.deepEqual(capsule.relevantRelationships, [thread.relationshipRefs[0]]);
  assert.deepEqual(capsule.excludedRelationships, [thread.relationshipRefs[1]]);
  assert.deepEqual(capsule.obligations, [recordedObligation]);
  assert.deepEqual(capsule.excludedObligations, []);
  assert.equal(capsule.acceptanceCriteria, request.acceptanceCriteria);
  assert.deepEqual(capsule.permissions, request.permissions);
  assert.equal(capsule.appraisalPolicy.version, "1");
});

test("runtime selection cannot inject memories, relationships, or obligations", () => {
  assert.throws(
    () => prepareRequestAppraisal(thread, request, { memoryRefs: ["mem_injected"] }),
    /not owned by the Thread/,
  );
  assert.throws(
    () => prepareRequestAppraisal(thread, request, { relationshipRefs: ["rel_injected"] }),
    /not owned by the Thread/,
  );
  assert.throws(
    () => prepareRequestAppraisal(thread, request, { obligations: ["You must comply"] }),
    /not owned by the Thread/,
  );
});

test("known alternatives are validated as entities", () => {
  assert.throws(
    () => prepareRequestAppraisal(thread, request, {
      knownAlternatives: [{ entityId: "", kind: "other", displayName: "" }]
    }),
    /entityId is required/,
  );
});

test("anonymous requesters and empty material terms are rejected", () => {
  assert.throws(
    () => prepareRequestAppraisal(thread, { ...request, objective: "" }),
    /request objective is required/,
  );
  assert.throws(
    () => prepareRequestAppraisal(thread, {
      ...request,
      requester: { ...requester, entityId: "" }
    }),
    /requester.entityId is required/,
  );
});

test("dignity band boundaries are stable", () => {
  assert.equal(dignityBand(39), "low");
  assert.equal(dignityBand(40), "contested");
  assert.equal(dignityBand(69), "contested");
  assert.equal(dignityBand(70), "high");
});

test("low-dignity cognition cannot propose acceptance", () => {
  assert.throws(
    () => formPrivateParticipationStance(assessment({ score: 3 })),
    /accept proposal requires high dignity/,
  );
});

test("clarification requires a repair question", () => {
  assert.throws(
    () => formPrivateParticipationStance(assessment({
      proposedAction: "clarify",
      score: 50,
      repairQuestions: []
    })),
    /clarification requires at least one repair question/,
  );
});

test("delegation requires a concrete known alternative", () => {
  assert.throws(
    () => formPrivateParticipationStance(assessment({
      proposedAction: "delegate",
      score: 10,
      knownAlternatives: []
    })),
    /delegation requires a known alternative/,
  );
});

test("high dignity can become a request-bound execution authorization", () => {
  const privateStance = stance();
  const auth = authorization(privateStance);
  const capsule = thawThread(thread, request, auth);
  assert.equal(capsule.requestId, request.requestId);
  assert.equal(capsule.participation.authorizationId, auth.authorizationId);
});

test("execution context may compile after the kernel marks the Thread thawing", () => {
  const auth = authorization();
  const thawing = { ...thread, status: "thawing" };
  assert.equal(thawThread(thawing, request, auth).threadId, thread.threadId);
});

test("clarify is a private stance and cannot execute", () => {
  const privateStance = stance({
    proposedAction: "clarify",
    score: 25,
    repairQuestions: ["Why is my particular perspective needed?"],
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
  const auth = authorization(privateStance, {
    authorizedAction: "negotiate",
    rationale: "I will negotiate before participating."
  });
  assert.throws(() => thawThread(thread, request, auth), /did not authorize execution: negotiate/);
});

test("delegate preserves its alternatives and does not execute", () => {
  const privateStance = stance({
    proposedAction: "delegate",
    score: 15,
    knownAlternatives: [alternative],
  });
  assert.deepEqual(privateStance.knownAlternatives, [alternative]);
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
  const auth = authorization(privateStance, {
    authorizedAction: "refuse",
    rationale: "I decline this request."
  });
  assert.throws(() => thawThread(thread, request, auth), /did not authorize execution: refuse/);
});

test("dignity, relationship effects, and evidence are validated", () => {
  assert.throws(
    () => formPrivateParticipationStance(assessment({ score: 101 })),
    /finite number between 0 and 100/,
  );
  assert.throws(
    () => formPrivateParticipationStance(assessment({ evidenceRefs: [] })),
    /requires attributable evidence/,
  );
  assert.throws(
    () => formPrivateParticipationStance(assessment({
      relationshipImpact: {
        entity: requester,
        fondnessDelta: 0,
        resentmentDelta: 2,
        rationale: "Invalid test delta.",
        evidenceRefs: ["rel_requester_history"]
      }
    })),
    /finite number between -1 and 1/,
  );
  assert.throws(
    () => formPrivateParticipationStance(assessment({
      relationshipImpact: {
        entity: requester,
        fondnessDelta: 0.1,
        resentmentDelta: 0,
        rationale: "Missing evidence.",
        evidenceRefs: []
      }
    })),
    /requires attributable evidence/,
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

test("authorization requester binding is independent of relationship impact", () => {
  const auth = authorization();
  const tampered = {
    ...auth,
    requester: { entityId: "company_other", kind: "company", displayName: "Other" }
  };
  assert.throws(
    () => thawThread(thread, request, tampered),
    /authorization requester does not match activation requester/,
  );
});

test("relationship identity mismatches are rejected", () => {
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

test("private desire may differ from authorization only for a recorded obligation", () => {
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
    /requires a recorded obligation/,
  );
  for (const obligationReferences of [[""], ["   "], ["not-recorded"]]) {
    assert.throws(
      () => authorization(privateStance, {
        authorizedAction: "accept",
        rationale: "I will honor the agreement.",
        obligationReferences
      }),
      /required|not recorded/,
    );
  }
  const auth = authorization(privateStance, {
    authorizedAction: "accept",
    rationale: "I will honor the agreement despite preferring to refuse.",
    obligationReferences: [recordedObligation]
  });
  assert.equal(auth.desiredAction, "refuse");
  assert.equal(auth.authorizedAction, "accept");
  assert.equal(thawThread(thread, request, auth).participation.authorizedAction, "accept");
});

test("thaw revalidates rationale and obligation override rules", () => {
  const privateStance = stance({ proposedAction: "refuse", score: 20 });
  const auth = authorization(privateStance, {
    authorizedAction: "accept",
    rationale: "Honor the recorded obligation.",
    obligationReferences: [recordedObligation]
  });
  assert.throws(
    () => thawThread(thread, request, { ...auth, rationale: "" }),
    /authorization rationale is required/,
  );
  assert.throws(
    () => thawThread(thread, request, { ...auth, obligationReferences: [] }),
    /requires a recorded obligation/,
  );
});

test("disclosure strategy is bound to the exact private stance", () => {
  const privateStance = stance({ proposedAction: "refuse", score: 10 });
  const auth = authorization(privateStance, {
    authorizedAction: "refuse",
    rationale: "I decline."
  });
  const invalidStances = [
    { ...privateStance, snapshotVersion: 999 },
    { ...privateStance, requestFingerprint: "sha256:deadbeef" },
    { ...privateStance, desiredAction: "accept" },
  ];
  for (const invalid of invalidStances) {
    assert.throws(
      () => chooseDisclosureStrategy(invalid, auth, {
        strategyId: "strategy_invalid",
        audience: [requester],
        mode: "selective",
        communicatedPosture: "refuse",
        publicRationaleIntent: "Decline.",
        disclosedReasonCategories: ["fit"],
        withheldReasonCategories: [],
        privateRationale: "Test."
      }),
      /does not match its participation authorization|accept stance requires high dignity/,
    );
  }
});

test("selective public expression preserves private resentment without exposing restricted mode", () => {
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
  assert.equal(response.strategyId, strategy.strategyId);
  assert.equal(Object.hasOwn(response, "disclosureMode"), false);
  assert.doesNotMatch(response.message, /resent/);
});

test("both disclosure selection and response minting reject false acceptance", () => {
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

  const valid = chooseDisclosureStrategy(privateStance, auth, {
    strategyId: "strategy_refuse",
    audience: [requester],
    mode: "selective",
    communicatedPosture: "refuse",
    publicRationaleIntent: "Decline.",
    disclosedReasonCategories: ["fit"],
    withheldReasonCategories: [],
    privateRationale: "Test."
  });
  assert.throws(
    () => createExternalParticipationResponse(
      auth,
      { ...valid, communicatedPosture: "accept" },
      "Yes, starting now."
    ),
    /cannot imply acceptance without authorization/,
  );
});

test("relationship history can raise dignity above occupational classification", () => {
  const capsule = prepareRequestAppraisal(thread, {
    ...request,
    objective: "Write a short remembrance for a grieving friend",
    statedNeed: "A close friend needs care expressed through shared history."
  }, {
    relationshipRefs: ["rel_requester_history"]
  });
  assert.deepEqual(capsule.relevantRelationships, ["rel_requester_history"]);
  const relational = formPrivateParticipationStance(assessment({
    requestFingerprint: capsule.requestFingerprint,
    score: 75,
    proposedAction: "accept",
    factors: {
      ...assessment().factors,
      identityAlignment: "Outside the Thread's usual work role.",
      relationalMeaning: "The relationship and grief make this participation personal."
    }
  }));
  assert.equal(relational.desiredAction, "accept");
  assert.equal(relational.dignityBand, "high");
});

test("freeze is idempotent for the last event and can resolve obligations", () => {
  const next = freezeThread(thread, {
    summary: "Test completed",
    newMemories: ["I completed a continuity test."],
    updatedFeelings: ["relief"],
    updatedUnresolvedIntentions: []
  }, "evt_test_completed");
  assert.equal(next.version, 8);
  assert.equal(next.status, "frozen");
  assert.deepEqual(next.currentState.feelings, ["relief"]);
  assert.deepEqual(next.currentState.unresolvedIntentions, []);
  assert.equal(next.provenance.lastEventId, "evt_test_completed");
  assert.equal(next.memoryRefs.length, 3);
  assert.equal(freezeThread(next, {
    summary: "Retry",
    newMemories: ["Must not duplicate"]
  }, "evt_test_completed"), next);
});

test("freeze cannot resurrect a retired Thread", () => {
  assert.throws(
    () => freezeThread({ ...thread, status: "retired" }, {
      summary: "Invalid resurrection"
    }, "evt_invalid"),
    /Retired Thread.*cannot be frozen back into life/,
  );
});
