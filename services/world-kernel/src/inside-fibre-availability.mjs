import {
  assertId,
  assertIsoTimestamp,
} from "./persistence-common.mjs";
import { plannedPositionAt } from "./lived-now.mjs";
import { INSIDE_FIBRE_VISITOR_WORK } from "./inside-fibre-work.mjs";

function requireMethod(owner, name, method) {
  if (!owner || typeof owner[method] !== "function") {
    throw new TypeError(`${name} must expose ${method}()`);
  }
}

function activeAt(commitment, at) {
  const instant = Date.parse(at);
  return Date.parse(commitment.startAt) <= instant
    && instant < Date.parse(commitment.endAt);
}

export function createInsideFibreAvailabilityService({
  livedNow,
  livedNowStore,
  workStore,
}) {
  requireMethod(livedNow, "Inside Fibre LivedNow", "ensure");
  requireMethod(livedNowStore, "Inside Fibre livedNowStore", "listPlans");
  requireMethod(livedNowStore, "Inside Fibre livedNowStore", "latestPlan");
  requireMethod(livedNowStore, "Inside Fibre livedNowStore", "getCurrentSituation");
  requireMethod(workStore, "Inside Fibre workStore", "listCommitments");

  function derive({ threadId, at, situation, requireExactTime }) {
    if (
      situation === null
      || situation.threadId !== threadId
      || Date.parse(situation.establishedAt) > Date.parse(at)
      || (requireExactTime && situation.establishedAt !== at)
      || situation.resolution?.observedDivergence === true
      || situation.mediatedContext !== INSIDE_FIBRE_VISITOR_WORK.mediatedContext
    ) {
      return null;
    }

    const governingPlan = livedNowStore
      .listPlans(threadId, { kind:"personal" })
      .find((plan) => plan.planId === situation.resolution?.governingPlanRef) ?? null;
    if (governingPlan === null) return null;
    const latest = livedNowStore.latestPlan(threadId, "personal", { at });
    if (latest?.planId !== governingPlan.planId) return null;

    const position = plannedPositionAt(governingPlan, at);
    if (
      position?.kind !== "at_place"
      || position.mediatedContext !== INSIDE_FIBRE_VISITOR_WORK.mediatedContext
    ) {
      return null;
    }

    const commitment = workStore.listCommitments(threadId)
      .filter((candidate) => activeAt(candidate, at))
      .find((candidate) =>
        candidate.mediatedContext === INSIDE_FIBRE_VISITOR_WORK.mediatedContext
        && governingPlan.sourceReferences.includes(candidate.commitmentId)
        && situation.evidenceRefs.includes(candidate.commitmentId)) ?? null;
    if (commitment === null) return null;

    return Object.freeze({
      threadId,
      commitmentId:commitment.commitmentId,
      startAt:commitment.startAt,
      endAt:commitment.endAt,
      mediatedContext:commitment.mediatedContext,
      situationId:situation.situationId,
      planId:governingPlan.planId,
    });
  }

  return Object.freeze({
    async current({ threadId, at }) {
      assertId("Inside Fibre availability threadId", threadId);
      assertIsoTimestamp("Inside Fibre availability at", at);
      const situation = await livedNow.ensure({ threadId, at });
      return derive({ threadId, at, situation, requireExactTime:true });
    },

    currentFromSituation({ threadId, expectedSituationId, at }) {
      assertId("Inside Fibre availability threadId", threadId);
      assertId("Inside Fibre availability expectedSituationId", expectedSituationId);
      assertIsoTimestamp("Inside Fibre availability at", at);
      const situation = livedNowStore.getCurrentSituation(threadId);
      if (situation?.situationId !== expectedSituationId) return null;
      return derive({ threadId, at, situation, requireExactTime:false });
    },
  });
}
