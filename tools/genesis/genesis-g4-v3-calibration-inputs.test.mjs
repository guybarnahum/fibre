import assert from "node:assert/strict";
import test from "node:test";

import { canonicalJson } from "../../services/world-kernel/src/persistence-common.mjs";
import {
  CALIBRATION_INPUT_VERSION,
  buildCalibrationInputCorpus,
  verifyCalibrationInputCorpus,
} from "./genesis-g4-v3-calibration-inputs.mjs";

test("G4-v3 calibration corpus is exactly 15 synthetic Worlds by 15 deterministic trials", () => {
  const corpus = buildCalibrationInputCorpus();
  assert.equal(corpus.evidenceVersion, CALIBRATION_INPUT_VERSION);
  assert.equal(corpus.status, "FROZEN_PRE_EXECUTION");
  assert.equal(corpus.worldSpecs.length, 15);
  assert.equal(corpus.trials.length, 225);
  assert.equal(corpus.construction.worldCount, 15);
  assert.equal(corpus.construction.trialsPerWorld, 15);
  assert.equal(corpus.construction.trialCount, 225);
  assert.deepEqual(corpus.construction.priorHistoryDistribution, {
    zeroPriorEpisodes: 75,
    onePriorEpisode: 75,
    twoPriorEpisodes: 75,
  });
});

test("G4-v3 calibration trials are unique, genome-free, and outside frozen cohort identity", () => {
  const corpus = buildCalibrationInputCorpus();
  assert.equal(new Set(corpus.trials.map((trial) => trial.trialId)).size, 225);
  assert.equal(new Set(corpus.trials.map((trial) => trial.passAInputDigest)).size, 225);
  assert.equal(new Set(corpus.trials.map((trial) => trial.cognitionInputDigest)).size, 225);
  assert.equal(new Set(corpus.trials.map((trial) => trial.worldSpecId)).size, 15);
  for (const trial of corpus.trials) {
    assert.match(trial.trialId, /^cal_g4v3_\d{3}$/u);
    assert.match(trial.subjectId, /^thr_cal_g4v3_/u);
    assert.match(trial.worldSpecId, /^world_cal_g4v3_/u);
    assert.equal(trial.passAInput.offeredStructures.length, 9);
    assert.equal(Object.hasOwn(trial.passAInput.world, "worldAuthorship"), false);
    assert.equal(/genome/iu.test(canonicalJson(trial.passAInput)), false);
    assert.equal(/thr_pr39_g2_/u.test(canonicalJson(trial.passAInput)), false);
    assert.equal(/world_slice_g1_/u.test(canonicalJson(trial.passAInput)), false);
  }
});

test("G4-v3 calibration corpus varies roster breadth and inherited developmental windows deterministically", () => {
  const corpus = buildCalibrationInputCorpus();
  assert.ok(new Set(corpus.trials.map((trial) => trial.initialRosterCount)).size >= 8);
  assert.equal(new Set(corpus.trials.map((trial) => trial.developmentalWindowOrdinal)).size, 10);
  assert.equal(corpus.trials[0].priorEpisodeCount, 0);
  assert.equal(corpus.trials[5].priorEpisodeCount, 1);
  assert.equal(corpus.trials[10].priorEpisodeCount, 2);
});

test("G4-v3 calibration corpus rebuild is byte-stable and self-verifying", () => {
  const first = buildCalibrationInputCorpus();
  const second = buildCalibrationInputCorpus();
  assert.equal(canonicalJson(first), canonicalJson(second));
  assert.equal(verifyCalibrationInputCorpus(structuredClone(first)).corpusDigest, first.corpusDigest);
});
