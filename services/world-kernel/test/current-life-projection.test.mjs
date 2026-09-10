import assert from "node:assert/strict";
import test from "node:test";

import { projectCurrentLife } from "../src/current-life-projection.mjs";
import { livedPlanId, resolveCurrentSituation } from "../src/lived-now.mjs";

const THREAD = "thr_projection_maya";
const HOME = "place_home";
const DENTIST = "place_dentist";

function personalPlan() {
  const authoredAt = "2026-09-10T09:00:00Z";
  const stops = [{
    startAt: authoredAt,
    endAt: "2026-09-10T11:00:00Z",
    physicalPlaceRef: HOME,
    mediatedContext: "Monterey Bay Aquarium octopus stream",
    activity: "Keep watching and sketching the octopus.",
    purpose: "I want to finish following what it does this morning.",
    companionRefs: [],
    travelFromPrevious: null,
  }];
  return {
    planId: livedPlanId({ threadId: THREAD, kind: "personal", authoredAt, stops }),
    kind: "personal",
    subjectThreadId: THREAD,
    owner: { partyId: THREAD, kind: "thread" },
    authoredAt,
    horizonStart: authoredAt,
    horizonEnd: "2026-09-10T11:00:00Z",
    stops,
    sourceReferences: ["evt_seed", HOME],
    cognition: { provider: "fixture", modelId: "fixture-plan", providerRequestId: "req_plan" },
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
      activity: "Get ready and leave with Mom.",
      purpose: "Leave in time for the dental appointment.",
      companionRefs: ["human_mother"],
      travelFromPrevious: null,
    },
    {
      startAt: "2026-09-10T10:00:00Z",
      endAt: "2026-09-10T10:30:00Z",
      physicalPlaceRef: DENTIST,
      mediatedContext: null,
      activity: "Attend the dental appointment.",
      purpose: "Keep the scheduled health appointment.",
      companionRefs: ["human_mother"],
      travelFromPrevious: "Ride with Mom to the dentist.",
    },
  ];
  return {
    planId: livedPlanId({ threadId: THREAD, kind: "care", authoredAt, stops }),
    kind: "care",
    subjectThreadId: THREAD,
    owner: { partyId: "human_mother", kind: "human_source" },
    authoredAt,
    horizonStart: authoredAt,
    horizonEnd: "2026-09-10T10:30:00Z",
    stops,
    sourceReferences: ["lrr_parent", HOME, DENTIST],
    authority: {
      relationRef: "lrr_parent",
      scope: "Same-day care and health appointments.",
      constraint: "required",
    },
  };
}

test("A3 one projection keeps now, personal will, care requirement, semantic interior, and provenance causally distinct", () => {
  const personal = personalPlan();
  const care = carePlan();
  const now = resolveCurrentSituation({
    situationId: "sit_projection_transit",
    establishedAt: "2026-09-10T09:40:00Z",
    personalPlan: personal,
    carePlan: care,
    observation: {
      phase: "in_transit",
      location: { kind: "transit", fromPlaceRef: HOME, toPlaceRef: DENTIST, progress: 0.35 },
      mediatedContext: null,
      activity: "Ride with Mom toward the dentist.",
      reason: "World observation records actual movement under the care plan.",
      participantRefs: ["human_mother"],
      evidenceRefs: ["evt_world_transit"],
    },
  });
  const semanticStates = [{
    stateId: "sstate_current_connection",
    domain: "need",
    dimension: "connection",
    state: "I want some familiar calm while this morning changes around me.",
  }];
  const trace = { asOf: now.establishedAt, attention: { family: "presence" } };

  const projection = projectCurrentLife({
    threadId: THREAD,
    livedNowStore: {
      getCurrentSituation: () => now,
      latestPlan: (_threadId, kind) => kind === "personal" ? personal : care,
    },
    semanticStateStore: { listCurrentState: () => semanticStates },
    organismTrace: trace,
  });

  assert.equal(projection.now.phase, "in_transit");
  assert.equal(projection.now.location.progress, 0.35);
  assert.equal(projection.flightPlan.planId, personal.planId);
  assert.equal(projection.carePlan.planId, care.planId);
  assert.equal(projection.planVsLived.personal.status, "delayed");
  assert.equal(projection.planVsLived.personal.presenceTarget.targetRef, "Monterey Bay Aquarium octopus stream");
  assert.equal(projection.planVsLived.careRequirement.status, "moving");
  assert.equal(Object.hasOwn(projection.planVsLived.careRequirement, "presenceTarget"), false);
  assert.equal(projection.semanticStates[0].state, semanticStates[0].state);
  assert.deepEqual(projection.organismTrace, trace);
  assert.deepEqual(projection.provenance.planRefs, [personal.planId, care.planId]);
  assert.deepEqual(projection.provenance.worldEvidenceRefs, ["evt_world_transit"]);
});
