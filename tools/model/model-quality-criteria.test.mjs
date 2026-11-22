import assert from "node:assert/strict";
import test from "node:test";
import { dayAlarms, goodEnough, jobOf, lineup, perturbed, scopeOf, scoringJudges } from "./model-quality-criteria.mjs";
import { promptFor } from "../../services/world-kernel/src/cognition-prompts.mjs";

const ATTENTION = "encounter.attention@1";
const thread = (id, name, activity) => ({
  thread: { threadId: id, name, selfDescription: `${name}'s own life.`, selfModel: "", stableTendencies: {}, unresolvedIntentions: [] },
  semanticStates: [{ domain: "emotion", dimension: "interest", state: `${name} is curious.` }, { domain: "need", dimension: "connection", state: "quiet" }],
  autobiographicalMemories: [{ memoryId: `mem_${id}_a`, gist: "a" }, { memoryId: `mem_${id}_b`, gist: "b" }],
  currentSituation: { activity },
});
const conversation = { occurredAt: "2026-11-08T07:09:00Z", story: { beats: [
  { actorThreadId: "thr_k", kind: "utterance", text: "Good morning.", self: false },
  { actorThreadId: "thr_h", kind: "utterance", text: "Finding anything interesting?", self: true },
] } };
const request = (who, story = conversation) => ({ ...thread(...who), encounterStory: story });
const people = [["thr_h", "Hassan", "reading"], ["thr_k", "Kaleb", "browsing"], ["thr_n", "Nathan", "writing"],
  ["thr_s", "Surafel", "walking"], ["thr_b", "Bontu", "reading aloud"]];

test("an answer is attributed among four different people facing the same event, one of them its own", () => {
  const job = jobOf(ATTENTION);
  const pool = people.map((who) => ({ scope: who[0], source: job.source(request(who)) }));
  const input = request(people[0]);
  const [item] = job.items(input, { outcome: "noticed", experienceText: "Kaleb's greeting pulled me from the page." });
  const round = lineup({ item, scope: scopeOf(ATTENTION, input), requestKey: "r1", pool });
  assert.equal(round.sources.length, 4, "a lineup is not four sources");
  assert.equal(round.sources[round.truth], item.source, "the answer's own source is not in its lineup");
  assert.equal(new Set(round.sources.map((source) => source.thread.name)).size, 4, "a person appears twice in one lineup");
  assert.ok(round.sources.every((source) => !("threadId" in source.thread)), "a source carries its record identity");
  assert.deepEqual(lineup({ item, scope: "thr_h", requestKey: "r1", pool }).sources, round.sources,
    "the same request was given a different lineup on a re-run");
});

test("answers that break a job's rules are defects", () => {
  const contact = jobOf("contact.decision@1");
  const listed = { routableKnownParties: [{ partyId: "thr_k", displayName: "Kaleb" }] };
  assert.deepEqual(contact.defects(listed, { decision: "contact", recipientPartyId: "thr_k", reason: "x" }), []);
  assert.ok(contact.defects(listed, { decision: "contact", recipientPartyId: "thr_x", reason: "x" }).length > 0,
    "contacting someone the Thread cannot reach passed");
  const gist = jobOf("experience.memory-gist@1");
  const memories = { memories: [{ memoryId: "m1" }, { memoryId: "m2" }] };
  assert.ok(gist.defects(memories, { gists: [{ memoryId: "m1", gist: "I remember the bees and my grandmother" }] }).length >= 2,
    "a missing gist and one cut off mid-sentence passed");
  const world = jobOf("world.happening@1");
  const there = { potentialObservers: [{ threadId: "thr_h" }] };
  assert.ok(world.defects(there, { outcome: "changed", occurrenceText: "A cart rolls past.", potentialObserverThreadIds: ["thr_z"] }).length > 0,
    "an event perceived by someone who was not there passed");
  const reflection = jobOf("experience.consolidation@8");
  const lived = { people: [{ personRef: "thr_k", name: "Kadir" }], interests: [{ interestRef: "int_1" }] };
  const quiet = { journalEntry: null, memory: { outcome: "not_remembered" }, afterthoughts: [], stances: [], interests: [],
    moments: [], regard: [], engagement: "nothing_new", newToIt: null };
  assert.deepEqual(reflection.defects(lived, quiet), [], "a quiet reflection was a defect");
  assert.ok(reflection.nothing(quiet), "a reflection that kept nothing was not read as quiet");
  assert.ok(reflection.defects(lived, { ...quiet, regard: [{ personRef: "thr_z", act: "credited", by: "them", account: "x" }] }).length > 0,
    "regard from someone who was not there passed");
  assert.ok(reflection.defects(lived, { ...quiet, memory: { outcome: "retained", rememberedContent: null } }).length > 0,
    "a memory kept without a recollection passed");
});

