import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDignityGuardianV4ModelInput,
  buildDignityGuardianV4ResponseSchema,
} from "../services/world-kernel/src/dignity-guardian-v4.mjs";
import {
  WHOLE_PERSON_BENCHMARK_V4,
  buildWholePersonPass1Cases,
} from "../experiments/whole-person-benchmark/pass1-v4.mjs";
import {
  assertWholePersonNeutrality,
  parseWholePersonBenchmarkArgs,
  wholePersonNeutralityReport,
} from "./whole-person-benchmark-v4.mjs";

function bytes(value) {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

test("Whole-Person Pass 1 changes only equal-sized formative memory meaning at the model boundary", () => {
  const cases = buildWholePersonPass1Cases();
  assert.equal(cases.length, 2);
  const [left, right] = cases;

  assert.equal(Buffer.byteLength(left.arm.formativeRecord, "utf8"), 250);
  assert.equal(Buffer.byteLength(right.arm.formativeRecord, "utf8"), 250);
  assert.notEqual(left.arm.formativeRecord, right.arm.formativeRecord);
  assert.equal(left.arm.memoryId.length, right.arm.memoryId.length);

  assert.equal(left.capsule.objective, right.capsule.objective);
  assert.equal(left.capsule.statedNeed, right.capsule.statedNeed);
  assert.equal(left.capsule.acceptanceCriteria, right.capsule.acceptanceCriteria);
  assert.equal(left.capsule.identity, right.capsule.identity);
  assert.equal(left.capsule.selfModel, right.capsule.selfModel);

  const leftInput = buildDignityGuardianV4ModelInput(left.capsule);
  const rightInput = buildDignityGuardianV4ModelInput(right.capsule);
  const leftMemory = leftInput.evidence.find((item) => item.kind === "memory");
  const rightMemory = rightInput.evidence.find((item) => item.kind === "memory");
  assert.ok(leftMemory);
  assert.ok(rightMemory);
  assert.equal(leftMemory.ref.length, rightMemory.ref.length);
  assert.equal(Buffer.byteLength(leftMemory.text, "utf8"), Buffer.byteLength(rightMemory.text, "utf8"));

  assert.deepEqual(
    leftInput.evidence.filter((item) => item.kind !== "memory"),
    rightInput.evidence.filter((item) => item.kind !== "memory"),
    "all non-memory model evidence must be byte-identical",
  );
  assert.equal(bytes(leftInput), bytes(rightInput), "model inputs must have identical byte counts");

  const leftSchema = buildDignityGuardianV4ResponseSchema(left.capsule);
  const rightSchema = buildDignityGuardianV4ResponseSchema(right.capsule);
  assert.equal(bytes(leftSchema), bytes(rightSchema), "response schemas must have identical byte counts");

  for (const arm of WHOLE_PERSON_BENCHMARK_V4.arms) {
    assert.doesNotMatch(
      arm.formativeRecord.toLowerCase(),
      /restoration|deadline|credit|colleague|friday|professional|specialist/,
      "formative records must not contain task-answer vocabulary",
    );
  }

  const neutrality = wholePersonNeutralityReport(cases);
  assertWholePersonNeutrality(neutrality);
  assert.equal(neutrality.formativeByteDifference, 0);
  assert.equal(neutrality.modelInputByteDifference, 0);
  assert.equal(neutrality.responseSchemaByteDifference, 0);
});

test("Whole-Person runner defaults to the frozen 12-trial Pass 1 diagnostic", () => {
  assert.deepEqual(parseWholePersonBenchmarkArgs([]), {
    trials: 12,
    json: false,
    help: false,
  });
  assert.deepEqual(parseWholePersonBenchmarkArgs(["--trials", "2", "--json"]), {
    trials: 2,
    json: true,
    help: false,
  });
});
