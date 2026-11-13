import assert from "node:assert/strict";
import test from "node:test";

import { bodyLevel, DAY_MS, HOUR_MS, inheritedHalfLife } from "../src/body-level.mjs";

const AT = Date.parse("2026-11-14T12:00:00.000Z");
const hoursAgo = (hours) => new Date(AT - hours * HOUR_MS).toISOString();

test("a spike fades back to the baseline, so the same sting leaves a calm Body low and a Body with a grievance high", () => {
  const sting = [{ at:hoursAgo(1), size:0.5 }];
  const level = (baseline, hours) => bodyLevel({ at:AT + hours * HOUR_MS, events:sting, halfLife:12 * HOUR_MS,
    baseline:{ given:baseline } }).level;
  assert.ok(level(0.05, 0) > 0.4 && level(0.6, 0) > 0.9, "the sting was not felt on top of the baseline");
  assert.ok(Math.abs(level(0.05, 240) - 0.05) < 0.01, "a calm Body did not return to its low baseline");
  assert.ok(Math.abs(level(0.6, 240) - 0.6) < 0.01, "a Body with a grievance did not return to its high baseline");
  const praised = bodyLevel({ at:AT, events:[{ at:hoursAgo(1), size:-0.3 }], halfLife:12 * HOUR_MS,
    baseline:{ given:0.6 } }).level;
  assert.ok(praised < 0.6, "praise did not lower it for a while");
});

test("a persistent Body holds a spike longer than a fleeting one", () => {
  const felt = (persistence) => bodyLevel({ at:AT, events:[{ at:hoursAgo(24), size:1 }],
    halfLife:inheritedHalfLife(12 * HOUR_MS, persistence) }).level;
  assert.ok(felt(0.8) > 3 * felt(-0.8), "inherited persistence did not set how long a spike lasts");
});

test("a baseline can accumulate what life has been like, or track it, and is not moved by what has not yet happened", () => {
  const contacts = Array.from({ length:10 }, (_, i) => ({ at:hoursAgo(24 * (10 - i)), toBaseline:1, size:1 }));
  const known = bodyLevel({ at:AT, events:contacts, baseline:{ accumulate:{ halfLife:730 * DAY_MS } },
    halfLife:14 * DAY_MS, combine:"max" });
  assert.ok(known.baseline > 9.9 && known.deviation > 0.95, "knowing did not accumulate, or being current lost the latest contact");
  const earlier = bodyLevel({ at:hoursAgo(24 * 5), events:contacts, baseline:{ accumulate:{ halfLife:730 * DAY_MS } } });
  assert.ok(earlier.baseline < 6.1, "a later event moved an earlier moment");
  const treated = bodyLevel({ at:AT, baseline:{ track:{ start:0, rate:0.2 } },
    events:Array.from({ length:20 }, (_, i) => ({ at:hoursAgo(20 - i), value:-1 })) });
  assert.ok(treated.baseline < -0.95 && treated.baseline > -1, "a tracked baseline did not move toward what was lived");
});

test("a reservoir fills with each event, never past full, and recovers between them", () => {
  const talk = Array.from({ length:10 }, (_, i) => ({ at:hoursAgo(2 - i * 0.05), size:0.2 }));
  const spent = bodyLevel({ at:hoursAgo(1.5), events:talk, cap:1, halfLife:90 * 60_000 }).level;
  assert.ok(spent <= 1 && spent > 0.6, "a long talk did not spend the Body, or overfilled it");
  assert.ok(bodyLevel({ at:AT + 6 * HOUR_MS, events:talk, cap:1, halfLife:90 * 60_000 }).level < 0.05,
    "the Body did not recover");
});
