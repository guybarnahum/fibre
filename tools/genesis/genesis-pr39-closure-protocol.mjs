// fibre-tool-lifecycle: milestone
// fibre-tool-scope: pr39
// fibre-tool-purpose: validate the predeclared PR39 final-cohort protocol without model calls
// fibre-tool-disposition: retire after PR39; retain summarized precommitment in milestone history

import { readFileSync } from "node:fs";

import { repoFile } from "#repo-root";
import { normalizeGenesisWorldSpec } from "#services/world-kernel/src/genesis-domain.mjs";
import { canonicalJson, sha256 } from "#services/world-kernel/src/persistence-common.mjs";

export const PR39_CLOSURE_PROTOCOL_PATH = "fixtures/genesis/pr39/closure-protocol-v1.json";
export const PR39_CLOSURE_PROTOCOL_VERSION = "pr39-closure-protocol-v1";
export const PR39_FINAL_WORLD_SET_VERSION = "pr39-final-world-set-v1";

function fail(message) { throw new Error(message); }
function readJson(path) { return JSON.parse(readFileSync(repoFile(path), "utf8")); }
function digest(value) { return `sha256:${sha256(canonicalJson(value))}`; }

function assertExactArray(name, actual, expected) {
  if (canonicalJson(actual) !== canonicalJson(expected)) {
    fail(`${name} drift`);
  }
}

function assertUnique(name, values) {
  if (new Set(values).size !== values.length) fail(`${name} must be unique`);
}

function assertWorldSlot(slot, world) {
  if (!Number.isInteger(slot.slot) || slot.slot < 1 || slot.slot > 5) fail("final World slot is invalid");
  if (typeof slot.threadId !== "string" || typeof slot.genesisId !== "string") fail(`final World slot ${slot.slot} lacks stable identities`);
  if (typeof slot.timeZone !== "string" || slot.timeZone.trim() === "") fail(`final World slot ${slot.slot} lacks timeZone`);
  if (!Array.isArray(slot.participants) || slot.participants.length < 3) fail(`final World slot ${slot.slot} requires a factual roster`);
  if (!slot.participants.some((item) => item.participantId === slot.threadId && item.factualRoles?.includes("subject"))) {
    fail(`final World slot ${slot.slot} roster lacks the subject`);
  }
  if (!Array.isArray(slot.placeAffordances) || slot.placeAffordances.length !== world.places.length) {
    fail(`final World slot ${slot.slot} place-affordance count drift`);
  }
  const placeIds = new Set(world.places.map((item) => item.placeId));
  for (const affordance of slot.placeAffordances) {
    if (!placeIds.has(affordance.placeRef)) fail(`final World slot ${slot.slot} affordance names unknown place ${affordance.placeRef}`);
    if (!Array.isArray(affordance.ordinaryCounterpartRoles) || affordance.ordinaryCounterpartRoles.length === 0) {
      fail(`final World slot ${slot.slot} affordance ${affordance.placeRef} lacks ordinary counterpart roles`);
    }
    for (const role of affordance.ordinaryCounterpartRoles) {
      if (!world.affordedRoles.includes(role)) fail(`final World slot ${slot.slot} uses unafforded role ${role}`);
    }
  }
  if (world.worldAuthorship.authorId !== "fibre_pr39_final_world_authoring") fail(`final World slot ${slot.slot} has wrong authorship boundary`);
  if (world.worldAuthorship.familiarityProbe !== null) fail(`final World slot ${slot.slot} must not gain a post-authoring familiarity probe`);
  if (!/before any final-cohort genome assignment/iu.test(world.worldAuthorship.abstractionMethod)) {
    fail(`final World slot ${slot.slot} does not witness World-before-genome ordering`);
  }
}

