import assert from "node:assert/strict";
import test from "node:test";

import { URGE_FAMILY_BY_NAME } from "#core/src/inherited-urges.mjs";
import { decideLaterContact } from "../src/lived-contact-cognition.mjs";
import { feltSocialBody } from "../src/interoceptive-cognition.mjs";
import { livedRegulationForLivedHistory, socialBodyInConversation } from "../src/lived-now-regulation.mjs";
import { runThreadLiveSocialEncounter } from "../src/lived-social-live-encounter.mjs";
import { socialEnergyEvidence } from "../src/social-body.mjs";

const AT = "2026-11-10T12:00:00.000Z";
const minutesBefore = (minutes, at = AT) => new Date(Date.parse(at) - minutes * 60_000).toISOString();
const locus = (variantId) => {
  const family = URGE_FAMILY_BY_NAME.get(variantId.replace(/_\d+$/u, ""));
  const variant = family.variants.find((item) => item.variantId === variantId);
  return { family:family.family, kind:family.kind, orientation:variant.orientation, positions:variant.positions };
};
const bodyOf = (...variantIds) => ({ threadId:"thr_body", genome:{ runtimeBaselines:{}, urgeProjection:variantIds.map(locus) } });
const battery = (frame) => frame.drives.find((item) => item.family === "social_energy");

test("the same talk tires two inherited Bodies differently, each pulled toward its own kind of rest", () => {
  // Inherited: talk costs much and is felt early, and quiet company restores it;
  // against: talk costs little, and livelier company restores it.
  const costly = bodyOf("social_energy_04");
  const light = bodyOf("social_energy_01");
  const firstFelt = (thread) => {
    for (let turns = 1; turns <= 24; turns += 1) {
      const drive = battery(socialBodyInConversation({ thread, start:null, familiarity:0, turns, asOf:AT }));
      if (drive.felt) return { turns, direction:drive.inheritedDirection };
    }
    return { turns:Infinity, direction:null };
  };
  const a = firstFelt(costly), b = firstFelt(light);
  assert.ok(a.turns < b.turns, "a costly battery was not felt sooner than a light one");
  assert.equal(a.direction, "quiet_company");
  assert.equal(b.direction, "company");
  const at12 = (thread) => battery(socialBodyInConversation({ thread, start:null, familiarity:0, turns:12, asOf:AT })).pressure;
  assert.ok(at12(costly) > at12(light), "the same twelve turns weighed the same on both Bodies");
});

test("talk with a familiar person drains less than with a stranger, and time apart restores", () => {
  const store = (familiar) => ({
    listSocialExposures:() => [{ kind:"conversation", ref:"story_talk", at:minutesBefore(30), turns:16,
      otherThreadId:"thr_other" }],
    listSharedContactTimes:() => familiar ? Array.from({ length:10 }, (_, day) => minutesBefore(60 * 24 * (day + 1))) : [],
  });
  const stranger = socialEnergyEvidence({ threadId:"thr_self", experienceStore:store(false), asOf:AT });
  const known = socialEnergyEvidence({ threadId:"thr_self", experienceStore:store(true), asOf:AT });
  assert.ok(known.depletion < stranger.depletion, "a well-known person cost as much as a stranger");
  assert.deepEqual(stranger.evidenceRefs, ["story_talk"], "the battery lost its World evidence");
  const later = socialEnergyEvidence({ threadId:"thr_self", experienceStore:store(false),
    asOf:new Date(Date.parse(AT) + 3 * 3_600_000).toISOString() });
  assert.ok(later.depletion < stranger.depletion / 2, "hours apart did not restore the battery");
});

