// fibre-tool-lifecycle: milestone
// fibre-tool-scope: pr39
// fibre-tool-purpose: verify durable local closure artifacts before operational resume
// fibre-tool-disposition: retire after PR39; retain the recovery-integrity lesson in milestone history

import { canonicalJson, sha256 } from "#services/world-kernel/src/persistence-common.mjs";
import { GENESIS_LIFE_CANDIDATE_VERSION } from "./genesis-life-candidate.mjs";

function fail(message) { throw new Error(message); }
function digest(value) { return `sha256:${sha256(canonicalJson(value))}`; }
function same(left, right) { return canonicalJson(left) === canonicalJson(right); }

export function assertPr39SavedClosureCandidate({ candidate, slotPlan, claim } = {}) {
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) {
    fail("saved PR39 closure candidate must be an object");
  }
  if (slotPlan === null || typeof slotPlan !== "object") fail("saved PR39 closure candidate requires a frozen slot plan");
  if (claim === null || typeof claim !== "object") fail("saved PR39 closure candidate requires the claimed attempt");

  const { candidateDigest, ...core } = candidate;
  if (candidateDigest !== digest(core)) fail(`saved closure candidate ${slotPlan.slot} digest drift`);

  const expected = {
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
  };
  for (const [field, value] of Object.entries(expected)) {
    if (candidate[field] !== value) fail(`saved closure candidate ${slotPlan.slot} frozen binding drift at ${field}`);
  }
  if (!Array.isArray(candidate.passA) || candidate.passA.length !== 14) {
    fail(`saved closure candidate ${slotPlan.slot} does not contain fourteen Pass-A records`);
  }
  return candidate;
}

export function assertPr39SavedClosureRepairProfile({ profile, candidate, slotPlan } = {}) {
  if (profile === null || typeof profile !== "object" || Array.isArray(profile)) {
    fail("saved PR39 closure repair profile must be an object");
  }
  if (profile.profileVersion !== "pr39-closure-repair-profile-v1") fail(`saved closure repair profile ${slotPlan.slot} version drift`);
  if (profile.slot !== slotPlan.slot || profile.threadId !== slotPlan.threadId) fail(`saved closure repair profile ${slotPlan.slot} identity drift`);
  if (profile.wholeCandidateFailure !== false || profile.terminalFailure !== null) fail(`saved closure repair profile ${slotPlan.slot} is not a successful candidate profile`);
  if (!Array.isArray(profile.episodes) || profile.episodes.length !== 14) fail(`saved closure repair profile ${slotPlan.slot} must contain fourteen episodes`);
  if (!Array.isArray(candidate.passA) || candidate.passA.length !== 14) fail(`saved closure candidate ${slotPlan.slot} must contain fourteen Pass-A records`);

  const totals = { generatedVersions: 0, formRepairs: 0, recordRetries: 0, failedGates: 0, exhaustions: 0 };
  for (let index = 0; index < 14; index += 1) {
    const episode = profile.episodes[index];
    const candidateRecord = candidate.passA[index];
    const budget = candidateRecord?.budgetState;
    if (episode?.ordinal !== index + 1 || candidateRecord?.ordinal !== index + 1) fail(`saved closure repair profile ${slotPlan.slot} ordinal drift at ${index + 1}`);
    if (episode.status !== "admitted" || episode.budgetExhausted !== false) fail(`saved closure repair profile ${slotPlan.slot} episode ${index + 1} is not admitted`);
    if (!Array.isArray(episode.failedGates)) fail(`saved closure repair profile ${slotPlan.slot} episode ${index + 1} failedGates drift`);
    if (
      episode.generatedVersions !== budget?.generatedVersions ||
      episode.formRepairs !== budget?.formRepairs ||
      episode.recordRetries !== budget?.recordRetries
    ) {
      fail(`saved closure repair profile ${slotPlan.slot} accounting drift at episode ${index + 1}`);
    }
    totals.generatedVersions += episode.generatedVersions;
    totals.formRepairs += episode.formRepairs;
    totals.recordRetries += episode.recordRetries;
    totals.failedGates += episode.failedGates.length;
    totals.exhaustions += episode.budgetExhausted ? 1 : 0;
  }
  if (!same(profile.totals, totals)) fail(`saved closure repair profile ${slotPlan.slot} totals drift`);
  return profile;
}
