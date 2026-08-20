import assert from "node:assert/strict";
import test from "node:test";

import { analyzePairLexicalOverlap } from "./genesis-g2-lexical-overlap.mjs";

function pairFixture({ responseA, responseB, raterCorrect = true } = {}) {
  return {
    genomes: {
      A: [
        "asks for concrete evidence before accepting a confident claim",
        "changes tactics after a failed attempt instead of repeating it",
      ],
      B: [
        "uses humor to lower tension when a group becomes formal",
        "keeps small promises when nobody else is likely to notice",
      ],
    },
    outputs: {
      A: [{ situationId: "s01", semanticResponse: responseA }],
      B: [{ situationId: "s01", semanticResponse: responseB }],
    },
    scoredChoices: [{
      situationId: "s01",
      correct: raterCorrect,
    }],
  };
}

test("literal classifier recognizes exact distinctive-token reuse", () => {
  const analysis = analyzePairLexicalOverlap(pairFixture({
    responseA: "I would ask for concrete evidence before accepting the claim.",
    responseB: "A little humor could lower the tension in the room.",
  }), "p-test");

  assert.equal(analysis.trials, 1);
  assert.equal(analysis.literalClassifier.nonTieTrials, 1);
  assert.equal(analysis.literalClassifier.correct, 1);
  assert.equal(analysis.literalClassifier.incorrect, 0);
  assert.equal(analysis.literalClassifier.accuracyExcludingTies, 1);
  assert.equal(analysis.trialsDetail[0].lexicalPrediction, "correct_candidate");
  assert.ok(analysis.trialsDetail[0].correctCandidateLiteralMargin > 0);
});

test("literal classifier preserves ties instead of manufacturing success", () => {
  const analysis = analyzePairLexicalOverlap(pairFixture({
    responseA: "I would slow down and reconsider what matters in the moment.",
    responseB: "I would slow down and reconsider what matters in the moment.",
  }), "p-test");

  assert.equal(analysis.literalClassifier.nonTieTrials, 0);
  assert.equal(analysis.literalClassifier.tieTrials, 1);
  assert.equal(analysis.literalClassifier.accuracyExcludingTies, null);
  assert.equal(analysis.trialsDetail[0].lexicalPrediction, "tie");
});

test("literal classifier can disagree with the correct response", () => {
  const analysis = analyzePairLexicalOverlap(pairFixture({
    responseA: "A little humor could lower the tension in the room.",
    responseB: "I would ask for concrete evidence before accepting the claim.",
    raterCorrect: false,
  }), "p-test");

  assert.equal(analysis.literalClassifier.nonTieTrials, 1);
  assert.equal(analysis.literalClassifier.correct, 0);
  assert.equal(analysis.literalClassifier.incorrect, 1);
  assert.equal(analysis.trialsDetail[0].lexicalPrediction, "distractor");
  assert.ok(analysis.trialsDetail[0].correctCandidateLiteralMargin < 0);
});
