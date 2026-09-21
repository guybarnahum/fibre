import {
  assertExactKeys,
  assertId,
  assertIsoTimestamp,
  assertPlainObject,
} from "./persistence-common.mjs";
import { formPersonalLivedPlan } from "./lived-plan-cognition.mjs";
import {
  livedSituationId,
  plannedPositionAt,
} from "./lived-now.mjs";
import { placeEpisodeRevisionRef } from "./situated-life-evidence.mjs";

const DAY_MS = 24 * 60 * 60 * 1000;
const FORWARD_PLAN_MS = 12 * 60 * 60 * 1000;
const MAX_RETROSPECTIVE_WINDOWS = 4;

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

function planCovers(plan, at) {
  return plan !== null && plannedPositionAt(plan, at) !== null;
}

function enact(livedNowStore, threadId, at, { materialization = null } = {}) {
  const personalPlan = livedNowStore.latestPlan(threadId, "personal", { at });
  if (!planCovers(personalPlan, at)) {
    throw new LivedNowCoverageError("LivedNow requires personal Flight Plan coverage at the requested time");
  }
  const carePlan = livedNowStore.latestPlan(threadId, "care", { at });
  const governingPlan = planForEnactment(personalPlan, carePlan, at);
  const observation = observationFromPlan(governingPlan, at);

  return livedNowStore.enactCurrentSituation({
    threadId,
    situationId: livedSituationId({
      kind: materialization === null ? "ensure_lived_now_v1" : "retrospective_lived_now_v1",
      threadId,
      at,
      governingPlanRef: governingPlan.planId,
      ...(materialization === null ? {} : { materializedAt: materialization.materializedAt }),
    }),
    establishedAt: at,
    observation,
    ...(materialization === null ? {} : { materialization }),
  });
}

function dormantWindows(from, to) {
  const start = Date.parse(from);
  const end = Date.parse(to);
  const duration = end - start;
  if (duration <= 0) return [];

  const count = Math.min(
    MAX_RETROSPECTIVE_WINDOWS,
    Math.max(1, Math.ceil(duration / DAY_MS)),
  );
  const windows = [];
  let cursor = from;
  for (let index = 0; index < count; index += 1) {
    const endAt = index === count - 1
      ? to
      : new Date(start + Math.round((duration * (index + 1)) / count)).toISOString();
    windows.push({ startAt: cursor, endAt });
    cursor = endAt;
  }
  return windows;
}

function activePlacesAt(situatedLifeStore, threadId, at) {
  const instant = Date.parse(at);
  return situatedLifeStore.listCurrentPlaceEpisodes(threadId)
    .filter((episode) =>
      Date.parse(episode.startAt) <= instant &&
      (episode.endAt === null || instant <= Date.parse(episode.endAt)))
    .map((episode) => ({
      ref: placeEpisodeRevisionRef(episode),
      displayName: episode.place.displayName,
    }));
}

function latestEventRefAt(worldStore, threadId, at) {
  const instant = Date.parse(at);
  const event = worldStore.listEvents(threadId)
    .filter((candidate) => Date.parse(candidate.occurredAt) <= instant)
    .at(-1);
  if (event === undefined) {
    throw new LivedNowCoverageError("Dormant catch-up has no prior Thread-event witness");
  }
  return event.eventId;
}

function retrospectivePlan(livedNowStore, threadId, startAt, endAt, materializedAt) {
  return livedNowStore.listPlans(threadId, { kind: "personal" }).find((plan) =>
    plan.authoredAt === startAt &&
    plan.horizonStart === startAt &&
    plan.horizonEnd === endAt &&
    plan.materialization?.mode === "retrospective" &&
    plan.materialization.materializedAt === materializedAt) ?? null;
}

function forwardPlan(livedNowStore, threadId, at) {
  const plan = livedNowStore.latestPlan(threadId, "personal", { at });
  if (
    planCovers(plan, at) &&
    plan.materialization === undefined &&
    Date.parse(plan.horizonEnd) > Date.parse(at)
  ) {
    return plan;
  }
  return null;
}

function personalPlanForSituation(livedNowStore, situation) {
  const refs = new Set(situation.sourcePlanRefs);
  return livedNowStore.listPlans(situation.threadId, { kind: "personal" })
    .find((plan) => refs.has(plan.planId)) ?? null;
}

function atPlaceRef(plan, at) {
  const position = plannedPositionAt(plan, at);
  if (position?.kind !== "at_place") {
    throw new LivedNowCoverageError("Dormant catch-up requires an at-place continuity boundary");
  }
  return position.location.placeRef;
}

function startingPlaceRef(situation) {
  if (situation.phase !== "at_place") {
    throw new LivedNowCoverageError("Dormant catch-up requires an at-place lived anchor");
  }
  return situation.location.placeRef;
}

