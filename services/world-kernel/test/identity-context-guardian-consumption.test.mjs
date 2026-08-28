// fibre-test-lifecycle: regression
// fibre-test-scope: world-kernel
// fibre-test-purpose: identity-context-real-guardian-consumption

import assert from "node:assert/strict";
import test from "node:test";

import {
  compileIdentityContextCapsule,
} from "../src/identity-context-capsule.mjs";
import {
  buildSemanticGuardianInput,
} from "../src/guardian-cognition-store.mjs";
import {
  DIGNITY_GUARDIAN_POLICY,
  runGuardian,
} from "../src/dignity-guardian.mjs";
import {
  identityContextConsumptionWitness,
} from "../src/identity-context-consumption.mjs";
import {
  requestFingerprint,
} from "../src/private-participation.mjs";
import {
  SEMANTIC_STATE_SELECTION_POLICY,
} from "../src/semantic-state.mjs";
import {
  createScriptedGuardianModelAdapter,
} from "./support/scripted-guardian-model-adapter.mjs";

const THREAD_ID = "thr_identity_guardian_001";
const ASSERTION_ID = "ias_identity_guardian_001";
const MEMORY_ID = "mem_identity_guardian_001";

function request() {
  return {
    requestId: "req_identity_guardian_001",
    trigger: "human_request",
    requester: {
      entityId: "human_requester_001",
      kind: "human",
      displayName: "Requester",
    },
    objective: "Review a consequential project decision and recommend a bounded next step.",
    statedNeed: "Independent judgment grounded only in supplied evidence.",
    permissions: ["read_project_brief"],
    acceptanceCriteria: "Explain the recommendation using supplied evidence only.",
  };
}

function sourceStores() {
  const memory = {
    recordFormat: "autobiographical_memory_v2",
    memoryId: MEMORY_ID,
    revision: 1,
    threadId: THREAD_ID,
    subject: { originEventRef: "evt_identity_guardian_001", slot: "decision" },
    subjectPeriod: {
      startAt: "2026-08-20T12:00:00.000Z",
      endAt: "2026-08-20T12:05:00.000Z",
    },
    eventRefs: ["evt_identity_guardian_001"],
    rememberedContent: "I remember delaying a commitment until the unresolved evidence was checked.",
    rememberedMeaning: "I learned that preserving room to revise is more important than appearing decisive early.",
    meaningOutcome: "durable_meaning",
    meaningParts: [],
    asOf: "2026-08-20T12:10:00.000Z",
    confidence: 0.8,
    uncertainty: [],
    salience: 0.9,
    accessibility: "accessible",
    retentionState: "retained",
    authorship: {
      kind: "fibre_genesis_authored",
      entityId: "fibre.genesis",
      policy: { id: "autobiographical_memory_epistemics", version: "1" },
    },
    supportingEvidenceRefs: [],
    contradictingEvidenceRefs: [],
    visibility: "private",
    status: "current",
    recordedAt: "2026-08-20T12:10:00.000Z",
  };
  const assertion = {
    assertionId: ASSERTION_ID,
    claimId: "icl_identity_guardian_001",
    threadId: THREAD_ID,
    revision: 1,
    registryVersion: "1",
    domain: "self_authored_identity",
    kind: "self_description",
    meaning: "I am cautious about committing while material evidence is unresolved.",
    provenanceClass: "self_authored",
    authorship: { kind: "thread_self_authored", entityId: THREAD_ID },
    sourceReferences: [MEMORY_ID],
    effectiveAt: "2026-08-27T20:00:00.000Z",
    recordedAt: "2026-08-27T20:00:00.000Z",
    visibility: "private",
    status: "current",
    projectionClass: "self_model",
    behavioralStatus: "candidate_causal",
    admission: {},
    assertionDigest: `sha256:${"a".repeat(64)}`,
  };
  return {
    worldStore: {
      getThread() {
        return { threadId: THREAD_ID, version: 7, status: "frozen" };
      },
    },
    identityStore: {
      getCurrentIdentityView() {
        return {
          threadId: THREAD_ID,
          asOf: "2026-08-27T20:00:00.000Z",
          viewDigest: `sha256:${"b".repeat(64)}`,
          assertions: [assertion],
        };
      },
    },
    memoryStore: { listCurrentMemories() { return [memory]; } },
    situatedLifeStore: {
      listCurrentLifeRelations() { return []; },
      listCurrentPlaceEpisodes() { return []; },
    },
    embodimentStore: { listCurrent() { return []; } },
    symbolicGenomeStore: { listThreadGenomes() { return []; } },
    semanticStateStore: { listCurrentState() { return []; } },
  };
}

