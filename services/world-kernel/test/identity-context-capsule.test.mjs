// fibre-test-lifecycle: regression
// fibre-test-scope: world-kernel
// fibre-test-purpose: identity-context-capsule-projection-boundary

import test from "node:test";
import assert from "node:assert/strict";

import {
  IDENTITY_CONTEXT_PROJECTION_POLICY,
  IDENTITY_CONTEXT_REASONING_PROMPT,
  buildIdentityContextWorkerPacket,
  compileIdentityContextCapsule,
} from "../src/identity-context-capsule.mjs";

const THREAD_ID = "thr_identity_capsule_001";
const REQUESTER_ID = "human_requester_001";

function identityAssertion({
  ref,
  meaning,
  behavioralStatus = "candidate_causal",
  visibility = "private",
  status = "current",
  sourceReferences = [],
  threadId = THREAD_ID,
}) {
  return {
    assertionId: ref,
    claimId: `claim_${ref}`,
    threadId,
    revision: 1,
    registryVersion: "1",
    domain: "self_authored_identity",
    kind: "self_description",
    meaning,
    provenanceClass: "self_authored",
    authorship: {
      kind: "thread_self_authored",
      entityId: THREAD_ID,
    },
    sourceReferences,
    effectiveAt: "2026-08-27T20:00:00.000Z",
    recordedAt: "2026-08-27T20:00:00.000Z",
    visibility,
    status,
    projectionClass: "self_model",
    behavioralStatus,
    admission: {},
    assertionDigest: `sha256:${"a".repeat(64)}`,
  };
}

function semanticState({
  stateId,
  domain = "need",
  dimension = "autonomy",
  state = "I want meaningful control over what I commit to.",
  target = null,
  evidenceReferences = [],
  threadId = THREAD_ID,
}) {
  return {
    stateId,
    threadId,
    domain,
    dimension,
    target,
    state,
    evidenceReferences: evidenceReferences.length === 0 ? ["evt_state_001"] : evidenceReferences,
    asOf: "2026-08-27T20:01:00.000Z",
    supersedes: null,
    provenance: {
      author: "fibre.world-kernel",
      authorType: "institution",
      policyId: "semantic_state_test",
      policyVersion: "1",
      validator: "test",
      validatorVersion: "1",
    },
    visibility: "restricted",
    staleness: "current",
  };
}

function memory({
  memoryId,
  text,
  threadId = THREAD_ID,
  status = "current",
  accessibility = "accessible",
  retentionState = "retained",
}) {
  return {
    recordFormat: "autobiographical_memory_v2",
    memoryId,
    revision: 1,
    threadId,
    subject: { originEventRef: `evt_${memoryId}`, slot: "test" },
    subjectPeriod: {
      startAt: "2026-08-20T12:00:00.000Z",
      endAt: "2026-08-20T12:05:00.000Z",
    },
    eventRefs: [`evt_${memoryId}`],
    rememberedContent: text,
    rememberedMeaning: null,
    meaningOutcome: "no_durable_meaning",
    meaningParts: [],
    asOf: "2026-08-20T12:10:00.000Z",
    confidence: 0.8,
    uncertainty: [],
    salience: 0.7,
    accessibility,
    retentionState,
    authorship: {
      kind: "fibre_genesis_authored",
      entityId: "fibre.genesis",
      policy: { id: "autobiographical_memory_epistemics", version: "1" },
    },
    supportingEvidenceRefs: [],
    contradictingEvidenceRefs: [],
    visibility: "private",
    status,
    recordedAt: "2026-08-20T12:10:00.000Z",
  };
}

function request(extra = {}) {
  return {
    requestId: "req_identity_capsule_001",
    trigger: "human_request",
    requester: {
      entityId: REQUESTER_ID,
      kind: "human",
      displayName: "Requester",
    },
    objective: "Review a difficult project decision and recommend a next step.",
    statedNeed: "Independent judgment rather than generic agreement.",
    permissions: ["read_project_brief"],
    acceptanceCriteria: "Explain the recommendation using only supplied evidence.",
    ...extra,
  };
}

