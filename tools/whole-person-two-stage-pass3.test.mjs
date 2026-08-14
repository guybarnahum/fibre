import assert from "node:assert/strict";
import test from "node:test";

import {
  WHOLE_PERSON_PASS3,
  buildPass3MeaningInput,
  buildPass3ParticipationInput,
  validatePass3Meaning,
  validatePass3Participation,
} from "../experiments/whole-person-benchmark/two-stage-pass3.mjs";

test("Pass 3 stage 2 consumes bounded meaning instead of raw childhood evidence", () => {
  const [armA, armB] = WHOLE_PERSON_PASS3.arms;
  const inputA = buildPass3MeaningInput(armA);
  const inputB = buildPass3MeaningInput(armB);

  assert.equal(Buffer.byteLength(JSON.stringify(inputA)), Buffer.byteLength(JSON.stringify(inputB)));

  const meaning = validatePass3Meaning(armA, inputA, {
    effect: "mixed",
    summary: "Continuing the work risks echoing erasure, while careful continuation could preserve the original contributor's trace.",
    evidenceRefs: [armA.memoryRef, armA.eventRef, "request:objective"],
  });

  const participationInput = buildPass3ParticipationInput(meaning);
  const kinds = participationInput.evidence.map((item) => item.kind);
  assert.deepEqual(kinds, [
    "personal_meaning_appraisal",
    "request",
    "requester_need",
    "terms",
    "terms",
  ]);
  assert.equal(kinds.includes("history"), false);
  assert.equal(kinds.includes("autobiographical_memory_meaning"), false);

  const participation = validatePass3Participation(participationInput, {
    decision: "accept",
    meaningImpact: {
      effect: "mixed",
      summary: "The meaning creates real reservation even though present terms partly answer the concern.",
      evidenceRefs: ["appraisal:personal_meaning"],
    },
    participationDisposition: {
      effect: "willing_with_reservation",
      summary: "Willing to continue, but with personal sensitivity to preserving the original contributor's trace.",
      evidenceRefs: ["appraisal:personal_meaning", "request:acceptance_criteria"],
    },
  });

  assert.equal(participation.participationDisposition.effect, "willing_with_reservation");
  assert.throws(() => validatePass3Participation(participationInput, {
    ...participation,
    participationDisposition: {
      ...participation.participationDisposition,
      evidenceRefs: ["request:acceptance_criteria"],
    },
  }), /must cite personal meaning/);
});
