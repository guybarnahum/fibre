// fibre-test-lifecycle: regression
// fibre-test-scope: tools
// fibre-test-purpose: identity-context-real-world-inspector-boundary

import assert from "node:assert/strict";
import test from "node:test";

import {
  formatIdentityContextInspection,
  inspectIdentityContext,
} from "./inspect-identity-context.mjs";

const THREAD_A = "thr_context_inspect_a";
const THREAD_B = "thr_context_inspect_b";
const FIN_A = "AAAA-AA-AAAA";
const FIN_B = "BBBB-BB-BBBB";

function identityAssertion(threadId) {
  return {
    assertionId: "ias_context_inspect_a",
    claimId: "icl_context_inspect_a",
    threadId,
    revision: 1,
    registryVersion: "1",
    domain: "self_authored_identity",
    kind: "self_description",
    meaning: "SECRET IDENTITY PHRASE SHOULD NOT APPEAR IN INSPECTOR TEXT OUTPUT",
    provenanceClass: "self_authored",
    authorship: {
      kind: "thread_self_authored",
      entityId: threadId,
    },
    sourceReferences: [],
    effectiveAt: "2026-08-27T20:00:00.000Z",
    recordedAt: "2026-08-27T20:00:00.000Z",
    visibility: "private",
    status: "current",
    projectionClass: "self_model",
    behavioralStatus: "candidate_causal",
    admission: {},
    assertionDigest: `sha256:${"a".repeat(64)}`,
  };
}

function fakeContext() {
  let closed = false;
  const sourceStores = {
    worldStore: {
      getThread(threadId) {
        return { threadId, version: 7, status: "frozen" };
      },
    },
    identityStore: {
      getCurrentIdentityView(threadId) {
        return {
          threadId,
          asOf: "2026-08-27T20:00:00.000Z",
          viewDigest: `sha256:${(threadId === THREAD_A ? "b" : "c").repeat(64)}`,
          assertions: threadId === THREAD_A ? [identityAssertion(threadId)] : [],
        };
      },
    },
    memoryStore: { listCurrentMemories() { return []; } },
    situatedLifeStore: {
      listCurrentLifeRelations() { return []; },
      listCurrentPlaceEpisodes() { return []; },
    },
    embodimentStore: { listCurrent() { return []; } },
    symbolicGenomeStore: { listThreadGenomes() { return []; } },
    semanticStateStore: { listCurrentState() { return []; } },
  };

  return {
    databasePath: "/tmp/fake-world.sqlite",
    sourceStores,
    registrations() {
      return [
        { threadId: THREAD_A, fibreIdentityNumber: FIN_A },
        { threadId: THREAD_B, fibreIdentityNumber: FIN_B },
      ];
    },
    queryOnly() { return true; },
    close() { closed = true; },
    get closed() { return closed; },
  };
}

test("identity context inspector characterizes registered Threads without treating empty projection as structural failure", () => {
  const context = fakeContext();
  const report = inspectIdentityContext(
    "/tmp/fake-world.sqlite",
    {},
    { openContext: () => context },
  );

  assert.equal(context.closed, true);
  assert.equal(report.threadCount, 2);
  assert.equal(report.structurallyValidThreads, 2);
  assert.equal(report.allStructuralChecksPass, true);
  assert.equal(report.consumerReadyThreads, 1);
  assert.equal(report.allThreadsConsumerReady, false);
  assert.equal(report.identityEvidenceThreads, 1);
  assert.equal(report.memoryEvidenceThreads, 0);
  assert.equal(report.semanticStateEvidenceThreads, 0);
  assert.equal(report.providerAccess, "not_present_in_inspector");

  const [a, b] = report.threads;
  assert.equal(a.fibreIdentityNumber, FIN_A);
  assert.equal(a.consumerReady, true);
  assert.deepEqual(a.includedKinds, { identity: 1 });
  assert.deepEqual(a.includedRefs, ["ias_context_inspect_a"]);
  assert.equal(b.consumerReady, false);
  assert.deepEqual(b.includedKinds, {});
  assert.equal(b.ok, true);

  const text = formatIdentityContextInspection(report);
  assert.match(text, /Consumer-ready projections: 1\/2/);
  assert.match(text, /identity=1\/2, memory=0\/2, semantic-state=0\/2/);
  assert.equal(text.includes("SECRET IDENTITY PHRASE"), false);
});

test("identity context inspector can characterize an exact FIN subset and rejects unknown FINs", () => {
  const one = inspectIdentityContext(
    "/tmp/fake-world.sqlite",
    { fins: [FIN_B] },
    { openContext: () => fakeContext() },
  );
  assert.equal(one.threadCount, 1);
  assert.equal(one.threads[0].fibreIdentityNumber, FIN_B);

  assert.throws(
    () => inspectIdentityContext(
      "/tmp/fake-world.sqlite",
      { fins: ["ZZZZ-ZZ-ZZZZ"] },
      { openContext: () => fakeContext() },
    ),
    /not registered/,
  );
});
