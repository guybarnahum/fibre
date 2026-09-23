import {
  assertId,
} from "./persistence-common.mjs";
import { formPersonalLivedPlan } from "./lived-plan-cognition.mjs";
import { plannedPositionAt } from "./lived-now.mjs";

function requireMethod(owner, name, method) {
  if (!owner || typeof owner[method] !== "function") {
    throw new TypeError(`${name} must expose ${method}()`);
  }
}

function existingPlanPlaces(plan) {
  const seen = new Set();
  const places = [];
  for (const stop of plan.stops) {
    if (seen.has(stop.physicalPlaceRef)) continue;
    seen.add(stop.physicalPlaceRef);
    places.push({
      ref:stop.physicalPlaceRef,
      displayName:stop.physicalPlaceRef,
    });
  }
  return places;
}

export async function replanForAcceptedInsideFibreWork({
  commitmentId,
  workStore,
  livedNowStore,
  worldStore,
  identityStore,
  semanticStateStore,
  memoryStore,
  situatedLifeStore,
  modelAdapter,
}) {
  assertId("Inside Fibre work commitmentId", commitmentId);
  requireMethod(workStore, "Inside Fibre workStore", "getCommitment");
  requireMethod(livedNowStore, "Inside Fibre livedNowStore", "latestPlan");
  requireMethod(livedNowStore, "Inside Fibre livedNowStore", "recordPlan");
  requireMethod(livedNowStore, "Inside Fibre livedNowStore", "getWorldContext");
  requireMethod(worldStore, "Inside Fibre worldStore", "getThread");
  requireMethod(identityStore, "Inside Fibre identityStore", "getCurrentIdentityView");
  requireMethod(semanticStateStore, "Inside Fibre semanticStateStore", "listCurrentState");
  requireMethod(memoryStore, "Inside Fibre memoryStore", "listCurrentMemories");
  requireMethod(situatedLifeStore, "Inside Fibre situatedLifeStore", "listCurrentLifeRelations");
  requireMethod(modelAdapter, "Inside Fibre planning modelAdapter", "invoke");

  const commitment = workStore.getCommitment(commitmentId);
  const priorPlan = livedNowStore.latestPlan(
    commitment.threadId,
    "personal",
    { at:commitment.acceptedAt },
  );
  if (priorPlan === null) {
    throw new TypeError("accepted Inside Fibre work requires an existing personal Flight Plan");
  }

  const position = plannedPositionAt(priorPlan, commitment.acceptedAt);
  if (position?.kind !== "at_place") {
    return Object.freeze({
      state:"awaiting_at_place",
      commitment,
      priorPlan,
      plan:null,
    });
  }

  const horizonEnd = new Date(Math.max(
    Date.parse(priorPlan.horizonEnd),
    Date.parse(commitment.endAt),
  )).toISOString();

  const plan = await formPersonalLivedPlan({
    threadId:commitment.threadId,
    authoredAt:commitment.acceptedAt,
    horizonEnd,
    availablePlaces:existingPlanPlaces(priorPlan),
    startingPlaceRef:position.location.placeRef,
    sourceReferences:[...priorPlan.sourceReferences],
    sourceStores:{
      worldStore,
      identityStore,
      semanticStateStore,
      memoryStore,
      situatedLifeStore,
    },
    modelAdapter,
    worldTimeZone:livedNowStore.getWorldContext(
      commitment.threadId,
      { required:false },
    )?.timeZone ?? null,
    requiredWorkCommitments:[commitment],
  });

  return Object.freeze({
    state:"planned",
    commitment,
    priorPlan,
    plan:livedNowStore.recordPlan(plan),
  });
}
