import assert from "node:assert/strict";
import test from "node:test";
import { bodyLink, lensOf, lensTexts, sharedMethod, captureDecisions, closenessToOthers, glanceDecisions, personUplift, rankCorrelation, spread,
  tellings, turnOutput, uplift } from "./thread-chain.mjs";

// The chain read per Thread: Body signals are the panel's levels at the last
// moment before a decision; acts are World records.
const AT = "2026-11-24T12:00:00.000Z";
const hoursAgo = (hours) => new Date(Date.parse(AT) - hours * 3_600_000).toISOString();
const SELF = "thr_self", FRIEND = "thr_friend", STRANGER = "thr_stranger";
const series = Array.from({ length: 13 }, (_, i) => {
  const at = hoursAgo(24 - 2 * i), late = i >= 6;
  return { at, weariness: late ? 0.8 : 0.1, noveltyHunger: late ? 0.3 : 0, lifted: i === 12, share: i === 12 ? 0.3 : 0,
    people: { [FRIEND]: { warmth: 0.6, promise: 0.4 }, [STRANGER]: { warmth: 0, promise: 0 } } };
});
const knowledge = { subjects: [{ subject: "Mars (Planet)", firstAt: hoursAgo(1), lastAt: hoursAgo(1), encounters: 1 },
  { subject: "Philosophy", firstAt: hoursAgo(200), lastAt: hoursAgo(20), encounters: 4 }] };
const own = { kind: "book", ref: "hld_own", title: "Apology", own: true, subjects: ["Philosophy"] };
const other = { kind: "book", ref: "hld_mars", title: "Thuvia, maid of Mars", own: false, subjects: ["Mars (Planet) -- Fiction"] };
const glance = (hours, items, focus) => ({ glanceId: `glance_${hours}`, occurredAt: hoursAgo(hours), items, focus });

test("a weary Thread that takes up a book new to it, and a rested one that goes back to its own, show the coupling", () => {
  const rows = glanceDecisions({ threadId: SELF, series, knowledge: { subjects: [knowledge.subjects[1]] }, glances: [
    glance(3, [own, other], 1), glance(5, [own, other], 1), glance(21, [own, other], 0), glance(19, [own, other], 0),
    glance(4, [own], 0)] });
  const weary = uplift(rows, "weary", "otherBook");
  assert.deepEqual([weary.felt, weary.notFelt, weary.uplift], [[2, 2], [0, 2], 1],
    "weariness was not read against taking up something other than its own book");
  assert.equal(uplift(rows, "hungryForNew", "newSubjectBook").felt[0], 2, "a book on a subject new to it was not recognised as new");
  assert.equal(weary.felt[1] + weary.notFelt[1], 4, "a glance with no other book on offer was counted as a choice against it");
  const legacy = glanceDecisions({ threadId: SELF, series, knowledge, glances: [
    glance(3, [{ ...own, own: undefined }, { ...other, own: undefined }], 0)] });
  assert.equal(legacy[0].acts.otherBook, undefined, "a glance that cannot tell its own book from another was counted");
});

test("toward people present: the one who brings something new, and the one it is warm to", () => {
  const friend = { kind: "person", ref: FRIEND }, stranger = { kind: "person", ref: STRANGER };
  const rows = glanceDecisions({ threadId: SELF, series, knowledge, glances: [glance(3, [friend, stranger], 0),
    glance(9, [friend, stranger], 0), glance(15, [stranger, friend], 0)] });
  const drawn = personUplift(rows, "promise", 0.1);
  assert.deepEqual([drawn.felt, drawn.notFelt], [[2, 3], [1, 3]], "who it looked to was not read against promise");
  assert.ok(drawn.uplift > 0, "being drawn to someone who brings something new did not show");
});

test("in conversation: whether it spoke, and whether it told what it had just learned", () => {
  assert.deepEqual(turnOutput("new credited SAY: Have you read about Mars?"),
    { reading: "new", regard: "credited", spoke: true, said: "Have you read about Mars?" });
  assert.equal(turnOutput("nothing_new ordinary SILENT").spoke, false, "silence was read as speaking");
  const capture = (said, at) => ({ prompt: "social.live-turn@13", at,
    capture: JSON.stringify({ input: { thread: { threadId: SELF } }, output: { text: `none none SAY: ${said}` } }) });
  // The Body just before the talk began, from the panel's decision moments.
  const moment = { ...series.at(-1), at: hoursAgo(0.6) };
  const rows = captureDecisions({ threadId: SELF, series: [...series.slice(0, -1), moment], knowledge, captures: [
    capture("I found a book about Mars and its moons.", hoursAgo(0.5)), capture("Good morning.", hoursAgo(10))] });
  assert.deepEqual(rows.map((row) => [row.signals.wantsToTell, row.acts.toldWhatItLearned]), [[true, true], [false, false]],
    "telling what it just learned was not read against its pull to tell");
});

