import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTROL_SITUATIONS,
  candidateOrderFor,
  runGenomeSpecificityControl,
} from "./genesis-genome-positive-control.mjs";

function mockFactory() {
  let generatorCalls = 0;
  return ({ observer }) => ({
    async invoke({ clientRequestId, input }) {
      observer?.({ type: "model_attempt" });
      observer?.({ type: "model_response" });
      if (clientRequestId.includes(":generate:")) {
        generatorCalls += 1;
        const label = generatorCalls === 1 ? "A" : "B";
        return {
          output: {
            items: CONTROL_SITUATIONS.map((situation) => ({
              situationId: situation.id,
              semanticResponse: `${label} semantic route for ${situation.id}`,
            })),
          },
          provenance: { provider: "mock", modelId: `generator-${label}` },
        };
      }
      return {
        output: {
          choices: input.trials.map((trial) => ({
            situationId: trial.situationId,
            genomeAChoice: trial.left.startsWith("A ") ? "left" : "right",
          })),
        },
        provenance: { provider: "mock", modelId: "blind-rater" },
      };
    },
  });
}

test("positive control blinds source labels, scores 2AFC, and exposes no admission verdict", async () => {
  const result = await runGenomeSpecificityControl({
    generatorProvider: "openai",
    generatorModel: "mock-generator",
    raterProvider: "openai",
    raterModel: "mock-rater",
    seed: "fixed-test-seed",
    adapterFactory: mockFactory(),
  });

  assert.equal(result.result.trials, CONTROL_SITUATIONS.length);
  assert.equal(result.result.correct, CONTROL_SITUATIONS.length);
  assert.equal(result.result.accuracy, 1);
  assert.equal(result.result.chanceAccuracy, 0.5);
  assert.equal(result.result.pass, undefined);
  assert.equal(result.result.verdict, undefined);
  assert.equal(result.blindedTrials.some((trial) => "correctGenomeAChoice" in trial), false);
  for (const trial of result.blindedTrials) {
    assert.equal(["A-left", "A-right"].includes(candidateOrderFor(result.seed, trial.situationId)), true);
  }
});
