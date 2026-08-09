import assert from "node:assert/strict";
import test from "node:test";

import { HISTORY_BENDS_JUDGMENT_FROZEN_BOUNDARY_CANDIDATE_4 as FROZEN } from
  "../experiments/history-bends-judgment/frozen-boundary-candidate-4.mjs";
import { HISTORY_BENDS_JUDGMENT_STANDING_GATE_V4 as SET } from
  "../experiments/history-bends-judgment/standing-gate-v4.mjs";
import { generatedHistoryStandingGateV4Source } from
  "./history-bends-judgment-gate-v4.mjs";
import {
  assertFreshStandingScenario,
  generatedHistoryStandingProofV4Source,
} from "./history-bends-judgment-standing-proof-v4.mjs";

function requestText(request) {
  return [
    request.objective,
    request.statedNeed,
    request.acceptanceCriteria,
    ...(request.permissions ?? []),
  ].join("\n").toLowerCase();
}

test("history standing gate v4 is staged after the immutable Nadia fixture boundary", () => {
  assert.equal(assertFreshStandingScenario(), true);
  assert.equal(SET.frozenCandidateId, FROZEN.id);
  assert.equal(SET.authoredAfterFreeze, true);
  assert.equal(SET.subject.threadId, "thr_nadia_001");
  assert.equal(FROZEN.standingThreadFixtureAuthored, false);
  assert.equal(FROZEN.standingScenarioAuthored, false);
  assert.equal(FROZEN.standingDirectionAuthored, false);
  assert.equal(
    SET.authorship.freshThreadFixtureCommit,
    "869a8adcf196064a6ec5bd8be99c633922838a79",
  );
  assert.equal(
    SET.authorship.freshThreadFixtureBlob,
    "60b0d5e234fd309620a7d48182435a4d065a2ada",
  );
  assert.equal(SET.authorship.scenarioAuthoredAfterThreadFixture, true);
  assert.equal(SET.authorship.directionChosenAfterThreadFixture, true);
});

test("history standing gate v4 predeclares history raises dignity without making that universal", () => {
  assert.equal(SET.direction, "history_raises_dignity");
  assert.equal(FROZEN.acceptanceContract.directionChosenAtFreeze, false);
  assert.deepEqual(FROZEN.acceptanceContract.allowedDirections, [
    "history_raises_dignity",
    "history_lowers_dignity",
  ]);
  assert.deepEqual(FROZEN.acceptanceContract.directionalShapes[SET.direction], {
    withoutHistory: "nonHighIndividualizedFitShape",
    withHistory: "highIndividualizedFitShape",
  });
  assert.equal(FROZEN.standingMethodology.bidirectionalHistoryEffectPermitted, true);
  assert.equal(FROZEN.standingMethodology.coreClaim, "history bends judgment; history is not required to raise dignity");
});

test("history standing gate v4 keeps every lived Episode-A fact out of Request B", () => {
  const episode = requestText(SET.episodeRequest);
  const later = requestText(SET.laterRequest);
  for (const fact of SET.heldOutEpisodeFacts) {
    assert.equal(episode.includes(fact.toLowerCase()), true, `Episode A missing ${fact}`);
    assert.equal(later.includes(fact.toLowerCase()), false, `Request B leaked ${fact}`);
  }
});

test("history standing gate v4 is a self-contained experience, not workflow continuation", () => {
  const episode = requestText(SET.episodeRequest);
  const later = requestText(SET.laterRequest);
  for (const phrase of SET.prohibitedEpisodeProspectiveText) {
    assert.equal(
      episode.includes(phrase.toLowerCase()),
      false,
      `Episode A contained prospective instruction: ${phrase}`,
    );
  }
  for (const phrase of SET.prohibitedLaterRequestText) {
    assert.equal(
      later.includes(phrase.toLowerCase()),
      false,
      `Request B leaked prior workflow/history-conditioned target: ${phrase}`,
    );
  }
  assert.equal(SET.methodology.episodeSelfContained, true);
  assert.equal(SET.methodology.episodeMayExistToComputeFutureRequestVariable, false);
  assert.equal(SET.methodology.laterRequestMayDeclarePriorWorkflowDependency, false);
  assert.equal(SET.methodology.genericCapabilityWithoutHistoryRequired, true);
});

test("history standing gate v4 does not reuse Development or retired standing material", () => {
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

test("history standing gate v4 evaluator matches Candidate 4's history-raises shape", () => {
  assert.deepEqual(SET.expected.withHistory, {
    action: "accept",
    participationFit: "high",
  });
  assert.deepEqual(SET.expected.withoutHistory.actions, ["clarify", "negotiate", "refuse"]);
  assert.deepEqual(SET.expected.withoutHistory.participationFits, ["mixed", "low"]);
  assert.equal(SET.expected.withoutHistory.highFitPermitted, false);
  assert.equal(SET.expected.withoutHistory.acceptPermitted, false);
  assert.equal(SET.expected.exactlyOneHighIndividualizedFitConditionRequired, true);
  assert.equal(SET.expected.downstreamDifferentialRequired, true);
  assert.deepEqual(SET.expected.loadBearingMemoryFactors, [
    "individualizedAdvantage",
    "interchangeability",
  ]);

  const source = generatedHistoryStandingProofV4Source();
  assert.match(source, /nadia\.thread\.json/);
  assert.match(source, /participationFits\.includes\(withoutHistory\.participationFit\)/);
  assert.match(source, /expected non-accept/);
  assert.doesNotMatch(source, /withoutHistory\.participationFit !== SET\.expected\.withoutHistory\.participationFit/);
});

test("history gate v4 runner mechanically binds the one-shot engine to Candidate 4", () => {
  const source = generatedHistoryStandingGateV4Source();
  assert.match(source, /frozen-boundary-candidate-4\.mjs/);
  assert.match(source, /standing-gate-v4\.mjs/);
  assert.match(source, /history-bends-judgment-standing-proof-v4\.mjs/);
  assert.doesNotMatch(source, /frozen-boundary-candidate-1\.mjs/);
  assert.doesNotMatch(source, /standing-gate-v1\.mjs/);
  assert.match(source, /History bends judgment standing gate v4/);
});
