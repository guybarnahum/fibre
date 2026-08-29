import assert from "node:assert/strict";
import test from "node:test";
import { prepareRequestAppraisal } from "../dist/thread.js";

const thread = {
  threadId: "thr_runtime_validation",
  version: 1,
  status: "frozen",
  identity: {
    name: "Runtime Validation",
    originOrientation: "original",
    selfDescription: "Validates untyped callers."
  },
  genome: {
    textualTraits: {},
    runtimeBaselines: {}
  },
  currentState: {
    needs: [],
    feelings: [],
    selfModel: "I validate inputs.",
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
  requestId: "req_runtime_validation",
  trigger: "test",
  requester: {
    entityId: "human_runtime_validation",
    kind: "human",
    displayName: "Runtime Caller"
  },
  objective: "Validate malformed alternatives",
  permissions: []
};

test("malformed known alternatives fail with a domain validation error", () => {
  for (const malformed of ["not-an-entity", 42, null, {}]) {
    assert.throws(
      () => prepareRequestAppraisal(thread, request, {
        knownAlternatives: [malformed]
      }),
      /entity reference|entityId is required/,
    );
  }
});

test("invalid entity kinds are rejected at runtime", () => {
  assert.throws(
    () => prepareRequestAppraisal(thread, request, {
      knownAlternatives: [{
        entityId: "alternative",
        kind: "invalid-kind",
        displayName: "Invalid"
      }]
    }),
    /kind is invalid/,
  );
});
