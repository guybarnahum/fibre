import assert from "node:assert/strict";
import test from "node:test";

import { bodyObservatory, recordsAsOf } from "../src/body-observatory.mjs";
import { regardOf, selfStanding, socialEnergyEvidence } from "../src/social-body.mjs";
import { wearinessOf } from "../src/engagement.mjs";

const AT = "2026-11-14T12:00:00.000Z";
const SELF = "thr_body_self", FRIEND = "thr_body_friend", AWAY = "thr_body_away";
const hoursAgo = (hours) => new Date(Date.parse(AT) - hours * 3_600_000).toISOString();

// A World's records for one Thread over two days, answering each query the
// way the store does, and counting how often it is asked.
function world() {
  const reads = new Map();
  const count = (name) => reads.set(name, (reads.get(name) ?? 0) + 1);
  const contacts = Array.from({ length:12 }, (_, i) => ({ at:hoursAgo(44 - i * 4), kind:"conversation", turns:6 }));
  // A close friend unseen for ten days, and a memory of a walk with them that came back to mind.
  const away = Array.from({ length:12 }, (_, i) => ({ at:hoursAgo(24 * (10 + 3 * i)), kind:"conversation", turns:12 }));
  const recalled = [{ memoryId:"mem_walk", at:hoursAgo(3), eventRefs:["exp_walk"] }];
  const exposures = contacts.map((contact, i) => ({ kind:"conversation", ref:`story_${i}`, at:contact.at, turns:6,
    otherThreadId:FRIEND }));
  const regard = Array.from({ length:10 }, (_, i) => ({ regardId:`reg_${i}`, personThreadId:FRIEND,
    act:i % 3 === 0 ? "corrected" : "credited", actorThreadId:FRIEND, witnesses:0, asOf:hoursAgo(40 - i * 4) }));
  const readings = Array.from({ length:8 }, (_, i) => ({ reading:i % 2 ? "weary" : "engaged", sourceKind:"turn",
    at:hoursAgo(30 - i * 3) }));
  const newest = (items, field) => [...items].sort((a, b) => b[field].localeCompare(a[field]));
  return { reads, store:{
    listSharedContact:(t, o, { before, limit }) => { count(`contact:${o}`);
      return newest((o === AWAY ? away : contacts).filter((c) => c.at < before), "at").slice(0, limit); },
    listSharedExperienceRefs:(t, o) => { count(`shared:${o}`); return o === AWAY ? ["exp_walk"] : []; },
    listRecalledMemories:(t, { since, until, limit }) => { count("recalled");
      return recalled.filter((m) => m.at >= since && m.at <= until).slice(0, limit); },
    listPairActs:(t, o) => { count(`acts:${o}`); return []; },
    listPerceivedRegard:(t, o, { before, limit }) => { count(`regard:${o}`);
      return newest(regard.filter((r) => r.personThreadId === o && r.asOf < before), "asOf").slice(0, limit); },
    listRecentPerceivedRegard:(t, { before, limit }) => { count("recent"); return newest(regard.filter((r) => r.asOf < before), "asOf").slice(0, limit); },
    listSocialExposures:(t, { since, until, limit }) => { count("exposures");
      return newest(exposures.filter((e) => e.at >= since && e.at <= until), "at").slice(0, limit); },
    listEngagementReadings:(t, { since, until, limit }) => { count("readings");
      return newest(readings.filter((r) => r.at >= since && r.at < until), "at").slice(0, limit); },
    listOpenDoors:(t, o) => { count(`doors:${o}`); return ["conversation", "contact", "time"]; },
  } };
}