test("a run of messages tires the battery and eases hunger, and the Thread still chooses whether to reply", async () => {
  const situations = [
    { threadId:"thr_writer", situationId:"sit_morning", establishedAt:minutesBefore(10 * 60) },
    { threadId:"thr_writer", situationId:"sit_now", establishedAt:minutesBefore(5 * 60) },
  ];
  const livedNowStore = { getPreviousSituation:(threadId, before) =>
    [...situations].reverse().find((item) => item.establishedAt < before) ?? null };
  const store = (messages) => ({
    listSocialInteractions:() => [], listAcceptedHumanMeetings:() => [], listReciprocalConversations:() => [],
    listSharedContactTimes:() => [],
    listSocialExposures:() => messages,
  });
  const run = Array.from({ length:8 }, (_, index) => ({ kind:"message", ref:`msg_${index}`,
    at:minutesBefore(5 * (index + 1)), turns:1, otherThreadId:"thr_friend" }));
  const thread = { ...bodyOf(), threadId:"thr_writer" };
  const frame = (messages) => livedRegulationForLivedHistory({ thread, livedNowStore, currentSituation:situations[1],
    experienceStore:store(messages), asOf:AT });
  const quiet = frame([]), busy = frame(run);
  const pressure = (value, family) => value.drives.find((item) => item.family === family)?.pressure ?? 0;
  assert.ok(pressure(busy, "social_contact") < pressure(quiet, "social_contact"), "messages did not ease the want of company");
  assert.ok(pressure(busy, "social_energy") > 0, "a run of messages cost the Body nothing");

  const body = feltSocialBody(busy);
  assert.ok(body.length > 0, "the Body's state did not reach words");
  let seen = null;
  const decision = await decideLaterContact({
    thread:{ threadId:"thr_writer", identity:{ name:"Writer" }, currentState:{ selfModel:"I write back.", unresolvedIntentions:[] } },
    afterthoughts:[{ kind:"question", text:"Did she mean the second chapter?" }],
    candidates:[{ partyId:"thr_friend", recipientKind:"thread", displayName:"Friend", relationKind:"social_contact" }],
    body,
    modelAdapter:{ async invoke({ input }) {
      seen = input;
      return { output:{ decision:"keep_private", recipientPartyId:null, reason:"I have written enough today." } };
    } },
  });
  assert.deepEqual(seen.body, body, "the contact choice did not feel the Body");
  assert.equal(decision.decision, "keep_private", "the Thread's own choice was overridden");
});

test("each live turn feels the talk so far, so a long conversation can tire the one speaking", async () => {
  const thread = (threadId, name) => ({ threadId, version:1, identity:{ name },
    currentState:{ selfModel:`I am ${name}.`, unresolvedIntentions:[] },
    genome:{ runtimeBaselines:{}, urgeProjection:[locus("social_energy_04")] } });
  const context = (self, other) => ({ thread:self,
    situation:{ situationId:`sit_${self.threadId}`, threadId:self.threadId, establishedAt:AT, activity:"Talking." },
    perspective:{ developedSelfEvidence:[], placeName:"the library",
      counterparts:[{ threadId:other.threadId, name:other.identity.name, appearance:"a reader", noticedBefore:[] }] },
    feltBody:(story) => feltSocialBody(socialBodyInConversation({ thread:self, start:null, familiarity:0, asOf:AT,
      turns:story.beats.filter((beat) => beat.kind === "utterance").length })) });
  const mina = thread("thr_talk_mina", "Mina"), noor = thread("thr_talk_noor", "Noor");
  const felt = [];
  let turns = 0;
  await runThreadLiveSocialEncounter({
    initiator:context(mina, noor), counterparty:context(noor, mina),
    request:{ initiatorThreadId:mina.threadId, text:"Have you read this one?" },
    stance:{ decision:"accept", expression:null, suggestedAt:null, reason:"Yes." },
    modelAdapter:{ async invoke() { throw new Error("no structured call"); },
      async *streamExpression(call) {
        felt.push(call.input.liveInteraction.body ?? []);
        turns += 1;
        yield { type:"expression_delta", text:turns < 14 ? `SAY: Turn ${turns}.` : "SILENT" };
        yield { type:"expression_complete", provenance:{ provider:"fixture", modelId:"fixture" } };
      } },
  });
  assert.equal(felt[0].length, 0, "a fresh Body felt worn before talking");
  assert.ok(felt.at(-1).length > 0, "a long talk never reached the speaker's body");
});
