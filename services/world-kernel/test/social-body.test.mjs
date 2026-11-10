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
const stranger = { knowing:0, staleness:0, trust:0 };
const talks = (daysAgo) => daysAgo.map((n) => ({ at:minutesBefore(60 * 24 * n), kind:"conversation", turns:10 }));
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
    listSharedContact:() => familiar ? talks([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) : [],
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
    listSharedContact:() => [], listPairActs:() => [],
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
    feltBody:(story) => feltSocialBody(socialBodyInConversation({ thread:self, start:null, regard:{ knowing:0.6, staleness:0, trust:0.8 },
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
  const store = (known) => ({ listSharedContact:() => known ? talks([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) : [],
    listPairActs:() => [] });
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

test("trust is reduced expected harm: kept faith makes talk drain less, broken faith more", async () => {
  const { regardOf, exposureCost } = await import("../src/social-body.mjs");
  const store = ({ contacts = 2, acts = [] } = {}) => ({
    listSharedContact:() => talks(Array.from({ length:contacts }, (_, i) => 2 + i)),
    listPairActs:() => acts.map(([kind, by = "thr_other"]) => ({ kind, actorThreadId:by, occurredAt:minutesBefore(60 * 24) })),
  });
  const regard = (value, orientation = null) => regardOf({ experienceStore:value, threadId:"thr_self",
    otherThreadId:"thr_other", at:AT, trustLocus:orientation === null ? null : { orientation, persistence:0 } });
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
});

test("a stranger meets some guard, a trusted friend none, and one who let it down is guarded again", async () => {
  const { bodyTowardPeople } = await import("../src/lived-now-regulation.mjs");
  const thread = { ...bodyOf(), threadId:"thr_self" };
  const day = (n) => minutesBefore(60 * 24 * n);
  const wariness = (contacts, acts = []) => bodyTowardPeople({ thread, asOf:AT,
    people:[{ threadId:"thr_other", evidenceRef:"sit_other" }],
    experienceStore:{ listSharedContact:() => talks(Array.from({ length:contacts }, (_, i) => i + 1)),
      listPairActs:() => acts.map((kind) => ({ kind, actorThreadId:"thr_other", occurredAt:day(1) })) },
  }).drives.find((item) => item.family === "trust");
  assert.ok(wariness(0).felt, "a stranger was met with no guard at all");
  assert.equal(wariness(12, ["kept", "accepted"]).felt, false, "a trusted friend was still felt as a risk");
  assert.ok(wariness(12, ["broken", "broken", "declined"]).felt, "being let down left no wariness");
});

const regardWith = async ({ contacts, acts = [], persistence = 0 }) => {
  const { regardOf } = await import("../src/social-body.mjs");
  return regardOf({ threadId:"thr_self", otherThreadId:"thr_other", at:AT,
    trustLocus:{ orientation:null, persistence },
    experienceStore:{ listSharedContact:() => contacts,
      listPairActs:() => acts.map(([kind, daysAgo]) => ({ kind, actorThreadId:"thr_other",
        occurredAt:minutesBefore(60 * 24 * daysAgo) })) } });
};
const friendship = (from) => talks(Array.from({ length:12 }, (_, i) => from + 3 * i));

test("an old friend after six months is still known and trusted, and only out of date with", async () => {
  const { exposureCost } = await import("../src/social-body.mjs");
  const recent = await regardWith({ contacts:friendship(1) });
  const apart = await regardWith({ contacts:friendship(180) });
  const stranger = await regardWith({ contacts:[] });
  assert.ok(apart.knowing > 0.9, "a friend was forgotten in months");
  assert.equal(apart.trust, recent.trust, "trust faded with absence");
  assert.ok(apart.staleness > 0.9 && recent.staleness < 0.1, "time apart did not leave one out of date");
  assert.ok(exposureCost(apart) < exposureCost(stranger) / 4, "an old friend cost nearly as much as a stranger");

  const { bodyTowardPeople } = await import("../src/lived-now-regulation.mjs");
  const seeker = { ...bodyOf("exploration_07"), threadId:"thr_self" };
  const catchUp = (contacts) => bodyTowardPeople({ thread:seeker, asOf:AT,
    people:[{ threadId:"thr_other", evidenceRef:"sit_other" }],
    experienceStore:{ listSharedContact:() => contacts, listPairActs:() => [] },
  }).drives.find((item) => item.family === "exploration");
  assert.equal(catchUp(friendship(180))?.catchingUp, true, "a long-unseen friend drew no wish to catch up");
  assert.equal(catchUp(friendship(1)), undefined, "a friend seen yesterday was felt as unknown");
});

test("time forgives a trivial harm, not a serious one, and a harm weighs more from a friend and when repeated", async () => {
  const plain = await regardWith({ contacts:friendship(1) });
  const declined = await regardWith({ contacts:friendship(1), acts:[["declined", 15]] });
  const closed = await regardWith({ contacts:friendship(1), acts:[["closed", 700]] });
  assert.ok(declined.trust > 0.98 * plain.trust, "a declined invitation was still held after two weeks");
  assert.ok(closed.trust < 0.9 * plain.trust && closed.hurt > 0, "a closed door was forgotten by time alone");

  const byStranger = await regardWith({ contacts:talks([3]), acts:[["broken", 2]] });
  const byFriend = await regardWith({ contacts:friendship(3), acts:[["broken", 2]] });
  assert.ok(byFriend.hurt > byStranger.hurt, "a friend's broken promise hurt no more than a stranger's");

  const once = await regardWith({ contacts:friendship(1), acts:[["broken", 2]] });
  const twice = await regardWith({ contacts:friendship(1), acts:[["broken", 100], ["broken", 2]] });
  const afterOther = await regardWith({ contacts:friendship(1), acts:[["closed", 300], ["broken", 2]] });
  assert.ok(twice.hurt > once.hurt, "a second broken promise weighed no more than the first");
  assert.ok(twice.hurt > afterOther.hurt, "a repeated harm weighed no more than one after an old harm of another kind");
  assert.equal(twice.revived, true, "the second broken promise did not bring back the first");
});

test("how fast a Body forgives is inherited, and later kept faith heals the healable part, never the scar", async () => {
  const forgiving = await regardWith({ contacts:friendship(20), acts:[["broken", 10]], persistence:-0.9 });
  const unforgiving = await regardWith({ contacts:friendship(20), acts:[["broken", 10]], persistence:0.9 });
  assert.ok(forgiving.hurt < unforgiving.hurt / 2, "the inherited pace of forgiving made no difference");

  const kept = [["kept", 15], ["kept", 10], ["kept", 5]];
  const fresh = await regardWith({ contacts:friendship(30), acts:[["broken", 20]] });
  const mended = await regardWith({ contacts:friendship(30), acts:[["broken", 20], ...kept] });
  assert.ok(mended.hurt < fresh.hurt, "kept faith afterward healed nothing");
  const scar = await regardWith({ contacts:friendship(1), acts:[["closed", 400]] });
  const scarKept = await regardWith({ contacts:friendship(1), acts:[["closed", 400], ...kept] });
  assert.ok(scarKept.hurt > 0 && Math.abs(scarKept.hurt - scar.hurt) < 0.001, "good conduct healed a scar");
});

test("a new harm brings back an old one of the same kind, and the Body feels it; a small one barely stirs an old wound", async () => {
  const healed = await regardWith({ contacts:friendship(1), acts:[["broken", 100]] });
  const again = await regardWith({ contacts:friendship(1), acts:[["broken", 100], ["broken", 1]] });
  const trivial = await regardWith({ contacts:friendship(1), acts:[["closed", 300], ["declined", 1]] });
  assert.ok(healed.hurt < 0.01, "a broken promise was not healed after months");
  assert.equal(again.revived, true, "a second broken promise did not bring back the first");
  assert.equal(trivial.revived, false, "a small slight was felt as bringing back an old wound");

  const { bodyTowardPeople } = await import("../src/lived-now-regulation.mjs");
  const { feltTowardPeople } = await import("../src/interoceptive-cognition.mjs");
  const thread = { ...bodyOf(), threadId:"thr_self" };
  const felt = (acts) => feltTowardPeople(bodyTowardPeople({ thread, asOf:AT,
    people:[{ threadId:"thr_other", evidenceRef:"sit_other" }],
    experienceStore:{ listSharedContact:() => friendship(1),
      listPairActs:() => acts.map(([kind, daysAgo]) => ({ kind, actorThreadId:"thr_other",
        occurredAt:minutesBefore(60 * 24 * daysAgo) })) } })).get("thr_other") ?? [];
  assert.ok(felt([["broken", 100], ["broken", 1]]).length > felt([["broken", 1]]).length,
    "the return of an old hurt did not reach the Body's words");
});

const bondedStore = ({ contacts, acts = [], doors = ["contact", "conversation", "time"] }) => ({
  listSharedContact:() => contacts, listOpenDoors:() => doors,
  listPairActs:() => acts.map(([kind, daysAgo]) => ({ kind, actorThreadId:"thr_other",
    occurredAt:minutesBefore(60 * 24 * daysAgo) })),
});
const missing = async (thread, store, present = true) => {
  const { bodyTowardPeople } = await import("../src/lived-now-regulation.mjs");
  return bodyTowardPeople({ thread, asOf:AT, experienceStore:store,
    people:[{ threadId:"thr_other", evidenceRef:"sit_other", present }] });
};
const attachment = (frame) => frame.drives.find((item) => item.family === "attachment_proximity");

test("seeing a bonded friend again is a joy in proportion to the missing, and a stranger is never missed", async () => {
  const { feltTowardPeople } = await import("../src/interoceptive-cognition.mjs");
  const { evaluateSalience } = await import("../src/salience-gate.mjs");
  const thread = { ...bodyOf("attachment_proximity_01"), threadId:"thr_self" };
  const week = await missing(thread, bondedStore({ contacts:friendship(7) }));
  const yesterday = await missing(thread, bondedStore({ contacts:friendship(1) }));
  assert.ok(attachment(week).attained && attachment(week).pressure > attachment(yesterday).pressure,
    "a friend unseen for a week was no more welcome than one seen yesterday");
  assert.ok(feltTowardPeople(week).get("thr_other").length > (feltTowardPeople(yesterday).get("thr_other") ?? []).length,
    "the joy of seeing a missed friend did not reach the Body's words");
  const gate = evaluateSalience({ opportunity:{ kind:"actor_presence", subjectRefs:["thr_other"] },
    situatedPercept:{ observerThreadId:"thr_self", setting:{ mode:"co_present", participantRefs:[] }, recentEvents:[], observed:[] },
    regulationFrame:week });
  assert.ok(gate.anchors.includes("reunion_with_missed_person"), "a missed friend was not worth considering");

  assert.equal(attachment(await missing(thread, bondedStore({ contacts:[], doors:[] }))), undefined, "a stranger was missed");
  assert.equal(attachment(await missing(thread, bondedStore({ contacts:talks([30]), doors:["conversation"] }))).pressure < 0.05, true,
    "a passing acquaintance was missed like a friend");
});

test("apart, a friend is missed by what the Body longs for: a message answers longing for the exchange, not for presence", async () => {
  const contacts = [...talks([8, 11, 14, 17, 20, 23]), { at:minutesBefore(60 * 24), kind:"message", turns:1 }];
  const exchange = await missing({ ...bodyOf("attachment_proximity_03"), threadId:"thr_self" }, bondedStore({ contacts }), false);
  const presence = await missing({ ...bodyOf("attachment_proximity_04"), threadId:"thr_self" }, bondedStore({ contacts }), false);
  assert.equal(attachment(presence).attained, false, "an absent friend was felt as found");
  assert.ok(attachment(exchange).pressure < attachment(presence).pressure / 2,
    "yesterday's message eased longing for presence as much as longing for the exchange");
});

test("a friend who wronged one is missed and guarded at once", async () => {
  const { feltTowardPeople } = await import("../src/interoceptive-cognition.mjs");
  const thread = { ...bodyOf("attachment_proximity_01"), threadId:"thr_self" };
  const wronged = await missing(thread, bondedStore({ contacts:friendship(7), acts:[["broken", 6]] }));
  const trust = wronged.drives.find((item) => item.family === "trust");
  assert.ok(attachment(wronged).attained && attachment(wronged).pressure > 0, "a friend who let one down was not missed at all");
  assert.ok(trust.felt && trust.hurt > 0, "seeing them again washed out the hurt");
  assert.ok(feltTowardPeople(wronged).get("thr_other").length >= 3, "the mixed feeling did not reach words");
});

test("longing for a light bond settles into fond memory over months, for a deep one it stays", async () => {
  const { longingOf } = await import("../src/social-body.mjs");
  const after = (bond, days) => longingOf({ bond, regard:{ apartDays:days, apartInPersonDays:days } }) / bond;
  assert.ok(after(0.3, 90) < after(0.3, 10) / 3, "a light bond was missed as much after months as after days");
  assert.ok(after(0.95, 90) > after(0.95, 10) * 0.8, "a deep bond faded into memory like a light one");
});
