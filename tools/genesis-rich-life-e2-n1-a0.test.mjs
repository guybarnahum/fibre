import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { sha256 } from "../services/world-kernel/src/persistence-common.mjs";
import {
  E2_N1_A0_POSITIVE_THRESHOLD,
  E2_N1_A0_SOURCE_FILE,
  E2_N1_A0_SOURCE_FILE_SHA256,
  E2_N1_A0_TRIAL_COUNT,
  buildN1A0Preflight,
  buildN1A0TrialPlan,
  runN1A0,
} from "./genesis-rich-life-e2-n1-a0.mjs";

function loadSource() {
  const sourceText = readFileSync(new URL(`../${E2_N1_A0_SOURCE_FILE}`, import.meta.url), "utf8");
  return {
    sourceText,
    sourceFileSha256: sha256(sourceText),
    sourceArtifact: JSON.parse(sourceText),
  };
}

test("N1-on-A0 freezes 9-trial conservative fertility protocol and executes checkpoint-safe with known residue", async () => {
  const { sourceArtifact, sourceFileSha256 } = loadSource();
  assert.equal(sourceFileSha256, E2_N1_A0_SOURCE_FILE_SHA256);

  const preflight = buildN1A0Preflight({ sourceArtifact, sourceFileSha256 });
  assert.equal(preflight.trialCount, E2_N1_A0_TRIAL_COUNT);
  assert.equal(preflight.positiveThreshold, E2_N1_A0_POSITIVE_THRESHOLD);
  assert.equal(preflight.thresholdChanceTail, 0.01953125);
  assert.equal(preflight.sevenOfNineChanceTail, 0.08984375);
  assert.deepEqual(preflight.assignment.sourceUses, { 1: 3, 2: 3, 3: 3 });
  assert.deepEqual(preflight.assignment.truthLabels, { A: 5, B: 4 });
  assert.deepEqual(preflight.assignment.candidateASides, { left: 5, right: 4 });
  assert.equal(preflight.scoring.notRememberedReceivesPositiveCredit, false);
  assert.equal(preflight.cognition.genomeVisibleToPassB, false);
  assert.equal(preflight.cognition.historyVisibleToPassC, false);

  const plan = buildN1A0TrialPlan();
  const truthByOrdinal = new Map(plan.map((trial) => [trial.trialOrdinal, trial.truthCandidate]));
  const requests = [];
  const adapter = Object.freeze({
    async invoke(request) {
      requests.push(structuredClone(request));
      const match = /trial-(\d{3})/.exec(request.clientRequestId);
      assert.notEqual(match, null);
      const ordinal = Number(match[1]);
      if (request.clientRequestId.endsWith(":pass-b")) {
        if (ordinal === 1) {
          return {
            output: {
              outcome: "not_remembered",
              episodeRefs: [],
              rememberedContent: null,
              uncertainty: ["No autobiographical memory was selected."],
            },
            provenance: { provider: "mock", modelId: "mock-n1-a0" },
          };
        }
        return {
          output: {
            outcome: "remembered",
            episodeRefs: ["n1_ep_01"],
            rememberedContent: "I remember the concrete first episode and the people and place involved in it.",
            uncertainty: [],
          },
          provenance: { provider: "mock", modelId: "mock-n1-a0" },
        };
      }
      if (request.clientRequestId.endsWith(":pass-c")) {
        return {
          output: {
            outcome: "durable_meaning",
            summary: "This concrete remembered episode remains personally meaningful in a specific way.",
            parts: [{ meaning: "The remembered interaction remains a specific point of reference." }],
          },
          provenance: { provider: "mock", modelId: "mock-n1-a0" },
        };
      }
      if (request.clientRequestId.endsWith(":rater")) {
        const serialized = JSON.stringify(request.input);
        assert.equal(serialized.includes("structureRef"), false);
        assert.equal(serialized.includes("slice-e2-v1-seed"), false);
        assert.equal(serialized.includes("A0_corrected_coupled_chooser_realizer"), false);
        return {
          output: {
            chosenCandidate: truthByOrdinal.get(ordinal),
            evidenceEpisodeOrdinals: [1],
            rationale: "Candidate episode 1 contains the concrete lived details reflected by the bundle.",
          },
          provenance: { provider: "mock", modelId: "mock-n1-a0" },
        };
      }
      throw new Error(`unexpected mock request ${request.clientRequestId}`);
    },
  });

  assert.equal(requests.length, 0);
  const checkpoints = [];
  const result = await runN1A0({
    provider: "mock",
    model: "mock-n1-a0",
    sourceArtifact,
    sourceFileSha256,
    adapterOverride: adapter,
    onCheckpoint: async (snapshot) => checkpoints.push(snapshot.status),
  });

  assert.equal(result.status, "complete");
  assert.equal(result.completedTrials.length, 9);
  assert.equal(result.score.rawForcedChoice.correct, 9);
  assert.equal(result.score.conservativeFertility.correct, 8);
  assert.equal(result.score.conservativeFertility.rememberedTrials, 8);
  assert.equal(result.score.conservativeFertility.notRememberedTrials, 1);
  assert.equal(result.score.conservativeFertility.thresholdMet, true);
  assert.equal(result.completedTrials[0].passB.output.outcome, "not_remembered");
  assert.equal(result.completedTrials[0].passC, null);
  assert.equal(result.completedTrials[0].passB.formCanonicalization.modelCallUsed, false);
  assert.equal(result.completedTrials[0].passB.formCanonicalization.semanticDecisionChanged, false);
  assert.equal(requests.filter((request) => request.clientRequestId.endsWith(":pass-b")).length, 9);
  assert.equal(requests.filter((request) => request.clientRequestId.endsWith(":pass-c")).length, 8);
  assert.equal(requests.filter((request) => request.clientRequestId.endsWith(":rater")).length, 9);
  assert.equal(checkpoints.at(-1), "complete");
});
