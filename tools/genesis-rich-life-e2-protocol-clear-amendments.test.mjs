import test from "node:test";
import assert from "node:assert/strict";

import {
  decorateE2V2A0Artifact,
  decorateE2V2A0Preflight,
} from "./genesis-rich-life-e2-v2-a0-reviewed.mjs";
import { E2_V2_WORLD_AUTHORING_RECORD } from "./genesis-rich-life-e2-v2-world.mjs";
import {
  decorateN2Preflight,
  decorateN2Snapshot,
  n2ReviewPlan,
  pairedPassBFramingComparison,
} from "./genesis-rich-life-e2-n2-reviewed.mjs";

function trialPlanOutcomes(rememberedCount, { worldId = "E2-V1" } = {}) {
  const rows = [];
  let ordinal = 0;
  for (let pairOrdinal = 1; pairOrdinal <= 3; pairOrdinal += 1) {
    for (const horizon of [6, 8, 10]) {
      ordinal += 1;
      rows.push({
        trialOrdinal: ordinal,
        worldId,
        pairOrdinal,
        horizon,
        sourceRunOrdinal: ((pairOrdinal + horizon) % 3) + 1,
        passB: { output: { outcome: ordinal <= rememberedCount ? "remembered" : "not_remembered" } },
      });
    }
  }
  return rows;
}

function oldInstrumentArtifact() {
  return {
    evidenceVersion: "pr39-slice-e2-n1-a0-v1",
    status: "complete",
    completedTrials: trialPlanOutcomes(6),
  };
}

test("protocol-clear R1-R4 remain observational and are written into evidence without changing N2 gate fields", () => {
  const v2Preflight = decorateE2V2A0Preflight({ protocolVersion: "v2-source" });
  assert.deepEqual(v2Preflight.worldAuthoringRecord, E2_V2_WORLD_AUTHORING_RECORD);
  assert.equal(v2Preflight.worldAuthoringRecord.recordedBeforeFirstModelUse, true);
  assert.match(v2Preflight.worldAuthoringRecord.reasonForDifferences, /not selected to target/i);
  assert.match(v2Preflight.reviewedPreflightDigest, /^sha256:[0-9a-f]{64}$/);

  const v2Artifact = decorateE2V2A0Artifact({
    evidenceVersion: "v2-source",
    preflight: { protocolVersion: "v2-source" },
  });
  assert.deepEqual(v2Artifact.worldAuthoringRecord, E2_V2_WORLD_AUTHORING_RECORD);
  assert.deepEqual(v2Artifact.preflight.worldAuthoringRecord, E2_V2_WORLD_AUTHORING_RECORD);
  assert.equal(v2Artifact.preflight.reviewedPreflightDigest, v2Preflight.reviewedPreflightDigest);

  const review = n2ReviewPlan();
  assert.equal(review.criteriaChangedByReviewRecommendations, false);
  assert.equal(review.memoryRateCharacterization.nearTotalRecallThreshold, 17);
  assert.equal(review.pairedFramingComparison.gateUse, false);
  assert.match(review.firstValidTestRationale, /first pairing/i);

  const reviewedN2Preflight = decorateN2Preflight({ protocolVersion: "n2" });
  assert.match(reviewedN2Preflight.reviewedPreflightDigest, /^sha256:[0-9a-f]{64}$/);
  assert.equal(reviewedN2Preflight.preExecutionReview.criteriaChangedByReviewRecommendations, false);

  const oldArtifact = oldInstrumentArtifact();
  const newTrials = trialPlanOutcomes(8);
  const paired = pairedPassBFramingComparison(newTrials, oldArtifact);
  assert.equal(paired.status, "complete");
  assert.equal(paired.gateUse, false);
  assert.equal(paired.oldRemembered, 6);
  assert.equal(paired.newRemembered, 8);
  assert.equal(paired.rememberedDelta, 2);
  assert.equal(paired.pairs.length, 9);

  const snapshot = decorateN2Snapshot({
    status: "complete",
    preflight: { protocolVersion: "n2" },
    score: {
      n: 18,
      memoryFormation: {
        remembered: 17,
        notRemembered: 1,
        minimumRemembered: 10,
        criterionMet: true,
      },
      conditionalAttribution: {
        rememberedTrials: 17,
        correct: 13,
        criterionMet: true,
      },
      gateFDownstreamFertilityMet: true,
    },
    completedTrials: [
      ...newTrials,
      ...trialPlanOutcomes(9, { worldId: "E2-V2" }).map((trial, index) => ({ ...trial, trialOrdinal: index + 10 })),
    ],
  }, oldArtifact);

  assert.equal(snapshot.score.gateFDownstreamFertilityMet, true);
  assert.equal(snapshot.score.memoryFormation.rememberedRate, 17 / 18);
  assert.equal(snapshot.score.memoryFormation.characterization.nearTotalRecallObserved, true);
  assert.equal(snapshot.score.memoryFormation.characterization.gateUse, false);
  assert.equal(snapshot.pairedPassBFramingComparison.gateUse, false);
  assert.equal(snapshot.pairedPassBFramingComparison.newRemembered, 8);
  assert.equal(snapshot.preflight.reviewedPreflightDigest, reviewedN2Preflight.reviewedPreflightDigest);
});
