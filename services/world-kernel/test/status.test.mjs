import assert from "node:assert/strict";
import test from "node:test";

import { URGE_FAMILY_BY_NAME } from "#core/src/inherited-urges.mjs";
import { DEFAULT_ORGANISM_POLICY } from "#core/src/organism-policy.mjs";
import { feltTowardPeople, feltSocialBody } from "../src/interoceptive-cognition.mjs";
import { bodyTowardPeople, configureWorldOrganismPolicy, livedRegulationForLivedHistory } from "../src/lived-now-regulation.mjs";
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
    listPairActs:() => [], listOpenDoors:() => ["conversation"],
    listPerceivedRegard:(threadId, person) => all.filter((item) => item.personThreadId === person),
    listRecentPerceivedRegard:() => all,
  };
};
const toward = (thread, items) => bodyTowardPeople({ thread, asOf:AT, experienceStore:store(items),
  people:[{ threadId:OTHER, evidenceRef:"sit_other" }] });
const drive = (frame, family, target = `person:${OTHER}`) =>
  frame.drives.find((item) => item.family === family && item.targetRef === target);

test("the same public correction stings far more from someone this Body feels below it than from one above it, and points at them", () => {
  const thread = body("standing_07", "standing_flare_03");
  const fromBelow = toward(thread, [...Array(6).fill(["gave_way", "them"]), ["corrected_publicly", "them", 3]]);
  const fromAbove = toward(thread, [...Array(6).fill(["gave_way", "me"]), ["corrected_publicly", "them", 3]]);
  const sting = (frame) => drive(frame, "standing_flare")?.pressure ?? 0;
  assert.ok(sting(fromBelow) > 1.5 * sting(fromAbove), "a correction stung as much from someone looked up to");
  assert.equal(drive(fromBelow, "standing_flare").triggerKind, "public_correction");
  assert.ok(feltTowardPeople(fromBelow).get(OTHER).length > 0, "the sting did not reach the Body's words");
});

test("the same history reads differently by what standing means to a Body", () => {
  const history = [...Array(3).fill(["asked_advice", "them"]), ...Array(3).fill(["held_ground", "them"])];
  const status = (variantId) => regardOf({ experienceStore:store(history), threadId:SELF, otherThreadId:OTHER, at:AT,
    standingLocus:{ orientation:locus(variantId).orientation, persistence:0, selfRegard:0 } }).status;
  assert.ok(status("standing_07") < 0, "a competence Body did not feel the advice-seeker below it");
  assert.ok(status("standing_06") > 0, "a deference Body did not feel the one who held ground above it");
});

test("treated alike, a Body that rates itself high is frustrated and one that rates itself low is gratified", () => {
  // Ordinary regard: credited as often as passed over, by two people.
  const ordinary = ["thr_a", "thr_b"].flatMap((person) =>
    Array.from({ length:10 }, (_, i) => [i % 2 === 0 ? "credited" : "overlooked", "them", 0, person]));
  const place = (variantId) => {
    const standing = locus(variantId);
    return selfStanding({ experienceStore:store(ordinary), threadId:SELF, at:AT,
      standingLocus:{ orientation:standing.orientation, persistence:0, selfRegard:standing.positions.selfRegard } });
  };
  const proud = place("standing_06"), modest = place("standing_03");
  assert.ok(proud.gap < -0.15, "a Body rating itself above its treatment was not frustrated");
  assert.ok(modest.gap > 0.15, "a Body rating itself below its treatment was not gratified");
  const situation = { threadId:SELF, situationId:"sit_now", establishedAt:AT };
  const words = (variantId) => feltSocialBody(livedRegulationForLivedHistory({ thread:body(variantId), asOf:AT,
    livedNowStore:{ getPreviousSituation:() => null }, currentSituation:situation,
    experienceStore:{ ...store(ordinary), listSocialInteractions:() => [], listAcceptedHumanMeetings:() => [],
      listReciprocalConversations:() => [], listSocialExposures:() => [] } }));
  assert.notDeepEqual(words("standing_06"), words("standing_03"), "frustration and gratification felt the same");
});

test("a Body that keeps giving way comes to feel the other above it, and a pull to hold its own", () => {
  const frame = toward(body("standing_06"), Array(8).fill(["gave_way", "me"]));
  const standing = drive(frame, "standing");
  assert.ok(standing.status >= 0.5 && standing.pressure > 0, "giving way taught the Body nothing about where it stands");
  assert.ok(feltTowardPeople(frame).get(OTHER).length >= 1, "where it stands did not reach words");
});

test("credit warms from someone looked up to, where the same credit from someone below is only expected", () => {
  const thread = body("standing_01");
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
