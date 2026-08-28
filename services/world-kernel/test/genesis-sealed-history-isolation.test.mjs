// fibre-test-lifecycle: permanent
// fibre-test-scope: genesis
// fibre-test-purpose: sealed-history-provenance-firewall

import assert from "node:assert/strict";
import test from "node:test";

import {
  GenesisSealedHistoryLeakError,
  assertSealedHistoryExposureManifest,
  compilePassBCognitionWithSealedHistory,
  compilePassCCognitionWithSealedHistory,
  computeSealedHistoryTaintClosure,
} from "../src/genesis-sealed-history-isolation.mjs";

function graph() {
  return [
    { sourceRef: "ep_safe", kind: "history_episode", dependsOn: [] },
    { sourceRef: "ep_holdout", kind: "history_episode", dependsOn: [] },
    { sourceRef: "ep_descendant", kind: "history_episode", dependsOn: ["ep_holdout"] },
    { sourceRef: "mem_safe", kind: "memory", dependsOn: ["ep_safe"] },
    { sourceRef: "mem_tainted", kind: "memory", dependsOn: ["ep_descendant"] },
    { sourceRef: "meaning_tainted", kind: "meaning", dependsOn: ["mem_tainted"] },
    { sourceRef: "ep_trigger_safe", kind: "history_episode", dependsOn: [] },
  ];
}

function passBCognition() {
  return {
    inputVersion: "genesis-pass-b-cognition-input-v1",
    subject: { provisionalThreadId: "thr_holdout", bornAt: "2000-01-01T00:00:00Z" },
    world: { worldSpecId: "world_holdout" },
    rememberingAt: "2020-01-01T00:00:00Z",
    ageAtRemembering: 20,
    chronologyEndsAt: "2020-01-01T00:00:00Z",
    history: [
      { episodeId: "ep_safe", observableAction: "safe" },
      { episodeId: "ep_holdout", observableAction: "sealed" },
      { episodeId: "ep_descendant", observableAction: "reveals sealed" },
    ],
    priorMemories: [
      { memoryRef: "mem_safe", episodeRefs: ["ep_safe"], rememberedContent: "safe", uncertainty: [] },
      { memoryRef: "mem_tainted", episodeRefs: ["ep_descendant"], rememberedContent: "tainted", uncertainty: [] },
    ],
    genomeExposure: null,
    policyWitness: { policyVersion: "genesis-pass-b-policy-v1" },
  };
}

function passCCognition({ memoryRef = "mem_safe", episodeRefs = ["ep_safe"], triggerRef = "ep_trigger_safe" } = {}) {
  return {
    inputVersion: "genesis-pass-c-cognition-input-v1",
    mode: "reinterpretation",
    targetMemory: {
      memoryRef,
      episodeRefs,
      rememberedContent: "A remembered event.",
      uncertainty: [],
    },
    formation: { asOf: "2020-01-01T00:00:00Z", ageAtFormation: 20, chronologyIndex: 10 },
    priorMeaning: { summary: "Prior meaning", parts: [{ meaningPartId: "meaning_part_1", meaning: "Prior meaning" }] },
    trigger: { episodeRef: triggerRef, occurredAt: "2019-12-01T00:00:00Z", observableAction: "A later event.", relation: "same_structure" },
    policyWitness: { policyVersion: "genesis-pass-c-policy-v1" },
  };
}

test("sealed-history taint closure follows explicit descendant provenance transitively", () => {
  const closure = computeSealedHistoryTaintClosure({
    sourceGraph: graph(),
    sealedSourceRefs: ["ep_holdout"],
  });
  assert.deepEqual(
    closure.taintedSourceRefs,
    ["ep_descendant", "ep_holdout", "meaning_tainted", "mem_tainted"],
  );
  assert.equal(closure.taintedSourceRefs.includes("ep_safe"), false);
  assert.equal(closure.taintedSourceRefs.includes("mem_safe"), false);
});

test("Pass-B and Pass-C cognition compilation excludes sealed provenance and records exposure manifests", () => {
  const passB = compilePassBCognitionWithSealedHistory({
    cognitionInput: passBCognition(),
    sourceGraph: graph(),
    sealedSourceRefs: ["ep_holdout"],
    callId: "d5_pass_b_01",
  });
  assert.deepEqual(passB.cognitionInput.history.map((item) => item.episodeId), ["ep_safe"]);
  assert.deepEqual(passB.cognitionInput.priorMemories.map((item) => item.memoryRef), ["mem_safe"]);
  assert.deepEqual(passB.manifest.includedSourceRefs, ["ep_safe", "mem_safe"]);
  assert.deepEqual(passB.manifest.excludedSourceRefs, ["ep_descendant", "ep_holdout", "mem_tainted"]);
  assert.equal(assertSealedHistoryExposureManifest(passB.manifest), true);

  const cleanPassC = compilePassCCognitionWithSealedHistory({
    cognitionInput: passCCognition(),
    sourceGraph: graph(),
    sealedSourceRefs: ["ep_holdout"],
    callId: "d5_pass_c_clean",
  });
  assert.equal(cleanPassC.excluded, false);
  assert.notEqual(cleanPassC.cognitionInput, null);
  assert.equal(assertSealedHistoryExposureManifest(cleanPassC.manifest), true);

  const taintedPassC = compilePassCCognitionWithSealedHistory({
    cognitionInput: passCCognition({ memoryRef: "mem_tainted", episodeRefs: ["ep_descendant"] }),
    sourceGraph: graph(),
    sealedSourceRefs: ["ep_holdout"],
    callId: "d5_pass_c_tainted",
  });
  assert.equal(taintedPassC.excluded, true);
  assert.equal(taintedPassC.cognitionInput, null);
  assert.deepEqual(taintedPassC.contaminatedSourceRefs, ["ep_descendant", "mem_tainted"]);
  assert.deepEqual(taintedPassC.manifest.includedSourceRefs, []);
});

test("sealed-history isolation fails closed on deliberate leaks and incomplete provenance", () => {
  assert.throws(
    () => assertSealedHistoryExposureManifest({
      taintedSourceRefs: ["ep_holdout", "ep_descendant"],
      includedSourceRefs: ["ep_safe", "ep_descendant"],
    }),
    (error) => {
      assert.equal(error instanceof GenesisSealedHistoryLeakError, true);
      assert.deepEqual(error.leakedSourceRefs, ["ep_descendant"]);
      return true;
    },
  );

  const incomplete = graph().filter((source) => source.sourceRef !== "mem_safe");
  assert.throws(
    () => compilePassBCognitionWithSealedHistory({
      cognitionInput: passBCognition(),
      sourceGraph: incomplete,
      sealedSourceRefs: ["ep_holdout"],
      callId: "d5_incomplete_graph",
    }),
    /sources missing from sealed-history sourceGraph: mem_safe/,
  );
});
