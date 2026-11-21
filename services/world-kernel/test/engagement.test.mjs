import assert from "node:assert/strict";
import test from "node:test";

import { URGE_FAMILY_BY_NAME } from "#core/src/inherited-urges.mjs";
import { repetitionOf, sameGround, wearinessLevel } from "../src/engagement.mjs";
import { createExchangeMeaning } from "../src/exchange-meaning.mjs";
import { decodeMeaning as decode, encodeMeaning } from "../src/meaning-vectors.mjs";
import { feltSocialBody } from "../src/interoceptive-cognition.mjs";
import { livedRegulationForLivedHistory } from "../src/lived-now-regulation.mjs";
import { runThreadLiveSocialEncounter } from "../src/lived-social-live-encounter.mjs";
import { conversationDepletion } from "../src/social-body.mjs";

const AT = "2026-11-12T12:00:00.000Z";
const hoursBefore = (hours) => new Date(Date.parse(AT) - hours * 3_600_000).toISOString();
const locus = (variantId) => {
  const family = URGE_FAMILY_BY_NAME.get(variantId.replace(/_\d+$/u, ""));
  const variant = family.variants.find((item) => item.variantId === variantId);
  return { family:family.family, kind:family.kind, orientation:variant.orientation, positions:variant.positions };
};
const situation = { threadId:"thr_self", situationId:"sit_now", establishedAt:AT };
const lived = { getPreviousSituation:() => null };
const store = (readings) => ({
  listSocialInteractions:() => [], listAcceptedHumanMeetings:() => [], listReciprocalConversations:() => [],
  listSocialExposures:() => [],
  listEngagementReadings:() => readings.map((reading, i) => ({ reading, sourceKind:"turn", at:hoursBefore(i + 1) })),
});
const frame = (variantId, readings) => livedRegulationForLivedHistory({
  thread:{ threadId:"thr_self", genome:{ runtimeBaselines:{}, urgeProjection:[locus(variantId)] } },
  livedNowStore:lived, currentSituation:situation, experienceStore:store(readings), asOf:AT,
});
const restless = (value) => value?.drives.find((item) => item.targetRef === "self:weariness") ?? null;

test("weariness follows the Thread's own reading of what was new: nothing new wearies, the new does not", () => {
  const weary = frame("exploration_10", ["nothing_new", "nothing_new", "some_new", "nothing_new"]);
  const fresh = frame("exploration_10", ["new", "new", "some_new", "new"]);
  assert.ok(restless(weary)?.felt, "repeated nothing-new left no pull toward something new");
  assert.equal(restless(fresh), null, "a Thread still finding the new grew weary");
  assert.ok(feltSocialBody(weary).some((line) => !feltSocialBody(fresh).includes(line)),
    "weariness did not reach the Body's words");
});

test("one new thing eases a day of repetition without erasing it", () => {
  const level = (readings) => wearinessLevel({ threadId:"thr_self", at:AT, experienceStore:store(readings) }).level;
  const repeated = level(["nothing_new", "nothing_new", "nothing_new", "nothing_new"]);
  const thenNew = level(["new", "nothing_new", "nothing_new", "nothing_new", "nothing_new"]);
  assert.ok(thenNew < repeated, "something new brought no relief");
  assert.ok(thenNew > 0.5 * repeated, "one new thing wiped out a day of the same");
});

test("a novelty-seeking temperament tires sooner of the same readings than a steady one", () => {
  const readings = ["some_new", "some_new", "nothing_new"];
  assert.ok(restless(frame("exploration_10", readings)).pressure > restless(frame("exploration_06", readings)).pressure,
    "inherited temperament did not set how strongly the same is felt");
});

test("without meaning measured, shared words still state the fact", () => {
  const framework = "The claim goes beyond what the caption supports; we should mark the boundary of evidence.";
  const earlier = [
    "Does the caption support the claim, or does it go beyond the evidence we can see?",
    "Mark the boundary of evidence: the caption claims more than the object supports.",
    "Again the caption's claim goes beyond the evidence; the boundary should be marked.",
  ];
  assert.ok(sameGround(repetitionOf({ current:framework, earlier })), "going over the same ground was not stated");
  assert.equal(sameGround(repetitionOf({ current:"The tea at the market was sweeter than at home.", earlier })), null,
    "new ground was reported as the same");
});

test("talk over ground this Body is weary of tires it sooner", () => {
  const fresh = conversationDepletion({ start:null, turns:10, knowing:0.9, trust:0.9, weariness:0 });
  const weary = conversationDepletion({ start:null, turns:10, knowing:0.9, trust:0.9, weariness:0.8 });
  assert.ok(weary > 1.5 * fresh, "weariness cost the battery nothing");
});

