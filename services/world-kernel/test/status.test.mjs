import assert from "node:assert/strict";
import test from "node:test";

import { URGE_FAMILY_BY_NAME } from "#core/src/inherited-urges.mjs";
import { DEFAULT_ORGANISM_POLICY } from "#core/src/organism-policy.mjs";
import { feltTowardPeople, feltSocialBody } from "../src/interoceptive-cognition.mjs";
import { bodyTowardPeople, configureWorldOrganismPolicy, livedRegulationForLivedHistory, socialBodyBeforeTalk,
  socialBodyInConversation } from "../src/lived-now-regulation.mjs";
import { runThreadLiveSocialEncounter } from "../src/lived-social-live-encounter.mjs";
import { regardOf, selfStanding } from "../src/social-body.mjs";

const AT = "2026-11-12T12:00:00.000Z";
const SELF = "thr_self", OTHER = "thr_other";
const minutesBefore = (minutes) => new Date(Date.parse(AT) - minutes * 60_000).toISOString();
const locus = (variantId) => {
  const family = URGE_FAMILY_BY_NAME.get(variantId.replace(/_\d+$/u, ""));
  const variant = family.variants.find((item) => item.variantId === variantId);
  return { family:family.family, kind:family.kind, orientation:variant.orientation, positions:variant.positions };
};
const body = (...variantIds) => ({ threadId:SELF, genome:{ runtimeBaselines:{}, urgeProjection:variantIds.map(locus) } });
// Regard as this Thread perceived it, oldest first, a day apart, the newest
// half an hour ago: [act, by, witnesses, person].
const records = (items) => items.map(([act, by, witnesses = 0, person = OTHER], index) => ({
  regardId:`reg_${index}`, personThreadId:person, act, actorThreadId:by === "me" ? SELF : person, account:"As I saw it.",
  evidenceRefs:[`exp_${index}`], sourceRef:`con_${index}`, witnesses,
  asOf:minutesBefore(30 + (items.length - 1 - index) * 60 * 24),
})).reverse();
const store = (items) => {
  const all = records(items);
  return {
    listSharedContact:() => Array.from({ length:10 }, (_, i) => ({ at:minutesBefore(60 * 24 * (i + 1)), kind:"conversation", turns:8 })),
    listPairActs:() => [], listOpenDoors:() => ["conversation"], listSocialExposures:() => [],
    listPerceivedRegard:(threadId, person) => all.filter((item) => item.personThreadId === person),
    listRecentPerceivedRegard:() => all,
  };
};
const toward = (thread, items) => bodyTowardPeople({ thread, asOf:AT, experienceStore:store(items),
  people:[{ threadId:OTHER, evidenceRef:"sit_other" }] });
const drive = (frame, family, target = `person:${OTHER}`) =>
  frame.drives.find((item) => item.family === family && item.targetRef === target);

test("the same public correction stings far more from someone this Body feels below it than from one above it, and points at them", () => {
  const thread = body("standing_09", "standing_flare_03");
  const fromBelow = toward(thread, [...Array(10).fill(["gave_way", "them"]), ["corrected_publicly", "them", 3]]);
  const fromAbove = toward(thread, [...Array(10).fill(["gave_way", "me"]), ["corrected_publicly", "them", 3]]);
  const sting = (frame) => drive(frame, "standing_flare")?.pressure ?? 0;
  assert.ok(sting(fromBelow) > 1.5 * sting(fromAbove), "a correction stung as much from someone looked up to");
  assert.equal(drive(fromBelow, "standing_flare").triggerKind, "public_correction");
  assert.ok(feltTowardPeople(fromBelow).get(OTHER).length > 0, "the sting did not reach the Body's words");
});

test("the same history reads differently by what standing means to a Body", () => {
  const history = Array.from({ length:6 }, (_, i) => [i % 2 === 0 ? "asked_advice" : "held_ground", "them"]);
  const status = (variantId) => regardOf({ experienceStore:store(history), threadId:SELF, otherThreadId:OTHER, at:AT,
    standingLocus:{ orientation:locus(variantId).orientation, persistence:0, selfRegard:0 } }).status;
  assert.ok(status("standing_07") < 0, "a competence Body did not feel the advice-seeker below it");
  assert.ok(status("standing_06") > 0, "a deference Body did not feel the one who held ground above it");
});

