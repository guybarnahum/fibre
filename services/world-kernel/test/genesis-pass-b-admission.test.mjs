import assert from "node:assert/strict";
import test from "node:test";

import {
  GENESIS_PASS_B_GENOME_COPY_GATE,
  GenesisPassBAdmissionError,
  assertPassBGenomeCopyBoundary,
  findVerbatimGenomeNgram,
  generateAdmittedPassBMemory,
} from "../src/genesis-pass-b-admission.mjs";
import { GENESIS_PASS_B_INPUT_VERSION, GENESIS_PASS_B_POLICY } from "../src/genesis-pass-b-domain.mjs";

function treatmentInput() {
  return {
    inputVersion: GENESIS_PASS_B_INPUT_VERSION,
    subject: { provisionalThreadId: "thr_pass_b_guard_test", bornAt: "2004-08-20T00:00:00Z" },
    world: {
      worldSpecId: "world_pass_b_guard_test",
      timeFrame: { startAt: "2004-08-20T00:00:00Z", endAt: "2026-08-20T00:00:00Z" },
      places: [{ placeId: "place_guard_test", description: "A public neighborhood setting." }],
      householdShape: "One caregiver and the subject share a home.",
      familyRelations: [],
      languages: ["English"],
      materialCircumstances: "Stable essentials with ordinary constraints.",
      mobilityPattern: "Walking and public transit.",
      schoolingOrCommunityContext: "Public school and neighborhood services.",
      culturalContext: "Ordinary public and household institutions.",
      availableInstitutions: ["public_school"],
      intellectualEnvironment: "Books, classes and conversation are available.",
      affordedRoles: ["caregiver", "teacher", "peer"],
    },
    rememberingAt: "2012-08-20T00:00:00Z",
    ageAtRemembering: 8,
    chronologyEndsAt: "2012-08-20T00:00:00Z",
    history: [{
      episodeId: "ep_guard_01",
      occurredAt: "2012-07-01T00:00:00Z",
      ageAtEvent: 7.86,
      placeRef: "place_guard_test",
      participantRefs: ["thr_pass_b_guard_test"],
      observableAction: "The subject checked a posted timetable with a teacher and copied the corrected departure time.",
      introducedParticipants: [],
    }],
    priorMemories: [],
    assignment: {
      formationMode: "life_plus_genome",
      priorTreatmentMemoryExposure: false,
      analysisStratum: "life_plus_genome",
    },
    genomeExposure: {
      policy: { kind: "whole_genome", k: null },
      genomeRef: "genome_guard_test",
      genomeDigest: `sha256:${"a".repeat(64)}`,
      totalLoci: 2,
      loci: [
        { locusId: "locus_guard_01", ordinal: 1, value: "notice the mismatch before deciding what to repeat" },
        { locusId: "locus_guard_02", ordinal: 2, value: "keep several explanations available when evidence remains incomplete" },
      ],
    },
    policyWitness: {
      policyVersion: GENESIS_PASS_B_POLICY.version,
      assignmentRef: "assignment_guard_test",
      genomeExposurePolicyRef: "policy_guard_test",
    },
  };
}

const leakingOutput = Object.freeze({
  outcome: "remembered",
  episodeRefs: ["ep_guard_01"],
  rememberedContent: "I remember that I should notice the mismatch before deciding what happened next.",
  uncertainty: [],
});

const safeOutput = Object.freeze({
  outcome: "remembered",
  episodeRefs: ["ep_guard_01"],
  rememberedContent: "I remember checking the posted timetable with my teacher and copying the corrected departure time.",
  uncertainty: [],
});

test("Pass-B genome-copy guard finds normalized four-token overlap", () => {
  const match = findVerbatimGenomeNgram({
    rememberedContent: "I tried to NOTICE, the mismatch before deciding what came next.",
    loci: treatmentInput().genomeExposure.loci,
  });
  assert.equal(match?.locusId, "locus_guard_01");
  assert.equal(match?.normalizedNgram, "notice the mismatch before");
});

test("Pass-B treatment memory rejects verbatim genome text and preserves assignment provenance", () => {
  const input = treatmentInput();
  assert.throws(
    () => assertPassBGenomeCopyBoundary(leakingOutput, input),
    (error) => error instanceof GenesisPassBAdmissionError && error.gate === GENESIS_PASS_B_GENOME_COPY_GATE,
  );
  assert.deepEqual(assertPassBGenomeCopyBoundary(safeOutput, input), {
    ...safeOutput,
    formationMode: input.assignment.formationMode,
    priorTreatmentMemoryExposure: input.assignment.priorTreatmentMemoryExposure,
    analysisStratum: input.assignment.analysisStratum,
  });
});

test("Pass-B mechanical genome-copy retry withholds rejected content and is bounded to one retry", async () => {
  const outputs = [leakingOutput, safeOutput];
  const requests = [];
  const adapter = {
    async invoke(request) {
      requests.push(structuredClone(request));
      return { output: outputs.shift(), provenance: { transport: "test" } };
    },
  };

  const result = await generateAdmittedPassBMemory({
    adapter,
    input: treatmentInput(),
    clientRequestId: "guard-test",
  });

  assert.equal(result.output.rememberedContent, safeOutput.rememberedContent);
  assert.equal(result.output.formationMode, "life_plus_genome");
  assert.equal(result.output.priorTreatmentMemoryExposure, false);
  assert.equal(result.output.analysisStratum, "life_plus_genome");
  assert.equal(result.calls.length, 2);
  assert.equal(requests.length, 2);
  assert.match(requests[1].clientRequestId, /mechanical-genome-copy-retry-1$/);
  assert.doesNotMatch(JSON.stringify(requests[1]), /I remember that I should notice the mismatch/);
  assert.match(requests[1].systemPrompt, /mechanical genome-copy boundary/);
});
