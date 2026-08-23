#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { GENESIS_PASS_A_RELIABILITY_POLICY_V3 } from "../services/world-kernel/src/genesis-pass-a-reliability-v3.mjs";
import { canonicalJson } from "../services/world-kernel/src/persistence-common.mjs";
import {
  REPLACEMENT_EXECUTION_BINDING_PATH,
  verifyReplacementFinalCohortPreflight,
} from "./genesis-replacement-final-cohort.mjs";

const readJson = (path) => JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"));

export function verifyReplacementGateG2Closure() {
  const preflight = verifyReplacementFinalCohortPreflight({ requireGateClear: false, enforceReviewedSource: false });
  assert.equal(preflight.executionAuthorized, false, "Gate-G(2) HOLD closure verification must run before final-life authorization");
  assert.equal(preflight.gateStatus, "MISSING_GATE_G2_CLEAR_WITNESS", "a pre-existing Gate-G(2) CLEAR witness would invalidate this closure-check phase");

  const binding = readJson(REPLACEMENT_EXECUTION_BINDING_PATH);
  const g3 = readJson(binding.authorityBoundary.g3TreatmentInstancePath);
  const g4 = readJson(binding.authorityBoundary.g4CognitionExecutionBindingPath);
  const disclosure = readJson(binding.authorityBoundary.g2DisclosureAmendmentPath);
  const closure = readJson(binding.authorityBoundary.replacementG56ClosureAmendmentPath);
  const passBClosure = readJson("artifacts/validation/m2-pr39/replacement-v1/protocol/rg4-pass-b-genome-copy-closure-amendment-v1.json");
  const runner = readFileSync(new URL("./genesis-replacement-final-cohort.mjs", import.meta.url), "utf8");

  // B1: a complete, frozen replacement execution surface exists.
  assert.equal(g3.protocolVersion, "pr39-replacement-g3-pass-b-treatment-instance-v1");
  assert.equal(g3.replacementAssignment.slots.length, 5);
  assert.equal(g3.replacementAssignment.eligiblePassBCallCount, 30);
  assert.equal(g4.protocolVersion, "pr39-replacement-g4-cognition-execution-binding-v1");
  assert.equal(g4.initialRosters.length, 5);
  assert.equal(binding.runner.path, "tools/genesis/genesis-replacement-final-cohort.mjs");
  assert.equal(binding.oneShot.outputRoot, "artifacts/validation/m2-pr39/replacement-v1/final-cohort-v1");
  assert.equal(binding.oneShot.wholeCandidateAttemptCap, 1);
  assert.equal(binding.oneShot.qualityDrivenRegeneration, false);
  assert.equal(typeof binding.seedBinding.eventStructureOfferSeedDomain, "string");
  assert.equal(typeof binding.seedBinding.modelClientRequestDomain, "string");

  // B2: G4-v3 is explicit at the replacement call site; legacy remains forbidden here.
  assert.equal(binding.generationPolicy.version, GENESIS_PASS_A_RELIABILITY_POLICY_V3.version);
  assert.equal(g4.passAReliabilityPolicy.version, GENESIS_PASS_A_RELIABILITY_POLICY_V3.version);
  assert.equal(binding.generationPolicy.legacySharedThreeVersionDefaultAllowed, false);
  assert.equal(g4.passAReliabilityPolicy.legacyDefaultAllowedForReplacement, false);
  assert.equal(GENESIS_PASS_A_RELIABILITY_POLICY_V3.maxFormRepairsPerRecord, 2);
  assert.equal(GENESIS_PASS_A_RELIABILITY_POLICY_V3.maxRecordRetriesPerRecord, 2);
  assert.equal(GENESIS_PASS_A_RELIABILITY_POLICY_V3.maxTotalGeneratedVersionsPerRecord, 5);
  assert.match(runner, /generationPolicy:\s*GENESIS_PASS_A_RELIABILITY_POLICY_V3/);

  // B3: five-edge CLEAR semantics are complete and the old pair-3-4 carve-out is dead.
  assert.equal(closure.effectiveReplacementD3.pair34OldCarveOutRetired, true);
  assert.deepEqual(closure.effectiveReplacementD3.measuredLowNonblockingEdges, []);
  assert.equal(closure.effectiveReplacementD3.clearRequirement.eachOrdinalMinimumCorrectCoreEdges, 4);
  assert.equal(closure.effectiveReplacementD3.clearRequirement.atLeastOneOrdinalCorrectCoreEdges, 5);
  assert.equal(closure.effectiveReplacementD3.nullMeasuredCoreEdge, "not_correct");
  assert.equal(closure.effectiveReplacementD3.erroredMeasuredCoreEdge, "not_correct");
  assert.equal(closure.effectiveReplacementD3.tiedMeasuredCoreEdge, "not_correct");
  assert.equal(closure.effectiveReplacementD3.unanalyzableMeasuredCoreEdge, "not_correct");
  assert.equal(closure.effectiveReplacementClearRule.explicitlyNotAllowedAsMandatoryDisclosureOnly.some((item) => item.includes("pair 3-4")), true);
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

  // N2/N4/N5 hardening chosen for this replacement packet.
  assert.deepEqual(passBClosure.change.replacementScannedFields, ["rememberedContent", "uncertainty[*]"]);
  assert.equal(binding.durability.replacementRunnerMustUseDurableAdapter, true);
  assert.equal(binding.durability.guaranteedScope, "process_restart_replay_of_committed_invocations");
  assert.equal(binding.durability.hostCrashFsyncDurabilityClaimed, false);
  assert.equal(binding.runner.bindingPathHardcoded, true);
  assert.equal(binding.runner.bindingEnvOverrideAllowed, false);
  assert.doesNotMatch(runner, /process\.env/);

  // N7: the stricter structural translation is disclosed rather than hidden.
  assert.equal(closure.thresholdDisclosure.oldFourEdgeIndependentReference, 0.03515625);
  assert.equal(closure.thresholdDisclosure.replacementFiveEdgeIndependentReference, 0.0107421875);
  assert.equal(closure.thresholdDisclosure.adaptiveDirection, "stricter_not_pass_shopping");

  return Object.freeze({
    status: "CLEAR_B1_B5_ZERO_CALL",
    b1CompleteExecutionPacket: true,
    b2ExplicitG4V3: true,
    b3FiveEdgeClearRuleClosed: true,
    b4AuthoringComparabilityDisclosed: true,
    b5AssignmentDisclosureCorrected: true,
    passBUncertaintyGenomeCopyGuard: true,
    processRestartDurableAdapterBound: true,
    hardcodedBindingPath: REPLACEMENT_EXECUTION_BINDING_PATH,
    treatmentModes: g3.inheritedAuthority.directModes,
    fixedPointSlots: disclosure.assignmentDisclosure.fixedPointSlots,
    effectiveD3: structuredClone(closure.effectiveReplacementD3.clearRequirement),
    canonicalTreatmentSchedule: canonicalJson(g3.replacementAssignment.slots.map((slot) => slot.calls.map(({ horizon, formationMode }) => ({ horizon, formationMode })))),
    finalLifeCognitionAuthorized: false,
    providerCallsMade: 0,
  });
}

function print(result) {
  process.stdout.write("PR39 REPLACEMENT GATE-G(2) HOLD CLOSURE: CLEAR B1-B5 — ZERO CALL\n\n");
  process.stdout.write("B1 complete replacement execution packet: yes\n");
  process.stdout.write("B2 G4-v3 explicit at replacement Pass-A call site: yes\n");
  process.stdout.write("B3 five-edge CLEAR rule + null/error/tie closure: yes\n");
  process.stdout.write("B4 aligned genome-authoring design/non-comparability disclosed: yes\n");
  process.stdout.write(`B5 mapping described without derangement claim; fixed points: ${result.fixedPointSlots.join(",")}\n`);
  process.stdout.write("Pass-B uncertainty genome-copy guard: yes\n");
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
