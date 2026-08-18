import assert from "node:assert/strict";
import test from "node:test";

import { characterizeGenesisSliceD } from "../src/genesis-slice-d-characterization.mjs";
import { scheduleReinterpretationOpportunities } from "../src/genesis-pass-c-reinterpretation.mjs";

function relationFacts() {
  return {
    targetStructureRef: "ges_a",
    triggerStructureRef: "ges_a",
    targetStructureFamilyRef: "ges_family_a",
    triggerStructureFamilyRef: "ges_family_a",
    sharedPersonRefs: [],
    sharedRelationshipRefs: [],
    sharedIntellectualSourceRefs: [],
  };
}

function opportunity(index) {
  return {
    threadId: "thr_d4_characterization",
    memoryRef: `mem_d4_characterization_${index}`,
    priorMeaningFormedAt: "2009-01-01T00:00:00Z",
    trigger: {
      episodeRef: `ep_d4_characterization_${index}`,
      occurredAt: `${2014 + index}-01-01T00:00:00Z`,
      observableAction: `A later observable episode ${index} occurs without any authored significance field.`,
    },
    relationFacts: relationFacts(),
  };
}

function repairProfile() {
  return {
    recordsGenerated: 12,
    recordRepairsByGate: { pass_c_future_policy_form: 2 },
    recordRepairExhaustions: 0,
    candidateAttemptFailuresByGate: { publication_bundle_integrity: 1 },
    candidateAttemptsPerThread: [1, 2],
  };
}

function baseInput() {
  const schedule = scheduleReinterpretationOpportunities([
    opportunity(1), opportunity(2), opportunity(3), opportunity(4),
  ]);
  const run = schedule.filter((item) => item.run);
  return {
    historicalEventCount: 8,
    memoryFormations: [
      { outcome: "remembered", analysisStratum: "life_only_unexposed" },
      { outcome: "not_remembered", analysisStratum: "life_only_unexposed" },
      { outcome: "remembered", analysisStratum: "life_only_exposed" },
      { outcome: "remembered", analysisStratum: "life_plus_genome" },
      { outcome: "not_remembered", analysisStratum: "life_plus_genome" },
    ],
    initialMeanings: [
      { meaningRef: "mean_d4_001", outcome: "durable_meaning", partCount: 2 },
      { meaningRef: "mean_d4_002", outcome: "no_durable_meaning", partCount: 0 },
      { meaningRef: "mean_d4_003", outcome: "durable_meaning", partCount: 1 },
    ],
    meaningAnnotations: [
      { meaningRef: "mean_d4_001", ambivalent: true, softPrescriptive: false, sentimentCoupled: false, selfAccountOverreach: false },
      { meaningRef: "mean_d4_002", ambivalent: false, softPrescriptive: false, sentimentCoupled: false, selfAccountOverreach: false },
      { meaningRef: "mean_d4_003", ambivalent: false, softPrescriptive: true, sentimentCoupled: true, selfAccountOverreach: true },
    ],
    reinterpretationSchedule: schedule,
    reinterpretationResults: [
      { opportunityId: run[0].opportunityId, outcome: "revised" },
      { opportunityId: run[1].opportunityId, outcome: "unchanged" },
      { opportunityId: run[2].opportunityId, outcome: "none" },
    ],
    repairProfile: repairProfile(),
  };
}

test("Slice D characterization reports the funnel, strata, diagnostics and cap without producing a gate verdict", () => {
  const report = characterizeGenesisSliceD(baseInput());
  assert.equal(report.admissionVerdict, null);
  assert.match(report.note, /must not be used as an admission gate/);
  assert.deepEqual(report.funnel, {
    historicalEvents: 8,
    passBCalls: 5,
    remembered: 3,
    notRemembered: 2,
    eventsToRememberedRate: 3 / 8,
    durableMeaning: 2,
    noDurableMeaning: 1,
    rememberedToDurableMeaningRate: 2 / 3,
    multiPartDurableMeaning: 1,
    durableMeaningToMultiPartRate: 1 / 2,
  });
  assert.deepEqual(report.strata.calls, {
    life_only_unexposed: 2,
    life_only_exposed: 1,
    life_plus_genome: 2,
  });
  assert.deepEqual(report.strata.remembered, {
    life_only_unexposed: 1,
    life_only_exposed: 1,
    life_plus_genome: 1,
  });
  assert.deepEqual(report.semanticDiagnostics, {
    ambivalentMeaning: 1,
    multiPartAmbivalentMeaning: 1,
    softPrescriptiveMeaning: 1,
    sentimentCoupledMeaning: 1,
    selfAccountOverreachMeaning: 1,
  });
  assert.deepEqual(report.reinterpretation, {
    eligible: 4,
    run: 3,
    skippedByCap: 1,
    revised: 1,
    unchanged: 1,
    none: 1,
    revisedRateOverRun: 1 / 3,
    unchangedRateOverRun: 1 / 3,
    noneRateOverRun: 1 / 3,
  });
  assert.deepEqual(report.repairProfile, repairProfile());
});

test("reinterpretation outcome rates use the run denominator, never all eligible opportunities", () => {
  const report = characterizeGenesisSliceD(baseInput());
  assert.equal(report.reinterpretation.eligible, 4);
  assert.equal(report.reinterpretation.run, 3);
  assert.equal(report.reinterpretation.revisedRateOverRun, 1 / 3);
  assert.notEqual(report.reinterpretation.revisedRateOverRun, 1 / 4);
});

test("characterization refuses missing run outcomes but does not reject weak quality", () => {
  const missing = baseInput();
  missing.reinterpretationResults = missing.reinterpretationResults.slice(0, 2);
  assert.throws(() => characterizeGenesisSliceD(missing), /one result for every run/);

  const weak = baseInput();
  weak.memoryFormations = weak.memoryFormations.map((item) => ({ ...item, outcome: "remembered" }));
  weak.initialMeanings = weak.memoryFormations.map((_, index) => ({
    meaningRef: `mean_weak_${index}`,
    outcome: "durable_meaning",
    partCount: 1,
  }));
  weak.meaningAnnotations = weak.initialMeanings.map((item) => ({
    meaningRef: item.meaningRef,
    ambivalent: false,
    softPrescriptive: true,
    sentimentCoupled: true,
    selfAccountOverreach: true,
  }));
  const report = characterizeGenesisSliceD(weak);
  assert.equal(report.funnel.remembered, 5);
  assert.equal(report.funnel.durableMeaning, 5);
  assert.equal(report.semanticDiagnostics.softPrescriptiveMeaning, 5);
  assert.equal(report.semanticDiagnostics.selfAccountOverreachMeaning, 5);
  assert.equal(report.admissionVerdict, null);
});

test("characterization requires one initial meaning outcome per remembered memory and annotations remain measurement-only", () => {
  const missingMeaning = baseInput();
  missingMeaning.initialMeanings = missingMeaning.initialMeanings.slice(0, 2);
  assert.throws(() => characterizeGenesisSliceD(missingMeaning), /one initial Pass-C outcome/);

  const missingAnnotation = baseInput();
  missingAnnotation.meaningAnnotations = missingAnnotation.meaningAnnotations.slice(0, 2);
  assert.throws(() => characterizeGenesisSliceD(missingAnnotation), /missing Slice-D meaning annotation/);
});
