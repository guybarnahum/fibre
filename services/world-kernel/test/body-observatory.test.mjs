import assert from "node:assert/strict";
import test from "node:test";

import { bodyObservatory, recordsAsOf } from "../src/body-observatory.mjs";
import { regardOf, selfStanding, socialEnergyEvidence } from "../src/social-body.mjs";
import { wearinessOf } from "../src/engagement.mjs";

const AT = "2026-11-14T12:00:00.000Z";
const SELF = "thr_body_self", FRIEND = "thr_body_friend";
const hoursAgo = (hours) => new Date(Date.parse(AT) - hours * 3_600_000).toISOString();

// A World's records for one Thread over two days, answering each query the
// way the store does, and counting how often it is asked.
function world() {
  const reads = new Map();
  const count = (name) => reads.set(name, (reads.get(name) ?? 0) + 1);
  const contacts = Array.from({ length:12 }, (_, i) => ({ at:hoursAgo(44 - i * 4), kind:"conversation", turns:6 }));
  const exposures = contacts.map((contact, i) => ({ kind:"conversation", ref:`story_${i}`, at:contact.at, turns:6,
    otherThreadId:FRIEND }));
  const regard = Array.from({ length:10 }, (_, i) => ({ regardId:`reg_${i}`, personThreadId:FRIEND,
    act:i % 3 === 0 ? "corrected" : "credited", actorThreadId:FRIEND, witnesses:0, asOf:hoursAgo(40 - i * 4) }));
  const readings = Array.from({ length:8 }, (_, i) => ({ reading:i % 2 ? "weary" : "engaged", sourceKind:"turn",
    at:hoursAgo(30 - i * 3) }));
  const newest = (items, field) => [...items].sort((a, b) => b[field].localeCompare(a[field]));
  return { reads, store:{
    listSharedContact:(t, o, { before, limit }) => { count("contact"); return newest(contacts.filter((c) => c.at < before), "at").slice(0, limit); },
    listPairActs:() => { count("acts"); return []; },
    listPerceivedRegard:(t, o, { before, limit }) => { count("regard"); return newest(regard.filter((r) => r.asOf < before), "asOf").slice(0, limit); },
    listRecentPerceivedRegard:(t, { before, limit }) => { count("recent"); return newest(regard.filter((r) => r.asOf < before), "asOf").slice(0, limit); },
    listSocialExposures:(t, { since, until, limit }) => { count("exposures");
      return newest(exposures.filter((e) => e.at >= since && e.at <= until), "at").slice(0, limit); },
    listEngagementReadings:(t, { since, until, limit }) => { count("readings");
      return newest(readings.filter((r) => r.at >= since && r.at < until), "at").slice(0, limit); },
    listOpenDoors:() => { count("doors"); return ["conversation", "contact"]; },
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
  const body = bodyObservatory({ thread:{ threadId:SELF, genome:{ urgeProjection:[] } }, experienceStore:panelReads.store, at:AT });
  assert.equal(body.series.length, 13);
  assert.ok(body.people.some((person) => person.threadId === FRIEND), "the person it lived most with is missing");
  assert.ok(new Set(body.series.map((point) => point.battery)).size > 3, "the day's battery did not move with its talk");
  const friend = (point) => point.people[FRIEND];
  assert.ok(friend(body.series.at(-1)).knowing > friend(body.series[0]).knowing && friend(body.series.at(-1)).trust > 0,
    "knowing and trust toward the friend were not shown as lived");
  assert.ok([...panelReads.reads.values()].every((n) => n === 1), "the panel read the same records more than once");
});
