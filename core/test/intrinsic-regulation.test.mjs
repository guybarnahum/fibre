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
    social: overrides.social ?? [],
    evidenceRefs: overrides.evidenceRefs ?? ["world:situation:001"],
  };
}

function drive(frame, family, targetRef = null) {
  const found = frame.drives.find((item) =>
    item.family === family && (targetRef === null || item.targetRef === targetRef));
  assert.ok(found, `missing ${family} drive`);
  return found;
}

function presenceTarget(overrides = {}) {
  return {
    targetId: overrides.targetId ?? "presence_zoom_alex",
    targetKind: overrides.targetKind ?? "obligation",
    targetRef: overrides.targetRef ?? "meeting:alex:1100",
    relation: overrides.relation ?? "available_for",
    orientation: overrides.orientation ?? "approach",
    actualSatisfaction: overrides.actualSatisfaction ?? 0.2,
    expectedSatisfaction: overrides.expectedSatisfaction ?? 0.3,
    predictedSatisfaction: overrides.predictedSatisfaction ?? 0.7,
    urgency: overrides.urgency ?? 0.3,
    evidenceRefs: overrides.evidenceRefs ?? ["plan:today", "meeting:alex:1100"],
  };
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
    targets: [presenceTarget()],
  });

  const late = evaluateIntrinsicRegulation({
    perceptFrame: percept({ asOf: "2026-09-10T17:45:00Z" }),
    targets: [presenceTarget({
      actualSatisfaction: 0.25,
      expectedSatisfaction: 0.7,
      predictedSatisfaction: 0.3,
      urgency: 0.9,
    })],
  });

  const arrived = evaluateIntrinsicRegulation({
    perceptFrame: percept({ asOf: "2026-09-10T18:00:00Z" }),
    targets: [presenceTarget({
      actualSatisfaction: 1,
      expectedSatisfaction: 1,
      predictedSatisfaction: 1,
      urgency: 1,
    })],
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
  const target = presenceTarget({
    targetId: "presence_station",
    targetKind: "place",
    targetRef: "place:victoria-station",
    relation: "at",
    actualSatisfaction: 0.35,
    expectedSatisfaction: 0.55,
    predictedSatisfaction: 0.5,
    urgency: 0.7,
    evidenceRefs: ["plan:train-to-edinburgh"],
  });

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

test("R2 a person can be a sensed place of desired proximity or desired distance", () => {
  const caregiver = "human:maya-mother";
  const far = evaluateIntrinsicRegulation({
    perceptFrame: percept({
      social: [{
        entityRef: caregiver,
        proximity: 0.1,
        familiarity: 1,
        calm: 0.5,
        evidenceRefs: ["world:mother-across-room"],
      }],
    }),
    targets: [presenceTarget({
      targetId: "with-caregiver",
      targetKind: "entity",
      targetRef: caregiver,
      relation: "with",
      orientation: "approach",
      actualSatisfaction: null,
      expectedSatisfaction: 0.5,
      predictedSatisfaction: 0.4,
      urgency: 0.8,
      evidenceRefs: ["relationship:maya-mother"],
    })],
  });

  const close = evaluateIntrinsicRegulation({
    perceptFrame: percept({
      social: [{
        entityRef: caregiver,
        proximity: 0.98,
        familiarity: 1,
        contact: 0.9,
        calm: 0.7,
        evidenceRefs: ["world:mother-beside-maya"],
      }],
    }),
    targets: [presenceTarget({
      targetId: "with-caregiver",
      targetKind: "entity",
      targetRef: caregiver,
      relation: "with",
      orientation: "approach",
      actualSatisfaction: null,
      expectedSatisfaction: 0.9,
      predictedSatisfaction: 1,
      urgency: 0.8,
      evidenceRefs: ["relationship:maya-mother"],
    })],
  });

  assert.ok(drive(far, "presence", caregiver).pressure > drive(close, "presence", caregiver).pressure);
  assert.equal(drive(close, "presence", caregiver).attained, true);

  const wantsDistance = evaluateIntrinsicRegulation({
    perceptFrame: percept({
      social: [{ entityRef: caregiver, proximity: 0.95, familiarity: 1, evidenceRefs: ["world:nearby"] }],
    }),
    targets: [presenceTarget({
      targetId: "distance-from-caregiver",
      targetKind: "entity",
      targetRef: caregiver,
      relation: "away_from",
      orientation: "avoid",
      actualSatisfaction: null,
      expectedSatisfaction: 0.8,
      predictedSatisfaction: 0.2,
      urgency: 0.6,
      evidenceRefs: ["relationship:current-distance-wanted"],
    })],
  });
  assert.ok(drive(wantsDistance, "presence", caregiver).pressure > 0.5);
  assert.ok(wantsDistance.intrinsicAffect.avoidancePush > 0);
});

test("R2 observable social cues create resonance without copying named emotions", () => {
  const laughter = evaluateIntrinsicRegulation({
    perceptFrame: percept({
      social: [{
        entityRef: "thread:friend",
        proximity: 0.9,
        familiarity: 0.9,
        laughter: 0.9,
        calm: 0.4,
        evidenceRefs: ["percept:laughter"],
      }],
    }),
  });
  const distress = evaluateIntrinsicRegulation({
    perceptFrame: percept({
      social: [{
        entityRef: "thread:friend",
        proximity: 0.9,
        familiarity: 0.9,
        crying: 0.8,
        agitation: 0.7,
        evidenceRefs: ["percept:crying-agitation"],
      }],
    }),
  });

  assert.ok(laughter.intrinsicAffect.socialResonance.affiliative > laughter.intrinsicAffect.socialResonance.distress);
  assert.ok(distress.intrinsicAffect.socialResonance.distress > distress.intrinsicAffect.socialResonance.affiliative);
  assert.ok(distress.intrinsicAffect.activation > 0);

  const encoded = JSON.stringify({ laughter, distress });
  assert.equal(encoded.includes("happy"), false);
  assert.equal(encoded.includes("sad"), false);
  assert.equal(encoded.includes("angry"), false);
});
