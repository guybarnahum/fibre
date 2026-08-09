import assert from "node:assert/strict";
import test from "node:test";

import { HISTORY_BENDS_JUDGMENT_FROZEN_BOUNDARY_CANDIDATE_3 as FROZEN } from
  "../experiments/history-bends-judgment/frozen-boundary-candidate-3.mjs";
import { HISTORY_BENDS_JUDGMENT_STANDING_GATE_V3 as SET } from
  "../experiments/history-bends-judgment/standing-gate-v3.mjs";
import { generatedHistoryStandingGateV3Source } from
  "./history-bends-judgment-gate-v3.mjs";
import {
  assertFreshStandingScenario,
  generatedHistoryStandingProofV3Source,
} from "./history-bends-judgment-standing-proof-v3.mjs";

function requestText(request) {
  return [
    request.objective,
    request.statedNeed,
    request.acceptanceCriteria,
    ...(request.permissions ?? []),
  ].join("\n").toLowerCase();
}

test("history standing gate v3 is fresh, post-freeze, and bound to candidate 3", () => {
  assert.equal(assertFreshStandingScenario(), true);
  assert.equal(SET.frozenCandidateId, FROZEN.id);
  assert.equal(SET.authoredAfterFreeze, true);
  assert.equal(SET.subject.threadId, "thr_leila_001");
  assert.equal(FROZEN.standingScenarioAuthored, false);
});

test("history standing gate v3 withholds every causal episode fact from request B", () => {
  const episode = requestText(SET.episodeRequest);
  const later = requestText(SET.laterRequest);
  for (const fact of SET.heldOutEpisodeFacts) {
    assert.equal(episode.includes(fact.toLowerCase()), true, `Episode A missing ${fact}`);
    assert.equal(later.includes(fact.toLowerCase()), false, `Request B leaked ${fact}`);
  }
});

test("history standing gate v3 does not assert the individuality conclusion in request B", () => {
  const later = requestText(SET.laterRequest);
  for (const phrase of SET.prohibitedLaterRequestText) {
    assert.equal(
      later.includes(phrase.toLowerCase()),
      false,
      `Request B leaked prohibited conclusion: ${phrase}`,
    );
  }
  assert.equal(SET.methodology.informationAsymmetryRequired, true);
  assert.equal(SET.methodology.causalConclusionMustComeFromRetainedHistory, true);
});

test("history standing gate v3 does not reuse Development or retired standing material", () => {
  const payload = JSON.stringify({
    subject: SET.subject,
    episodeRequest: SET.episodeRequest,
    laterRequest: SET.laterRequest,
  }).toLowerCase();
  for (const forbidden of SET.developmentSeparation.forbiddenStandingText) {
    assert.equal(payload.includes(forbidden.toLowerCase()), false, `reused forbidden text: ${forbidden}`);
  }
  for (const prior of FROZEN.priorStandingGates) {
    for (const retired of prior.retiredStandingMaterial) {
      assert.equal(payload.includes(retired.toLowerCase()), false, `reused retired text: ${retired}`);
    }
  }
});

test("history standing gate v3 evaluator permits any Guardian-valid non-accept action below high fit", () => {
  assert.deepEqual(SET.expected.withoutHistory.actions, ["clarify", "negotiate", "refuse"]);
  assert.deepEqual(SET.expected.withoutHistory.participationFits, ["mixed", "low"]);
  assert.equal(SET.expected.withoutHistory.highFitPermitted, false);
  assert.equal(SET.expected.withoutHistory.acceptPermitted, false);
  assert.equal(SET.methodology.nonAcceptActionVerbPrescribed, false);

  const source = generatedHistoryStandingProofV3Source();
  assert.match(source, /participationFits\.includes\(withoutHistory\.participationFit\)/);
  assert.match(source, /expected non-accept/);
  assert.doesNotMatch(source, /withoutHistory\.participationFit !== SET\.expected\.withoutHistory\.participationFit/);
});

test("history gate v3 runner mechanically binds the sealed engine to candidate 3", () => {
  const source = generatedHistoryStandingGateV3Source();
  assert.match(source, /frozen-boundary-candidate-3\.mjs/);
  assert.match(source, /standing-gate-v3\.mjs/);
  assert.match(source, /history-bends-judgment-standing-proof-v3\.mjs/);
  assert.doesNotMatch(source, /frozen-boundary-candidate-1\.mjs/);
  assert.doesNotMatch(source, /standing-gate-v1\.mjs/);
  assert.match(source, /History bends judgment standing gate v3/);
});