test("the Body panel shows the Body as it was at each moment of the day, from one reading of the records", () => {
  const { store } = world();
  const sliced = recordsAsOf(store, { now:AT, since:hoursAgo(72) });
  for (const hours of [20, 10, 2, 0]) {
    const at = hoursAgo(hours);
    assert.deepEqual(regardOf({ experienceStore:sliced, threadId:SELF, otherThreadId:FRIEND, at }),
      regardOf({ experienceStore:store, threadId:SELF, otherThreadId:FRIEND, at }), `trust or standing differed at ${at}`);
    assert.deepEqual(selfStanding({ experienceStore:sliced, threadId:SELF, at }),
      selfStanding({ experienceStore:store, threadId:SELF, at }), `self-status differed at ${at}`);
    assert.equal(wearinessOf({ experienceStore:sliced, threadId:SELF, at }),
      wearinessOf({ experienceStore:store, threadId:SELF, at }), `weariness differed at ${at}`);
    assert.deepEqual(socialEnergyEvidence({ threadId:SELF, experienceStore:sliced, asOf:at }),
      socialEnergyEvidence({ threadId:SELF, experienceStore:store, asOf:at }), `the battery differed at ${at}`);
  }
  const panelReads = world();
  const body = bodyObservatory({ thread:{ threadId:SELF, genome:{ urgeProjection:[] } }, experienceStore:panelReads.store,
    memoryStore:panelReads.store, apart:[AWAY], at:AT });
  assert.equal(body.series.length, 13);
  assert.ok(body.people.some((person) => person.threadId === FRIEND), "the person it lived most with is missing");
  assert.ok(new Set(body.series.map((point) => point.battery)).size > 3, "the day's battery did not move with its talk");
  const friend = (point) => point.people[FRIEND];
  assert.ok(friend(body.series.at(-1)).knowing > friend(body.series[0]).knowing && friend(body.series.at(-1)).trust > 0,
    "knowing and trust toward the friend were not shown as lived");
  const missed = (point) => point.people[AWAY];
  assert.ok(missed(body.series.at(-1)).longing > missed(body.series.at(-1)).longingBaseline
    && missed(body.series[0]).longing === missed(body.series[0]).longingBaseline,
    "a friend apart was not shown missed, or the memory of them was felt before it came back");
  assert.deepEqual(body.events.recalled.map((item) => item.people), [[AWAY]], "the memory was not tied to the friend it holds");
  assert.ok([...panelReads.reads.values()].every((n) => n === 1), "the panel read the same records more than once");
});

test("the Body panel shows what learning did to it through the day: the lift of a discovery, and the pull to tell", () => {
  const { store } = world();
  const learning = [{ learning:"discovery", sourceRef:"gutenberg:78", at:hoursAgo(5) }];
  const body = bodyObservatory({ thread:{ threadId:SELF, genome:{ urgeProjection:[] } }, at:AT,
    experienceStore:{ ...store, listLearning:(t, { since, until }) => learning.filter((item) => item.at >= since && item.at <= until) },
    memoryStore:store });
  const before = body.series.find((point) => point.at <= hoursAgo(6)), after = body.series.find((point) => point.at >= hoursAgo(4));
  assert.ok(!before.lifted && before.share === 0, "it was lifted before it found anything");
  assert.ok(after.lifted && after.novelty > before.novelty && after.share > 0,
    "the discovery's lift and the pull to tell were not shown when they were felt");
});

test("the Body panel shows the Body just before each moment it chose something, never after what the choice brought", () => {
  const { store } = world();
  const found = hoursAgo(5);
  const learning = [{ learning:"discovery", sourceRef:"gutenberg:78", at:found }];
  const body = bodyObservatory({ thread:{ threadId:SELF, genome:{ urgeProjection:[] } }, at:AT, moments:[found, hoursAgo(3)],
    present:[AWAY], memoryStore:store,
    experienceStore:{ ...store, listLearning:(t, { since, until }) => learning.filter((item) => item.at >= since && item.at <= until) } });
  const [atChoice, later] = body.atMoments;
  assert.ok(atChoice.at < found && !atChoice.lifted, "the Body at the moment of choosing already held what the choice brought");
  assert.ok(later.lifted, "the Body after the discovery was not shown lifted");
  assert.ok(AWAY in later.people, "how it took someone it met then was not shown");
});
