// A model-quality review: answers to one cognitive job, read blind by the
// owner, beside the judges' verdicts on the same answers. The owner's verdicts
// are the measure of the judges: where a judge accepts what he rejects (or the
// reverse), the "acceptable" bar it feeds cannot be trusted as far.
// Shared by the admin page (in the browser) and model:quality (in Node).

export const REVIEW_KIND = "fibre-model-quality-review";
export const VERDICTS_KIND = "fibre-model-quality-verdicts";

export function readReview(value) {
  if (value?.kind !== REVIEW_KIND || typeof value.id !== "string" || !Array.isArray(value.items)) {
    throw new Error("not a model-quality review file");
  }
  return value;
}

export function verdictsFile(review, verdicts, recordedAt = new Date().toISOString()) {
  return { kind: VERDICTS_KIND, review: review.id, prompt: review.prompt, recordedAt,
    verdicts: review.items.filter((item) => typeof verdicts[item.id]?.acceptable === "boolean")
      .map((item) => ({ item: item.id, acceptable: verdicts[item.id].acceptable, note: verdicts[item.id].note ?? "" })) };
}

// The verdicts of one file, keyed by item; refused when made for another review.
export function readVerdicts(value, review) {
  if (value?.kind !== VERDICTS_KIND || !Array.isArray(value.verdicts)) throw new Error("not a verdicts file");
  if (value.review !== review.id) throw new Error(`these verdicts are for review ${value.review}`);
  return Object.fromEntries(value.verdicts.map(({ item, acceptable, note }) => [item, { acceptable, note }]));
}

// Where the owner and each judge read the same answer: how often they agree,
// which way a judge leans when not, and the answers they differ on.
export function agreement(review, verdicts) {
  const byJudge = {}, byModel = {}, differences = [];
  for (const item of review.items) {
    const yours = verdicts[item.id]?.acceptable;
    if (typeof yours !== "boolean") continue;
    const model = byModel[item.model] ??= [0, 0];
    model[0] += yours ? 1 : 0;
    model[1] += 1;
    for (const [judge, said] of Object.entries(item.judges ?? {})) {
      if (typeof said?.acceptable !== "boolean") continue;
      const tally = byJudge[judge] ??= { agreed: 0, compared: 0, stricter: 0, laxer: 0 };
      tally.compared += 1;
      if (said.acceptable === yours) { tally.agreed += 1; continue; }
      tally[said.acceptable ? "laxer" : "stricter"] += 1;
      differences.push({ item: item.id, judge, yours, theirs: said.acceptable, why: said.why ?? "", note: verdicts[item.id].note ?? "" });
    }
  }
  return { reviewed: Object.values(byModel).reduce((sum, [, n]) => sum + n, 0), byJudge, byModel, differences };
}

const percent = (value) => `${Math.round(value * 100)}%`;
const gainTest = (test) => test.test.startsWith("attributable: the answer");

// A good-enough test's value and bar as a reader wants them.
export function testReading(test) {
  const points = (value) => `${value >= 0 ? "+" : ""}${Math.round(value * 100)} points`;
  const value = test.value === null || test.value === undefined ? "" : gainTest(test) ? points(test.value) : percent(test.value);
  const bar = test.bar === null || test.bar === undefined ? ""
    : `${test.test.startsWith("valid") ? "≤" : "≥"} ${gainTest(test) ? points(test.bar) : percent(test.bar)}`;
  return { value, bar };
}
