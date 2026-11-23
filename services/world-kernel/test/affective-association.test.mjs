import assert from "node:assert/strict";
import test from "node:test";
import { bondOf, regardOf } from "../src/social-body.mjs";
import { socialBodyInConversation } from "../src/lived-now-regulation.mjs";
import { feltSocialBody, feltTowardPeople } from "../src/interoceptive-cognition.mjs";
import { DEFAULT_ORGANISM_POLICY } from "#core/src/organism-policy.mjs";
import { evaluateIntrinsicRegulation } from "#core/src/intrinsic-regulation.mjs";

// Teaching and closeness are not mechanisms (ADR-0041 W3): they emerge from
// low-level regulation once what a Body felt in someone's company becomes
// part of how it takes them. These tests pin that primitive and its reach.
const AT = "2026-11-24T12:00:00.000Z";
const daysAgo = (days) => new Date(Date.parse(AT) - days * 86_400_000).toISOString();
const TALKS = [1, 2, 3, 4].map(daysAgo);
const DOORS = ["conversation", "time", "place"];
// Each talk's own turn readings, in order: one word for every turn, or a list.
const store = ({ reading = null, valued = [], talks = TALKS } = {}) => ({
  listSharedContact:() => talks.map((at) => ({ at, kind:"conversation", turns:10 })),
  listPairActs:() => [],
  listPerceivedRegard:() => valued.map((act, index) => ({ regardId:`reg_${index}`, act, actorThreadId:"thr_teacher",
    asOf:talks[index], witnesses:0 })),
  listEngagementReadings:() => reading === null ? [] : talks.flatMap((at) =>
    (Array.isArray(reading) ? reading : Array(5).fill(reading)).map((word, turn) =>
      ({ reading:word, sourceKind:"turn", sourceRef:`live:thr_self:${at}:${turn}`, at }))),
});
const regard = (value) => regardOf({ experienceStore:value, threadId:"thr_self", otherThreadId:"thr_teacher", at:AT });

test("what a Body felt in someone's company shapes how it takes them, and how much they come to matter", () => {
  const lifted = regard(store({ reading:"new" })), flat = regard(store({ reading:"nothing_new" })), plain = regard(store());
  assert.ok(lifted.warmth > 0 && flat.warmth < 0 && plain.warmth === 0,
    "talks that brought something new and talks that brought nothing left the Body taking the person the same way");
  assert.ok(bondOf({ regard:lifted, doors:DOORS }) > bondOf({ regard:plain, doors:DOORS })
    && bondOf({ regard:plain, doors:DOORS }) > bondOf({ regard:flat, doors:DOORS }),
    "how it felt to be with someone did not deepen or thin the bond");
  assert.equal(lifted.trust, plain.trust, "being lifted by someone was counted as evidence of their trustworthiness");
  assert.ok(regard(store({ valued:["asked_advice", "credited"] })).warmth > 0,
    "being valued by someone did not warm the Body toward them");
  const later = (value) => regardOf({ experienceStore:value, threadId:"thr_self", otherThreadId:"thr_teacher",
    at:new Date(Date.parse(AT) + 60 * 86_400_000).toISOString() });
  assert.ok(later(store({ reading:"new" })).warmth > lifted.warmth / 2, "an old friend went cold between visits");
  assert.ok(later(store({ valued:["asked_advice", "credited"] })).warmth < 0.05, "the glow of being valued once never faded");
});

test("a talk is felt as a whole, and many plain talks only cool a little", () => {
  const brightEnd = regard(store({ reading:["nothing_new", "nothing_new", "nothing_new", "new"] }));
  const dullEnd = regard(store({ reading:["new", "nothing_new", "nothing_new", "nothing_new"] }));
  assert.ok(brightEnd.warmth > dullEnd.warmth && dullEnd.warmth > 0,
    "talks were felt turn by turn, not by their best moment and how they ended");
  const plain = regard(store()), flat = regard(store({ reading:"nothing_new" }));
  assert.ok(flat.warmth > -0.5 && bondOf({ regard:flat, doors:DOORS }) > 0.6 * bondOf({ regard:plain, doors:DOORS }),
    "a friend whose talks bring nothing new came to feel like a stranger");
  const often = regard(store({ reading:"new", talks:[0.1, 0.5, 1, 1.5, 2, 3].map(daysAgo) }));
  assert.ok(often.warmth <= 1 && often.warmth > regard(store({ reading:"new", talks:[1].map(daysAgo) })).warmth,
    "talk after good talk did not make someone warmer");
});

