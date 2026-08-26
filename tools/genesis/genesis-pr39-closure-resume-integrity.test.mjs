import assert from "node:assert/strict";
import test from "node:test";

import { canonicalJson, sha256 } from "#services/world-kernel/src/persistence-common.mjs";
import { GENESIS_LIFE_CANDIDATE_VERSION } from "./genesis-life-candidate.mjs";
import {
  assertPr39SavedClosureCandidate,
  assertPr39SavedClosureRepairProfile,
} from "./genesis-pr39-closure-resume-integrity.mjs";

function digest(value) { return `sha256:${sha256(canonicalJson(value))}`; }

function fixture() {
  const slotPlan = {
    slot: 1,
    threadId: "thr_pr39_final_01",
    genesisId: "genesis_pr39_final_01",
    originMode: "de_novo",
    worldSpec: { worldSpecId: "world_pr39_final_sapporo" },
    worldSpecDigest: `sha256:${"a".repeat(64)}`,
    genome: { header: { genomeId: "genome_test" } },
    genomeDigest: `sha256:${"b".repeat(64)}`,
    envelopePlan: { digest: `sha256:${"c".repeat(64)}` },
  };
  const claim = { claimedAt: "2026-08-26T01:00:00Z" };
  const passA = Array.from({ length: 14 }, (_, index) => ({
    ordinal: index + 1,
    budgetState: { generatedVersions: 1, formRepairs: 0, recordRetries: 0 },
  }));
  const core = {
    candidateVersion: GENESIS_LIFE_CANDIDATE_VERSION,
    attemptStartedAt: claim.claimedAt,
    slot: slotPlan.slot,
    threadId: slotPlan.threadId,
    genesisId: slotPlan.genesisId,
    originMode: slotPlan.originMode,
    worldSpecId: slotPlan.worldSpec.worldSpecId,
    worldSpecDigest: slotPlan.worldSpecDigest,
    genomeId: slotPlan.genome.header.genomeId,
    genomeDigest: slotPlan.genomeDigest,
    envelopePlanDigest: slotPlan.envelopePlan.digest,
    passA,
    episodes: [],
    lifeContinuity: {},
    passB: [],
    passCInitial: [],
    memories: [],
    reinterpretationSchedule: [],
    reinterpretationRuns: [],
  };
  const candidate = { ...core, candidateDigest: digest(core) };
  const episodes = passA.map((record) => ({
    ordinal: record.ordinal,
    status: "admitted",
    generatedVersions: 1,
    formRepairs: 0,
    recordRetries: 0,
    failedGates: [],
    budgetExhausted: false,
  }));
  const profile = {
    profileVersion: "pr39-closure-repair-profile-v1",
    slot: slotPlan.slot,
    threadId: slotPlan.threadId,
    wholeCandidateFailure: false,
    terminalFailure: null,
    episodes,
    totals: { generatedVersions: 14, formRepairs: 0, recordRetries: 0, failedGates: 0, exhaustions: 0 },
  };
  return { slotPlan, claim, candidate, profile };
}

test("PR39 operational resume accepts only digest-valid candidates with exact frozen bindings", () => {
  const { slotPlan, claim, candidate } = fixture();
  assert.equal(assertPr39SavedClosureCandidate({ candidate, slotPlan, claim }), candidate);

  const changed = structuredClone(candidate);
  changed.worldSpecDigest = `sha256:${"d".repeat(64)}`;
  const { candidateDigest: ignored, ...changedCore } = changed;
  void ignored;
  changed.candidateDigest = digest(changedCore);
  assert.throws(
    () => assertPr39SavedClosureCandidate({ candidate: changed, slotPlan, claim }),
    /frozen binding drift at worldSpecDigest/u,
  );
});

test("PR39 operational resume rejects a repair profile that no longer matches candidate accounting", () => {
  const { slotPlan, claim, candidate, profile } = fixture();
  assertPr39SavedClosureCandidate({ candidate, slotPlan, claim });
  assert.equal(assertPr39SavedClosureRepairProfile({ profile, candidate, slotPlan }), profile);

  const changed = structuredClone(profile);
  changed.episodes[4].generatedVersions = 2;
  changed.totals.generatedVersions = 15;
  assert.throws(
    () => assertPr39SavedClosureRepairProfile({ profile: changed, candidate, slotPlan }),
    /accounting drift at episode 5/u,
  );
});
