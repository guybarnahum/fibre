import assert from "node:assert/strict";
import test from "node:test";
import { learningFromReading, subjectsOf } from "../src/knowledge.mjs";
import { wearinessLevel } from "../src/engagement.mjs";

const AT = "2026-11-24T12:00:00.000Z";
const hoursAgo = (hours) => new Date(Date.parse(AT) - hours * 3_600_000).toISOString();

test("a work's subjects are the catalogue's own words for what it is about, never its collection", () => {
  assert.deepEqual(subjectsOf({ subjects:["Tarzan (Fictitious character) -- Fiction", "Adventure stories",
    "Browsing: Science-Fiction & Fantasy", "Best Books Ever Listings"] }).map((item) => item.subject),
  ["Tarzan", "Adventure stories", "Science-Fiction & Fantasy"]);
});

test("meeting a subject new to it is a discovery; going on, or another book in what it holds, is a step deeper", () => {
  const tarzan = { subjects:["Adventure stories", "Africa -- Fiction"] };
  assert.equal(learningFromReading({ held:new Map(), work:tarzan, continuing:false }).learning, "discovery");
  const held = new Map([["adventure stories", {}], ["africa", {}]]);
  assert.equal(learningFromReading({ held, work:tarzan, continuing:false }).learning, "depth",
    "a book wholly within what it knew counted as discovery");
  assert.equal(learningFromReading({ held:new Map(), work:tarzan, continuing:true }).learning, "depth",
    "going on with a book it began counted as discovery");
});

test("a subject new to it eases weariness of the same, as something new in talk does", () => {
  const readings = [1, 2, 3].map((hours) => ({ reading:"nothing_new", at:hoursAgo(hours) }));
  const store = (learning) => ({ listEngagementReadings:() => readings, listLearning:() => learning });
  const weary = wearinessLevel({ experienceStore:store([]), threadId:"thr_kadir", at:AT }).level;
  const eased = wearinessLevel({ experienceStore:store([{ learning:"discovery", sourceRef:"gutenberg:78", at:hoursAgo(0.5) }]),
    threadId:"thr_kadir", at:AT }).level;
  assert.ok(eased < weary, "a discovery did nothing for weariness of the same");
  const deeper = wearinessLevel({ experienceStore:store([{ learning:"depth", sourceRef:"gutenberg:78", at:hoursAgo(0.5) }]),
    threadId:"thr_kadir", at:AT }).level;
  assert.equal(deeper, weary, "a step deeper was counted as something new");
});