function advanceThroughExistingPlan(livedNowStore, current, requestedAt) {
  const plan = personalPlanForSituation(livedNowStore, current);
  if (plan === null) return current;
  if (
    Date.parse(plan.horizonEnd) <= Date.parse(current.establishedAt) ||
    Date.parse(plan.horizonEnd) >= Date.parse(requestedAt) ||
    plannedPositionAt(plan, plan.horizonEnd) === null
  ) {
    return current;
  }
  return enact(livedNowStore, current.threadId, plan.horizonEnd, {
    materialization: {
      mode: "retrospective",
      materializedAt: requestedAt,
    },
  });
}

function requireCatchUpDependencies({ worldStore, situatedLifeStore, modelAdapter }) {
  requireMethod(worldStore, "getThread");
  requireMethod(worldStore, "listEvents");
  requireMethod(situatedLifeStore, "listCurrentPlaceEpisodes");
  requireMethod(modelAdapter, "invoke");
}

async function formPlan({
  livedNowStore,
  worldStore,
  situatedLifeStore,
  modelAdapter,
  thread,
  threadId,
  startAt,
  endAt,
  startingPlace,
  materializedAt = null,
}) {
  const existing = materializedAt === null
    ? forwardPlan(livedNowStore, threadId, startAt)
    : retrospectivePlan(livedNowStore, threadId, startAt, endAt, materializedAt);
  if (existing !== null) return existing;

  const places = activePlacesAt(situatedLifeStore, threadId, startAt);
  if (places.length === 0) {
    throw new LivedNowCoverageError("Dormant catch-up has no grounded place available at the lived time");
  }
  if (!places.some((place) => place.ref === startingPlace)) {
    throw new LivedNowCoverageError("Dormant catch-up cannot continue from an ungrounded prior place");
  }

  const plan = await formPersonalLivedPlan({
    thread,
    authoredAt: startAt,
    horizonEnd: endAt,
    availablePlaces: places,
    sourceReferences: [latestEventRefAt(worldStore, threadId, startAt)],
    modelAdapter,
    startingPlaceRef: startingPlace,
    ...(materializedAt === null ? {} : { materializedAt }),
  });
  return livedNowStore.recordPlan(plan);
}

async function catchUpDormantInterval({
  livedNowStore,
  worldStore,
  situatedLifeStore,
  modelAdapter,
  threadId,
  current,
  at,
}) {
  requireCatchUpDependencies({ worldStore, situatedLifeStore, modelAdapter });

  let anchor = advanceThroughExistingPlan(livedNowStore, current, at);
  const thread = worldStore.getThread(threadId);
  let placeRef = startingPlaceRef(anchor);
  const windows = dormantWindows(anchor.establishedAt, at);
  let finalRetrospectivePlan = null;

  for (let index = 0; index < windows.length; index += 1) {
    const window = windows[index];
    const plan = await formPlan({
      livedNowStore,
      worldStore,
      situatedLifeStore,
      modelAdapter,
      thread,
      threadId,
      startAt: window.startAt,
      endAt: window.endAt,
      startingPlace: placeRef,
      materializedAt: at,
    });
    finalRetrospectivePlan = plan;
    placeRef = atPlaceRef(plan, window.endAt);

    if (index < windows.length - 1) {
      anchor = enact(livedNowStore, threadId, window.endAt, {
        materialization: {
          mode: "retrospective",
          materializedAt: at,
        },
      });
    }
  }

  if (finalRetrospectivePlan !== null) {
    placeRef = atPlaceRef(finalRetrospectivePlan, at);
  }

  const futureEnd = new Date(Date.parse(at) + FORWARD_PLAN_MS).toISOString();
  await formPlan({
    livedNowStore,
    worldStore,
    situatedLifeStore,
    modelAdapter,
    thread,
    threadId,
    startAt: at,
    endAt: futureEnd,
    startingPlace: placeRef,
  });
}

export function createLivedNowService({
  livedNowStore,
  worldStore = null,
  situatedLifeStore = null,
  modelAdapter = null,
} = {}) {
  requireMethod(livedNowStore, "getCurrentSituation");
  requireMethod(livedNowStore, "latestPlan");
  requireMethod(livedNowStore, "listPlans");
  requireMethod(livedNowStore, "recordPlan");
  requireMethod(livedNowStore, "enactCurrentSituation");

  return Object.freeze({
    async ensure(input) {
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
      if (planCovers(personalPlan, input.at)) {
        return enact(livedNowStore, input.threadId, input.at);
      }

      if (current === null) {
        throw new LivedNowCoverageError(
          "Dormant catch-up requires an authoritative lived anchor before the requested time",
        );
      }
      if (worldStore === null || situatedLifeStore === null || modelAdapter === null) {
        throw new LivedNowCoverageError(
          "LivedNow requires retrospective catch-up before the requested time",
        );
      }

      await catchUpDormantInterval({
        livedNowStore,
        worldStore,
        situatedLifeStore,
        modelAdapter,
        threadId: input.threadId,
        current,
        at: input.at,
      });
      return enact(livedNowStore, input.threadId, input.at);
    },
  });
}