test("treated ordinarily, a proud stubborn Body stays frustrated, a proud reasonable one comes near calm, and a modest one is gratified", () => {
  // Ordinary regard from two people, ten days each.
  const ordinary = ["thr_a", "thr_b"].flatMap((person) => Array.from({ length:10 }, () => ["ordinary", "them", 0, person]));
  const place = (variantId) => {
    const standing = locus(variantId);
    return selfStanding({ experienceStore:store(ordinary), threadId:SELF, at:AT,
      standingLocus:{ orientation:standing.orientation, persistence:0, selfRegard:standing.positions.selfRegard,
        stubbornness:standing.positions.stubbornness } });
  };
  const stubborn = place("standing_01"), reasonable = place("standing_06"), modest = place("standing_03");
  assert.ok(stubborn.gap < -0.15, "a proud stubborn Body treated ordinarily was not frustrated");
  assert.ok(Math.abs(reasonable.gap) < Math.abs(stubborn.gap) && Math.abs(reasonable.gap) <= 0.15,
    "a proud reasonable Body did not come near calm");
  assert.ok(modest.gap > 0.15, "a modest Body treated ordinarily was not gratified");
  const situation = { threadId:SELF, situationId:"sit_now", establishedAt:AT };
  const words = (variantId) => feltSocialBody(livedRegulationForLivedHistory({ thread:body(variantId), asOf:AT,
    livedNowStore:{ getPreviousSituation:() => null }, currentSituation:situation,
    experienceStore:{ ...store(ordinary), listSocialInteractions:() => [], listAcceptedHumanMeetings:() => [],
      listReciprocalConversations:() => [], listSocialExposures:() => [] } }));
  assert.notDeepEqual(words("standing_01"), words("standing_03"), "frustration and gratification felt the same");
});

test("a Body that keeps giving way comes to feel the other above it, and a pull to hold its own", () => {
  const frame = toward(body("standing_06"), Array(8).fill(["gave_way", "me"]));
  const standing = drive(frame, "standing");
  assert.ok(standing.status >= 0.5 && standing.pressure > 0, "giving way taught the Body nothing about where it stands");
  assert.ok(feltTowardPeople(frame).get(OTHER).length >= 1, "where it stands did not reach words");
});

test("credit warms from someone looked up to, where the same credit from someone below is only expected", () => {
  const thread = body("standing_06");
  const fromAbove = toward(thread, [...Array(6).fill(["gave_way", "me"]), ["credited", "them"]]);
  const fromBelow = toward(thread, [...Array(6).fill(["gave_way", "them"]), ["credited", "them"]]);
  assert.equal(drive(fromAbove, "standing").attained, true, "credit from someone looked up to did not warm");
  assert.equal(drive(fromBelow, "standing").attained, false, "credit that was expected felt like recognition");
});

test("status does not fade with absence, and changes only as it is lived differently", () => {
  const order = Array(10).fill(["gave_way", "them"]);
  const status = (items, at) => regardOf({ experienceStore:store(items), threadId:SELF, otherThreadId:OTHER, at,
    standingLocus:null }).status;
  assert.equal(status(order, "2027-05-12T12:00:00.000Z"), status(order, AT), "an order faded with time apart");
  assert.ok(status([...order, ...Array(30).fill(["gave_way", "me"])], AT) > 0, "a new way of living together did not change it");
});

test("a morning of messages weighs as one episode: the same act repeated within a day sets no stronger an order", () => {
  const status = (asOfs) => regardOf({ experienceStore:{ ...store([]),
    listPerceivedRegard:() => asOfs.map((asOf, i) => ({ regardId:`reg_${i}`, personThreadId:OTHER, act:"asked_advice",
      actorThreadId:OTHER, witnesses:0, asOf })).reverse() }, threadId:SELF, otherThreadId:OTHER, at:AT }).status;
  const once = status([minutesBefore(30)]);
  const morning = status([240, 180, 120, 60, 30].map(minutesBefore));
  const days = status([4, 3, 2, 1, 0].map((day) => minutesBefore(30 + day * 60 * 24)));
  assert.equal(morning, once, "five messages in a morning set a stronger order than one");
  assert.ok(days < once, "the same act lived on separate days did not build an order");
});

test("a private slight hurts and yet builds trust; before others it breaks trust and costs standing", () => {
  const regard = (witnesses) => regardOf({ experienceStore:store([["corrected", "them", witnesses]]), threadId:SELF,
    otherThreadId:OTHER, at:AT });
  const none = regardOf({ experienceStore:store([]), threadId:SELF, otherThreadId:OTHER, at:AT });
  const privately = regard(0), publicly = regard(3);
  assert.ok(privately.hurt > 0, "a private slight left no resentment");
  assert.ok(publicly.hurt > privately.hurt && publicly.trust < privately.trust, "a public slight cost no more than a private one");
  const later = (items) => regardOf({ experienceStore:store(items), threadId:SELF, otherThreadId:OTHER,
    at:"2026-12-12T12:00:00.000Z" }).trust;
  assert.ok(later([["corrected", "them", 0]]) > later([]), "once the sting healed, being spared left no more trust");
  const self = (witnesses) => selfStanding({ experienceStore:store([["corrected", "them", witnesses]]), threadId:SELF, at:AT }).self;
  assert.ok(self(3) < self(0), "a slight before witnesses cost no standing");
});

