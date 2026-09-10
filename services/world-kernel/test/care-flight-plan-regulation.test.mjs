import assert from "node:assert/strict";
import test from "node:test";

import { evaluateIntrinsicRegulation } from "../../../core/src/intrinsic-regulation.mjs";
import {
  assessCareConstrainedPresence,
  assessFlightPlanPresence,
} from "../src/flight-plan-regulation.mjs";
import { livedPlanId, resolveCurrentSituation } from "../src/lived-now.mjs";

const THREAD_ID = "thr_care_maya";
const HOME = "place_home";
const DENTIST = "place_dentist";
const CAREGIVER = "human_mother";

function personalPlan() {
  const authoredAt = "2026-09-10T09:00:00Z";
  const stops = [{
    startAt: authoredAt,
    endAt: "2026-09-10T11:00:00Z",
    physicalPlaceRef: HOME,
    mediatedContext: "Monterey Bay Aquarium octopus stream",
    activity: "Watch the octopus stream and keep sketching the color changes.",
    purpose: "I want to finish following the octopus while it is active.",
    companionRefs: [],
    travelFromPrevious: null,
  }];
  return {
    planId: livedPlanId({ threadId: THREAD_ID, kind: "personal", authoredAt, stops }),
    kind: "personal",
    subjectThreadId: THREAD_ID,
    owner: { partyId: THREAD_ID, kind: "thread" },
    authoredAt,
    horizonStart: authoredAt,
    horizonEnd: "2026-09-10T11:00:00Z",
    stops,
    sourceReferences: ["evt_seed", HOME],
    cognition: {
      provider: "fixture",
      modelId: "fixture-personal-flight-plan",
      providerRequestId: "req_personal_flight_plan",
    },
  };
}

function carePlan() {
  const authoredAt = "2026-09-10T09:15:00Z";
  const stops = [
    {
      startAt: authoredAt,
      endAt: "2026-09-10T09:30:00Z",
      physicalPlaceRef: HOME,
      mediatedContext: null,
      activity: "Put the tablet away, get shoes on, and leave with Mom.",
      purpose: "Leave in time for the dental appointment.",
      companionRefs: [CAREGIVER],
      travelFromPrevious: null,
    },
    {
      startAt: "2026-09-10T10:00:00Z",
      endAt: "2026-09-10T10:30:00Z",
      physicalPlaceRef: DENTIST,
      mediatedContext: null,
      activity: "Check in for the dental appointment with Mom.",
      purpose: "Attend the scheduled dental appointment.",
      companionRefs: [CAREGIVER],
      travelFromPrevious: "Ride with Mom to the dentist.",
    },
  ];
  return {
    planId: livedPlanId({ threadId: THREAD_ID, kind: "care", authoredAt, stops }),
    kind: "care",
    subjectThreadId: THREAD_ID,
    owner: { partyId: CAREGIVER, kind: "human_source" },
    authoredAt,
    horizonStart: authoredAt,
    horizonEnd: "2026-09-10T10:30:00Z",
    stops,
    sourceReferences: ["lrr_parent", HOME, DENTIST],
    authority: {
      relationRef: "lrr_parent",
      scope: "Same-day care and scheduled health appointments.",
      constraint: "required",
    },
  };
}

function neutralPercept(asOf) {
  return {
    asOf,
    internal: { energy: 0.8, fatigue: 0.2 },
    environment: {
      temperatureC: 22,
      lightLevel: 0.5,
      soundLoad: 0.2,
      crowding: 0.2,
      openness: 0.8,
    },
    social: [],
    evidenceRefs: ["evt_neutral_environment"],
  };
}

function presenceDrive(frame) {
  return frame.drives.find((drive) => drive.family === "presence");
}

function situationAt({ situationId, at, observation }) {
  return resolveCurrentSituation({
    situationId,
    establishedAt: at,
    personalPlan: personalPlan(),
    carePlan: carePlan(),
    observation,
  });
}

test("A2 care can move a child through the World while the child's own presence drive remains hers", () => {
  const personal = personalPlan();
  const care = carePlan();
  const personalBefore = structuredClone(personal);
  const careBefore = structuredClone(care);

  const before = assessFlightPlanPresence({
    plan: personal,
    at: "2026-09-10T09:20:00Z",
    observation: {
      location: { kind: "place", placeRef: HOME },
      mediatedContext: "Monterey Bay Aquarium octopus stream",
      evidenceRefs: ["evt_octopus_still_playing"],
    },
  });

  const movingSituation = situationAt({
    situationId: "sit_care_transit",
    at: "2026-09-10T09:40:00Z",
    observation: {
      phase: "in_transit",
      location: {
        kind: "transit",
        fromPlaceRef: HOME,
        toPlaceRef: DENTIST,
        progress: 0.35,
      },
      mediatedContext: null,
      activity: "Ride with Mom toward the dentist.",
      reason: "World observation records the household carrying out Mom's required care plan.",
      participantRefs: [CAREGIVER],
      evidenceRefs: ["evt_world_care_transit"],
    },
  });

  assert.equal(movingSituation.resolution.kind, "care_constraint");
  assert.equal(movingSituation.resolution.conflict, true);
  assert.equal(movingSituation.resolution.observedDivergence, false);
  assert.equal(movingSituation.resolution.governingPlanRef, care.planId);
  assert.equal(movingSituation.resolution.constrainedPlanRef, personal.planId);

  const moving = assessCareConstrainedPresence({
    personalPlan: personal,
    carePlan: care,
    currentSituation: movingSituation,
  });
  assert.equal(moving.careRequirement.status, "moving");
  assert.equal(moving.careRequirement.intended.kind, "in_transit");
  assert.equal(moving.personal.status, "delayed");
  assert.equal(moving.personal.presenceTarget.targetRef, "Monterey Bay Aquarium octopus stream");
  assert.equal(moving.personal.presenceTarget.actualSatisfaction, 0);
  assert.equal(Object.hasOwn(moving.careRequirement, "presenceTarget"), false);

  const beforeRegulation = evaluateIntrinsicRegulation({
    perceptFrame: neutralPercept("2026-09-10T09:20:00Z"),
    targets: [before.presenceTarget],
  });
  const movingRegulation = evaluateIntrinsicRegulation({
    perceptFrame: neutralPercept("2026-09-10T09:40:00Z"),
    targets: [moving.personal.presenceTarget],
  });
  assert.equal(presenceDrive(beforeRegulation).attained, true);
  assert.ok(presenceDrive(movingRegulation).pressure > presenceDrive(beforeRegulation).pressure);

  const arrivedSituation = situationAt({
    situationId: "sit_care_arrived",
    at: "2026-09-10T10:05:00Z",
    observation: {
      phase: "at_place",
      location: { kind: "place", placeRef: DENTIST },
      mediatedContext: null,
      activity: "Check in for the dental appointment with Mom.",
      reason: "World observation records Maya and Mom at the appointment.",
      participantRefs: [CAREGIVER],
      evidenceRefs: ["evt_world_dentist_arrival"],
    },
  });
  const arrived = assessCareConstrainedPresence({
    personalPlan: personal,
    carePlan: care,
    currentSituation: arrivedSituation,
  });
  assert.equal(arrived.careRequirement.status, "dwelling");
  assert.equal(arrived.personal.status, "delayed");
  assert.equal(arrived.personal.presenceTarget.actualSatisfaction, 0);

  assert.deepEqual(personal, personalBefore);
  assert.deepEqual(care, careBefore);
});
