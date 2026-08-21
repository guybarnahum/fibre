import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildHPassBInput,
  buildNeutralHThreadSeed,
  verifyHFinalCohortPreflight,
} from "./genesis-h-final-cohort.mjs";

const readJson = (path) => JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"));

function passBHistory(world, threadId, g4) {
  return g4.historicalPlan.windows.map((window, index) => ({
    episodeId: `ep_h_preflight_${String(index + 1).padStart(2, "0")}`,
    occurredAt: window.startAt,
    ageAtEvent: window.minAge,
    placeRef: world.places[0].placeId,
    participantRefs: [threadId],
    observableAction: `The subject completes ordinary observable activity number ${index + 1}.`,
    structureRef: null,
    introducedParticipants: [],
  }));
}

test("H zero-call preflight binds the reviewed five-slot frozen packet", () => {
  const result = verifyHFinalCohortPreflight({ enforceReviewedSource: false });
  assert.equal(result.status, "CLEAR_TO_EXECUTE_H");
  assert.equal(result.slots.length, 5);
  assert.deepEqual(result.slots.map((slot) => slot.passAEpisodes), [10, 10, 10, 10, 10]);
  assert.deepEqual(result.slots[0].passBHorizons, [4, 5, 6, 7, 8, 10]);
  assert.deepEqual(result.slots[0].passBModes, [
    "life_only", "life_only", "life_plus_genome", "life_only", "life_only", "life_plus_genome",
  ]);
  assert.equal(result.oneShot.wholeCandidateAttemptCap, 1);
  assert.equal(result.oneShot.qualityDrivenRegeneration, false);
});

test("H publication seed is semantically uniform and does not duplicate the symbolic genome", () => {
  const createdAt = "2026-08-21T03:00:00Z";
  const left = buildNeutralHThreadSeed({ threadId: "thr_h_seed_left", createdAt });
  const right = buildNeutralHThreadSeed({ threadId: "thr_h_seed_right", createdAt });
  assert.equal(left.identity.name, "Fibre Thread");
  assert.equal(left.identity.selfDescription, "I am a Fibre Thread.");
  assert.deepEqual(left.identity, right.identity);
  assert.deepEqual(left.genome.textualTraits, {});
  assert.deepEqual(left.genome.runtimeBaselines, {});
  assert.deepEqual(left.currentState.needs, []);
  assert.deepEqual(left.currentState.feelings, []);
  assert.deepEqual(left.currentState.unresolvedIntentions, []);
  assert.deepEqual(left.relationshipRefs, []);
  assert.deepEqual(left.memoryRefs, []);
});

test("H Pass-B schedule keeps clean control blind, exposes the whole genome only at treatment, and derives exposed control from admitted prior treatment memory", () => {
  const g2 = readJson("artifacts/validation/m2-pr39/g/protocol/g2-cohort-genome-freeze-v2.json");
  const g3v1 = readJson("artifacts/validation/m2-pr39/g/protocol/g3-pass-b-treatment-freeze-v1.json");
  const g4v1 = readJson("artifacts/validation/m2-pr39/g/protocol/g4-cognition-freeze-v1.json");
  const binding = g2.worldBindings[0];
  const world = readJson(binding.worldSpecPath);
  const genome = readJson(binding.genomePath);
  const episodes = passBHistory(world, binding.threadId, g4v1);

  const clean = buildHPassBInput({
    threadId: binding.threadId,
    bornAt: g4v1.historicalPlan.entry.bornAt,
    worldSpec: world,
    episodes,
    horizon: 4,
    callOrdinal: 1,
    formationMode: "life_only",
    priorRememberedMemories: [],
    genome,
    g3v1,
    g4v1,
  });
  assert.equal(clean.assignment.analysisStratum, "life_only_unexposed");
  assert.equal(clean.genomeExposure, null);

  const treatment = buildHPassBInput({
    threadId: binding.threadId,
    bornAt: g4v1.historicalPlan.entry.bornAt,
    worldSpec: world,
    episodes,
    horizon: 6,
    callOrdinal: 3,
    formationMode: "life_plus_genome",
    priorRememberedMemories: [],
    genome,
    g3v1,
    g4v1,
  });
  assert.equal(treatment.assignment.analysisStratum, "life_plus_genome");
  assert.equal(treatment.genomeExposure.loci.length, 6);
  assert.deepEqual(treatment.genomeExposure.loci.map((locus) => locus.ordinal), [1, 2, 3, 4, 5, 6]);

  const exposed = buildHPassBInput({
    threadId: binding.threadId,
    bornAt: g4v1.historicalPlan.entry.bornAt,
    worldSpec: world,
    episodes,
    horizon: 7,
    callOrdinal: 4,
    formationMode: "life_only",
    priorRememberedMemories: [{
      memoryRef: "mem_h_prior_treatment",
      passBEpisodeRefs: [episodes[0].episodeId],
      rememberedContent: "I remember one concrete earlier event from the visible history.",
      uncertainty: [],
      formationMode: "life_plus_genome",
    }],
    genome,
    g3v1,
    g4v1,
  });
  assert.equal(exposed.assignment.priorTreatmentMemoryExposure, true);
  assert.equal(exposed.assignment.analysisStratum, "life_only_exposed");
  assert.equal(exposed.genomeExposure, null);
});
