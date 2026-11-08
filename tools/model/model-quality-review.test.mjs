import assert from "node:assert/strict";
import test from "node:test";
import { agreement, readReview, readVerdicts, REVIEW_KIND, verdictsFile } from "../../apps/admin-dashboard/model-quality-review.mjs";

const review = readReview({ kind: REVIEW_KIND, id: "encounter.attention-run1", prompt: "encounter.attention", items: [
  { id: "a", model: "sol", answer: "Kaleb's greeting pulled me from the page.",
    judges: { claude: { acceptable: true, why: "fits" }, terra: { acceptable: false, why: "too long" } } },
  { id: "b", model: "terra", answer: "I said hello back.", judges: { claude: { acceptable: true, why: "fine" } } },
  { id: "c", model: "terra", answer: "I kept reading.", judges: { claude: { acceptable: null } } },
  { id: "d", model: "sol", answer: "Unread.", judges: { claude: { acceptable: true } } },
] });

test("a judge is measured only on answers both it and the owner read, and every difference is listed with both reasons", () => {
  const mine = { a: { acceptable: true, note: "" }, b: { acceptable: false, note: "it speaks; noticing is not acting" },
    c: { acceptable: true, note: "" } };
  const result = agreement(review, mine);
  assert.equal(result.reviewed, 3, "an unread answer was counted as read");
  assert.deepEqual(result.byJudge.claude, { agreed: 1, compared: 2, stricter: 0, laxer: 1 },
    "a judge was scored on an answer it gave no verdict on, or its leaning was miscounted");
  assert.deepEqual(result.byJudge.terra, { agreed: 0, compared: 1, stricter: 1, laxer: 0 }, "a stricter judge was not seen as stricter");
  assert.deepEqual(result.byModel, { sol: [1, 1], terra: [1, 2] }, "the owner's own acceptance per model was miscounted");
  const laxer = result.differences.find((difference) => difference.item === "b");
  assert.deepEqual([laxer.judge, laxer.yours, laxer.theirs, laxer.why, laxer.note],
    ["claude", false, true, "fine", "it speaks; noticing is not acting"], "a difference lost one side's reason");
});

test("saved verdicts round-trip to their own review and are refused by any other", () => {
  const saved = JSON.parse(JSON.stringify(verdictsFile(review, { a: { acceptable: false, note: "x" }, d: { note: "undecided" } })));
  assert.deepEqual(readVerdicts(saved, review), { a: { acceptable: false, note: "x" } }, "an undecided answer was saved as a verdict");
  assert.throws(() => readVerdicts(saved, { ...review, id: "encounter.attention-run2" }), /run1/u,
    "verdicts were applied to a review they were not made for");
});
