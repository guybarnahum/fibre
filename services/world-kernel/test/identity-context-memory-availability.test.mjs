// fibre-test-lifecycle: regression
// fibre-test-scope: world-kernel
// fibre-test-purpose: identity-context-autobiographical-availability-selection

import assert from "node:assert/strict";
import test from "node:test";

import {
  IDENTITY_CONTEXT_PROJECTION_POLICY,
  compileIdentityContextCapsule,
} from "../src/identity-context-capsule.mjs";

const THREAD_ID = "thr_identity_memory_availability";
const REQUEST = {
  requestId: "req_identity_memory_availability",
  trigger: "fibre_validation",
  requester: {
    entityId: "fibre.validation",
    kind: "institution",
    displayName: "Fibre validation",
  },
  objective: "Make a bounded local judgment.",
  permissions: [],
};

function memory({
  memoryId,
  content,
  meaning,
  accessibility = "accessible",
  salience = 0.5,
  asOf = "2026-08-20T12:10:00.000Z",
}) {
  const durable = meaning !== null;
  return {
    recordFormat: "autobiographical_memory_v2",
    memoryId,
    revision: 1,
    threadId: THREAD_ID,
    subject: { originEventRef: `evt_${memoryId}`, slot: "test" },
    subjectPeriod: {
      startAt: "2026-08-20T12:00:00.000Z",
      endAt: "2026-08-20T12:05:00.000Z",
    },
    eventRefs: [`evt_${memoryId}`],
    rememberedContent: content,
    rememberedMeaning: meaning,
    meaningOutcome: durable ? "durable_meaning" : "no_durable_meaning",
    meaningParts: durable
      ? [{ meaningPartId: `mpart_${memoryId}`, meaning }]
      : [],
    asOf,
    confidence: 0.8,
    uncertainty: [],
    salience,
    accessibility,
    retentionState: "fragmentary",
    authorship: {
      kind: "fibre_genesis_authored",
      entityId: "fibre.genesis",
      policy: { id: "autobiographical_memory_epistemics", version: "1" },
    },
    supportingEvidenceRefs: [],
    contradictingEvidenceRefs: [],
    visibility: "private",
    status: "current",
    recordedAt: "2026-08-27T20:24:49.518Z",
  };
}

function stores(memories) {
  return {
    worldStore: {
      getThread() {
        return { threadId: THREAD_ID, version: 9 };
      },
    },
    identityStore: {
      getCurrentIdentityView() {
        return {
          threadId: THREAD_ID,
          asOf: "2026-08-27T20:24:49.518Z",
          viewDigest: `sha256:${"a".repeat(64)}`,
          assertions: [],
        };
      },
    },
    memoryStore: {
      listCurrentMemories() {
        return memories;
      },
    },
    situatedLifeStore: {
      listCurrentLifeRelations() { return []; },
      listCurrentPlaceEpisodes() { return []; },
    },
    embodimentStore: {
      listCurrent() { return []; },
    },
    symbolicGenomeStore: {
      listThreadGenomes() { return []; },
    },
    semanticStateStore: {
      listCurrentState() { return []; },
    },
  };
}

test("identity context admits only a bounded deterministic fallback of currently available durable memories", () => {
  const candidates = [
    memory({
      memoryId: "mem_available_older",
      content: "Older accessible durable memory.",
      meaning: "I learned to verify uncertain commitments.",
      accessibility: "accessible",
      salience: 0.8,
      asOf: "2026-08-20T12:10:00.000Z",
    }),
    memory({
      memoryId: "mem_available_newer",
      content: "Newer accessible durable memory.",
      meaning: "I learned to preserve room to revise.",
      accessibility: "accessible",
      salience: 0.8,
      asOf: "2026-08-21T12:10:00.000Z",
    }),
    memory({
      memoryId: "mem_accessible_lower_salience",
      content: "Lower-salience accessible durable memory.",
      meaning: "I noticed that ordinary choices can still matter.",
      accessibility: "accessible",
      salience: 0.4,
      asOf: "2026-08-22T12:10:00.000Z",
    }),
    memory({
      memoryId: "mem_difficult_high_salience",
      content: "Difficult but high-salience durable memory.",
      meaning: "I remain wary of a past failure.",
      accessibility: "difficult",
      salience: 1,
      asOf: "2026-08-23T12:10:00.000Z",
    }),
    memory({
      memoryId: "mem_no_durable_meaning_canary",
      content: "NO-DURABLE-MEANING-CANARY-MUST-NOT-ENTER-FALLBACK",
      meaning: null,
      accessibility: "accessible",
      salience: 1,
      asOf: "2026-08-24T12:10:00.000Z",
    }),
  ];

  const first = compileIdentityContextCapsule({
    threadId: THREAD_ID,
    request: REQUEST,
    sourceStores: stores(candidates),
  });
  const reversed = compileIdentityContextCapsule({
    threadId: THREAD_ID,
    request: REQUEST,
    sourceStores: stores([...candidates].reverse()),
  });

  assert.deepEqual(first, reversed);
  assert.equal(IDENTITY_CONTEXT_PROJECTION_POLICY.maximumAvailableMeaningMemories, 2);
  assert.deepEqual(
    first.evidence.map((item) => item.ref),
    ["mem_available_newer", "mem_available_older"],
  );
  assert.deepEqual(first.includedRefs, [
    "mem_available_newer",
    "mem_available_older",
  ]);

  const excluded = new Map(first.excludedRefs.map((item) => [item.ref, item.reason]));
  assert.equal(
    excluded.get("mem_accessible_lower_salience"),
    "memory_available_meaning_budget",
  );
  assert.equal(
    excluded.get("mem_difficult_high_salience"),
    "memory_available_meaning_budget",
  );
  assert.equal(
    excluded.get("mem_no_durable_meaning_canary"),
    "memory_not_referenced_by_selected_context",
  );

  const serialized = JSON.stringify(first);
  assert.equal(
    serialized.includes("NO-DURABLE-MEANING-CANARY-MUST-NOT-ENTER-FALLBACK"),
    false,
  );
});