test("a turn may open with the Thread's private reading of what was new to it, which is recorded and never spoken", async () => {
  const thread = (threadId, name) => ({ threadId, version:1, identity:{ name },
    currentState:{ selfModel:`I am ${name}.`, unresolvedIntentions:[] }, genome:{ runtimeBaselines:{}, urgeProjection:[] } });
  const readings = [];
  const context = (self, other) => ({ thread:self,
    situation:{ situationId:`sit_${self.threadId}`, threadId:self.threadId, establishedAt:AT, activity:"Talking." },
    perspective:{ developedSelfEvidence:[], placeName:"the library",
      counterparts:[{ threadId:other.threadId, name:other.identity.name, appearance:"a reader", noticedBefore:[] }] },
    onReading:(reading) => readings.push([self.threadId, reading]) });
  const mina = thread("thr_read_mina", "Mina"), noor = thread("thr_read_noor", "Noor");
  let turns = 0;
  const result = await runThreadLiveSocialEncounter({
    initiator:context(mina, noor), counterparty:context(noor, mina),
    request:{ initiatorThreadId:mina.threadId, text:"Shall we test another caption?" },
    stance:{ decision:"accept", expression:null, suggestedAt:null, reason:"Yes." },
    modelAdapter:{ async invoke() { throw new Error("no structured call"); },
      async *streamExpression() {
        turns += 1;
        yield { type:"expression_delta", text:turns === 1 ? "none none SAY: Another one?"
          : turns < 3 ? "nothing_new ordinary SAY: Another one, then." : "SILENT" };
        yield { type:"expression_complete", provenance:{ provider:"fixture", modelId:"fixture" } };
      } },
  });
  assert.deepEqual(readings.map(([, reading]) => reading), ["nothing_new"],
    "the Thread's reading of the talk was lost, or nothing yet said was read as something");
  assert.ok(result.story.beats.every((beat) => !/nothing_new|none/iu.test(beat.text ?? "")), "a private reading was spoken aloud");
});

// Meaning, measured through a stand-in port: texts on one subject share a
// direction whatever their words; other subjects point elsewhere.
const SUBJECTS = [[/caption|label|claim|assert|evidence|support/iu, [1, 0.1, 0]], [/tea|market|kiosk|sweet/iu, [0, 1, 0.1]]];
const embedder = { modelId:"fixture-meaning", calls:0,
  async embed(texts) { this.calls += 1;
    return { modelId:"fixture-meaning", vectors:texts.map((text) => SUBJECTS.find(([pattern]) => pattern.test(text))?.[1] ?? [0, 0, 1]) }; } };
const meaningStore = (exchanges) => {
  const kept = new Map();
  return { listRecentExchangeTexts:() => exchanges, kept,
    exchangeMeanings:(refs) => new Map(refs.filter((ref) => kept.has(ref)).map((ref) => [ref, { vector:decode(kept.get(ref)) }])),
    recordExchangeMeanings:(items) => items.forEach((item) => kept.set(item.ref, item.vector)),
    listEngagementReadings:() => [] };
};
const talks = [
  { ref:"enc_1", at:hoursBefore(5), text:"Does the caption support the claim it makes?" },
  { ref:"enc_2", at:hoursBefore(3), text:"Mark where the evidence stops supporting what is asserted." },
  { ref:"enc_3", at:hoursBefore(1), text:"Again the label claims more than the object supports." },
];

test("the same ground in other words is still the same ground, by meaning; other ground is not", async () => {
  const meaning = createExchangeMeaning({ embedder, experienceStore:meaningStore(talks) });
  assert.ok(await meaning.sameGround({ threadId:"thr_self", at:AT, text:"Whether that inscription really backs what is asserted." }),
    "reworded ground was not recognised as the same");
  assert.equal(await meaning.sameGround({ threadId:"thr_self", at:AT, text:"The tea at the kiosk was sweeter than at home." }), null,
    "new ground was reported as the same");
  const words = createExchangeMeaning({ embedder:null, experienceStore:meaningStore(talks) });
  assert.equal(await words.sameGround({ threadId:"thr_self", at:AT, text:"Whether that inscription really backs what is asserted." }), null,
    "without meaning, the fallback was not by shared words");
});

test("habituation: a run of talk on one subject raises weariness's baseline, varied talk does not", async () => {
  const baseline = (exchanges) => {
    const experienceStore = meaningStore(exchanges);
    for (const exchange of exchanges) experienceStore.kept.set(exchange.ref,
      encodeMeaning(SUBJECTS.find(([pattern]) => pattern.test(exchange.text))?.[1] ?? [0, 0, 1]));
    return wearinessLevel({ threadId:"thr_self", at:AT, experienceStore }).baseline;
  };
  const varied = [talks[0], { ref:"msg_1", at:hoursBefore(4), text:"The tea at the market was sweet." },
    { ref:"enc_9", at:hoursBefore(2), text:"Rain on the tin roofs all night." }];
  assert.ok(baseline(talks) > 0.2, "repeating one subject left no habituation");
  assert.ok(baseline(varied) < 0.05, "varied talk was felt as repetition");
});

test("a conversation whose last turns go back over its first ones feels the same ground; one that moves on does not", async () => {
  const meaning = createExchangeMeaning({ embedder, experienceStore:meaningStore([]) });
  const circling = ["Does the caption support the claim?", "Only partly.", "Where does the evidence stop?",
    "The label asserts more.", "So the claim outruns the evidence?", "Yes, the caption claims too much."];
  const moving = [...circling.slice(0, 3), "Shall we get tea at the kiosk?", "The market one is sweeter.", "Sweet tea it is."];
  assert.ok(await meaning.conversationGround({ threadId:"thr_self", at:AT, earlier:[], utterances:circling }),
    "a talk circling back was not felt as the same ground");
  assert.equal(await meaning.conversationGround({ threadId:"thr_self", at:AT, earlier:[], utterances:moving }), null,
    "a talk that moved on was felt as circling");
});
