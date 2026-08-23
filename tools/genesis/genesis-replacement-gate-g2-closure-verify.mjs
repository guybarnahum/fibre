#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { GENESIS_PASS_A_RELIABILITY_POLICY_V3 } from "../services/world-kernel/src/genesis-pass-a-reliability-v3.mjs";
import { canonicalJson } from "../services/world-kernel/src/persistence-common.mjs";
import { verifyG34ReviewAmendments } from "./genesis-g34-review-amendments.mjs";
import {
  REPLACEMENT_CORE_PATH,
  REPLACEMENT_EXECUTION_BINDING_PATH,
  verifyReplacementFinalCohortPreflight,
  verifyReplacementInheritedAuthorityBinding,
} from "./genesis-replacement-final-cohort.mjs";

const readJson = (path) => JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"));
const FROZEN_G4_V2_PASS_B_ADMISSION_BLOB = "b6400e98ce83f809f0e06f95f3d5ab79eebbbb2d";

function assertReplacementRosterGrounding(g2, g4) {
  const bindingBySlot = new Map(g2.worldBindings.map((item) => [item.slot, item]));
  for (const roster of g4.initialRosters) {
    const binding = bindingBySlot.get(roster.slot);
    assert.ok(binding, `replacement roster slot ${roster.slot} lacks G2 binding`);
    assert.equal(roster.worldSpecId, binding.worldSpecId, `replacement roster slot ${roster.slot} World drift`);
    assert.equal(roster.threadId, binding.threadId, `replacement roster slot ${roster.slot} Thread drift`);
    const world = readJson(binding.worldSpecPath);
    const afforded = new Set(world.affordedRoles);
    const ids = roster.participants.map((item) => item.participantId);
    assert.equal(new Set(ids).size, ids.length, `replacement roster slot ${roster.slot} duplicate participant`);
    const subject = roster.participants.find((item) => item.participantId === roster.threadId);
    assert.deepEqual(subject?.factualRoles, ["subject"], `replacement roster slot ${roster.slot} subject role drift`);
    for (const person of roster.participants) {
      assert.equal(Array.isArray(person.factualRoles) && person.factualRoles.length > 0, true, `replacement roster slot ${roster.slot} participant lacks role`);
      assert.equal(Array.isArray(person.relationshipFacts) && person.relationshipFacts.length > 0, true, `replacement roster slot ${roster.slot} participant lacks relationship fact`);
      if (person.participantId === roster.threadId) continue;
      for (const role of person.factualRoles) assert.equal(afforded.has(role), true, `replacement roster slot ${roster.slot} unafforded role ${role}`);
    }
  }
}

