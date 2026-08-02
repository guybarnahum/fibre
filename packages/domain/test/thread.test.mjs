import assert from "node:assert/strict";
import test from "node:test";
import { freezeThread, thawThread } from "../dist/thread.js";

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

test("thaw builds a bounded context capsule", () => {
  const capsule = thawThread(thread, {
    trigger: "test",
    objective: "Demonstrate continuity",
    relevantMemories: [],
    relevantRelationships: [],
    permissions: ["fixture:read"]
  });
  assert.equal(capsule.threadId, thread.threadId);
  assert.equal(capsule.snapshotVersion, 1);
  assert.deepEqual(capsule.auditPolicies, ["goal_guardian", "self_examiner_steward"]);
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
