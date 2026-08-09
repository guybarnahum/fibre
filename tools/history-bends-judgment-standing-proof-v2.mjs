import assert from "node:assert/strict";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { HISTORY_BENDS_JUDGMENT_FROZEN_BOUNDARY_CANDIDATE_2 as FROZEN } from
  "../experiments/history-bends-judgment/frozen-boundary-candidate-2.mjs";
import { HISTORY_BENDS_JUDGMENT_STANDING_GATE_V2 as SET } from
  "../experiments/history-bends-judgment/standing-gate-v2.mjs";

const toolsDir = dirname(fileURLToPath(import.meta.url));
const generatedPath = join(
  toolsDir,
  `.history-bends-judgment-standing-proof-v2.generated.${process.pid}.mjs`,
);

function transformTemplate(source) {
  const replacements = [
    [
      "HISTORY_BENDS_JUDGMENT_FROZEN_BOUNDARY_CANDIDATE_1",
      "HISTORY_BENDS_JUDGMENT_FROZEN_BOUNDARY_CANDIDATE_2",
    ],
    ["frozen-boundary-candidate-1.mjs", "frozen-boundary-candidate-2.mjs"],
    [
      "HISTORY_BENDS_JUDGMENT_STANDING_GATE_V1",
      "HISTORY_BENDS_JUDGMENT_STANDING_GATE_V2",
    ],
    ["standing-gate-v1.mjs", "standing-gate-v2.mjs"],
    ["amara.thread.json", "daniel.thread.json"],
    ["history-standing-setup-v1", "history-standing-setup-v2"],
    ["bounded Rowan archival episode", "bounded Borealis product-discovery episode"],
    ["bounded archival provenance work aligned with Amara's identity", "bounded product-framing work aligned with Daniel's identity"],
    ["Amara's archival synthesis self-model", "Daniel's product-framing self-model"],
    ["bounded provenance episode", "bounded product-discovery episode"],
    ["institution supplied a bounded archival need", "customer supplied a bounded product-planning need"],
    ["explicit archival permissions", "explicit product-planning permissions"],
    ["descriptive evidence-backed Rowan episode memory", "descriptive evidence-backed Borealis episode memory"],
  ];

  let transformed = source;
  for (const [from, to] of replacements) {
    assert.equal(
      transformed.includes(from),
      true,
      `history standing proof v2 template marker missing: ${from}`,
    );
    transformed = transformed.replaceAll(from, to);
  }
  return transformed;
}

async function loadGeneratedProof() {
  const template = readFileSync(
    new URL("./history-bends-judgment-standing-proof.mjs", import.meta.url),
    "utf8",
  );
  const generated = transformTemplate(template);
  writeFileSync(generatedPath, generated, "utf8");
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
  assert.equal(SET.subject.threadId, "thr_daniel_001");
  assert.equal(FROZEN.standingScenarioAuthored, false);
  assert.equal(FROZEN.standingMethodology.authorFreshScenarioAfterFreezeOnly, true);

  const standingPayload = JSON.stringify({
    subject: SET.subject,
    episodeRequest: SET.episodeRequest,
    laterRequest: SET.laterRequest,
  }).toLowerCase();
  for (const retired of FROZEN.priorStandingGate.retiredStandingMaterial) {
    assert.equal(
      standingPayload.includes(retired.toLowerCase()),
      false,
      `standing gate v2 reused retired v1 material: ${retired}`,
    );
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
  return true;
}

export function blockedHistoryStandingReport(reason) {
  return generatedProof.blockedHistoryStandingReport(reason);
}

export async function runHistoryStandingProof(options) {
  assertFreshStandingScenario();
  return generatedProof.runHistoryStandingProof(options);
}
