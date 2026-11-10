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
const stranger = { familiarity:0, trust:0 };
const other = { threadId:"thr_other", evidenceRef:"sit_other_here" };

test("the same talk tires two inherited Bodies differently, each pulled toward its own kind of rest", () => {
  // Inherited: talk costs much and is felt early, and quiet company restores it;
  // against: talk costs little, and livelier company restores it.
  const costly = bodyOf("social_energy_04");
  const light = bodyOf("social_energy_01");
  const firstFelt = (thread) => {
    for (let turns = 1; turns <= 24; turns += 1) {
      const drive = battery(socialBodyInConversation({ thread, start:null, regard:stranger, other, turns, asOf:AT }));
      if (drive.felt) return { turns, direction:drive.inheritedDirection };
    }
    return { turns:Infinity, direction:null };
  };
  const a = firstFelt(costly), b = firstFelt(light);
  assert.ok(a.turns < b.turns, "a costly battery was not felt sooner than a light one");
  assert.equal(a.direction, "quiet_company");
  assert.equal(b.direction, "company");
  const at12 = (thread) => battery(socialBodyInConversation({ thread, start:null, regard:stranger, other, turns:12, asOf:AT })).pressure;
  assert.ok(at12(costly) > at12(light), "the same twelve turns weighed the same on both Bodies");
});

test("talk with a familiar person drains less than with a stranger, and time apart restores", () => {
  const store = (familiar) => ({
    listSocialExposures:() => [{ kind:"conversation", ref:"story_talk", at:minutesBefore(30), turns:16,
      otherThreadId:"thr_other" }],
    listSharedContactTimes:() => familiar ? Array.from({ length:10 }, (_, day) => minutesBefore(60 * 24 * (day + 1))) : [],
    listPairActs:() => [],
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
    listSharedContactTimes:() => [], listPairActs:() => [],
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
    feltBody:(story) => feltSocialBody(socialBodyInConversation({ thread:self, start:null, regard:{ familiarity:0.6, trust:0.8 },
      other:{ threadId:other.threadId, evidenceRef:`sit_${other.threadId}` }, asOf:AT,
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

test("someone new draws a Body inherited to seek new people, not one oriented elsewhere, and the pull fades as they become known", async () => {
  const { bodyTowardPeople } = await import("../src/lived-now-regulation.mjs");
  const { feltTowardPeople } = await import("../src/interoceptive-cognition.mjs");
  const { evaluateSalience } = await import("../src/salience-gate.mjs");
  const store = (known) => ({ listSharedContactTimes:() => known
    ? Array.from({ length:10 }, (_, day) => minutesBefore(60 * 24 * (day + 1))) : [], listPairActs:() => [] });
  const seeker = { ...bodyOf("exploration_07"), threadId:"thr_seeker" };
  const homebody = { ...bodyOf("exploration_01"), threadId:"thr_homebody" };
  const people = [{ threadId:"thr_stranger", evidenceRef:"sit_stranger_here" }];
  const frame = (thread, known = false) => bodyTowardPeople({ thread, people, experienceStore:store(known), asOf:AT });
  const curiosity = (value) => value.drives.find((item) => item.family === "exploration");

  assert.ok(curiosity(frame(seeker)).felt && curiosity(frame(seeker)).inheritedDirection === "people",
    "a people-seeking Body felt no pull toward a stranger");
  assert.ok(feltTowardPeople(frame(seeker)).get("thr_stranger").length >= 1);
  assert.equal(curiosity(frame(homebody)).inheritedDirection, "places", "a Body oriented to new places was drawn to the person");
  assert.equal(curiosity(frame(seeker, true)), undefined, "a well-known person still counted as new");

  const gate = (regulationFrame) => evaluateSalience({
    opportunity:{ kind:"actor_presence", subjectRefs:["thr_stranger"] },
    situatedPercept:{ observerThreadId:"thr_body", setting:{ mode:"co_present", participantRefs:[] },
      recentEvents:[], observed:[] },
    regulationFrame,
  });
  const curious = gate(frame(seeker));
  assert.equal(curious.outcome, "salient", "curiosity did not make the stranger worth considering");
  assert.ok(curious.anchors.includes("curious_about_unfamiliar_person"));
  assert.equal(gate(frame(homebody)).outcome, "background", "a Body not drawn to people was made to consider one");
});

test("trust is reduced expected harm: kept faith makes talk drain less, broken faith more, and it fades unlived", async () => {
  const { regardOf, exposureCost } = await import("../src/social-body.mjs");
  const day = (n) => minutesBefore(60 * 24 * n);
  const store = ({ contacts = 2, acts = [], age = 1 } = {}) => ({
    listSharedContactTimes:() => Array.from({ length:contacts }, (_, i) => day(age + i)),
    listPairActs:() => acts.map(([kind, by = "thr_other"]) => ({ kind, actorThreadId:by, occurredAt:day(age) })),
  });
  const regard = (value, trustOrientation = null) => regardOf({ experienceStore:value, threadId:"thr_self",
    otherThreadId:"thr_other", at:AT, trustOrientation });
  const cost = (value) => exposureCost(regard(value));
  const plain = store(), kept = store({ acts:[["kept"]] }), broken = store({ acts:[["broken"]] });
  assert.ok(cost(kept) < cost(plain), "a kept appointment did not make the next talk drain less");
  assert.ok(cost(broken) > cost(plain), "a broken appointment did not make the next talk drain more");
  assert.equal(regard(store({ acts:[["broken", "thr_self"]] })).trust, regard(plain).trust,
    "this Thread's own broken promise counted as harm done to it");

  // What counts as evidence of safety is inherited.
  const appointment = store({ contacts:0, acts:[["kept"]] }), company = store({ contacts:3 });
  assert.ok(regard(appointment, "reliability").trust > regard(appointment, "warmth").trust,
    "a reliability Body did not move more on a kept appointment");
  assert.ok(regard(company, "warmth").trust > regard(company, "reliability").trust,
    "a warmth Body did not move more on time spent together");

  assert.ok(regard(store({ age:60 })).trust < regard(plain).trust / 4, "trust did not fade without contact");
});

test("a stranger meets some guard, a trusted friend none, and one who let it down is guarded again", async () => {
  const { bodyTowardPeople } = await import("../src/lived-now-regulation.mjs");
  const thread = { ...bodyOf(), threadId:"thr_self" };
  const day = (n) => minutesBefore(60 * 24 * n);
  const wariness = (contacts, acts = []) => bodyTowardPeople({ thread, asOf:AT,
    people:[{ threadId:"thr_other", evidenceRef:"sit_other" }],
    experienceStore:{ listSharedContactTimes:() => Array.from({ length:contacts }, (_, i) => day(i + 1)),
      listPairActs:() => acts.map((kind) => ({ kind, actorThreadId:"thr_other", occurredAt:day(1) })) },
  }).drives.find((item) => item.family === "trust");
  assert.ok(wariness(0).felt, "a stranger was met with no guard at all");
  assert.equal(wariness(12, ["kept", "accepted"]).felt, false, "a trusted friend was still felt as a risk");
  assert.ok(wariness(12, ["broken", "broken", "declined"]).felt, "being let down left no wariness");
});
