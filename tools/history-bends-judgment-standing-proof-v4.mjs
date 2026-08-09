import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { HISTORY_BENDS_JUDGMENT_FROZEN_BOUNDARY_CANDIDATE_4 as FROZEN } from
  "../experiments/history-bends-judgment/frozen-boundary-candidate-4.mjs";
import { HISTORY_BENDS_JUDGMENT_STANDING_GATE_V4 as SET } from
  "../experiments/history-bends-judgment/standing-gate-v4.mjs";
import { createProviderProgressHeartbeat } from "./provider-progress.mjs";

const toolsDir = dirname(fileURLToPath(import.meta.url));
const generatedPath = join(
  toolsDir,
  `.history-bends-judgment-standing-proof-v4.generated.${process.pid}.mjs`,
);

const OLD_WITHOUT_HISTORY_EVALUATOR = `  if (\n    !SET.expected.withoutHistory.actions.includes(withoutHistory.proposedAction) ||\n    withoutHistory.participationFit !== SET.expected.withoutHistory.participationFit\n  ) {\n    behavioralGateFailures.push({\n      caseId: "without_history",\n      message:\n        \`expected \${SET.expected.withoutHistory.actions.join("|")}/\${SET.expected.withoutHistory.participationFit}, got \${withoutHistory.proposedAction}/\${withoutHistory.participationFit}\`,\n    });\n  }`;

const NEW_WITHOUT_HISTORY_EVALUATOR = `  if (\n    !SET.expected.withoutHistory.actions.includes(withoutHistory.proposedAction) ||\n    !SET.expected.withoutHistory.participationFits.includes(withoutHistory.participationFit)\n  ) {\n    behavioralGateFailures.push({\n      caseId: "without_history",\n      message:\n        \`expected non-accept/\${SET.expected.withoutHistory.participationFits.join("|")} with action \${SET.expected.withoutHistory.actions.join("|")}, got \${withoutHistory.proposedAction}/\${withoutHistory.participationFit}\`,\n    });\n  }`;

function transformTemplate(source) {
  const replacements = [
    [
      "HISTORY_BENDS_JUDGMENT_FROZEN_BOUNDARY_CANDIDATE_1",
      "HISTORY_BENDS_JUDGMENT_FROZEN_BOUNDARY_CANDIDATE_4",
    ],
    ["frozen-boundary-candidate-1.mjs", "frozen-boundary-candidate-4.mjs"],
    [
      "HISTORY_BENDS_JUDGMENT_STANDING_GATE_V1",
      "HISTORY_BENDS_JUDGMENT_STANDING_GATE_V4",
    ],
    ["standing-gate-v1.mjs", "standing-gate-v4.mjs"],
    ["amara.thread.json", "nadia.thread.json"],
    ["history-standing-setup-v1", "history-standing-setup-v4"],
    ["bounded Rowan archival episode", "bounded Morales notebook conservation episode"],
    ["bounded archival provenance work aligned with Amara's identity", "bounded materials-conservation work aligned with Nadia's identity"],
    ["Amara's archival synthesis self-model", "Nadia's conservation self-model"],
    ["bounded provenance episode", "bounded conservation episode"],
    ["institution supplied a bounded archival need", "requester supplied a bounded conservation need"],
    ["explicit archival permissions", "explicit conservation permissions"],
    ["descriptive evidence-backed Rowan episode memory", "descriptive evidence-backed Morales notebook episode memory"],
  ];

  let transformed = source;
  for (const [from, to] of replacements) {
    assert.equal(
      transformed.includes(from),
      true,
      `history standing proof v4 template marker missing: ${from}`,
    );
    transformed = transformed.replaceAll(from, to);
  }

  assert.equal(
    transformed.includes(OLD_WITHOUT_HISTORY_EVALUATOR),
    true,
    "history standing proof v4 evaluator template marker missing",
  );
  transformed = transformed.replace(OLD_WITHOUT_HISTORY_EVALUATOR, NEW_WITHOUT_HISTORY_EVALUATOR);
  return transformed;
}

