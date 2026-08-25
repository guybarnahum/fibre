import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPr39ClosureRepairProfile,
  createPr39ClosureCallRecorder,
} from "./genesis-pr39-closure-profile.mjs";

function slotPlan() {
  return {
    slot: 2,
    threadId: "thr_pr39_final_02",
    freshModelRequestDomain: "pr39-final-life-v1",
  };
}

function request(ordinal, suffix, input = {}) {
  return {
    clientRequestId: `pr39-final-life-v1:slot-02:pass-a:episode-${String(ordinal).padStart(2, "0")}:${suffix}`,
    input,
  };
}

function plainSuccessfulCalls() {
  return Array.from({ length: 14 }, (_, index) => ({
    clientRequestId: request(index + 1, "initial").clientRequestId,
    failedGate: null,
    retryOrdinal: null,
  }));
}

function plainSuccessfulCandidate() {
  return {
    passA: Array.from({ length: 14 }, (_, index) => ({
      ordinal: index + 1,
      budgetState: { generatedVersions: 1, formRepairs: 0, recordRetries: 0 },
    })),
  };
}

test("closure call recorder preserves failed gates used by actual recovery calls", async () => {
  const seen = [];
  const base = {
    provider: "fixture",
    modelId: "fixture-model",
    configuration: { temperature: 0.3 },
    invoke: async (item) => {
      seen.push(item);
      return { output: { ok: true } };
    },
  };
  const recorder = createPr39ClosureCallRecorder();
  const adapter = recorder.wrap(base);

  await adapter.invoke(request(1, "initial"));
  await adapter.invoke(request(1, "form-repair-1", { failedGate: "pass_a_interiority_form", retryOrdinal: 1 }));
  await adapter.invoke(request(1, "record-retry-1", { failedGate: "pass_a_participant_grounding", retryOrdinal: 1 }));

  assert.equal(seen.length, 3);
  assert.equal(adapter.provider, base.provider);
  assert.equal(adapter.modelId, base.modelId);
  assert.deepEqual(recorder.snapshot(), [
    { clientRequestId: request(1, "initial").clientRequestId, failedGate: null, retryOrdinal: null },
    { clientRequestId: request(1, "form-repair-1").clientRequestId, failedGate: "pass_a_interiority_form", retryOrdinal: 1 },
    { clientRequestId: request(1, "record-retry-1").clientRequestId, failedGate: "pass_a_participant_grounding", retryOrdinal: 1 },
  ]);
});

test("closure repair profile exposes recovered per-episode admission pressure", () => {
  const plan = slotPlan();
  const recordedCalls = plainSuccessfulCalls();
  recordedCalls.splice(1, 0,
    { clientRequestId: request(1, "form-repair-1").clientRequestId, failedGate: "pass_a_interiority_form", retryOrdinal: 1 },
    { clientRequestId: request(1, "record-retry-1").clientRequestId, failedGate: "pass_a_participant_grounding", retryOrdinal: 1 },
  );
  const candidate = plainSuccessfulCandidate();
  candidate.passA[0] = {
    ordinal: 1,
    budgetState: { generatedVersions: 3, formRepairs: 1, recordRetries: 1 },
  };

  const profile = buildPr39ClosureRepairProfile({
    slotPlan: plan,
    candidate,
    recordedCalls,
  });

  assert.equal(profile.wholeCandidateFailure, false);
  assert.deepEqual(profile.episodes[0], {
    ordinal: 1,
    status: "admitted",
    generatedVersions: 3,
    formRepairs: 1,
    recordRetries: 1,
    failedGates: ["pass_a_interiority_form", "pass_a_participant_grounding"],
    budgetExhausted: false,
  });
  assert.deepEqual(profile.totals, {
    generatedVersions: 16,
    formRepairs: 1,
    recordRetries: 1,
    failedGates: 2,
    exhaustions: 0,
  });
});

test("closure repair profile exposes terminal exhaustion and later unattempted episodes", () => {
  const plan = slotPlan();
  const recordedCalls = [
    { clientRequestId: request(1, "initial").clientRequestId, failedGate: null, retryOrdinal: null },
    { clientRequestId: request(2, "initial").clientRequestId, failedGate: null, retryOrdinal: null },
    { clientRequestId: request(2, "form-repair-1").clientRequestId, failedGate: "pass_a_interiority_form", retryOrdinal: 1 },
    { clientRequestId: request(2, "form-repair-2").clientRequestId, failedGate: "pass_a_interiority_form", retryOrdinal: 2 },
    { clientRequestId: request(2, "record-retry-1").clientRequestId, failedGate: "pass_a_participant_grounding", retryOrdinal: 1 },
    { clientRequestId: request(2, "record-retry-2").clientRequestId, failedGate: "pass_a_participant_grounding", retryOrdinal: 2 },
  ];
  const error = new Error("replacement Pass-A exhausted 5 generated versions");
  error.gate = "record_repair_exhausted";
  error.cause = Object.assign(new Error("participant not grounded"), { gate: "pass_a_participant_grounding" });

  const profile = buildPr39ClosureRepairProfile({
    slotPlan: plan,
    error,
    recordedCalls,
  });

  assert.equal(profile.wholeCandidateFailure, true);
  assert.deepEqual(profile.terminalFailure, {
    gate: "record_repair_exhausted",
    failedGate: "pass_a_participant_grounding",
    episodeOrdinal: 2,
  });
  assert.equal(profile.episodes[1].status, "budget_exhausted");
  assert.equal(profile.episodes[1].generatedVersions, 5);
  assert.equal(profile.episodes[1].formRepairs, 2);
  assert.equal(profile.episodes[1].recordRetries, 2);
  assert.equal(profile.episodes[1].budgetExhausted, true);
  assert.equal(profile.episodes[2].status, "not_attempted_after_candidate_failure");
  assert.equal(profile.totals.exhaustions, 1);
});

test("successful closure profile rejects a partial candidate instead of hiding missing episodes", () => {
  assert.throws(() => buildPr39ClosureRepairProfile({
    slotPlan: slotPlan(),
    candidate: { passA: [{ ordinal: 1, budgetState: { generatedVersions: 1, formRepairs: 0, recordRetries: 0 } }] },
    recordedCalls: [{ clientRequestId: request(1, "initial").clientRequestId, failedGate: null, retryOrdinal: null }],
  }), /fourteen Pass-A episode records/u);
});
