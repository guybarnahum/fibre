import {
  assertExactKeys,
  assertId,
  assertIsoTimestamp,
  assertPlainObject,
} from "./persistence-common.mjs";
import {
  livedSituationId,
  plannedPositionAt,
} from "./lived-now.mjs";

export class LivedNowCoverageError extends Error {}

function requireMethod(owner, name) {
  if (!owner || typeof owner[name] !== "function") {
    throw new TypeError(`${name} is required for LivedNow reconciliation`);
  }
}

function transitProgress(plan, at, position) {
  const instant = Date.parse(at);
  for (let index = 1; index < plan.stops.length; index += 1) {
    const previous = plan.stops[index - 1];
    const next = plan.stops[index];
    if (
      previous.physicalPlaceRef !== position.location.fromPlaceRef ||
      next.physicalPlaceRef !== position.location.toPlaceRef
    ) {
      continue;
    }
    const start = Date.parse(previous.endAt);
    const end = Date.parse(next.startAt);
    if (start <= instant && instant < end) {
      return end === start ? 1 : Math.max(0, Math.min(1, (instant - start) / (end - start)));
    }
  }
  throw new LivedNowCoverageError("Flight Plan has no enacted transit interval at the requested time");
}

function observationFromPlan(plan, at) {
  const position = plannedPositionAt(plan, at);
  if (position === null) {
    throw new LivedNowCoverageError("Flight Plan has no lived position at the requested time");
  }

  return {
    phase: position.kind,
    location: position.kind === "at_place"
      ? structuredClone(position.location)
      : {
          ...structuredClone(position.location),
          progress: transitProgress(plan, at, position),
        },
    mediatedContext: position.mediatedContext,
    activity: position.activity,
    reason: position.reason,
    participantRefs: [...position.participantRefs],
    evidenceRefs: [...plan.sourceReferences],
  };
}

function planForEnactment(personalPlan, carePlan, at) {
  if (carePlan?.authority?.constraint === "required" && plannedPositionAt(carePlan, at) !== null) {
    return carePlan;
  }
  return personalPlan;
}

export function createLivedNowService({ livedNowStore } = {}) {
  requireMethod(livedNowStore, "getCurrentSituation");
  requireMethod(livedNowStore, "latestPlan");
  requireMethod(livedNowStore, "enactCurrentSituation");

  return Object.freeze({
    ensure(input) {
      assertPlainObject("ensure LivedNow input", input);
      assertExactKeys("ensure LivedNow input", input, ["threadId", "at"]);
      assertId("ensure LivedNow input.threadId", input.threadId);
      assertIsoTimestamp("ensure LivedNow input.at", input.at);

      const current = livedNowStore.getCurrentSituation(input.threadId);
      if (current !== null) {
        if (current.establishedAt === input.at) return current;
        if (Date.parse(current.establishedAt) > Date.parse(input.at)) {
          throw new LivedNowCoverageError("LivedNow cannot move backward behind the authoritative present");
        }
      }

      const personalPlan = livedNowStore.latestPlan(input.threadId, "personal", { at: input.at });
      if (personalPlan === null) {
        throw new LivedNowCoverageError("LivedNow requires personal Flight Plan coverage at the requested time");
      }
      const carePlan = livedNowStore.latestPlan(input.threadId, "care", { at: input.at });
      const governingPlan = planForEnactment(personalPlan, carePlan, input.at);
      const observation = observationFromPlan(governingPlan, input.at);

      return livedNowStore.enactCurrentSituation({
        threadId: input.threadId,
        situationId: livedSituationId({
          kind: "ensure_lived_now_v1",
          threadId: input.threadId,
          at: input.at,
          governingPlanRef: governingPlan.planId,
        }),
        establishedAt: input.at,
        observation,
      });
    },
  });
}