function sourceStores({ reverse = false, crossThreadIdentity = false } = {}) {
  const linkedMemory = memory({
    memoryId: "mem_linked_001",
    text: "I remember refusing to sign a report until the unresolved evidence was checked.",
  });
  const unlinkedMemory = memory({
    memoryId: "mem_unlinked_001",
    text: "This unrelated private memory must not be dumped into local cognition.",
  });
  const includedIdentity = identityAssertion({
    ref: "ias_candidate_001",
    meaning: "I am cautious about committing to conclusions while material evidence is unresolved.",
    sourceReferences: [linkedMemory.memoryId],
    ...(crossThreadIdentity ? { threadId: "thr_other_001" } : {}),
  });
  const contextOnlyIdentity = identityAssertion({
    ref: "ias_context_only_001",
    meaning: "I was born in a coastal city.",
    behavioralStatus: "context_only",
  });
  const protectedIdentity = identityAssertion({
    ref: "ias_protected_001",
    meaning: "PROTECTED SOURCE TEXT MUST NEVER REACH COGNITION",
    visibility: "protected_source",
  });
  const requesterState = semanticState({
    stateId: "sst_requester_trust_001",
    domain: "relationship_attitude",
    dimension: "trust",
    target: {
      targetId: REQUESTER_ID,
      kind: "human",
      displayName: "Requester",
    },
    state: "I currently trust this requester to state uncertainty plainly.",
    evidenceReferences: [linkedMemory.memoryId],
  });
  const otherState = semanticState({
    stateId: "sst_other_trust_001",
    domain: "relationship_attitude",
    dimension: "trust",
    target: {
      targetId: "human_other_001",
      kind: "human",
      displayName: "Other person",
    },
    state: "This relationship state is not about the current requester.",
  });

  const identities = [includedIdentity, contextOnlyIdentity, protectedIdentity];
  const states = [requesterState, otherState];
  const memories = [linkedMemory, unlinkedMemory];
  if (reverse) {
    identities.reverse();
    states.reverse();
    memories.reverse();
  }

  return {
    worldStore: {
      getThread(threadId) {
        return {
          threadId,
          version: 17,
          status: "frozen",
          identity: {
            name: "Legacy Projection Name",
            selfDescription: "SEALED-HISTORY-CANARY-DO-NOT-LEAK",
          },
          sealedHistory: "SEALED-HISTORY-CANARY-DO-NOT-LEAK",
        };
      },
    },
    identityStore: {
      getCurrentIdentityView(threadId) {
        return {
          threadId,
          asOf: "2026-08-27T20:02:00.000Z",
          viewDigest: `sha256:${"b".repeat(64)}`,
          assertions: identities,
        };
      },
    },
    memoryStore: {
      listCurrentMemories() {
        return memories;
      },
    },
    situatedLifeStore: {
      listCurrentLifeRelations(threadId) {
        return [{
          relationId: "rel_parent_001",
          revision: 1,
          threadId,
          relatedParty: {
            partyId: "thr_parent_001",
            kind: "thread",
            displayName: "Parent",
          },
          relationKind: "biological_parent",
          geneticContributionRole: "parent_genome_source",
          visibility: "private",
          provenance: "genesis_created",
          sourceReferences: ["evt_birth_001"],
          recordedAt: "2026-08-20T00:00:00.000Z",
        }];
      },
      listCurrentPlaceEpisodes(threadId) {
        return [{
          episodeId: "place_birth_001",
          revision: 1,
          threadId,
          episodeKind: "birth",
          place: {
            placeId: "place_001",
            displayName: "Birth place",
          },
          visibility: "private",
          provenance: "genesis_created",
          sourceReferences: ["evt_birth_001"],
          recordedAt: "2026-08-20T00:00:00.000Z",
        }];
      },
    },
    embodimentStore: {
      listCurrent(threadId) {
        return [{
          embodimentId: "emb_visual_001",
          revision: 1,
          threadId,
          representationKind: "synthetic_generation",
          visibility: "private",
          rightsBasis: "genesis_synthetic",
          sourceReferences: ["evt_birth_001"],
          permissionReferences: [],
          recordedAt: "2026-08-20T00:00:00.000Z",
        }];
      },
    },
    symbolicGenomeStore: {
      listThreadGenomes(threadId) {
        return [{
          header: {
            genomeId: "genome_001",
            owner: { kind: "thread", ownerId: threadId },
            originKind: "de_novo",
          },
          loci: [{
            locusId: "locus_001",
            genomeId: "genome_001",
            ordinal: 1,
            value: "persists after setbacks but changes approach",
            provenance: { kind: "de_novo" },
          }],
          mutations: [],
          genomeDigest: `sha256:${"c".repeat(64)}`,
        }];
      },
    },
    semanticStateStore: {
      listCurrentState() {
        return states;
      },
    },
  };
}