export function verifyReplacementGateG2Closure() {
  const inheritedAuthority = verifyReplacementInheritedAuthorityBinding();
  const preflight = verifyReplacementFinalCohortPreflight({ requireGateClear: false, enforceReviewedSource: false });
  assert.equal(inheritedAuthority.status, "CLEAR_INHERITED_AUTHORITY_BOUND");
  assert.equal(preflight.inheritedAuthority.status, "CLEAR_INHERITED_AUTHORITY_BOUND");
  assert.equal(preflight.executionAuthorized, false, "Gate-G(2) HOLD closure verification must run before final-life authorization");
  assert.equal(preflight.gateStatus, "MISSING_GATE_G2_CLEAR_WITNESS", "a pre-existing Gate-G(2) CLEAR witness would invalidate this closure-check phase");

  const binding = readJson(REPLACEMENT_EXECUTION_BINDING_PATH);
  const g2 = readJson(binding.authorityBoundary.g2ProtocolPath);
  const g3 = readJson(binding.authorityBoundary.g3TreatmentInstancePath);
  const g4 = readJson(binding.authorityBoundary.g4CognitionExecutionBindingPath);
  const disclosure = readJson(binding.authorityBoundary.g2DisclosureAmendmentPath);
  const closure = readJson(binding.authorityBoundary.replacementG56ClosureAmendmentPath);
  const passBReviewNote = readJson("artifacts/validation/m2-pr39/replacement-v1/protocol/rg4-pass-b-genome-copy-closure-amendment-v1.json");
  const residual = readJson("artifacts/validation/m2-pr39/replacement-v1/protocol/rg4-residual-gate-g2-disclosures-v1.json");
  const g34 = verifyG34ReviewAmendments();
  const runner = readFileSync(new URL("./genesis-replacement-final-cohort.mjs", import.meta.url), "utf8");
  const core = readFileSync(new URL("./genesis-replacement-final-cohort-core.mjs", import.meta.url), "utf8");

  // B1/C1: the complete replacement execution surface exists and binds inherited authority at the authorized entrypoint.
  assert.equal(g3.protocolVersion, "pr39-replacement-g3-pass-b-treatment-instance-v1");
  assert.equal(g3.replacementAssignment.slots.length, 5);
  assert.equal(g3.replacementAssignment.eligiblePassBCallCount, 30);
  assert.equal(g4.protocolVersion, "pr39-replacement-g4-cognition-execution-binding-v1");
  assert.equal(g4.initialRosters.length, 5);
  assertReplacementRosterGrounding(g2, g4);
  assert.equal(binding.runner.path, "tools/genesis/genesis-replacement-final-cohort.mjs");
  assert.equal(REPLACEMENT_CORE_PATH, "tools/genesis/genesis-replacement-final-cohort-core.mjs");
  assert.equal(binding.oneShot.outputRoot, "artifacts/validation/m2-pr39/replacement-v1/final-cohort-v1");
  assert.equal(binding.oneShot.wholeCandidateAttemptCap, 1);
  assert.equal(binding.oneShot.qualityDrivenRegeneration, false);
  assert.equal(typeof binding.seedBinding.eventStructureOfferSeedDomain, "string");
  assert.equal(typeof binding.seedBinding.modelClientRequestDomain, "string");
  assert.equal(inheritedAuthority.hPassBHelperBlobSha, "0bca252aa20e3af375ad977fc3e2fd22dc76d9f1");
  assert.match(runner, /verifyReplacementInheritedAuthorityBinding\(\)/);
  assert.match(runner, /verifyG4CognitionFreeze/);
  assert.match(runner, /verifyG34ReviewAmendments/);
  assert.match(runner, /verifyG4V3ReliabilityImplementation/);
  assert.match(runner, /verifyG5DiagnosticsFreeze/);
  assert.match(runner, /verifyG6VerdictFreeze/);

  // B2: G4-v3 is explicit in the byte-preserved generation core; legacy remains forbidden here.
  assert.equal(binding.generationPolicy.version, GENESIS_PASS_A_RELIABILITY_POLICY_V3.version);
  assert.equal(g4.passAReliabilityPolicy.version, GENESIS_PASS_A_RELIABILITY_POLICY_V3.version);
  assert.equal(binding.generationPolicy.legacySharedThreeVersionDefaultAllowed, false);
  assert.equal(g4.passAReliabilityPolicy.legacyDefaultAllowedForReplacement, false);
  assert.equal(GENESIS_PASS_A_RELIABILITY_POLICY_V3.maxFormRepairsPerRecord, 2);
  assert.equal(GENESIS_PASS_A_RELIABILITY_POLICY_V3.maxRecordRetriesPerRecord, 2);
  assert.equal(GENESIS_PASS_A_RELIABILITY_POLICY_V3.maxTotalGeneratedVersionsPerRecord, 5);
  assert.match(core, /generationPolicy:\s*GENESIS_PASS_A_RELIABILITY_POLICY_V3/);

  // B3: five-edge CLEAR semantics are complete and the old pair-3-4 carve-out is dead.
  assert.equal(closure.effectiveReplacementD3.pair34OldCarveOutRetired, true);
  assert.deepEqual(closure.effectiveReplacementD3.measuredLowNonblockingEdges, []);
  assert.equal(closure.effectiveReplacementD3.clearRequirement.eachOrdinalMinimumCorrectCoreEdges, 4);
  assert.equal(closure.effectiveReplacementD3.clearRequirement.atLeastOneOrdinalCorrectCoreEdges, 5);
  assert.equal(closure.effectiveReplacementD3.nullMeasuredCoreEdge, "not_correct");
  assert.equal(closure.effectiveReplacementD3.erroredMeasuredCoreEdge, "not_correct");
  assert.equal(closure.effectiveReplacementD3.tiedMeasuredCoreEdge, "not_correct");
  assert.equal(closure.effectiveReplacementD3.unanalyzableMeasuredCoreEdge, "not_correct");
  for (const required of [
    "pair 3-4 D3 null",
    "pair 3-4 D3 error",
    "pair 3-4 D3 tie",
    "any other measured core-edge null, error, tie or unanalyzable result",
  ]) assert.equal(closure.effectiveReplacementClearRule.explicitlyNotAllowedAsMandatoryDisclosureOnly.includes(required), true);
  assert.equal(closure.replacementGateProofAndExitSemantics.oldPair34LimitationProofRetired, true);
  assert.equal(closure.replacementGateProofAndExitSemantics.oldPair34NonblockingMechanicalExitCheckRetired, true);

  // B4: authoring-template change and non-comparability are explicit, without genome rewrite.
  assert.equal(disclosure.authoringTemplateDisclosure.comparabilityToOriginalG2, "not_directly_comparable");
  assert.deepEqual(Object.keys(disclosure.authoringTemplateDisclosure.dimensionsByOrdinal), ["1", "2", "3", "4", "5", "6"]);
  assert.equal(disclosure.authoringTemplateDisclosure.genomeValuesMayBeRewrittenAfterThisDisclosure, false);
  assert.equal(closure.g2ComparabilityDisclosure.freshG2ComparableToOriginalNumerically, false);
  assert.equal(closure.g2ComparabilityDisclosure.eventualD3ConditionedOnAlignedDimensionDesign, true);

  // B5: deterministic reassignment is described accurately and is not rerandomized.
  assert.deepEqual(disclosure.assignmentDisclosure.fixedPointSlots, [2, 4, 5]);
  assert.equal(disclosure.assignmentDisclosure.mappingChanged, false);
  assert.equal(disclosure.assignmentDisclosure.rerandomizationAllowed, false);
  assert.equal(closure.assignmentDisclosure.derangementClaimRetired, true);
  assert.deepEqual(closure.assignmentDisclosure.fixedPointSlots, [2, 4, 5]);

  // Preserve historical G4-v2 exactly. Optional uncertainty hardening is disclosed, not applied.
  assert.equal(g34.passBAdmissionBlobSha, FROZEN_G4_V2_PASS_B_ADMISSION_BLOB);
  assert.equal(passBReviewNote.status, "not_applied_preserved_review_note");
  assert.equal(passBReviewNote.frozenAuthority.sharedAdmissionGitBlobSha, FROZEN_G4_V2_PASS_B_ADMISSION_BLOB);
  assert.deepEqual(passBReviewNote.frozenAuthority.scannedFields, ["rememberedContent"]);
  assert.equal(passBReviewNote.consideredChange.appliedToReplacement, false);
  assert.equal(residual.passBUncertaintyGenomeCopyCoverage.uncertaintyItemsScannedByFrozenG4V2Gate, false);
  assert.equal(residual.passBUncertaintyGenomeCopyCoverage.changeMadeForReplacement, false);

  // One-shot/durability/review binding hardening.
  assert.equal(binding.durability.replacementRunnerMustUseDurableAdapter, true);
  assert.equal(binding.durability.guaranteedScope, "process_restart_replay_of_committed_invocations");
  assert.equal(binding.durability.hostCrashFsyncDurabilityClaimed, false);
  assert.equal(binding.runner.bindingPathHardcoded, true);
  assert.equal(binding.runner.bindingEnvOverrideAllowed, false);
  assert.doesNotMatch(runner, /process\.env/);
  assert.match(runner, /"tools\/genesis"/);
  assert.match(runner, /"artifacts\/validation\/m2-pr39\/g\/protocol"/);
  assert.match(runner, /merge-base/);

  // The stricter structural translation is disclosed rather than hidden.
  assert.equal(closure.thresholdDisclosure.oldFourEdgeIndependentReference, 0.03515625);
  assert.equal(closure.thresholdDisclosure.replacementFiveEdgeIndependentReference, 0.0107421875);
  assert.equal(closure.thresholdDisclosure.adaptiveDirection, "stricter_not_pass_shopping");

  return Object.freeze({
    status: "CLEAR_B1_B5_C1_ZERO_CALL",
    b1CompleteExecutionPacket: true,
    c1InheritedAuthorityBound: true,
    b2ExplicitG4V3: true,
    b3FiveEdgeClearRuleClosed: true,
    b4AuthoringComparabilityDisclosed: true,
    b5AssignmentDisclosureCorrected: true,
    rosterGrounding: true,
    historicalG4V2PassBPreserved: true,
    passBUncertaintyGenomeCopyGuard: false,
    passBUncertaintyGenomeCopyGapDisclosed: true,
    processRestartDurableAdapterBound: true,
    hardcodedBindingPath: REPLACEMENT_EXECUTION_BINDING_PATH,
    treatmentModes: g3.inheritedAuthority.directModes,
    fixedPointSlots: disclosure.assignmentDisclosure.fixedPointSlots,
    effectiveD3: structuredClone(closure.effectiveReplacementD3.clearRequirement),
    inheritedAuthority,
    canonicalTreatmentSchedule: canonicalJson(g3.replacementAssignment.slots.map((slot) => slot.calls.map(({ horizon, formationMode }) => ({ horizon, formationMode })))),
    finalLifeCognitionAuthorized: false,
    providerCallsMade: 0,
  });
}

