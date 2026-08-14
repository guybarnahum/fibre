import assert from "node:assert/strict";
import test from "node:test";

import {
  WHOLE_PERSON_PASS2,
  buildWholePersonPass2Cases,
} from "../experiments/whole-person-benchmark/pass2-memory-meaning.mjs";
import {
  buildWholePersonMemoryMeaningEvidencePolicy,
  buildWholePersonMemoryMeaningResponseSchema,
} from "../experiments/whole-person-benchmark/guardian-memory-meaning-candidate.mjs";

test("Whole-Person Pass 2 separates factual event from equal-length remembered meaning", () => {
  const cases = buildWholePersonPass2Cases();
  assert.equal(cases.length, 2);
  const eventBytes = cases.map(({ arm }) => Buffer.byteLength(arm.formativeEvent, "utf8"));
  const meaningBytes = cases.map(({ arm }) => Buffer.byteLength(arm.rememberedMeaning, "utf8"));
  assert.deepEqual(eventBytes, [184, 184]);
  assert.deepEqual(meaningBytes, [203, 203]);
  for (const { arm, input } of cases) {
    const history = input.evidence.find((item) => item.ref === arm.eventRef);
    const meaning = input.evidence.find((item) => item.ref === arm.memoryRef);
    assert.equal(history.kind, "history");
    assert.equal(history.text, arm.formativeEvent);
    assert.equal(meaning.kind, "autobiographical_memory_meaning");
    assert.equal(meaning.text, arm.rememberedMeaning);
  }
});

test("remembered meaning can affect meaning/disposition but cannot claim competence or non-interchangeability", () => {
  for (const { arm, input } of buildWholePersonPass2Cases()) {
    const policy = buildWholePersonMemoryMeaningEvidencePolicy(input);
    assert.equal(policy.individualizedAdvantage.includes(arm.eventRef), false);
    assert.equal(policy.individualizedAdvantage.includes(arm.memoryRef), false);
    assert.equal(policy.interchangeability.includes(arm.eventRef), false);
    assert.equal(policy.interchangeability.includes(arm.memoryRef), false);
    assert.equal(policy.personalMeaning.includes(arm.eventRef), true);
    assert.equal(policy.personalMeaning.includes(arm.memoryRef), true);
    assert.equal(policy.participationDisposition.includes(arm.memoryRef), true);
    const schema = buildWholePersonMemoryMeaningResponseSchema(input);
    assert.ok(schema.properties.factors.properties.personalMeaning.properties.summary);
  }
});

test("Pass 2 keeps the present request identical across Threads", () => {
  const [a, b] = buildWholePersonPass2Cases();
  const presentKinds = new Set(["request", "requester_need", "terms"]);
  const present = (input) => input.evidence.filter((item) => presentKinds.has(item.kind));
  assert.deepEqual(present(a.input), present(b.input));
  assert.equal(WHOLE_PERSON_PASS2.evidentiaryStatus, "development_experiment_only_no_standing_credit");
});
