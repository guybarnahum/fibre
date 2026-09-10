import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateIntrinsicRegulation,
  threadRegulatorProfile,
} from "../src/intrinsic-regulation.mjs";

function percept(overrides = {}) {
  return {
    asOf: overrides.asOf ?? "2026-09-10T17:00:00Z",
    internal: {
      energy: overrides.energy ?? 0.8,
      fatigue: overrides.fatigue ?? 0.2,
    },
    environment: {
      temperatureC: overrides.temperatureC ?? 22,
      lightLevel: overrides.lightLevel ?? 0.5,
      soundLoad: overrides.soundLoad ?? 0.2,
      crowding: overrides.crowding ?? 0.2,
      openness: overrides.openness ?? 0.8,
    },
    evidenceRefs: overrides.evidenceRefs ?? ["world:situation:001"],
  };
}

function drive(frame, family) {
  const found = frame.drives.find((item) => item.family === family);
  assert.ok(found, `missing ${family} drive`);
  return found;
}

test("R1 basal regulation responds to body and ambient sensory conditions without naming emotions", () => {
  const settled = evaluateIntrinsicRegulation({ perceptFrame: percept() });
  assert.equal(drive(settled, "thermal_comfort").pressure, 0);
  assert.equal(drive(settled, "energy").pressure, 0);
  assert.equal(drive(settled, "rest").pressure, 0);
  assert.equal(drive(settled, "sensory_load").pressure, 0);
  assert.equal(settled.intrinsicAffect.activation, 0);

  const stressed = evaluateIntrinsicRegulation({
    perceptFrame: percept({
      temperatureC: 34,
      energy: 0.2,
      fatigue: 0.9,
      lightLevel: 0.01,
      soundLoad: 0.9,
      crowding: 0.92,
      openness: 0.03,
    }),
  });

  assert.ok(drive(stressed, "thermal_comfort").pressure > 0);
  assert.ok(drive(stressed, "energy").pressure > 0);
  assert.ok(drive(stressed, "rest").pressure > 0);
  assert.ok(drive(stressed, "sensory_load").pressure > 0);
  assert.ok(stressed.intrinsicAffect.activation > 0);
  assert.ok(stressed.intrinsicAffect.avoidancePush > 0);
  assert.equal(JSON.stringify(stressed).includes("anxious"), false);
  assert.equal(JSON.stringify(stressed).includes("afraid"), false);
});

test("R1 presence pressure is predictive, worsens when progress falls behind, and collapses on attainment", () => {
  const early = evaluateIntrinsicRegulation({
    perceptFrame: percept(),
    targets: [{
      targetId: "presence_zoom_alex",
      targetRef: "meeting:alex:1100",
      relation: "available_for",
      orientation: "approach",
      actualSatisfaction: 0.2,
      expectedSatisfaction: 0.3,
      predictedSatisfaction: 0.7,
      urgency: 0.3,
      evidenceRefs: ["plan:today", "meeting:alex:1100"],
    }],
  });

  const late = evaluateIntrinsicRegulation({
    perceptFrame: percept({ asOf: "2026-09-10T17:45:00Z" }),
    targets: [{
      targetId: "presence_zoom_alex",
      targetRef: "meeting:alex:1100",
      relation: "available_for",
      orientation: "approach",
      actualSatisfaction: 0.25,
      expectedSatisfaction: 0.7,
      predictedSatisfaction: 0.3,
      urgency: 0.9,
      evidenceRefs: ["plan:today", "meeting:alex:1100"],
    }],
  });

  const arrived = evaluateIntrinsicRegulation({
    perceptFrame: percept({ asOf: "2026-09-10T18:00:00Z" }),
    targets: [{
      targetId: "presence_zoom_alex",
      targetRef: "meeting:alex:1100",
      relation: "available_for",
      orientation: "approach",
      actualSatisfaction: 1,
      expectedSatisfaction: 1,
      predictedSatisfaction: 1,
      urgency: 1,
      evidenceRefs: ["plan:today", "meeting:alex:1100"],
    }],
  });

  const earlyPresence = drive(early, "presence");
  const latePresence = drive(late, "presence");
  const arrivedPresence = drive(arrived, "presence");
  assert.ok(latePresence.pressure > earlyPresence.pressure);
  assert.ok(latePresence.progressError < earlyPresence.progressError);
  assert.ok(latePresence.predictionError < earlyPresence.predictionError);
  assert.equal(arrivedPresence.pressure, 0);
  assert.equal(arrivedPresence.attained, true);
  assert.equal(arrived.intrinsicAffect.attainment, 1);
});

test("R1 Thread-species baselines allow only small inherited modulation and regulation is replay-deterministic", () => {
  const target = {
    targetId: "presence_station",
    targetRef: "place:victoria-station",
    relation: "at",
    orientation: "approach",
    actualSatisfaction: 0.35,
    expectedSatisfaction: 0.55,
    predictedSatisfaction: 0.5,
    urgency: 0.7,
    evidenceRefs: ["plan:train-to-edinburgh"],
  };

  const lower = evaluateIntrinsicRegulation({
    perceptFrame: percept(),
    targets: [target],
    runtimeBaselines: { regulatorPresenceSensitivity: 0.85 },
  });
  const higher = evaluateIntrinsicRegulation({
    perceptFrame: percept(),
    targets: [target],
    runtimeBaselines: { regulatorPresenceSensitivity: 1.15 },
  });

  const lowerPressure = drive(lower, "presence").pressure;
  const higherPressure = drive(higher, "presence").pressure;
  assert.ok(higherPressure > lowerPressure);
  assert.ok(higherPressure / lowerPressure < 1.5);

  assert.throws(
    () => threadRegulatorProfile({ regulatorPresenceSensitivity: 1.5 }),
    /species envelope/,
  );

  const input = {
    perceptFrame: percept(),
    targets: [target],
    runtimeBaselines: { regulatorPresenceSensitivity: 1.05 },
  };
  assert.deepEqual(
    evaluateIntrinsicRegulation(input),
    evaluateIntrinsicRegulation(structuredClone(input)),
  );
});
