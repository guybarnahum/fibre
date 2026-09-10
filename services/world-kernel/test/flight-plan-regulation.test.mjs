import assert from "node:assert/strict";
import test from "node:test";

import { evaluateIntrinsicRegulation } from "../../../core/src/intrinsic-regulation.mjs";
import { assessFlightPlanPresence } from "../src/flight-plan-regulation.mjs";
import { livedPlanId } from "../src/lived-now.mjs";

function plan() {
  const authoredAt = "2026-09-10T09:00:00Z";
  const stops = [
    {
      startAt: "2026-09-10T09:00:00Z",
      endAt: "2026-09-10T10:00:00Z",
      physicalPlaceRef: "place_home",
      mediatedContext: null,
      activity: "Finish breakfast and gather the sketchbook.",
      purpose: "I want a quiet start before going out to draw.",
      companionRefs: [],
      travelFromPrevious: null,
    },
    {
      startAt: "2026-09-10T10:30:00Z",
      endAt: "2026-09-10T11:30:00Z",
      physicalPlaceRef: "place_park",
      mediatedContext: null,
      activity: "Sketch birds near the pond.",
      purpose: "I want to notice how different birds move when they land.",
      companionRefs: [],
      travelFromPrevious: "Walk to the park.",
    },
    {
      startAt: "2026-09-10T12:00:00Z",
      endAt: "2026-09-10T13:00:00Z",
      physicalPlaceRef: "place_home",
      mediatedContext: "Zoom with Rowan",
      activity: "Show Rowan the sketches and compare what we noticed.",
      purpose: "I want to share the details that surprised me while they are still fresh.",
      companionRefs: [],
      travelFromPrevious: "Walk home.",
    },
  ];
  return {
    planId: livedPlanId({ threadId: "thr_flight_maya", authoredAt, stops }),
    kind: "personal",
    subjectThreadId: "thr_flight_maya",
    owner: { partyId: "thr_flight_maya", kind: "thread" },
    authoredAt,
    horizonStart: authoredAt,
    horizonEnd: "2026-09-10T13:00:00Z",
    stops,
    sourceReferences: ["evt_seed", "place_home", "place_park"],
    cognition: {
      provider: "fixture",
      modelId: "fixture-flight-plan",
      providerRequestId: "req_flight_plan",
    },
  };
}

function observation(location, mediatedContext = null, evidenceRef = "world:movement") {
  return {
    location,
    mediatedContext,
    evidenceRefs: [evidenceRef],
  };
}

function regulate(assessment) {
  return evaluateIntrinsicRegulation({
    perceptFrame: {
      asOf: assessment.observed.evidenceRefs[0].includes("zoom")
        ? "2026-09-10T12:05:00Z"
        : "2026-09-10T10:15:00Z",
      internal: { energy: 0.8, fatigue: 0.2 },
      environment: {
        temperatureC: 22,
        lightLevel: 0.5,
        soundLoad: 0.2,
        crowding: 0.2,
        openness: 0.8,
      },
      social: [],
      evidenceRefs: ["world:neutral-body-environment"],
    },
    targets: [assessment.presenceTarget],
  });
}

function presence(frame) {
  return frame.drives.find((drive) => drive.family === "presence");
}

test("A1 planned physical movement can be preparing, delayed, moving, or arrived without rewriting intention", () => {
  const flightPlan = plan();
  const original = structuredClone(flightPlan);

  const preparing = assessFlightPlanPresence({
    plan: flightPlan,
    at: "2026-09-10T10:02:00Z",
    observation: observation({ kind: "place", placeRef: "place_home" }, null, "world:still-home-1002"),
  });
  assert.equal(preparing.status, "preparing");

  const delayed = assessFlightPlanPresence({
    plan: flightPlan,
    at: "2026-09-10T10:15:00Z",
    observation: observation({ kind: "place", placeRef: "place_home" }, null, "world:still-home-1015"),
  });
  const moving = assessFlightPlanPresence({
    plan: flightPlan,
    at: "2026-09-10T10:15:00Z",
    observation: observation({
      kind: "transit",
      fromPlaceRef: "place_home",
      toPlaceRef: "place_park",
      progress: 0.55,
    }, null, "world:on-way-1015"),
  });
  const arrived = assessFlightPlanPresence({
    plan: flightPlan,
    at: "2026-09-10T10:15:00Z",
    observation: observation({ kind: "place", placeRef: "place_park" }, null, "world:park-early"),
  });

  assert.equal(delayed.status, "delayed");
  assert.equal(moving.status, "moving");
  assert.equal(arrived.status, "arrived");
  assert.ok(delayed.presenceTarget.expectedSatisfaction > delayed.presenceTarget.actualSatisfaction);
  assert.ok(moving.presenceTarget.actualSatisfaction >= moving.presenceTarget.expectedSatisfaction);
  assert.equal(arrived.presenceTarget.actualSatisfaction, 1);

  const delayedDrive = presence(regulate(delayed));
  const movingDrive = presence(regulate(moving));
  const arrivedDrive = presence(regulate(arrived));
  assert.ok(delayedDrive.pressure > movingDrive.pressure);
  assert.ok(movingDrive.pressure > arrivedDrive.pressure);
  assert.equal(arrivedDrive.attained, true);
  assert.deepEqual(flightPlan, original);
});

test("A1 mediated presence is a real destination even when physical place does not change", () => {
  const flightPlan = plan();
  const disconnected = assessFlightPlanPresence({
    plan: flightPlan,
    at: "2026-09-10T12:05:00Z",
    observation: observation({ kind: "place", placeRef: "place_home" }, null, "world:zoom-not-connected"),
  });
  const connected = assessFlightPlanPresence({
    plan: flightPlan,
    at: "2026-09-10T12:05:00Z",
    observation: observation({ kind: "place", placeRef: "place_home" }, "Zoom with Rowan", "world:zoom-connected"),
  });

  assert.equal(disconnected.status, "delayed");
  assert.equal(disconnected.presenceTarget.targetKind, "mediated");
  assert.equal(disconnected.presenceTarget.relation, "connected_to");
  assert.equal(connected.status, "dwelling");
  assert.equal(connected.presenceTarget.actualSatisfaction, 1);
  assert.ok(presence(regulate(disconnected)).pressure > presence(regulate(connected)).pressure);
  assert.equal(presence(regulate(connected)).attained, true);
});
