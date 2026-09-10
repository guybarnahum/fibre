import {
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
  assertStringArray,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import { normalizeLivedPlan, plannedPositionAt } from "./lived-now.mjs";

function unit(name, value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new TypeError(`${name} must be between 0 and 1`);
  }
  return value;
}

function normalizeObservation(value) {
  assertPlainObject("flight plan observation", value);
  assertPlainObject("flight plan observation.location", value.location);
  assertNonEmpty("flight plan observation.location.kind", value.location.kind);
  let location;
  if (value.location.kind === "place") {
    assertId("flight plan observation.location.placeRef", value.location.placeRef);
    location = { kind: "place", placeRef: value.location.placeRef };
  } else if (value.location.kind === "transit") {
    assertId("flight plan observation.location.fromPlaceRef", value.location.fromPlaceRef);
    assertId("flight plan observation.location.toPlaceRef", value.location.toPlaceRef);
    location = {
      kind: "transit",
      fromPlaceRef: value.location.fromPlaceRef,
      toPlaceRef: value.location.toPlaceRef,
      progress: unit("flight plan observation.location.progress", value.location.progress),
    };
  } else {
    throw new TypeError("flight plan observation.location.kind is invalid");
  }
  const mediatedContext = value.mediatedContext ?? null;
  if (mediatedContext !== null) assertNonEmpty("flight plan observation.mediatedContext", mediatedContext);
  const evidenceRefs = value.evidenceRefs ?? [];
  assertStringArray("flight plan observation.evidenceRefs", evidenceRefs);
  if (evidenceRefs.length === 0) throw new TypeError("flight plan observation requires World evidence");
  return { location, mediatedContext, evidenceRefs: [...new Set(evidenceRefs)] };
}

function expectedTravelProgress(plan, at) {
  const instant = Date.parse(at);
  for (let index = 1; index < plan.stops.length; index += 1) {
    const previous = plan.stops[index - 1];
    const next = plan.stops[index];
    const start = Date.parse(previous.endAt);
    const end = Date.parse(next.startAt);
    if (start <= instant && instant < end && previous.physicalPlaceRef !== next.physicalPlaceRef) {
      return end === start ? 1 : Math.max(0, Math.min(1, (instant - start) / (end - start)));
    }
  }
  return 0;
}

function actualForPlace(observation, placeRef) {
  if (observation.location.kind === "place") return observation.location.placeRef === placeRef ? 1 : 0;
  if (observation.location.toPlaceRef === placeRef) return observation.location.progress;
  return 0;
}

function actualForMediated(observation, planned) {
  if (actualForPlace(observation, planned.location.placeRef) < 1) return 0;
  return observation.mediatedContext === planned.mediatedContext ? 1 : 0;
}

function movementStatus(planned, observation, actual, expected) {
  if (planned.kind === "at_place") {
    if (actual >= 0.95) return "dwelling";
    if (observation.location.kind === "transit" && observation.location.toPlaceRef === planned.location.placeRef) {
      return "moving";
    }
    return "delayed";
  }

  if (observation.location.kind === "place") {
    if (observation.location.placeRef === planned.location.toPlaceRef) return "arrived";
    if (observation.location.placeRef === planned.location.fromPlaceRef) {
      return expected <= 0.15 ? "preparing" : "delayed";
    }
    return "off_plan";
  }

  const sameMovement = observation.location.fromPlaceRef === planned.location.fromPlaceRef &&
    observation.location.toPlaceRef === planned.location.toPlaceRef;
  if (!sameMovement) return "off_plan";
  return actual + 0.1 < expected ? "delayed" : "moving";
}

export function assessFlightPlanPresence({ plan: candidate, at, observation: candidateObservation }) {
  const plan = normalizeLivedPlan(candidate);
  if (plan.kind !== "personal") throw new TypeError("flight-plan regulation requires a personal plan");
  assertIsoTimestamp("flight-plan regulation at", at);
  const observation = normalizeObservation(candidateObservation);
  const planned = plannedPositionAt(plan, at);
  if (planned === null) return null;

  const mediated = planned.kind === "at_place" && planned.mediatedContext !== null;
  const targetKind = mediated ? "mediated" : "place";
  const targetRef = mediated ? planned.mediatedContext :
    planned.kind === "at_place" ? planned.location.placeRef : planned.location.toPlaceRef;
  const relation = mediated ? "connected_to" : "at";
  const expectedSatisfaction = planned.kind === "in_transit" ? expectedTravelProgress(plan, at) : 1;
  const actualSatisfaction = mediated
    ? actualForMediated(observation, planned)
    : actualForPlace(observation, targetRef);
  const status = movementStatus(planned, observation, actualSatisfaction, expectedSatisfaction);
  const evidenceRefs = [...new Set([...plan.sourceReferences, ...observation.evidenceRefs])];

  return {
    status,
    intended: planned,
    observed: observation,
    presenceTarget: {
      targetId: `flight_presence_${sha256(canonicalJson({ planId: plan.planId, at, targetRef })).slice(0, 24)}`,
      targetKind,
      targetRef,
      relation,
      orientation: "approach",
      actualSatisfaction,
      expectedSatisfaction,
      predictedSatisfaction: null,
      urgency: planned.kind === "in_transit" ? expectedSatisfaction : 1,
      evidenceRefs,
    },
  };
}