// Exploration as the core feels it toward one person, with or without promise.
const towardPerson = (person, gain = 0) => evaluateIntrinsicRegulation({
  perceptFrame:{ asOf:AT, evidenceRefs:["sit_now"], exploration:{ unfamiliarPeople:[{ personRef:"thr_teacher",
    evidenceRefs:["sit_teacher"], staleness:0, ...person }] } },
  runtimeBaselines:{}, urgeProjection:[{ family:"exploration", orientation:"people",
    positions:{ gain, feltThreshold:0, persistence:0 } }], organismPolicy:DEFAULT_ORGANISM_POLICY,
}).drives.find((item) => item.family === "exploration" && item.targetRef === "person:thr_teacher");

test("someone who lately brought something new stays interesting, however well known", () => {
  const promised = regard(store({ reading:["nothing_new", "new"] }));
  assert.ok(promised.promise > 0 && regard(store({ reading:"nothing_new" })).promise === 0,
    "promise did not follow who brought something new");
  const friend = towardPerson({ unfamiliarity:0.1, promise:promised.promise });
  assert.ok(friend.pressure > towardPerson({ unfamiliarity:0.1 }).pressure,
    "a well-known person who brings something new pulled no more than one who never does");
  assert.ok(friend.promising, "the pull was not marked as coming from what they bring");
  assert.ok(towardPerson({ unfamiliarity:0.1, promise:promised.promise }, 0.8).pressure > friend.pressure,
    "the inherited gain did not shape the pull toward someone who brings something new");
  assert.match((feltTowardPeople({ drives:[friend] }).get("thr_teacher") ?? []).join(" "),
    /bring you something new/u, "the pull toward someone who brings something new was not felt in words");
});

test("good news seeks company: a fresh lift is a pull to tell someone, as sharp as the genome makes it", () => {
  const lifted = (novelty, competence = 0, gain = 0) => evaluateIntrinsicRegulation({
    perceptFrame:{ asOf:AT, evidenceRefs:["sit_now"], exploration:{ novelty },
      ...(competence > 0 ? { mastery:{ competence, unfinished:[] } } : {}) },
    runtimeBaselines:{}, urgeProjection:[{ family:"social_contact", orientation:"conversation",
      positions:{ gain, feltThreshold:0, persistence:0 } }], organismPolicy:DEFAULT_ORGANISM_POLICY });
  const share = (frame) => frame.drives.find((item) => item.targetRef === "self:share")?.pressure ?? 0;
  assert.equal(share(lifted(0.2)), 0, "a Body starved of anything new wanted to tell of it");
  assert.ok(share(lifted(0.9)) > share(lifted(0.5)) && share(lifted(0.5)) > 0, "a bigger lift was no stronger a pull to tell");
  assert.ok(share(lifted(0.2, 0.6)) > 0, "going deeper was no pull to tell");
  assert.ok(share(lifted(0.9, 0, 0.8)) > share(lifted(0.9)), "the inherited gain did not shape the pull to tell");
  const words = feltSocialBody(lifted(0.9)).join(" ");
  assert.match(words, /want to tell someone/u, "the pull to tell was not felt in words");
  assert.doesNotMatch(words, /company/u, "the pull to tell was felt as loneliness");
});

test("in conversation the Body hears what learning did for it, as it does everywhere else", () => {
  const thread = { threadId:"thr_self", genome:{ urgeProjection:[{ family:"exploration", orientation:"ideas",
    positions:{ gain:0, feltThreshold:0, persistence:0 } }] } };
  const talk = (novelty) => feltSocialBody(socialBodyInConversation({ thread, start:null, turns:2, asOf:AT,
    regard:{ knowing:0.6, staleness:0, trust:0.8 }, other:{ threadId:"thr_teacher", evidenceRef:"sit_teacher" },
    learning:{ novelty, competence:0, unfinished:[] } })).join(" ");
  assert.match(talk(0), /hungry/u, "a Thread starved of anything new did not feel it in the talk");
  assert.doesNotMatch(talk(0.9), /hungry/u, "a Thread just lifted by something new still felt starved of it");
});