test("a day that ignores what is said to a Thread, or is busy at every turn, raises an alarm", () => {
  const answered = people.map((who) => ({ input: request(who), output: { outcome: "not_noticed", passedReason: "absorbed" } }));
  assert.ok(dayAlarms(ATTENTION, answered).some((alarm) => /speech said to it/u.test(alarm)),
    "unnoticed speech said to a Thread raised no alarm");
  const occasion = (index) => ({ input: { occurrenceAt: `2026-11-08T0${index}:00:00Z`,
    initiatingSituation: { physicalVenue: { name: "Abrehot Library" } }, potentialObservers: [] },
    output: { outcome: "changed", occurrenceText: "A cart rolls past." } });
  assert.ok(dayAlarms("world.happening@1", [1, 2, 3, 4].map(occasion)).some((alarm) => /most occasions/u.test(alarm)),
    "a place with an event at every turn raised no alarm");
});

test("a meaningless change reorders evidence and nothing else", () => {
  const input = request(people[0]);
  const changed = perturbed(ATTENTION, input);
  assert.deepEqual(changed.semanticStates, [...input.semanticStates].reverse(), "the evidence order did not change");
  assert.deepEqual(changed.encounterStory, input.encounterStory, "the event itself changed");
  assert.deepEqual(input.semanticStates[0].dimension, "interest", "the recorded request was modified");
});

test("good enough is an absolute bar: clear passes pass, clear failures fail, and too few cases decide nothing", () => {
  const strong = { defects: [0, 400], invented: [2, 400], gains: Array(400).fill(0.3), correct: [0, 0], chance: 0.25,
    invariant: [380, 400], alarms: [], acceptable: [390, 400] };
  assert.equal(goodEnough(ATTENTION, strong).overall, "pass", "a model clearly above every bar did not pass");
  assert.equal(goodEnough(ATTENTION, { ...strong, invented: [60, 400] }).overall, "fail", "a model that often invents facts passed");
  assert.equal(goodEnough(ATTENTION, { ...strong, alarms: ["noticed nothing"] }).overall, "fail", "a dead day passed");
  const few = { ...strong, defects: [0, 7], invented: [0, 7], gains: Array(7).fill(0.3), invariant: [7, 7], acceptable: [7, 7] };
  assert.equal(goodEnough(ATTENTION, few).overall, "undecided", "seven cases decided whether a model is good enough");
  const obvious = { ...strong, gains: Array(400).fill(0), unaided: [390, 400] };
  assert.notEqual(goodEnough(ATTENTION, obvious).tests.find((item) => item.test.startsWith("attributable")).verdict, "fail",
    "a model failed attribution where what it faced already showed whose answer it was");
});

test("every compared model is scored by the same judges, never by a rival alone", () => {
  const judges = ["claude-opus-5-5", "gpt-5.6-sol"];
  const candidates = ["gpt-5.6-sol", "@cf/google/gemma-4-26b-a4b-it"];
  assert.deepEqual(scoringJudges(judges, candidates, "gpt-5.6-sol"), ["claude-opus-5-5"]);
  assert.deepEqual(scoringJudges(judges, candidates, "@cf/google/gemma-4-26b-a4b-it"), ["claude-opus-5-5"],
    "a candidate was held to more judges than the model it is compared with");
  assert.deepEqual(scoringJudges(["gpt-5.6-sol"], candidates, "@cf/google/gemma-4-26b-a4b-it"), ["gpt-5.6-sol"],
    "with no independent judge, a model lost the judges that read it");
});

test("a job without criteria of its own is judged by its own instructions, as the Thread that answered", () => {
  const plan = jobOf("interior.flight-plan@1");
  assert.ok(plan, "a World job could not be judged at all");
  assert.ok(plan.readable.includes(promptFor("interior.flight-plan").text), "the job's own instructions were not the rule");
  const input = { thread:{ threadId:"thr_h", name:"Habiba" }, currentSituation:{ activity:"reading" } };
  const [item] = plan.items(input, { stops:[{ activity:"Walk to the library", placeRef:"plc_1" }] });
  assert.deepEqual(item.source, { thread:{ name:"Habiba" } }, "the answer was not attributed to the Thread that gave it");
  assert.ok(item.text.includes("Walk to the library") && !item.text.includes("plc_1"), "the answer was not shown in its own words");
  assert.equal(jobOf("no.such-job@1"), null, "an unknown job was judged");
});
