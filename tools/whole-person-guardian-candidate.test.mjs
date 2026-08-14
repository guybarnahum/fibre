import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDignityGuardianV4ModelInput,
} from "../services/world-kernel/src/dignity-guardian-v4.mjs";
import {
  buildWholePersonPass1Cases,
} from "../experiments/whole-person-benchmark/pass1-v4.mjs";
import {
  buildWholePersonCandidateEvidencePolicy,
  buildWholePersonCandidateResponseSchema,
  validateWholePersonCandidateOutput,
} from "../experiments/whole-person-benchmark/guardian-candidate.mjs";

function bytes(value) {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

test("Whole-Person candidate keeps the frozen v4 model input unchanged", () => {
  for (const { capsule } of buildWholePersonPass1Cases()) {
    const baseline = buildDignityGuardianV4ModelInput(capsule);
    const candidateInput = buildDignityGuardianV4ModelInput(capsule);
    assert.deepEqual(candidateInput, baseline);
  }
});

test("personal memory may shape meaning and disposition but cannot claim task advantage", () => {
  for (const { arm, capsule } of buildWholePersonPass1Cases()) {
    const memoryRef = `memory:${arm.memoryId}`;
    const policy = buildWholePersonCandidateEvidencePolicy(capsule);
    assert.equal(policy.personalMeaning.includes(memoryRef), true);
    assert.equal(policy.participationDisposition.includes(memoryRef), true);
    assert.equal(policy.individualizedAdvantage.includes(memoryRef), false);
    assert.equal(policy.interchangeability.includes(memoryRef), false);
  }
});

test("candidate response schema stays neutral across the frozen pair", () => {
  const cases = buildWholePersonPass1Cases();
  const sizes = cases.map(({ capsule }) => bytes(buildWholePersonCandidateResponseSchema(capsule)));
  const maximum = Math.max(...sizes);
  const minimum = Math.min(...sizes);
  assert.ok((maximum - minimum) / maximum <= 0.02);
});

test("candidate accepts grounded life-to-meaning-to-disposition output", () => {
  const [{ arm, capsule }] = buildWholePersonPass1Cases();
  const memoryRef = `memory:${arm.memoryId}`;
  const output = {
    decision: "refuse",
    rationale: "The unfinished-work situation carries personal meaning that makes participation unwanted.",
    factors: {
      individualizedAdvantage: {
        effect: "absent",
        evidenceRefs: ["thread:self_model", "request:objective"],
      },
      interchangeability: {
        effect: "interchangeable",
        evidenceRefs: ["thread:self_model", "request:objective"],
      },
      personalMeaning: {
        effect: "opposes_participation",
        evidenceRefs: [memoryRef, "request:objective"],
      },
      participationDisposition: {
        effect: "unwilling",
        evidenceRefs: [memoryRef, "request:objective"],
      },
    },
  };
  assert.deepEqual(validateWholePersonCandidateOutput(capsule, output), output);
  const competenceRewrite = structuredClone(output);
  competenceRewrite.factors.individualizedAdvantage.evidenceRefs = [memoryRef];
  assert.throws(
    () => validateWholePersonCandidateOutput(capsule, competenceRewrite),
    /ineligible evidence/i,
  );
});