test("identity context capsule deterministically projects bounded Thread-owned semantic context", () => {
  const first = compileIdentityContextCapsule({
    threadId: THREAD_ID,
    request: request(),
    sourceStores: sourceStores(),
  });
  const reordered = compileIdentityContextCapsule({
    threadId: THREAD_ID,
    request: request(),
    sourceStores: sourceStores({ reverse: true }),
  });

  assert.deepEqual(first, reordered);
  assert.equal(first.selectionAuthority, "fibre");
  assert.deepEqual(first.projectionPolicy, {
    id: IDENTITY_CONTEXT_PROJECTION_POLICY.id,
    version: IDENTITY_CONTEXT_PROJECTION_POLICY.version,
  });
  assert.deepEqual(first.includedRefs, [
    "ias_candidate_001",
    "mem_linked_001",
    "sst_requester_trust_001",
  ]);
  assert.deepEqual(
    first.evidence.map(({ ref, kind }) => ({ ref, kind })),
    [
      { ref: "ias_candidate_001", kind: "identity" },
      { ref: "sst_requester_trust_001", kind: "current_state" },
      { ref: "mem_linked_001", kind: "memory" },
    ],
  );

  const excluded = new Map(first.excludedRefs.map((item) => [item.ref, item.reason]));
  assert.equal(excluded.get("ias_context_only_001"), "identity_not_behavioral_candidate");
  assert.equal(excluded.get("ias_protected_001"), "protected_source");
  assert.equal(excluded.get("mem_unlinked_001"), "memory_not_referenced_by_selected_context");
  assert.equal(excluded.get("sst_other_trust_001"), "semantic_state_selection_policy");
  assert.equal(excluded.get("rel_parent_001"), "raw_relation_requires_semantic_projection");
  assert.equal(excluded.get("place_birth_001"), "raw_place_requires_semantic_projection");
  assert.equal(excluded.get("emb_visual_001"), "presentation_source_not_local_cognition");
  assert.equal(excluded.get("locus_001"), "genome_context_only_until_attributable_consumer");

  const serialized = JSON.stringify(first);
  assert.equal(serialized.includes("SEALED-HISTORY-CANARY-DO-NOT-LEAK"), false);
  assert.equal(serialized.includes("PROTECTED SOURCE TEXT MUST NEVER REACH COGNITION"), false);
  assert.equal(serialized.includes("This unrelated private memory must not be dumped"), false);
  assert.equal(serialized.includes("persists after setbacks"), false);
});

test("identity context worker packet contains the five worker inputs and prompt-asset provenance", () => {
  const capsule = compileIdentityContextCapsule({
    threadId: THREAD_ID,
    request: request(),
    sourceStores: sourceStores(),
  });
  const packet = buildIdentityContextWorkerPacket(capsule, request());

  assert.deepEqual(Object.keys(packet.modelInput), [
    "task",
    "actors",
    "evidence",
    "rules",
    "outputSchema",
  ]);
  assert.equal(packet.prompt.id, "identity-context.local-reasoning");
  assert.equal(packet.prompt.digest, IDENTITY_CONTEXT_REASONING_PROMPT.digest);
  assert.equal(packet.prompt.baseDigest, IDENTITY_CONTEXT_REASONING_PROMPT.baseDigest);
  assert.equal(packet.prompt.text, IDENTITY_CONTEXT_REASONING_PROMPT.text);
  assert.equal(packet.provenance.capsuleDigest, capsule.capsuleDigest);
  assert.equal(
    packet.provenance.sourceSnapshotDigest,
    capsule.sourceSnapshot.sourceSnapshotDigest,
  );

  const workerOnly = JSON.stringify(packet.modelInput);
  assert.equal(workerOnly.includes("registryVersion"), false);
  assert.equal(workerOnly.includes("behavioralStatus"), false);
  assert.equal(workerOnly.includes("sourceReferences"), false);
  assert.equal(workerOnly.includes("projectionPolicy"), false);
  assert.equal(workerOnly.includes("SEALED-HISTORY-CANARY-DO-NOT-LEAK"), false);
  assert.deepEqual(packet.modelInput.task.permissions, ["read_project_brief"]);
});

test("requesters cannot nominate private context refs through the identity projection boundary", () => {
  assert.throws(
    () => compileIdentityContextCapsule({
      threadId: THREAD_ID,
      request: request({ memoryRefs: ["mem_unlinked_001"] }),
      sourceStores: sourceStores(),
    }),
    /request.*memoryRefs|keys|allowed|unexpected/i,
  );
});

test("identity projection fails closed on a cross-Thread authoritative source", () => {
  assert.throws(
    () => compileIdentityContextCapsule({
      threadId: THREAD_ID,
      request: request(),
      sourceStores: sourceStores({ crossThreadIdentity: true }),
    }),
    /does not belong to Thread/,
  );
});

test("identity projection enforces explicit evidence bounds without changing source inventory", () => {
  const stores = sourceStores();
  const original = stores.identityStore.getCurrentIdentityView;
  stores.identityStore.getCurrentIdentityView = (threadId) => {
    const view = original(threadId);
    const additions = Array.from({ length: 10 }, (_, index) =>
      identityAssertion({
        ref: `ias_extra_${String(index).padStart(2, "0")}`,
        meaning: `Additional bounded identity assertion ${index}.`,
      }));
    return { ...view, assertions: [...view.assertions, ...additions] };
  };

  const capsule = compileIdentityContextCapsule({
    threadId: THREAD_ID,
    request: request(),
    sourceStores: stores,
  });
  const identityIncluded = capsule.evidence.filter((item) => item.kind === "identity");
  assert.equal(
    identityIncluded.length,
    IDENTITY_CONTEXT_PROJECTION_POLICY.maximumIdentityAssertions,
  );
  assert.equal(
    capsule.excludedRefs.filter((item) => item.reason === "identity_assertion_budget").length,
    3,
  );
  assert.equal(
    capsule.sourceSnapshot.bindings.filter((item) => item.kind === "identity_assertion").length,
    13,
  );
});
