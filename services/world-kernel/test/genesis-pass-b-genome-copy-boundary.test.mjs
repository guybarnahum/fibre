import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  GENESIS_PASS_B_GENOME_COPY_GATE,
  GenesisPassBAdmissionError,
  assertPassBGenomeCopyBoundary,
} from "../src/genesis-pass-b-admission.mjs";
import { buildHPassBInput } from "../../../tools/genesis/genesis-h-final-cohort.mjs";

const readJson = (path) => JSON.parse(readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8"));

function treatmentInput() {
  const g2 = readJson("artifacts/validation/m2-pr39/replacement-v1/protocol/rg2-cohort-genome-freeze-v1.json");
  const g3 = readJson("artifacts/validation/m2-pr39/g/protocol/g3-pass-b-treatment-freeze-v1.json");
  const g4 = readJson("artifacts/validation/m2-pr39/g/protocol/g4-cognition-freeze-v1.json");
  const binding = g2.worldBindings[0];
  const world = readJson(binding.worldSpecPath);
  const genome = readJson(binding.genomePath);
  const episodes = g4.historicalPlan.windows.map((window, index) => ({
    episodeId: `ep_boundary_${String(index + 1).padStart(2, "0")}`,
    occurredAt: window.startAt,
    ageAtEvent: window.minAge,
    placeRef: world.places[0].placeId,
    participantRefs: [binding.threadId],
    observableAction: `The subject completes ordinary observable activity ${index + 1}.`,
    structureRef: null,
    introducedParticipants: [],
  }));
  return {
    input: buildHPassBInput({
      threadId: binding.threadId,
      bornAt: g4.historicalPlan.entry.bornAt,
      worldSpec: world,
      episodes,
      horizon: 6,
      callOrdinal: 3,
      formationMode: "life_plus_genome",
      priorRememberedMemories: [],
      genome,
      g3v1: g3,
      g4v1: g4,
    }),
    episodeRef: episodes[0].episodeId,
    copiedPhrase: genome.loci[0].value.split(/\s+/u).slice(0, 4).join(" "),
  };
}

test("Pass-B genome-copy boundary rejects verbatim locus text in uncertainty as well as rememberedContent", () => {
  const { input, episodeRef, copiedPhrase } = treatmentInput();
  assert.throws(
    () => assertPassBGenomeCopyBoundary({
      outcome: "remembered",
      episodeRefs: [episodeRef],
      rememberedContent: "I remember a routine event from the visible history.",
      uncertainty: [`I am unsure whether ${copiedPhrase} was relevant.`],
    }, input),
    (error) => {
      assert.equal(error instanceof GenesisPassBAdmissionError, true);
      assert.equal(error.gate, GENESIS_PASS_B_GENOME_COPY_GATE);
      assert.equal(error.details.field, "uncertainty[0]");
      return true;
    },
  );
});

test("Pass-B genome-copy boundary still admits ordinary uncertainty without a copied genome n-gram", () => {
  const { input, episodeRef } = treatmentInput();
  const output = assertPassBGenomeCopyBoundary({
    outcome: "remembered",
    episodeRefs: [episodeRef],
    rememberedContent: "I remember a routine event from the visible history.",
    uncertainty: ["I am unsure which weekday it happened."],
  }, input);
  assert.deepEqual(output.uncertainty, ["I am unsure which weekday it happened."]);
});