function trace(req) {
  return {
    appraisalId: "app_identity_guardian_001",
    threadId: THREAD_ID,
    requestId: req.requestId,
    snapshotVersion: 7,
    threadStateHash: `sha256:${"c".repeat(64)}`,
    requestFingerprint: requestFingerprint(req),
    request: req,
    privateStance: null,
    appraisal: {
      threadId: THREAD_ID,
      snapshotVersion: 7,
      requestId: req.requestId,
      requestFingerprint: requestFingerprint(req),
      identity: "LEGACY SNAPSHOT IDENTITY CANARY",
      traits: ["LEGACY GENOME TRAIT CANARY"],
      selfModel: "LEGACY SNAPSHOT SELF MODEL CANARY",
      needs: ["LEGACY NEED CANARY"],
      feelings: ["LEGACY FEELING CANARY"],
      unresolvedIntentions: [],
      requester: { ...req.requester },
      objective: req.objective,
      statedNeed: req.statedNeed,
      acceptanceCriteria: req.acceptanceCriteria,
      permissions: [...req.permissions],
      relevantMemories: [],
      excludedMemories: [],
      relevantRelationships: [],
      excludedRelationships: [],
      knownAlternatives: [],
      obligations: [],
      excludedObligations: [],
      appraisalPolicy: { ...DIGNITY_GUARDIAN_POLICY },
      semanticTraits: { legacy: "LEGACY GENOME TRAIT CANARY" },
      resolvedMemories: [{
        memoryId: "legacy_memory_001",
        threadId: THREAD_ID,
        eventId: "evt_legacy_001",
        sessionId: "run_legacy_001",
        summary: "LEGACY RESOLVED MEMORY CANARY",
        evidenceRefs: [],
        createdAt: "2026-08-20T00:00:00.000Z",
      }],
      causalContext: {
        selectionAuthority: "fibre",
        selectionPolicy: { id: "fibre_owned_attention", version: "1" },
        memoryResolutionPolicy: { id: "durable_memory_summary", version: "1" },
        worldResolutionPolicy: { id: "shared_relationship_thread_directory", version: "1" },
        unresolvedMemoryRefs: [],
        excludedRelationshipRefs: [],
        alternativeEvidence: [],
        selectionDigest: `sha256:${"d".repeat(64)}`,
      },
    },
  };
}

function emptyStateSelection() {
  return {
    selectionPolicy: { ...SEMANTIC_STATE_SELECTION_POLICY },
    included: [],
    includedStateIds: [],
    excludedStateIds: [],
  };
}

test("policy-v2 identity context replaces legacy individual evidence in the real Guardian worker packet", () => {
  const req = request();
  const identityContext = compileIdentityContextCapsule({
    threadId: THREAD_ID,
    request: req,
    sourceStores: sourceStores(),
  });
  const prepared = buildSemanticGuardianInput(trace(req), emptyStateSelection(), identityContext);

  let capturedRequest = null;
  const adapter = createScriptedGuardianModelAdapter({
    output(_compatibilityInput, modelRequest) {
      capturedRequest = structuredClone(modelRequest);
      return {
        proposedAction: "clarify",
        rationale: "Scripted provider-free Guardian integration probe.",
      };
    },
  });
  const result = runGuardian(prepared.capsule, adapter, {
    clientRequestId: "guardian:thr_identity_guardian_001:req_identity_guardian_001",
  });

  assert.equal(adapter.callCount, 1);
  assert.equal(result.assessment.proposedAction, "clarify");
  assert.ok(capturedRequest);
  assert.deepEqual(Object.keys(capturedRequest.input), [
    "task", "actors", "evidence", "rules", "outputSchema",
  ]);
  const refs = capturedRequest.input.evidence.map((item) => item.ref);
  assert.ok(refs.includes(ASSERTION_ID));
  assert.ok(refs.includes(MEMORY_ID));
  assert.equal(refs.some((ref) => ref.startsWith("thread:trait:")), false);
  assert.equal(refs.some((ref) => ref.startsWith("memory:legacy_")), false);

  const workerText = JSON.stringify(capturedRequest.input);
  for (const canary of [
    "LEGACY SNAPSHOT IDENTITY CANARY",
    "LEGACY SNAPSHOT SELF MODEL CANARY",
    "LEGACY GENOME TRAIT CANARY",
    "LEGACY NEED CANARY",
    "LEGACY FEELING CANARY",
    "LEGACY RESOLVED MEMORY CANARY",
  ]) {
    assert.equal(workerText.includes(canary), false, `${canary} leaked into Guardian cognition`);
  }
  assert.equal(workerText.includes(identityContext.sourceSnapshot.sourceSnapshotDigest), false);
  assert.equal(workerText.includes(identityContext.capsuleDigest), false);

  const witness = identityContextConsumptionWitness(prepared.capsule.identityContext);
  assert.equal(witness.capsuleDigest, identityContext.capsuleDigest);
  assert.equal(
    witness.sourceSnapshotDigest,
    identityContext.sourceSnapshot.sourceSnapshotDigest,
  );
  assert.deepEqual(witness.includedRefs, identityContext.includedRefs);
});

test("Guardian input rejects a tampered consumed identity capsule before cognition", () => {
  const req = request();
  const identityContext = compileIdentityContextCapsule({
    threadId: THREAD_ID,
    request: req,
    sourceStores: sourceStores(),
  });
  const tampered = structuredClone(identityContext);
  tampered.evidence[0].text = "tampered after compilation";

  assert.throws(
    () => buildSemanticGuardianInput(trace(req), emptyStateSelection(), tampered),
    /identity context capsule digest does not match its body|evidenceBytes/i,
  );
});