test("the Body's lift is checked against what lifted it: a discovery lifts, going on with a known book does not", () => {
  const learning = [{ at: hoursAgo(1), learning: "discovery", workRef: "gutenberg:72" }];
  const backed = bodyLink({ series, learning, readings: [], from: hoursAgo(24), to: AT });
  assert.deepEqual([backed.discoveries, backed.liftPrecision, backed.liftRecall], [1, 1, 1], "a discovery's lift was not traced to it");
  const deeper = bodyLink({ series, learning: [{ ...learning[0], learning: "depth" }], readings: [], from: hoursAgo(24), to: AT });
  assert.deepEqual([deeper.discoveries, deeper.deeper, deeper.liftPrecision], [0, 1, 0],
    "going on with a book it knew was counted as a discovery, or a lift with nothing new behind it was not caught");
});

test("teaching between two: it spoke of a subject it held and the other did not, and the other heard it as new", () => {
  const story = { occurredAt: hoursAgo(0.5), threadPresence: [{ threadId: SELF }, { threadId: FRIEND }],
    story: { beats: [{ kind: "utterance", actorThreadId: SELF, spokenText: "There is a whole novel set on Mars." }] } };
  const told = tellings({ threadId: SELF, stories: [story], from: hoursAgo(24), to: AT,
    knowledgeOf: (id) => id === SELF ? knowledge : { subjects: [] },
    readingsOf: (id) => id === FRIEND ? [{ at: story.occurredAt, reading: "new" }] : [] });
  assert.deepEqual(told.map((item) => [item.subject, item.to, item.heardAsNew]), [["Mars (Planet)", FRIEND, true]]);
  const shared = tellings({ threadId: SELF, stories: [story], from: hoursAgo(24), to: AT,
    knowledgeOf: () => knowledge, readingsOf: () => [] });
  assert.equal(shared.length, 0, "speaking of a subject both held was counted as teaching");
});

test("meaning measures: variety, closeness to others, and genes read against a link", () => {
  assert.equal(spread([[1, 0], [1, 0]]), 0);
  assert.equal(spread([[1, 0], [0, 1]]), 1);
  assert.equal(closenessToOthers([1, 0], [[1, 0], [0, 1]]), 0.5);
  assert.equal(rankCorrelation([[0.1, 1], [0.2, 2], [0.3, 3], [0.4, 5]]).rho, 1);
  assert.equal(rankCorrelation([[0.1, 1], [0.2, 2]]), null, "a direction was claimed from two Threads");
});

test("the shared lens is found from the Threads' own interests, and a text goes through it only when nearer to it than to the Thread's other ways in", () => {
  const vectors = {
    "Testing claims: what the evidence supports": [1, 0, 0, 0.1], "Careful verification of claims": [0.95, 0.05, 0, 0.1],
    "Stress-testing claims with examples": [0.97, 0, 0.05, 0.1], "Bees and their hives": [0, 1, 0, 0],
    "Sea stories": [0, 0, 1, 0], "Twenty Thousand Leagues: submarines, sea stories": [0, 0.05, 1, 0],
    "Marking where the passage supports a mechanism": [0.9, 0, 0.2, 0.1], "The Nautilus dives under the ice, and I hold my breath": [0.1, 0, 0.95, 0],
  };
  const vectorOf = (text) => vectors[text] ?? null;
  const method = sharedMethod({ vectorOf, interestsByThread: { a: ["Testing claims: what the evidence supports", "Bees and their hives"],
    b: ["Careful verification of claims"], c: ["Stress-testing claims with examples", "Sea stories"] } });
  assert.ok(method !== null, "a method held by every Thread was not found");
  assert.equal(method.members.a, "Testing claims: what the evidence supports", "a Thread's own form of the method was not its interest nearest the others'");
  const lens = lensOf({ method, vectorOf, alternatives: ["Stress-testing claims with examples", "Sea stories", "Twenty Thousand Leagues: submarines, sea stories"],
    texts: [{ carrier: "reading", text: "Marking where the passage supports a mechanism" },
      { carrier: "reading", text: "The Nautilus dives under the ice, and I hold my breath" }] });
  assert.deepEqual(lens.byCarrier.reading, [1, 2], "reading a book as itself was counted as reading it through the method, or the reverse");
  assert.equal(sharedMethod({ vectorOf, interestsByThread: { a: ["Bees and their hives"], b: ["Sea stories"], c: ["Testing claims: what the evidence supports"] } }),
    null, "Threads with nothing in common were said to share a method");
});

test("a Thread's cognition is read from the requests that name it, whatever cache scope they were kept under", () => {
  const at = "2026-11-25T10:00:00.000Z";
  const captures = [{ prompt: "encounter.reading@1", scope: "cache-scope-1", at,
    capture: JSON.stringify({ input: { thread: { threadId: "thr_a" } }, output: { experienceText: "The Nautilus dives under the ice and I hold my breath with Aronnax." } }) },
    { prompt: "encounter.reading@1", scope: "thr_a", at,
      capture: JSON.stringify({ input: { thread: { threadId: "thr_b" } }, output: { experienceText: "Someone else's reading, kept under a scope that looks like a Thread's id." } }) }];
  const texts = lensTexts({ threadId: "thr_a", captures, from: "2026-11-25T00:00:00.000Z", to: "2026-11-26T00:00:00.000Z" });
  assert.deepEqual(texts.map((item) => item.carrier), ["reading"], "a Thread's reading was missed, or another's counted as its own");
});
