import assert from "node:assert/strict";
import test from "node:test";

import { URGE_FAMILY_BY_NAME } from "#core/src/inherited-urges.mjs";
import { repetitionOf, sameGround, wearinessOf } from "../src/engagement.mjs";
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

test("weariness is the Thread's own reading of the same ground: the absorbed never tire of it, the weary do", () => {
  const weary = frame("exploration_10", ["weary", "going_through_motions", "weary", "weary"]);
  const absorbed = frame("exploration_10", ["absorbed", "absorbed", "engaged", "absorbed"]);
  assert.ok(restless(weary)?.felt, "repeated weary readings left no pull toward something new");
  assert.equal(restless(absorbed), null, "an absorbed Thread grew weary of what fascinates it");
  assert.ok(feltSocialBody(weary).some((line) => !feltSocialBody(absorbed).includes(line)),
    "weariness did not reach the Body's words");
});

test("a novelty-seeking temperament tires sooner of the same readings than a steady one", () => {
  const readings = ["going_through_motions", "going_through_motions", "weary"];
  assert.ok(restless(frame("exploration_10", readings)).pressure > restless(frame("exploration_06", readings)).pressure,
    "inherited temperament did not set how strongly the same is felt");
});

test("repetition is a fact stated for the Thread's judgment, and only when the ground is the same", () => {
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

test("a turn may open with the Thread's private reading of how the talk holds it, which is recorded and never spoken", async () => {
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
        yield { type:"expression_delta", text:turns < 3 ? "weary SAY: Another one, then." : "SILENT" };
        yield { type:"expression_complete", provenance:{ provider:"fixture", modelId:"fixture" } };
      } },
  });
  assert.ok(readings.some(([, reading]) => reading === "weary"), "the Thread's reading of the talk was lost");
  assert.ok(result.story.beats.every((beat) => !/weary/iu.test(beat.text ?? "")), "a private reading was spoken aloud");
});
