import assert from "node:assert/strict";
import test from "node:test";
import { evaluateIntrinsicRegulation } from "#core/src/intrinsic-regulation.mjs";
import { DEFAULT_ORGANISM_POLICY } from "#core/src/organism-policy.mjs";
import { moodOf } from "../src/social-body.mjs";
import { feltSocialBody } from "../src/interoceptive-cognition.mjs";

// Mood (ADR-0038 B5, Guy, November 25): "A bad experience with one person may
// color the whole day." The narrow feeling stays with its person; a share of
// it spills into a general tone that colours how everyone else is felt, and
// fades back in hours to how life has been going.
const at = "2026-11-25T18:00:00.000Z";
const hoursBefore = (hours) => new Date(Date.parse(at) - hours * 3_600_000).toISOString();

test("a sting from one person sours the mood for hours, longer in a Body whose moods linger, and it passes", () => {
  const sting = [{ at:hoursBefore(2), value:-0.5 }];
  const soon = moodOf({ people:sting, at });
  assert.ok(soon.level < -0.25, "a sting two hours ago did not sour the mood");
  const lingering = moodOf({ people:sting, at, moodLocus:{ orientation:"everything", persistence:0.9 } });
  const passing = moodOf({ people:sting, at, moodLocus:{ orientation:"everything", persistence:-0.9 } });
  assert.ok(lingering.level < passing.level, "inherited persistence did not make a mood linger");
  const nextDay = moodOf({ people:[{ at:hoursBefore(30), value:-0.5 }], at });
  assert.ok(Math.abs(nextDay.level - nextDay.baseline) < 0.05, "a sting still coloured the mood the next day");
  const fromPeople = moodOf({ people:sting, at, moodLocus:{ orientation:"people", persistence:0 } });
  const fromDoing = moodOf({ people:sting, at, moodLocus:{ orientation:"doing", persistence:0 } });
  assert.ok(fromPeople.level < fromDoing.level, "a mood moved by people was not moved more by a person");
});

test("a warm life does not rise into constant good spirits: a warmth lifts as far as it differs from how life has been going", () => {
  const warmths = Array.from({ length: 30 }, (_, i) => ({ at:hoursBefore(160 - i * 5), value:0.3 }));
  const warm = moodOf({ people:warmths, at });
  assert.ok(warm.baseline > 0, "a warm week did not warm how life has been going");
  assert.ok(warm.level - warm.baseline < 0.1, "a warm life kept lifting the mood above its usual");
  const surprise = moodOf({ people:[...warmths, { at:hoursBefore(1), value:-0.5 }], at });
  assert.ok(surprise.level < warm.level - 0.25, "a sting in a warm life was hardly felt");
});

test("a sour mood makes the Body less drawn to others and warier of someone who did nothing, and says so", () => {
  const frame = (mood) => evaluateIntrinsicRegulation({
    perceptFrame:{ asOf:at, evidenceRefs:["self:test"],
      exploration:{ unfamiliarPeople:[{ personRef:"thr_new", unfamiliarity:0.8, evidenceRefs:["presence:new"] }] },
      trust:[{ personRef:"thr_other", trust:0.4, evidenceRefs:["presence:other"] }],
      ...(mood === null ? {} : { mood:{ ...mood, evidenceRefs:["regard:sting"] } }) },
    organismPolicy:DEFAULT_ORGANISM_POLICY });
  const pull = (regulation, family, ref) => regulation.drives.find((item) => item.family === family && item.targetRef === ref).pressure;
  const calm = frame(null), sour = frame({ level:-0.6, baseline:0 }), bright = frame({ level:0.6, baseline:0 });
  assert.ok(pull(sour, "exploration", "person:thr_new") < pull(calm, "exploration", "person:thr_new"),
    "a sour mood left a new person as inviting");
  assert.ok(pull(bright, "exploration", "person:thr_new") > pull(calm, "exploration", "person:thr_new"),
    "a good mood did not make a new person more inviting");
  assert.ok(pull(sour, "trust", "person:thr_other") > pull(calm, "trust", "person:thr_other"),
    "a sour mood did not raise guard toward someone who did nothing");
  assert.ok(feltSocialBody(sour).some((line) => /sits badly|soured/u.test(line)), "a sour mood was not felt in words");
  assert.ok(!feltSocialBody(calm).some((line) => /sits badly|soured|spirits|lighter/u.test(line)), "a mood was felt with none");
  const usual = frame({ level:0.2, baseline:0.2 });
  assert.ok(usual.drives.find((item) => item.family === "mood").pressure < 0.05, "a good life it has adapted to was felt as high spirits");
  const hard = frame({ level:-0.4, baseline:-0.4 });
  assert.ok(feltSocialBody(hard).includes("Things have been weighing on you lately."), "a long hardship went unfelt");
});

test("a good moment never sours the mood, and a run of them does not carry it away (review, Nov 25)", () => {
  const warm = Array.from({ length: 30 }, (_, i) => ({ at:hoursBefore(160 - i * 5), value:0.3 }));
  const felt = (mood) => mood.level - 0.8 * Math.max(0, mood.baseline);
  const before = moodOf({ people:warm, at }), after = moodOf({ people:warm, doing:[{ at:hoursBefore(0.5), value:0.1 }], at });
  assert.ok(felt(after) >= felt(before) - 0.002, "going deeper in a book soured a warm Thread's mood");
  const burst = moodOf({ people:Array.from({ length: 12 }, (_, i) => ({ at:hoursBefore(4 - i * 0.2), value:0.25 })), at });
  assert.ok(burst.level < 0.5, `a chatty afternoon of recognition carried the mood to ${burst.level}`);
  const hardWeek = Array.from({ length: 30 }, (_, i) => ({ at:hoursBefore(160 - i * 5), value:-0.4 }));
  assert.ok(moodOf({ people:[...hardWeek, { at:hoursBefore(1), value:-0.5 }], at }).level < moodOf({ people:hardWeek, at }).level - 0.15,
    "a sting in a hard life was hardly felt");
});
