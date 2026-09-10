import {
  assessCareConstrainedPresence,
  assessFlightPlanPresence,
  observationFromCurrentSituation,
} from "./flight-plan-regulation.mjs";

function requireMethod(owner, name) {
  if (!owner || typeof owner[name] !== "function") {
    throw new TypeError(`${name} is required for current-life projection`);
  }
}

function personalView(assessment) {
  if (assessment === null) return null;
  return {
    status: assessment.status,
    intended: assessment.intended,
    presenceTarget: assessment.presenceTarget,
  };
}

export function projectCurrentLife({
  threadId,
  livedNowStore,
  semanticStateStore,
  organismTrace = null,
}) {
  requireMethod(livedNowStore, "getCurrentSituation");
  requireMethod(livedNowStore, "latestPlan");
  requireMethod(semanticStateStore, "listCurrentState");

  const semanticStates = semanticStateStore.listCurrentState(threadId);
  const now = livedNowStore.getCurrentSituation(threadId);
  if (now === null) {
    return {
      threadId,
      asOf: null,
      now: null,
      flightPlan: null,
      carePlan: null,
      planVsLived: null,
      semanticStates,
      organismTrace,
      provenance: {
        situationId: null,
        planRefs: [],
        worldEvidenceRefs: [],
        semanticStateIds: semanticStates.map((state) => state.stateId),
      },
    };
  }

  const at = now.establishedAt;
  const flightPlan = livedNowStore.latestPlan(threadId, "personal", { at });
  const carePlan = livedNowStore.latestPlan(threadId, "care", { at });
  const observation = observationFromCurrentSituation(now);
  const personal = flightPlan === null
    ? null
    : assessFlightPlanPresence({ plan: flightPlan, at, observation });

  let careRequirement = null;
  if (
    flightPlan !== null &&
    carePlan !== null &&
    now.resolution.kind === "care_constraint" &&
    now.resolution.governingPlanRef === carePlan.planId &&
    now.resolution.constrainedPlanRef === flightPlan.planId
  ) {
    careRequirement = assessCareConstrainedPresence({
      personalPlan: flightPlan,
      carePlan,
      currentSituation: now,
    }).careRequirement;
  }

  return {
    threadId,
    asOf: at,
    now,
    flightPlan,
    carePlan,
    planVsLived: personal === null ? null : {
      personal: personalView(personal),
      careRequirement,
      resolution: now.resolution,
    },
    semanticStates,
    organismTrace,
    provenance: {
      situationId: now.situationId,
      planRefs: [...now.sourcePlanRefs],
      worldEvidenceRefs: [...now.evidenceRefs],
      semanticStateIds: semanticStates.map((state) => state.stateId),
    },
  };
}