test("with inherited spread at zero, every Body feels status the species way", () => {
  configureWorldOrganismPolicy({ ...DEFAULT_ORGANISM_POLICY, inheritedSpread:0 });
  try {
    const history = [...Array(3).fill(["asked_advice", "them"]), ...Array(3).fill(["held_ground", "them"])];
    const status = (variantId) => drive(toward(body(variantId), history), "standing")?.status ?? 0;
    assert.equal(status("standing_07"), status("standing_06"), "inherited differences acted with spread at zero");
  } finally { configureWorldOrganismPolicy(DEFAULT_ORGANISM_POLICY); }
});

// ---- Asserting standing, and the slights it leaves (C3b) ----

test("how one is treated and the self-view one holds are separate: a stubborn Body keeps its view where a reasonable one revises it", () => {
  // Left out, again and again: an act neither Body's orientation weighs more.
  const history = Array(10).fill(["left_out", "them"]);
  const regard = (variantId) => {
    const standing = locus(variantId);
    return regardOf({ experienceStore:store(history), threadId:SELF, otherThreadId:OTHER, at:AT,
      standingLocus:{ orientation:standing.orientation, persistence:0, selfRegard:standing.positions.selfRegard,
        stubbornness:standing.positions.stubbornness } });
  };
  const stubborn = regard("standing_01"), reasonable = regard("standing_06");
  assert.equal(stubborn.treated, reasonable.treated, "the world's answer depended on the Body hearing it");
  assert.ok(Math.abs(stubborn.status - stubborn.treated) > 2 * Math.abs(reasonable.status - reasonable.treated),
    "a stubborn self-view was revised as far as a reasonable one");
});

test("an ordinary turn from someone a Body holds below it is a slight, felt at once; from someone it holds above it is not", () => {
  const thread = body("standing_06");
  const felt = (history) => {
    const before = socialBodyBeforeTalk({ thread, otherThreadId:OTHER, experienceStore:store(history), asOf:AT });
    return feltTowardPeople(socialBodyInConversation({ thread, ...before, turns:2, asOf:AT,
      other:{ threadId:OTHER, evidenceRef:"sit_other" }, heardNow:[{ act:"ordinary", witnesses:0 }] })).get(OTHER) ?? [];
  };
  const due = (lines) => lines.some((line) => line.includes("due"));
  assert.ok(due(felt(Array(8).fill(["credited", "them"]))), "ordinary regard from one who usually credits it did not grate");
  assert.ok(!due(felt(Array(8).fill(["gave_way", "me"]))), "ordinary regard from one it looks up to grated");
});

test("each turn may privately say how the other's last words treated the Thread; it is heard, never spoken", async () => {
  const thread = (threadId, name) => ({ threadId, version:1, identity:{ name },
    currentState:{ selfModel:`I am ${name}.`, unresolvedIntentions:[] }, genome:{ runtimeBaselines:{}, urgeProjection:[] } });
  const heard = [];
  const context = (self, other) => ({ thread:self,
    situation:{ situationId:`sit_${self.threadId}`, threadId:self.threadId, establishedAt:AT, activity:"Talking." },
    perspective:{ developedSelfEvidence:[], placeName:"the library",
      counterparts:[{ threadId:other.threadId, name:other.identity.name, appearance:"a reader", noticedBefore:[] }] },
    onHeard:(act) => heard.push([self.threadId, act]) });
  const mina = thread("thr_heard_mina", "Mina"), noor = thread("thr_heard_noor", "Noor");
  const lines = ["engaged none SAY: That caption overstates it.", "absorbed corrected SAY: No, it is exactly right.", "SILENT"];
  let turns = 0;
  const result = await runThreadLiveSocialEncounter({
    initiator:context(mina, noor), counterparty:context(noor, mina),
    request:{ initiatorThreadId:mina.threadId, text:"Look at this caption." },
    stance:{ decision:"accept", expression:null, suggestedAt:null, reason:"Yes." },
    modelAdapter:{ async invoke() { throw new Error("no structured call"); },
      async *streamExpression() {
        yield { type:"expression_delta", text:lines[Math.min(turns++, lines.length - 1)] };
        yield { type:"expression_complete", provenance:{ provider:"fixture", modelId:"fixture" } };
      } },
  });
  assert.deepEqual(heard.map(([, act]) => act), ["corrected"], "how the other's words landed was lost, or nothing was invented");
  assert.ok(result.story.beats.every((beat) => !/corrected|engaged|absorbed|\bnone\b/iu.test(beat.text ?? "")),
    "a private reading was spoken aloud");
});

