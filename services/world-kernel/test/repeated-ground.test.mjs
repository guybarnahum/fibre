import assert from "node:assert/strict";
import test from "node:test";
import { wearinessLevel } from "../src/engagement.mjs";
import { createRepeatedGroundNaming, repeatedGround } from "../src/repeated-ground.mjs";
import { decodeMeaning, unit } from "../src/meaning-vectors.mjs";
import { feltSocialBody } from "../src/interoceptive-cognition.mjs";

// Body-drives plan C1 and C5 (Guy, November 25): a feeling must point at
// something to move a Thread, and it must move to say anything.
const AT = "2026-11-25T18:00:00.000Z";
const hoursBefore = (hours) => new Date(Date.parse(AT) - hours * 3_600_000).toISOString();

test("a dull talk is felt once, by its freshest moment and how it ended, so weariness moves", () => {
  const talk = (hours, readings) => readings.map((reading, turn) =>
    ({ reading, sourceKind:"turn", sourceRef:`live:thr_a:${hoursBefore(hours)}:${turn}`, at:hoursBefore(hours) }));
  const store = (readings) => ({ listEngagementReadings:() => readings, listLearning:() => [] });
  const dull = wearinessLevel({ experienceStore:store(talk(1, Array(10).fill("nothing_new"))), threadId:"thr_a", at:AT }).level;
  assert.ok(dull > 0.2 && dull < 0.5, `one dull talk of ten turns ${dull}: it should weary, never fill`);
  const endedFresh = wearinessLevel({ experienceStore:store(talk(1, [...Array(9).fill("nothing_new"), "new"])),
    threadId:"thr_a", at:AT }).level;
  assert.ok(endedFresh < dull, "a talk that ended on something new wearied as much as a dull one");
  const day = talk(10, Array(8).fill("nothing_new")).concat(talk(6, Array(8).fill("nothing_new")), talk(2, Array(8).fill("nothing_new")));
  const evening = wearinessLevel({ experienceStore:store(day), threadId:"thr_a", at:AT }).level;
  assert.ok(evening < 0.9, `three dull talks pinned weariness at ${evening}`);
});

// Three exchanges on one ground, one elsewhere.
const ground = unit([1, 0.2, 0, 0]), near = unit([1, 0.3, 0.1, 0]), close = unit([0.9, 0.1, 0.2, 0]), other = unit([0, 0, 1, 0.3]);
const exchanges = [["x1", near, "Where does the text itself say it was providence?"], ["x2", ground, "Sequence alone does not prove a cause."],
  ["x3", close, "We should mark where the narrator adds the cause."], ["x4", other, "The market was busy this morning."]];
function world(named = null) {
  let kept = named;
  return {
    listRecentExchangeTexts:() => exchanges.map(([ref, , text], i) => ({ ref, text, at:hoursBefore(i + 1) })),
    exchangeMeanings:(refs) => new Map(exchanges.filter(([ref]) => refs.includes(ref)).map(([ref, vector]) => [ref, { vector }])),
    getRepeatedGround:() => kept,
    recordRepeatedGround:({ at, centreRef, vector, name }) => { kept = { at, centreRef, vector:decodeMeaning(vector), name }; },
  };
}

test("World finds the ground a Thread keeps coming back to, and the Thread names it in its own words, once", async () => {
  const store = world();
  const found = repeatedGround({ experienceStore:store, threadId:"thr_a", at:AT });
  assert.equal(found.texts.length, 3, "the cluster was not the three exchanges on one ground");
  assert.ok(!found.texts.some((text) => text.includes("market")), "an exchange elsewhere was counted as the same ground");
  const asked = [];
  const modelAdapter = { async invoke(request) { asked.push(request.input); return { output:{ ground:"weighing what texts really support" } }; } };
  const naming = createRepeatedGroundNaming({ experienceStore:store, modelAdapter });
  assert.equal((await naming.refresh({ threadId:"thr_a", at:AT })).name, "weighing what texts really support");
  assert.deepEqual(asked[0], { ownWords:found.texts }, "the Thread named it from anything but its own words");
  await naming.refresh({ threadId:"thr_a", at:hoursBefore(-1) });
  assert.equal(asked.length, 1, "an unchanged ground was named again");
});

test("having had enough says of what, once the Thread has named it", () => {
  const frame = { drives:[{ family:"exploration", targetRef:"self:weariness", pressure:0.6, felt:true, inheritedDirection:"ideas" }] };
  assert.deepEqual(feltSocialBody({ ...frame, repeatedGround:"weighing what texts really support" }),
    ["You have had enough of weighing what texts really support for now; something new to think about would be welcome."]);
  assert.deepEqual(feltSocialBody(frame), ["You have had enough of this for now; something new to think about would be welcome."]);
});
