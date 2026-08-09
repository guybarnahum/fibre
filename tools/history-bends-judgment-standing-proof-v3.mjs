import assert from "node:assert/strict";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { HISTORY_BENDS_JUDGMENT_FROZEN_BOUNDARY_CANDIDATE_3 as FROZEN } from
  "../experiments/history-bends-judgment/frozen-boundary-candidate-3.mjs";
import { HISTORY_BENDS_JUDGMENT_STANDING_GATE_V3 as SET } from
  "../experiments/history-bends-judgment/standing-gate-v3.mjs";

const toolsDir = dirname(fileURLToPath(import.meta.url));
const generatedPath = join(
  toolsDir,
  `.history-bends-judgment-standing-proof-v3.generated.${process.pid}.mjs`,
);

const OLD_WITHOUT_HISTORY_EVALUATOR = `  if (\n    !SET.expected.withoutHistory.actions.includes(withoutHistory.proposedAction) ||\n    withoutHistory.participationFit !== SET.expected.withoutHistory.participationFit\n  ) {\n    behavioralGateFailures.push({\n      caseId: "without_history",\n      message:\n        \`expected \${SET.expected.withoutHistory.actions.join("|")}/\${SET.expected.withoutHistory.participationFit}, got \${withoutHistory.proposedAction}/\${withoutHistory.participationFit}\`,\n    });\n  }`;

const NEW_WITHOUT_HISTORY_EVALUATOR = `  if (\n    !SET.expected.withoutHistory.actions.includes(withoutHistory.proposedAction) ||\n    !SET.expected.withoutHistory.participationFits.includes(withoutHistory.participationFit)\n  ) {\n    behavioralGateFailures.push({\n      caseId: "without_history",\n      message:\n        \`expected non-accept/\${SET.expected.withoutHistory.participationFits.join("|")} with action \${SET.expected.withoutHistory.actions.join("|")}, got \${withoutHistory.proposedAction}/\${withoutHistory.participationFit}\`,\n    });\n  }`;

function transformTemplate(source) {
  const replacements = [
    [
      "HISTORY_BENDS_JUDGMENT_FROZEN_BOUNDARY_CANDIDATE_1",
      "HISTORY_BENDS_JUDGMENT_FROZEN_BOUNDARY_CANDIDATE_3",
    ],
    ["frozen-boundary-candidate-1.mjs", "frozen-boundary-candidate-3.mjs"],
    [
      "HISTORY_BENDS_JUDGMENT_STANDING_GATE_V1",
      "HISTORY_BENDS_JUDGMENT_STANDING_GATE_V3",
    ],
    ["standing-gate-v1.mjs", "standing-gate-v3.mjs"],
    ["amara.thread.json", "leila.thread.json"],
    ["history-standing-setup-v1", "history-standing-setup-v3"],
    ["bounded Rowan archival episode", "bounded Harborlight dock-trial episode"],
    ["bounded archival provenance work aligned with Amara's identity", "bounded field service-design work aligned with Leila's identity"],
    ["Amara's archival synthesis self-model", "Leila's field-observation self-model"],
    ["bounded provenance episode", "bounded dock-trial episode"],
    ["institution supplied a bounded archival need", "operator supplied a bounded field-research need"],
    ["explicit archival permissions", "explicit dock-trial permissions"],
    ["descriptive evidence-backed Rowan episode memory", "descriptive evidence-backed Harborlight episode memory"],
  ];

  let transformed = source;
  for (const [from, to] of replacements) {
    assert.equal(
      transformed.includes(from),
      true,
      `history standing proof v3 template marker missing: ${from}`,
    );
    transformed = transformed.replaceAll(from, to);
  }

  assert.equal(
    transformed.includes(OLD_WITHOUT_HISTORY_EVALUATOR),
    true,
    "history standing proof v3 evaluator template marker missing",
  );
  transformed = transformed.replace(OLD_WITHOUT_HISTORY_EVALUATOR, NEW_WITHOUT_HISTORY_EVALUATOR);
  return transformed;
}

export function generatedHistoryStandingProofV3Source() {
  const template = readFileSync(
    new URL("./history-bends-judgment-standing-proof.mjs", import.meta.url),
    "utf8",
  );
  return transformTemplate(template);
}

async function loadGeneratedProof() {
  writeFileSync(generatedPath, generatedHistoryStandingProofV3Source(), "utf8");
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

export function assertFreshStandingScenario() {
  generatedProof.assertFreshStandingScenario();

  assert.equal(SET.frozenCandidateId, FROZEN.id);
  assert.equal(SET.authoredAfterFreeze, true);
  assert.equal(SET.subject.threadId, "thr_leila_001");
  assert.equal(FROZEN.standingScenarioAuthored, false);
  assert.equal(FROZEN.standingMethodology.authorFreshScenarioAfterFreezeOnly, true);

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
        `standing gate v3 reused retired material: ${retired}`,
      );
    }
  }

  const laterText = requestText(SET.laterRequest).toLowerCase();
  for (const prohibited of SET.prohibitedLaterRequestText) {
    assert.equal(
      laterText.includes(prohibited.toLowerCase()),
      false,
      `later request leaked prohibited individuality conclusion: ${prohibited}`,
    );
  }

  assert.equal(SET.methodology.informationAsymmetryRequired, true);
  assert.equal(SET.methodology.laterRequestMayAssertThreadUniqueness, false);
  assert.equal(SET.methodology.laterRequestMayAssertGenericSubstitutionInadequate, false);
  assert.equal(
    SET.methodology.laterRequestMayAssertPriorEpisodeCreatesIndividualizedAdvantage,
    false,
  );
  assert.equal(SET.methodology.causalConclusionMustComeFromRetainedHistory, true);
  assert.equal(SET.methodology.causalLossOfHighFitRequired, true);
  assert.equal(SET.methodology.nonAcceptActionVerbPrescribed, false);

  assert.deepEqual(
    SET.expected.withoutHistory.actions,
    FROZEN.acceptanceContract.withoutHistory.allowedActions,
  );
  assert.deepEqual(
    SET.expected.withoutHistory.participationFits,
    FROZEN.acceptanceContract.withoutHistory.allowedParticipationFits,
  );
  assert.equal(FROZEN.acceptanceContract.withoutHistory.highFitPermitted, false);
  assert.equal(FROZEN.acceptanceContract.withoutHistory.acceptPermitted, false);
  assert.equal(FROZEN.acceptanceContract.withoutHistory.actionVerbPrescribed, false);
  return true;
}

export function blockedHistoryStandingReport(reason) {
  return generatedProof.blockedHistoryStandingReport(reason);
}

export async function runHistoryStandingProof(options) {
  assertFreshStandingScenario();
  return generatedProof.runHistoryStandingProof(options);
}