function print(result) {
  process.stdout.write("PR39 REPLACEMENT GATE-G(2) HOLD CLOSURE: CLEAR B1-B5+C1 — ZERO CALL\n\n");
  process.stdout.write("B1 complete replacement execution packet: yes\n");
  process.stdout.write("C1 inherited G3/G4/G5/G6/G4-v3 authority bound at executable preflight: yes\n");
  process.stdout.write("B2 G4-v3 explicit at replacement Pass-A call site: yes\n");
  process.stdout.write("B3 five-edge CLEAR rule + null/error/tie closure: yes\n");
  process.stdout.write("B4 aligned genome-authoring design/non-comparability disclosed: yes\n");
  process.stdout.write(`B5 mapping described without derangement claim; fixed points: ${result.fixedPointSlots.join(",")}\n`);
  process.stdout.write("Replacement roster roles grounded to frozen Worlds: yes\n");
  process.stdout.write("Historical G4-v2 Pass-B admission source/hash: preserved exactly\n");
  process.stdout.write("Pass-B uncertainty genome-copy hardening: not applied; residual gap disclosed\n");
  process.stdout.write(`Pass-B input helper blob: ${result.inheritedAuthority.hPassBHelperBlobSha}\n`);
  process.stdout.write("Post-CLEAR drift scope: services + all tools/genesis + inherited g/protocol + replacement protocol\n");
  process.stdout.write("Replacement durable adapter: process-restart scope only\n");
  process.stdout.write(`D3: both >=${result.effectiveD3.eachOrdinalMinimumCorrectCoreEdges}/5; at least one ${result.effectiveD3.atLeastOneOrdinalCorrectCoreEdges}/5\n`);
  process.stdout.write("Final-life cognition: NOT AUTHORIZED\n\n");
  process.stdout.write("Verifier made zero provider calls.\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const unknown = args.filter((arg) => arg !== "--verify");
  if (unknown.length !== 0) throw new Error(`unsupported argument(s): ${unknown.join(", ")}`);
  print(verifyReplacementGateG2Closure());
}