function validateWorldSet(worldSet) {
  if (worldSet.worldSetVersion !== PR39_FINAL_WORLD_SET_VERSION) fail("unexpected PR39 final World-set version");
  if (worldSet.status !== "FROZEN_BEFORE_FINAL_GENOME_ASSIGNMENT") fail("PR39 final Worlds are not frozen before genome assignment");
  if (worldSet.genomeAssignmentStatus !== "UNASSIGNED") fail("B9 World-set must remain genome-unassigned until the separate assignment step");
  if (!Array.isArray(worldSet.slots) || worldSet.slots.length !== 5) fail("PR39 final World-set must contain exactly five slots");
  assertUnique("PR39 final World labels", worldSet.slots.map((item) => item.label));
  assertUnique("PR39 final World paths", worldSet.slots.map((item) => item.worldSpecPath));
  assertUnique("PR39 final Thread IDs", worldSet.slots.map((item) => item.threadId));
  assertUnique("PR39 final Genesis IDs", worldSet.slots.map((item) => item.genesisId));

  const normalizedWorlds = worldSet.slots.map((slot, index) => {
    if (slot.slot !== index + 1) fail(`PR39 final World-set slot order drift at ${index + 1}`);
    const world = normalizeGenesisWorldSpec(readJson(slot.worldSpecPath));
    assertWorldSlot(slot, world);
    return Object.freeze({
      slot: slot.slot,
      label: slot.label,
      path: slot.worldSpecPath,
      world,
      worldDigest: digest(world),
    });
  });
  return Object.freeze(normalizedWorlds);
}

function validateD1(d1, raterDiscipline) {
  assertExactArray("D1 conditions", d1.conditions, ["raw", "setting_style_normalized"]);
  if (d1.choiceCount !== 5 || d1.chanceAccuracy !== 0.2) fail("D1 must remain a five-way attribution task");
  if (d1.normalization?.kind !== "deterministic_structural_render_and_lexical_redaction") fail("D1 normalization policy drift");
  if (d1.normalization?.mayInferOrAddMeaning !== false) fail("D1 normalization may not add meaning");
  const forbidden = new Set(raterDiscipline.ratersNeverReceive ?? []);
  for (const required of ["world_specs", "genome_assignment_labels", "compiler_prompts", "build_diagnostics", "thread_ids", "genesis_ids"]) {
    if (!forbidden.has(required)) fail(`D1 rater exclusion missing ${required}`);
  }
  if (raterDiscipline.replicatesPerTrial !== 3 || raterDiscipline.majorityVotesRequired !== 2) fail("D1 rater majority discipline drift");
  if (!/normalized >= 4\/5/u.test(d1.interpretation?.strongParticularity ?? "")) fail("D1 strong-particularity threshold drift");
  if (!/normalized <= 2\/5/u.test(d1.interpretation?.weakParticularity ?? "")) fail("D1 weak-particularity threshold drift");
}

function validateD3(d3, cells) {
  if (d3.choiceCount !== 5 || d3.chanceAccuracy !== 0.2) fail("D3 must remain a five-way genome attribution task");
  assertExactArray("D3 cells", d3.cells, [
    "life_only_unexposed",
    "life_plus_genome",
    "later_life_only_potentially_contaminated",
  ]);
  if (cells.lifeOnlyUnexposedCalls !== 10 || cells.lifePlusGenomeCalls !== 10 || cells.laterLifeOnlyPotentiallyContaminatedCalls !== 10) {
    fail("D3 planned cell counts drift");
  }
  if (!/at least 5 remembered trials/iu.test(d3.aboveChanceRule ?? "") || !/0\.60/u.test(d3.aboveChanceRule ?? "") || !/0\.05/u.test(d3.aboveChanceRule ?? "")) {
    fail("D3 above-chance rule drift");
  }
  if (!/blocks a clean genome-propagation reading/iu.test(d3.interpretation?.negativeControlFailure ?? "")) {
    fail("D3 negative-control failure rule drift");
  }
  if (!/All 5/iu.test(d3.ceilingCheck ?? "")) fail("D3 direct-visible ceiling check drift");
}