// ---- Frustration, and stings that fade (body levels B2) ----

const standingOf = (variantId) => {
  const standing = locus(variantId);
  return { orientation:standing.orientation, persistence:standing.positions.persistence,
    selfRegard:standing.positions.selfRegard, stubbornness:standing.positions.stubbornness };
};
// Ordinary regard from two people for ten days, then whatever happened last, at
// its own time; read at a moment.
const lived = (last, { declined = false } = {}) => {
  const ordinary = records(["thr_a", "thr_b"].flatMap((person) =>
    Array.from({ length:10 }, () => ["ordinary", "them", 0, person])));
  const fresh = last.map(([act, hours, witnesses = 0], i) => ({ regardId:`reg_fresh_${i}`, personThreadId:"thr_a", act,
    actorThreadId:"thr_a", witnesses, asOf:minutesBefore(hours * 60) }));
  const all = [...fresh, ...ordinary];
  return { ...store([]), listRecentPerceivedRegard:() => all,
    listPerceivedRegard:(threadId, person) => all.filter((item) => item.personThreadId === person),
    listSocialInteractions:() => declined ? [{ initiatorThreadId:SELF, recipientThreadId:"thr_a",
      responseDecision:"decline", occurredAt:minutesBefore(60) }] : [] };
};
const frustration = (variantId, experienceStore, hoursLater = 0) => selfStanding({ experienceStore, threadId:SELF,
  at:new Date(Date.parse(AT) + hoursLater * 3_600_000).toISOString(), standingLocus:standingOf(variantId) }).frustration;

test("a sting spikes frustration, which fades back to the baseline: low for a calm Body, high for a stubborn one with a grievance", () => {
  const stung = lived([["corrected_publicly", 1, 2]]);
  const calm = frustration("standing_06", stung), stubborn = frustration("standing_01", stung);
  assert.ok(calm.level > calm.baseline + 0.2 && stubborn.level > stubborn.baseline + 0.2, "the sting did not spike frustration");
  const calmLater = frustration("standing_06", stung, 24 * 8), stubbornLater = frustration("standing_01", stung, 24 * 8);
  assert.ok(calmLater.level < 0.1, "a calm Body did not return to a low baseline");
  assert.ok(stubbornLater.level >= 0.3 && stubbornLater.level === stubbornLater.baseline,
    "a stubborn Body with a grievance did not return to its high baseline");
  const praised = frustration("standing_01", lived([["credited", 1]]));
  assert.ok(praised.level < frustration("standing_01", lived([])).level, "praise did not lower frustration");
  const afterPraise = frustration("standing_01", lived([["credited", 1]]), 24 * 8);
  assert.equal(afterPraise.level, afterPraise.baseline, "after praise it did not return to its baseline");
});

test("an approach turned down spikes frustration too", () => {
  assert.ok(frustration("standing_06", lived([], { declined:true })).level > frustration("standing_06", lived([])).level,
    "being turned down left no frustration");
});

test("frustration is less patience with anyone: every turn costs more, and the Body says so", () => {
  const stung = lived([["corrected_publicly", 1, 2]]);
  const thread = body("standing_01");
  const before = socialBodyBeforeTalk({ thread, otherThreadId:"thr_c", experienceStore:stung, asOf:AT });
  const calmBefore = socialBodyBeforeTalk({ thread, otherThreadId:"thr_c", experienceStore:lived([]), asOf:AT });
  const talk = (start) => socialBodyInConversation({ thread, ...start, turns:10, asOf:AT,
    other:{ threadId:"thr_c", evidenceRef:"sit_c" } });
  const spent = (frame) => frame.drives.find((item) => item.family === "social_energy")?.pressure ?? 0;
  assert.ok(spent(talk(before)) > spent(talk(calmBefore)), "frustration did not make talk with someone else cost more");
  assert.ok(feltSocialBody(talk(before)).some((line) => /patience|under your skin/u.test(line)),
    "frustration did not reach the Body's words in talk with someone who did nothing");
});

test("a sting lasts as long as this Body holds such things: a day later a persistent Body still feels it, a fleeting one not", () => {
  const stung = (variantId) => {
    const experienceStore = lived([["corrected_publicly", 24, 2]]);
    return bodyTowardPeople({ thread:body(variantId, "standing_flare_03"), asOf:AT, experienceStore,
      people:[{ threadId:"thr_a", evidenceRef:"sit_a" }] });
  };
  const flare = (frame) => frame.drives.find((item) => item.family === "standing_flare")?.pressure ?? 0;
  assert.ok(flare(stung("standing_04")) > 0, "a persistent Body no longer felt yesterday's public correction");
  assert.equal(flare(stung("standing_07")), 0, "a fleeting Body still felt yesterday's public correction");
});
