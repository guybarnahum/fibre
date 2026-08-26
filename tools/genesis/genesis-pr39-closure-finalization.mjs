// fibre-tool-lifecycle: milestone
// fibre-tool-scope: pr39
// fibre-tool-purpose: bind the frozen PR39 precommitment to its mechanically assigned final cohort
// fibre-tool-disposition: retire after PR39; retain summarized finalization in milestone history

import { readFileSync } from "node:fs";

import { repoFile } from "#repo-root";
import { canonicalJson, sha256 } from "#services/world-kernel/src/persistence-common.mjs";
import { buildPr39FinalClosurePlans } from "./genesis-pr39-final-plan.mjs";
import { loadPr39ClosurePrecommitment } from "./genesis-pr39-closure-protocol.mjs";

export const PR39_CLOSURE_FINALIZATION_PATH = "fixtures/genesis/pr39/closure-finalization-v1.json";
export const PR39_CLOSURE_FINALIZATION_VERSION = "pr39-closure-finalization-v1";

function fail(message) { throw new Error(message); }
function readJson(path) { return JSON.parse(readFileSync(repoFile(path), "utf8")); }
function digest(value) { return `sha256:${sha256(canonicalJson(value))}`; }

export function loadPr39ClosureFinalization({ finalizationPath = PR39_CLOSURE_FINALIZATION_PATH } = {}) {
  const finalization = readJson(finalizationPath);
  if (finalization.finalizationVersion !== PR39_CLOSURE_FINALIZATION_VERSION) fail("unexpected PR39 closure finalization version");
  if (finalization.status !== "READY_FOR_ONE_PASS_GENERATION") fail("PR39 closure is not finalized for one-pass generation");
  if (finalization.finalGenomeAssignmentStatus !== "FROZEN" || finalization.generationAuthorized !== true) fail("PR39 final genome assignment is not frozen/authorized");
  if (!Array.isArray(finalization.generationBlockers) || finalization.generationBlockers.length !== 0) fail("PR39 closure finalization still has generation blockers");
  if (finalization.worldsFrozenBeforeFinalGenomes !== true || finalization.weakValidCohortMayBeResampled !== false) fail("PR39 closure scientific-ordering discipline drift");

  const precommitment = loadPr39ClosurePrecommitment({ protocolPath: finalization.precommitmentPath });
  const plans = buildPr39FinalClosurePlans({ fixturePath: finalization.finalCohortPath });
  if (precommitment.protocol.closureId !== finalization.closureId || plans.fixture.closureId !== finalization.closureId) fail("PR39 closure identity drift across precommitment/finalization/cohort");
  if (Date.parse(finalization.finalizedAt) < Date.parse(precommitment.protocol.frozenAt)) fail("PR39 finalization predates the World precommitment");
  const bindings = plans.fixture.slots.map((slot) => ({
    slot: slot.slot,
    worldBlobSha: slot.worldBlobSha,
    genomeBlobSha: slot.genomeBlobSha,
    genomeDigest: slot.genomeDigest,
  }));
  const finalizationDigest = digest({
    finalization,
    precommitmentDigest: precommitment.precommitmentDigest,
    finalCohortBindings: bindings,
  });
  return Object.freeze({
    finalization: Object.freeze(structuredClone(finalization)),
    precommitment,
    plans,
    finalizationDigest,
  });
}