function validateProtocol(protocol, worldSet) {
  if (protocol.protocolVersion !== PR39_CLOSURE_PROTOCOL_VERSION) fail("unexpected PR39 closure-protocol version");
  if (protocol.status !== "PRECOMMITTED_BEFORE_FINAL_GENOME_ASSIGNMENT_OR_GENERATION") fail("PR39 closure protocol status drift");
  if (protocol.worldSetPath !== PR39_CLOSURE_PROTOCOL_PATH.replace("closure-protocol-v1.json", "final-worlds/world-set-v1.json")) {
    fail("PR39 closure protocol World-set path drift");
  }
  if (protocol.worldsAuthoredBeforeFinalGenomes !== true || protocol.finalGenomeAssignmentStatus !== "UNASSIGNED") {
    fail("PR39 closure protocol must preserve World-before-genome ordering");
  }
  if (protocol.generationAuthorized !== false) fail("B9-B11 precommitment must not authorize generation before final genome assignment");
  if (protocol.onePassDiscipline?.claimMustPrecedeFirstGenerationCall !== true || protocol.onePassDiscipline?.secondClosureGenerationForbidden !== true) {
    fail("B7 one-pass discipline drift");
  }
  if (protocol.onePassDiscipline?.weakValidCohortMayBeResampled !== false) fail("weak valid closure cohort may not be resampled");
  if (protocol.repairProfile?.wholeCandidateFailureVisible !== true || protocol.repairProfile?.qualityWeaknessTriggersRetry !== false) {
    fail("B8 repair/rejection profile drift");
  }

  const pair = protocol.convergentPair;
  if (!Array.isArray(pair?.slots) || pair.slots.length !== 2 || pair.slots[0] === pair.slots[1]) fail("B9 requires a two-World convergent pair");
  const labelsBySlot = new Map(worldSet.slots.map((slot) => [slot.slot, slot.label]));
  assertExactArray("B9 convergent-pair labels", pair.labels, pair.slots.map((slot) => labelsBySlot.get(slot)));
  if (pair.mustNotEnterWorldSpecOrGenerationPrompt !== true || pair.convergenceRequiredInOutput !== false) fail("B9 evaluator-only convergence boundary drift");
  if (pair.routeA === pair.routeB) fail("B9 convergent pair must have materially distinct route descriptions");

  const expectedModes = ["life_only", "life_only", "life_plus_genome", "life_only", "life_only", "life_plus_genome"];
  assertExactArray("Pass-B formation modes", protocol.passBExpectedCells?.formationModesByOrdinal, expectedModes);
  if (protocol.passBExpectedCells?.totalCalls !== 30 || protocol.passBExpectedCells?.notRememberedIsLegal !== true || protocol.passBExpectedCells?.noCellMayBeResampledToReachPower !== true) {
    fail("B11 Pass-B cell precommitment drift");
  }

  const ids = Object.keys(protocol.diagnostics ?? {});
  assertExactArray("PR39 diagnostics", ids, ["D1", "D2", "D3", "D4", "D5"]);
  validateD1(protocol.diagnostics.D1, protocol.raterDiscipline);
  validateD3(protocol.diagnostics.D3, protocol.passBExpectedCells);
  if (protocol.diagnostics.D2.minimumPairsPerThread !== 4) fail("D2 minimum-pair rule drift");
  if (protocol.diagnostics.D4.interpretation?.noQuota !== true) fail("D4 must remain descriptive, not a quota");
  if (!/at least 4\/5 Threads have zero/iu.test(protocol.diagnostics.D5.interpretation?.cohortOverreachConcern ?? "")) fail("D5 cohort-overreach threshold drift");
  if (!protocol.globalInterpretationRules?.some((item) => /No threshold may be changed after final output is read/iu.test(item))) {
    fail("B11 threshold freeze rule missing");
  }
}

export function loadPr39ClosurePrecommitment({ protocolPath = PR39_CLOSURE_PROTOCOL_PATH } = {}) {
  const protocol = readJson(protocolPath);
  const worldSet = readJson(protocol.worldSetPath);
  validateProtocol(protocol, worldSet);
  const worlds = validateWorldSet(worldSet);
  const frozenInput = Object.freeze({
    protocol: structuredClone(protocol),
    worldSet: structuredClone(worldSet),
    worlds: worlds.map((item) => ({
      slot: item.slot,
      label: item.label,
      path: item.path,
      worldDigest: item.worldDigest,
    })),
  });
  return Object.freeze({
    protocol: frozenInput.protocol,
    worldSet: frozenInput.worldSet,
    worlds,
    precommitmentDigest: digest(frozenInput),
  });
}
