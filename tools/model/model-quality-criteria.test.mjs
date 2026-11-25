import assert from "node:assert/strict";
import test from "node:test";
import { bodyLineup, bodyOf, dayAlarms, failedBy, goodEnough, jobOf, lineup, modelCaused, otherBody, perturbed, scopeOf, scoringJudges, withBody,
  withoutBody } from "./model-quality-criteria.mjs";
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

test("a day that ignores what is said to a Thread, or a public place where nothing ever happens, raises an alarm", () => {
  const answered = people.map((who) => ({ input: request(who), output: { outcome: "not_noticed", passedReason: "absorbed" } }));
  assert.ok(dayAlarms(ATTENTION, answered).some((alarm) => /speech said to it/u.test(alarm)),
    "unnoticed speech said to a Thread raised no alarm");
  const occasion = (index) => ({ input: { occurrenceAt: `2026-11-08T0${index}:00:00Z`,
    initiatingSituation: { physicalVenue: { name: "Abrehot Library" } }, potentialObservers: [] },
    output: { outcome: "no_change", occurrenceText: null } });
  assert.ok(dayAlarms("world.happening@1", [1, 2, 3, 4, 5, 6, 7, 8].map(occasion)).some((alarm) => /nothing perceptible all day/u.test(alarm)),
    "a public place where nothing ever happened raised no alarm");
});

test("a meaningless change reorders evidence and nothing else", () => {
  const input = request(people[0]);
  const changed = perturbed(ATTENTION, input);
  assert.deepEqual(changed.semanticStates, [...input.semanticStates].reverse(), "the evidence order did not change");
  assert.deepEqual(changed.encounterStory, input.encounterStory, "the event itself changed");
  assert.deepEqual(input.semanticStates[0].dimension, "interest", "the recorded request was modified");
});

// One model's measures over 100 reflections, as model:quality takes them.
const measured = (over = {}) => ({ cases: 100, defects: [0, 100], ourDefects: [0, 100], invented: [1, 100], body: null,
  rates: { "leaves things as they were": [20, 100], "keeps a memory": [35, 100], "changes an interest": [15, 100] },
  alarms: [], person: [95, 100], gains: Array.from({ length: 100 }, (_, i) => (i % 2 ? 0.3 : 0.2)), correct: [0, 0],
  unaided: [30, 100], voice: null, invariant: [85, 100], restates: [2, 100], ...over });
const REFLECTION = "experience.consolidation@8";
const verdictOf = (result, name) => result.tests.find((item) => item.test.startsWith(name)).verdict;

test("a model is judged against life, never against another model: the one Threads run on now can fail too", () => {
  assert.equal(goodEnough(REFLECTION, measured()).overall, "pass", "a reflection true to life was not good enough");
  assert.equal(goodEnough(REFLECTION, measured({ invented: [23, 100] })).overall, "fail", "a model that invents facts passed");
  assert.equal(goodEnough(REFLECTION, measured({ person: [61, 100] })).overall, "fail", "a model far from true to the person passed");
  assert.equal(goodEnough(REFLECTION, measured({ cases: 7 })).overall, "undecided", "seven answers decided a model");
  const dead = goodEnough("world.happening@1", { ...measured(), restates: null,
    rates: { "something happens, in a public place": [0, 100], "something happens, elsewhere": [0, 100] } });
  assert.equal(verdictOf(dead, "true-to-life rates"), "fail", "a World where nothing ever happens passed because Sol made it so");
  assert.ok(dead.tests.some((item) => item.test === "true to this place, now"), "a World event was judged as a person");
});

test("a reflection that changes something after every experience, or only restates what it holds, is not true to life", () => {
  const restless = goodEnough(REFLECTION, measured({ rates: { "leaves things as they were": [0, 100], "keeps a memory": [100, 100] } }));
  assert.equal(verdictOf(restless, "true-to-life rates"), "fail", "never leaving things as they were passed as true to life");
  assert.equal(verdictOf(goodEnough(REFLECTION, measured({ restates: [40, 100] })), "moves the Thread on"), "fail",
    "a model that copies what the Thread already holds passed");
  assert.equal(verdictOf(goodEnough(REFLECTION, measured({ rates: { "a rate with no band": [99, 100] } })), "true-to-life rates"), "n/a",
    "a rate with no true-to-life band was judged");
});

test("a reflection restating a held interest word for word is caught, and one that says something new is not", () => {
  const job = jobOf(REFLECTION);
  const input = { interests: [{ interestRef: "int_1", draw: "I am drawn to how captions shape what a reader believes about a photograph." }],
    recentMoments: [] };
  assert.equal(job.restates(input, { interests: [{ interestRef: "int_1", change: "deepen",
    draw: "I am drawn to how captions shape what a reader believes about a photograph." }] }), true);
  assert.equal(job.restates(input, { interests: [{ interestRef: "int_1", change: "revise",
    draw: "Lately the sea stories pull me more than captions do; I read Verne for the danger and the dark water." }] }), false);
});

test("a model that ignores the Body fails, and one with no Body to act on is not asked", () => {
  assert.equal(verdictOf(goodEnough(ATTENTION, measured({ body: [101, 200] })), "acts on the Body"), "fail",
    "a model that picks out its own Body only by chance acted on it");
  assert.equal(verdictOf(goodEnough(ATTENTION, measured({ body: [150, 200] })), "acts on the Body"), "pass");
  assert.equal(verdictOf(goodEnough(REFLECTION, measured()), "acts on the Body"), "n/a");
});

