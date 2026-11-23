import assert from "node:assert/strict";
import test from "node:test";
import { bondOf, regardOf } from "../src/social-body.mjs";
import { socialBodyInConversation } from "../src/lived-now-regulation.mjs";
import { feltSocialBody } from "../src/interoceptive-cognition.mjs";

// Teaching and closeness are not mechanisms (ADR-0041 W3): they emerge from
// low-level regulation once what a Body felt in someone's company becomes
// part of how it takes them. These tests pin that primitive and its reach.
const AT = "2026-11-24T12:00:00.000Z";
const daysAgo = (days) => new Date(Date.parse(AT) - days * 86_400_000).toISOString();
const TALKS = [1, 2, 3, 4].map(daysAgo);
const DOORS = ["conversation", "time", "place"];
const store = ({ reading = null, valued = [] } = {}) => ({
  listSharedContact:() => TALKS.map((at) => ({ at, kind:"conversation", turns:10 })),
  listPairActs:() => [],
  listPerceivedRegard:() => valued.map((act, index) => ({ regardId:`reg_${index}`, act, actorThreadId:"thr_teacher",
    asOf:TALKS[index], witnesses:0 })),
  listEngagementReadings:() => reading === null ? [] : TALKS.map((at) => ({ reading, sourceKind:"turn", at })),
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
  const fading = regardOf({ experienceStore:store({ reading:"new" }), threadId:"thr_self", otherThreadId:"thr_teacher",
    at:new Date(Date.parse(AT) + 60 * 86_400_000).toISOString() });
  assert.ok(fading.warmth < lifted.warmth / 4, "warmth from old times never faded");
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
