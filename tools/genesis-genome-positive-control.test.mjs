import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTROL_GENOME_A,
  CONTROL_SITUATIONS,
  PREDECLARED_READING,
  candidateOrderFor,
  exactOneSidedBinomialP,
  runGenomeSpecificityControl,
} from "./genesis-genome-positive-control.mjs";

function mockFactory(counters) {
  return ({ observer }) => ({
    async invoke({ clientRequestId, input }) {
      observer?.({ type: "model_attempt" });
      observer?.({ type: "model_response" });
      if (clientRequestId.includes(":generate:")) {
        counters.generator += 1;
        assert.equal(Array.isArray(input.situations), false);
        assert.equal(typeof input.situation?.id, "string");
        const label = input.genome[0] === CONTROL_GENOME_A[0] ? "A" : "B";
        return {
          output: {
            situationId: input.situation.id,
            semanticResponse: `${label} semantic route for ${input.situation.id}`,
          },
          provenance: { provider: "mock", modelId: `generator-${label}` },
        };
      }
      counters.rater += 1;
      assert.equal(Array.isArray(input.trials), false);
      assert.equal(typeof input.trial?.situationId, "string");
      return {
        output: {
          situationId: input.trial.situationId,
          genomeAChoice: input.trial.left.startsWith("A ") ? "left" : "right",
        },
        provenance: { provider: "mock", modelId: "blind-rater" },
      };
    },
  });
}

test("positive control uses independent generation/rating calls, blinds answers, and exposes no admission verdict", async () => {
  const counters = { generator: 0, rater: 0 };
  const result = await runGenomeSpecificityControl({
    generatorProvider: "openai",
    generatorModel: "mock-generator",
    raterProvider: "google",
    raterModel: "mock-rater",
    seed: "fixed-test-seed",
    adapterFactory: mockFactory(counters),
  });

  assert.equal(CONTROL_SITUATIONS.length, 24);
  assert.equal(counters.generator, CONTROL_SITUATIONS.length * 2);
  assert.equal(counters.rater, CONTROL_SITUATIONS.length);
  assert.equal(result.generator.calls.length, CONTROL_SITUATIONS.length * 2);
  assert.equal(result.rater.calls.length, CONTROL_SITUATIONS.length);
  assert.equal(result.rater.sameProviderAndModelAsGenerator, false);
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

test("predeclared reading fixes the 24-trial significance boundary before live execution", () => {
  assert.equal(PREDECLARED_READING.trials, 24);
  assert.equal(PREDECLARED_READING.firstSignificantCorrectCount, 17);
  assert.equal(exactOneSidedBinomialP({ trials: 24, correct: 16 }) > 0.05, true);
  assert.equal(exactOneSidedBinomialP({ trials: 24, correct: 17 }) < 0.05, true);
  assert.equal(Math.abs(exactOneSidedBinomialP({ trials: 24, correct: 17 }) - 0.03195732831954956) < 1e-12, true);
});
