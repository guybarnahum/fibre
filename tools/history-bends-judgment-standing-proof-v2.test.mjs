import assert from "node:assert/strict";
import test from "node:test";

import { HISTORY_BENDS_JUDGMENT_FROZEN_BOUNDARY_CANDIDATE_2 as FROZEN } from
  "../experiments/history-bends-judgment/frozen-boundary-candidate-2.mjs";
import { HISTORY_BENDS_JUDGMENT_STANDING_GATE_V2 as SET } from
  "../experiments/history-bends-judgment/standing-gate-v2.mjs";
import { generatedHistoryStandingGateV2Source } from
  "./history-bends-judgment-gate-v2.mjs";
import { assertFreshStandingScenario } from
  "./history-bends-judgment-standing-proof-v2.mjs";

function requestText(request) {
  return [
    request.objective,
    request.statedNeed,
    request.acceptanceCriteria,
    ...(request.permissions ?? []),
  ].join("\n").toLowerCase();
}

test("history standing gate v2 is fresh, post-freeze, and bound to candidate 2", () => {
  assert.equal(assertFreshStandingScenario(), true);
  assert.equal(SET.frozenCandidateId, FROZEN.id);
  assert.equal(SET.authoredAfterFreeze, true);
  assert.equal(SET.subject.threadId, "thr_daniel_001");
  assert.equal(FROZEN.standingScenarioAuthored, false);
});

test("history standing gate v2 withholds every causal episode fact from request B", () => {
  const episode = requestText(SET.episodeRequest);
  const later = requestText(SET.laterRequest);
  for (const fact of SET.heldOutEpisodeFacts) {
    assert.equal(episode.includes(fact.toLowerCase()), true, `Episode A missing ${fact}`);
    assert.equal(later.includes(fact.toLowerCase()), false, `Request B leaked ${fact}`);
  }
});

test("history standing gate v2 does not assert the individuality conclusion in request B", () => {
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

test("history standing gate v2 does not reuse Development or retired standing material", () => {
  const payload = JSON.stringify({
    subject: SET.subject,
    episodeRequest: SET.episodeRequest,
    laterRequest: SET.laterRequest,
  }).toLowerCase();
  for (const forbidden of SET.developmentSeparation.forbiddenStandingText) {
    assert.equal(payload.includes(forbidden.toLowerCase()), false, `reused forbidden text: ${forbidden}`);
  }
});

test("history gate v2 runner mechanically binds the sealed engine to candidate 2", () => {
  const source = generatedHistoryStandingGateV2Source();
  assert.match(source, /frozen-boundary-candidate-2\.mjs/);
  assert.match(source, /standing-gate-v2\.mjs/);
  assert.match(source, /history-bends-judgment-standing-proof-v2\.mjs/);
  assert.doesNotMatch(source, /frozen-boundary-candidate-1\.mjs/);
  assert.doesNotMatch(source, /standing-gate-v1\.mjs/);
  assert.match(source, /History bends judgment standing gate v2/);
});