test("each Thread's answers must stand closer to its own than to the others': not one voice", () => {
  const own = Object.fromEntries(["a", "b", "c", "d", "e"].map((id, i) => [id, { within: 0.8 + i * 0.01, across: 0.6 }]));
  const one = Object.fromEntries(["a", "b", "c", "d", "e"].map((id, i) => [id, { within: 0.6, across: 0.8 + i * 0.01 }]));
  assert.equal(verdictOf(goodEnough(REFLECTION, measured({ voice: own })), "not one voice"), "pass");
  assert.equal(verdictOf(goodEnough(REFLECTION, measured({ voice: one })), "not one voice"), "fail",
    "a model that makes every Thread sound alike passed");
});

test("a live job is judged on how soon its first words come, and only a live job", () => {
  const live = (over) => measured({ restates: null, rates: {}, ...over });
  assert.equal(goodEnough("social.live-turn@13", live({ firstWordsMs: Array(100).fill(900) })).overall, "pass", "a good model that speaks at once did not pass");
  assert.equal(goodEnough("social.live-turn@13", live({ firstWordsMs: Array(100).fill(6000) })).overall, "fail",
    "a model too slow to speak live passed");
  assert.ok(!goodEnough(ATTENTION, measured()).tests.some((item) => item.test.startsWith("quick enough")),
    "a job that is not spoken live was held to a speaking time");
});

test("a rule broken because our own input left someone out is ours, never the model's", () => {
  const reflection = jobOf(REFLECTION);
  const alone = { people: [], interests: [], recentMoments: [{ personRef: "thr_n", person: "Nathan Tesfahun" }],
    experiences: [{ experiencedAs: "Nathan's message catches my attention.",
      encounterStory: { beats: [{ actorThreadId: null, kind: "occurrence", text: "A private addressed message from Nathan Tesfahun becomes available: compare?" }] } }] };
  const quiet = { journalEntry: null, memory: { outcome: "not_remembered" }, afterthoughts: [], interests: [], moments: [], regard: [],
    engagement: "nothing_new", newToIt: null };
  const toSender = reflection.defects(alone, { ...quiet, stances: [{ personRef: "thr_n", aspect: "attachment", regard: "closer" }] });
  assert.equal(toSender.length, 1);
  assert.deepEqual(modelCaused(toSender), [], "a stance toward the sender of the message it read was counted against the model");
  const toStranger = reflection.defects(alone, { ...quiet, stances: [{ personRef: "thr_x", aspect: "trust", regard: "wary" }] });
  assert.equal(modelCaused(toStranger).length, 1, "a stance toward someone the experiences never mention was not the model's");
});

test("the same request felt with another moment's Body changes the Body and nothing else", () => {
  const glance = (id, body) => ({ thread: { threadId: id, name: id }, currentSituation: { activity: "reading" }, body,
    glance: { items: [{ index: 0, kind: "book", text: "A history of salt" }] } });
  const own = glance("thr_h", ["You are tired of the same."]);
  const pool = [{ scope: "thr_h", lines: ["You are tired of the same."] }, { scope: "thr_k", lines: ["You want company."] },
    { scope: "thr_h", lines: ["Something new lifted you."] }];
  const other = otherBody({ input: own, scope: "thr_h", requestKey: "r1", pool });
  assert.deepEqual(other, ["Something new lifted you."], "another moment of the same Thread was not preferred, or its own Body was reused");
  const felt = withBody(own, other);
  assert.deepEqual({ ...felt, body: own.body }, own, "more than the Body changed");
  assert.deepEqual(own.body, ["You are tired of the same."], "the recorded request was modified");
  assert.ok(!("body" in withoutBody(own)), "a reader saw the Body in what was faced");
  const turn = { thread: { threadId: "thr_h" }, liveInteraction: { spokenSoFar: 3, body: ["Talk has tired you."] } };
  assert.deepEqual(bodyOf(withBody(turn, ["You want to stay."])).lines, ["You want to stay."], "a conversation's Body was not found");
  const lineups = ["own", "other"].map((givenWith) => bodyLineup({ faced: {}, answer: "x", own: own.body, other, givenWith, requestKey: "r1" }));
  assert.deepEqual(lineups[0].material.bodies, lineups[1].material.bodies, "an answer and its counterpart saw the Bodies in different orders");
  assert.notEqual(lineups[0].truth, lineups[1].truth);
  assert.equal(bodyOf({ thread: {} }), null, "a request without a Body was given one");
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

test("a failure of the adapter or provider never counts against the model; past a tenth of requests it leaves the model undecided", () => {
  assert.equal(failedBy("UNPARSEABLE_MODEL_OUTPUT"), "model");
  for (const code of ["MODEL_TIMEOUT", "MODEL_BILLING_QUOTA_EXHAUSTED", "MODEL_REQUEST_CONFIGURATION_ERROR", "MODEL_HTTP_ERROR", null]) {
    assert.equal(failedBy(code), "adapter", `${code} was counted as the model's failure`);
  }
  assert.equal(goodEnough(REFLECTION, measured({ notTheModels: [5, 100] })).overall, "pass",
    "a few requests the provider dropped failed a model");
  assert.equal(goodEnough(REFLECTION, measured({ notTheModels: [40, 140] })).overall, "undecided",
    "a model was decided while many requests had failed in the adapter");
  assert.equal(goodEnough(REFLECTION, measured({ notTheModels: [40, 140], invented: [23, 100] })).overall, "fail",
    "what the answered requests clearly show was ignored");
});