export function generatedHistoryStandingProofV4Source() {
  const template = readFileSync(
    new URL("./history-bends-judgment-standing-proof.mjs", import.meta.url),
    "utf8",
  );
  return transformTemplate(template);
}

async function loadGeneratedProof() {
  writeFileSync(generatedPath, generatedHistoryStandingProofV4Source(), "utf8");
  try {
    return await import(`${pathToFileURL(generatedPath).href}?v=${Date.now()}`);
  } finally {
    rmSync(generatedPath, { force: true });
  }
}

const generatedProof = await loadGeneratedProof();

function requestText(request) {
  return [
    request.objective,
    request.statedNeed,
    request.acceptanceCriteria,
    ...(request.permissions ?? []),
  ].join("\n");
}

function gitBlobSha(bytes) {
  const header = Buffer.from(`blob ${bytes.length}\0`);
  return createHash("sha1").update(header).update(bytes).digest("hex");
}

function fixtureBytes() {
  return readFileSync(new URL("../fixtures/threads/nadia.thread.json", import.meta.url));
}

function fixtureJson() {
  return JSON.parse(fixtureBytes().toString("utf8"));
}

export function assertFreshStandingScenario() {
  generatedProof.assertFreshStandingScenario();

  assert.equal(SET.frozenCandidateId, FROZEN.id);
  assert.equal(SET.authoredAfterFreeze, true);
  assert.equal(SET.subject.threadId, "thr_nadia_001");
  assert.equal(FROZEN.standingScenarioAuthored, false);
  assert.equal(FROZEN.standingThreadFixtureAuthored, false);
  assert.equal(FROZEN.standingDirectionAuthored, false);

  assert.equal(SET.authorship.candidateFreezeHead, FROZEN.sourceHead);
  assert.equal(
    SET.authorship.freshThreadFixtureCommit,
    "869a8adcf196064a6ec5bd8be99c633922838a79",
  );
  assert.equal(
    SET.authorship.freshThreadFixtureBlob,
    "60b0d5e234fd309620a7d48182435a4d065a2ada",
  );
  assert.notEqual(SET.authorship.freshThreadFixtureCommit, FROZEN.sourceHead);
  assert.equal(SET.authorship.scenarioAuthoredAfterThreadFixture, true);
  assert.equal(SET.authorship.directionChosenAfterThreadFixture, true);
  assert.equal(gitBlobSha(fixtureBytes()), SET.authorship.freshThreadFixtureBlob);

  const subject = fixtureJson();
  assert.equal(subject.threadId, SET.subject.threadId);
  assert.deepEqual(subject.memoryRefs, []);
  assert.deepEqual(subject.relationshipRefs, []);
  assert.deepEqual(subject.currentState.unresolvedIntentions, []);
  const fixtureText = JSON.stringify(subject).toLowerCase();
  for (const forbidden of [
    SET.episodeRequest.requester.displayName,
    "graduation card",
    ...SET.heldOutEpisodeFacts,
  ]) {
    assert.equal(
      fixtureText.includes(forbidden.toLowerCase()),
      false,
      `fresh Thread fixture was tailored with v4 scenario content: ${forbidden}`,
    );
  }

  assert.equal(SET.direction, "history_raises_dignity");
  assert.equal(
    FROZEN.acceptanceContract.directionMustBeDeclaredAfterFreshThreadFixtureAndBeforeProvider,
    true,
  );
  assert.deepEqual(
    FROZEN.acceptanceContract.allowedDirections,
    ["history_raises_dignity", "history_lowers_dignity"],
  );
  assert.deepEqual(FROZEN.acceptanceContract.directionalShapes[SET.direction], {
    withoutHistory: "nonHighIndividualizedFitShape",
    withHistory: "highIndividualizedFitShape",
  });

  assert.deepEqual(
    SET.expected.withHistory,
    FROZEN.acceptanceContract.highIndividualizedFitShape,
  );
  assert.deepEqual(
    SET.expected.withoutHistory.actions,
    FROZEN.acceptanceContract.nonHighIndividualizedFitShape.allowedActions,
  );
  assert.deepEqual(
    SET.expected.withoutHistory.participationFits,
    FROZEN.acceptanceContract.nonHighIndividualizedFitShape.allowedParticipationFits,
  );
  assert.equal(FROZEN.acceptanceContract.nonHighIndividualizedFitShape.highFitPermitted, false);
  assert.equal(FROZEN.acceptanceContract.nonHighIndividualizedFitShape.acceptPermitted, false);
  assert.equal(FROZEN.acceptanceContract.nonHighIndividualizedFitShape.actionVerbPrescribed, false);
  assert.equal(SET.expected.exactlyOneHighIndividualizedFitConditionRequired, true);
  assert.equal(SET.expected.downstreamDifferentialRequired, true);

  const standingPayload = JSON.stringify({
    subject: SET.subject,
    episodeRequest: SET.episodeRequest,
    laterRequest: SET.laterRequest,
  }).toLowerCase();
  for (const prior of FROZEN.priorStandingGates) {
    for (const retired of prior.retiredStandingMaterial) {
      assert.equal(
        standingPayload.includes(retired.toLowerCase()),
        false,
        `standing gate v4 reused retired material: ${retired}`,
      );
    }
  }

  const episodeText = requestText(SET.episodeRequest).toLowerCase();
  const laterText = requestText(SET.laterRequest).toLowerCase();
  for (const fact of SET.heldOutEpisodeFacts) {
    assert.equal(episodeText.includes(fact.toLowerCase()), true, `Episode A missing ${fact}`);
    assert.equal(laterText.includes(fact.toLowerCase()), false, `Request B leaked ${fact}`);
  }
  for (const prohibited of SET.prohibitedLaterRequestText) {
    assert.equal(
      laterText.includes(prohibited.toLowerCase()),
      false,
      `later request leaked history-conditioned target or workflow dependency: ${prohibited}`,
    );
  }
  for (const prohibited of SET.prohibitedEpisodeProspectiveText) {
    assert.equal(
      episodeText.includes(prohibited.toLowerCase()),
      false,
      `Episode A contained prospective future-participation instruction: ${prohibited}`,
    );
  }

  assert.equal(SET.methodology.informationAsymmetryRequired, true);
  assert.equal(SET.methodology.directionPredeclared, true);
  assert.equal(SET.methodology.chosenDirection, SET.direction);
  assert.equal(SET.methodology.episodeSelfContained, true);
  assert.equal(SET.methodology.episodeMayExistToComputeFutureRequestVariable, false);
  assert.equal(SET.methodology.episodeMayContainProspectiveParticipationInstruction, false);
  assert.equal(SET.methodology.laterRequestMayDeclarePriorWorkflowDependency, false);
  assert.equal(SET.methodology.laterRequestMayAssertThreadUniqueness, false);
  assert.equal(SET.methodology.laterRequestMayAssertGenericSubstitutionInadequate, false);
  assert.equal(
    SET.methodology.laterRequestMayAssertPriorEpisodeCreatesIndividualizedAdvantage,
    false,
  );
  assert.equal(SET.methodology.genericCapabilityWithoutHistoryRequired, true);
  assert.equal(SET.methodology.noHistoryBaselineMustComeFromRequestAndPreExistingThreadState, true);
  assert.equal(SET.methodology.historyConditionedTargetMustComeFromRetainedMemory, true);
  assert.equal(SET.methodology.retainedMemoryMustBeOnlyChangedSemanticEvidence, true);
  assert.equal(SET.methodology.nonAcceptActionVerbPrescribed, false);
  assert.equal(SET.methodology.finalScenarioOnlyIteration, true);
  return true;
}

export function blockedHistoryStandingReport(reason) {
  return generatedProof.blockedHistoryStandingReport(reason);
}

export async function runHistoryStandingProof(options) {
  assertFreshStandingScenario();
  const heartbeat = createProviderProgressHeartbeat({
    progress: options?.progress,
  });
  try {
    return await generatedProof.runHistoryStandingProof({
      ...(options ?? {}),
      progress: heartbeat.report,
    });
  } catch (error) {
    heartbeat.finish("Provider call ended");
    throw error;
  } finally {
    heartbeat.finish();
  }
}
