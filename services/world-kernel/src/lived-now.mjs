import {
  assertExactKeys,
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
  assertStringArray,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import { ageYearsAt } from "./visual-identity-reference-domain.mjs";

export const LIVED_PLAN_KINDS = Object.freeze(["personal", "care"]);
export const CARE_CONSTRAINTS = Object.freeze(["preferred", "required"]);

function assertEnum(name, value, allowed) {
  if (!allowed.includes(value)) throw new TypeError(`${name} is invalid`);
}

function normalizeIds(name, value, { required = false } = {}) {
  assertStringArray(name, value);
  if (required && value.length === 0) throw new TypeError(`${name} must not be empty`);
  if (new Set(value).size !== value.length) throw new TypeError(`${name} must be unique`);
  value.forEach((item, index) => assertId(`${name}[${index}]`, item));
  return [...value];
}

function nullableText(name, value) {
  if (value === null) return null;
  assertNonEmpty(name, value);
  return value;
}

function normalizeOwner(value) {
  assertPlainObject("lived plan.owner", value);
  assertExactKeys("lived plan.owner", value, ["partyId", "kind"]);
  assertId("lived plan.owner.partyId", value.partyId);
  assertEnum("lived plan.owner.kind", value.kind, ["thread", "human_source"]);
  return { partyId: value.partyId, kind: value.kind };
}

function normalizeAuthority(value) {
  assertPlainObject("care plan.authority", value);
  assertExactKeys("care plan.authority", value, ["relationRef", "scope", "constraint"]);
  assertId("care plan.authority.relationRef", value.relationRef);
  assertNonEmpty("care plan.authority.scope", value.scope);
  assertEnum("care plan.authority.constraint", value.constraint, CARE_CONSTRAINTS);
  return {
    relationRef: value.relationRef,
    scope: value.scope,
    constraint: value.constraint,
  };
}

function normalizeCognition(value) {
  assertPlainObject("personal plan.cognition", value);
  assertExactKeys("personal plan.cognition", value, ["provider", "modelId", "providerRequestId"]);
  assertNonEmpty("personal plan.cognition.provider", value.provider);
  assertNonEmpty("personal plan.cognition.modelId", value.modelId);
  if (value.providerRequestId !== null) assertNonEmpty("personal plan.cognition.providerRequestId", value.providerRequestId);
  return {
    provider: value.provider,
    modelId: value.modelId,
    providerRequestId: value.providerRequestId,
  };
}

function normalizeStop(value, index) {
  const name = `lived plan.stops[${index}]`;
  assertPlainObject(name, value);
  assertExactKeys(name, value, [
    "startAt",
    "endAt",
    "physicalPlaceRef",
    "mediatedContext",
    "activity",
    "purpose",
    "companionRefs",
    "travelFromPrevious",
  ]);
  assertIsoTimestamp(`${name}.startAt`, value.startAt);
  assertIsoTimestamp(`${name}.endAt`, value.endAt);
  if (Date.parse(value.endAt) <= Date.parse(value.startAt)) {
    throw new TypeError(`${name}.endAt must follow startAt`);
  }
  assertId(`${name}.physicalPlaceRef`, value.physicalPlaceRef);
  const mediatedContext = nullableText(`${name}.mediatedContext`, value.mediatedContext);
  assertNonEmpty(`${name}.activity`, value.activity);
  assertNonEmpty(`${name}.purpose`, value.purpose);
  const companionRefs = normalizeIds(`${name}.companionRefs`, value.companionRefs);
  const travelFromPrevious = nullableText(`${name}.travelFromPrevious`, value.travelFromPrevious);
  return {
    startAt: value.startAt,
    endAt: value.endAt,
    physicalPlaceRef: value.physicalPlaceRef,
    mediatedContext,
    activity: value.activity,
    purpose: value.purpose,
    companionRefs,
    travelFromPrevious,
  };
}

function normalizeLocation(value) {
  assertPlainObject("current situation.location", value);
  assertNonEmpty("current situation.location.kind", value.kind);
  if (value.kind === "place") {
    assertExactKeys("current situation.location", value, ["kind", "placeRef"]);
    assertId("current situation.location.placeRef", value.placeRef);
    return { kind: "place", placeRef: value.placeRef };
  }
  if (value.kind === "transit") {
    assertExactKeys("current situation.location", value, ["kind", "fromPlaceRef", "toPlaceRef"]);
    assertId("current situation.location.fromPlaceRef", value.fromPlaceRef);
    assertId("current situation.location.toPlaceRef", value.toPlaceRef);
    if (value.fromPlaceRef === value.toPlaceRef) {
      throw new TypeError("transit location requires distinct places");
    }
    return {
      kind: "transit",
      fromPlaceRef: value.fromPlaceRef,
      toPlaceRef: value.toPlaceRef,
    };
  }
  throw new TypeError("current situation.location.kind is invalid");
}

export function livedPlanId(seed) {
  return `lplan_${sha256(canonicalJson(seed))}`;
}

export function livedSituationId(seed) {
  return `sit_${sha256(canonicalJson(seed))}`;
}

export function developmentalContextForThread(thread, at) {
  assertPlainObject("Thread", thread);
  assertId("Thread.threadId", thread.threadId);
  assertIsoTimestamp("developmental context at", at);
  assertPlainObject("Thread.identity", thread.identity);
  assertNonEmpty("Thread.identity.selfDescription", thread.identity.selfDescription);

  const birthDate = thread.identity.birthDate ?? null;
  const ageYears = ageYearsAt(birthDate, at);
  const needs = [...(thread.currentState?.needs ?? [])];
  const feelings = [...(thread.currentState?.feelings ?? [])];
  const unresolvedIntentions = [...(thread.currentState?.unresolvedIntentions ?? [])];
  const selfModel = thread.currentState?.selfModel ?? thread.identity.selfDescription;
  assertStringArray("Thread.currentState.needs", needs);
  assertStringArray("Thread.currentState.feelings", feelings);
  assertStringArray("Thread.currentState.unresolvedIntentions", unresolvedIntentions);
  assertNonEmpty("Thread.currentState.selfModel", selfModel);

  return {
    threadId: thread.threadId,
    birthDate,
    ageYears,
    selfDescription: thread.identity.selfDescription,
    selfModel,
    needs,
    feelings,
    unresolvedIntentions,
  };
}

export function normalizeLivedPlan(value) {
  assertPlainObject("lived plan", value);
  assertExactKeys("lived plan", value, [
    "planId",
    "kind",
    "subjectThreadId",
    "owner",
    "authoredAt",
    "horizonStart",
    "horizonEnd",
    "stops",
    "sourceReferences",
    "authority",
    "cognition",
  ]);
  assertId("lived plan.planId", value.planId);
  assertEnum("lived plan.kind", value.kind, LIVED_PLAN_KINDS);
  assertId("lived plan.subjectThreadId", value.subjectThreadId);
  const owner = normalizeOwner(value.owner);
  assertIsoTimestamp("lived plan.authoredAt", value.authoredAt);
  assertIsoTimestamp("lived plan.horizonStart", value.horizonStart);
  assertIsoTimestamp("lived plan.horizonEnd", value.horizonEnd);
  if (Date.parse(value.horizonStart) < Date.parse(value.authoredAt)) {
    throw new TypeError("lived plan horizon cannot start before it was authored");
  }
  if (Date.parse(value.horizonEnd) <= Date.parse(value.horizonStart)) {
    throw new TypeError("lived plan horizonEnd must follow horizonStart");
  }
  if (!Array.isArray(value.stops) || value.stops.length === 0) {
    throw new TypeError("lived plan.stops must not be empty");
  }
  const stops = value.stops.map(normalizeStop);
  for (let index = 0; index < stops.length; index += 1) {
    const stop = stops[index];
    if (
      Date.parse(stop.startAt) < Date.parse(value.horizonStart) ||
      Date.parse(stop.endAt) > Date.parse(value.horizonEnd)
    ) {
      throw new TypeError(`lived plan.stops[${index}] falls outside the plan horizon`);
    }
    if (index === 0) {
      if (stop.travelFromPrevious !== null) {
        throw new TypeError("first lived plan stop cannot have travelFromPrevious");
      }
      continue;
    }
    const previous = stops[index - 1];
    if (Date.parse(stop.startAt) < Date.parse(previous.endAt)) {
      throw new TypeError("lived plan stops cannot overlap or run backward");
    }
    if (stop.physicalPlaceRef !== previous.physicalPlaceRef && stop.travelFromPrevious === null) {
      throw new TypeError("a stop at a different physical place requires travelFromPrevious");
    }
  }
  const sourceReferences = normalizeIds("lived plan.sourceReferences", value.sourceReferences, { required: true });

  let authority;
  let cognition;
  if (value.kind === "personal") {
    if (owner.kind !== "thread" || owner.partyId !== value.subjectThreadId) {
      throw new TypeError("personal plan must be owned by its subject Thread");
    }
    if (value.authority !== undefined) throw new TypeError("personal plan cannot carry care authority");
    if (value.cognition === undefined) throw new TypeError("personal plan requires Thread cognition provenance");
    cognition = normalizeCognition(value.cognition);
  } else {
    if (owner.partyId === value.subjectThreadId) {
      throw new TypeError("care plan owner must be distinct from its subject Thread");
    }
    if (value.authority === undefined) throw new TypeError("care plan requires authority");
    if (value.cognition !== undefined) throw new TypeError("care plan cannot carry Thread cognition provenance");
    authority = normalizeAuthority(value.authority);
    if (!sourceReferences.includes(authority.relationRef)) {
      throw new TypeError("care plan sourceReferences must include its authority relationRef");
    }
  }

  return {
    planId: value.planId,
    kind: value.kind,
    subjectThreadId: value.subjectThreadId,
    owner,
    authoredAt: value.authoredAt,
    horizonStart: value.horizonStart,
    horizonEnd: value.horizonEnd,
    stops,
    sourceReferences,
    ...(authority === undefined ? {} : { authority }),
    ...(cognition === undefined ? {} : { cognition }),
  };
}

export function plannedPositionAt(planCandidate, at) {
  const plan = normalizeLivedPlan(planCandidate);
  assertIsoTimestamp("planned position at", at);
  const instant = Date.parse(at);
  if (instant < Date.parse(plan.horizonStart) || instant > Date.parse(plan.horizonEnd)) return null;

  for (let index = 0; index < plan.stops.length; index += 1) {
    const stop = plan.stops[index];
    const isLastAtHorizonEnd = index === plan.stops.length - 1 && instant === Date.parse(plan.horizonEnd);
    if (instant >= Date.parse(stop.startAt) && (instant < Date.parse(stop.endAt) || isLastAtHorizonEnd)) {
      return {
        kind: "at_place",
        location: { kind: "place", placeRef: stop.physicalPlaceRef },
        mediatedContext: stop.mediatedContext,
        activity: stop.activity,
        reason: stop.purpose,
        participantRefs: stop.companionRefs,
      };
    }
  }

  let previous = null;
  let next = null;
  for (let index = 0; index < plan.stops.length; index += 1) {
    const stop = plan.stops[index];
    if (Date.parse(stop.endAt) <= instant) previous = stop;
    if (Date.parse(stop.startAt) > instant) {
      next = stop;
      break;
    }
  }
  if (previous === null || next === null) return null;

  if (previous.physicalPlaceRef !== next.physicalPlaceRef) {
    return {
      kind: "in_transit",
      location: {
        kind: "transit",
        fromPlaceRef: previous.physicalPlaceRef,
        toPlaceRef: next.physicalPlaceRef,
      },
      mediatedContext: null,
      activity: next.travelFromPrevious,
      reason: next.purpose,
      participantRefs: next.companionRefs,
    };
  }

  return {
    kind: "at_place",
    location: { kind: "place", placeRef: previous.physicalPlaceRef },
    mediatedContext: null,
    activity: "Unstructured time between planned commitments.",
    reason: "The flight plan leaves this interval open.",
    participantRefs: [],
  };
}

export function normalizeCurrentSituation(value) {
  assertPlainObject("current situation", value);
  assertExactKeys("current situation", value, [
    "situationId",
    "threadId",
    "establishedAt",
    "phase",
    "location",
    "mediatedContext",
    "activity",
    "reason",
    "participantRefs",
    "sourcePlanRefs",
    "resolution",
    "provenance",
  ]);
  assertId("current situation.situationId", value.situationId);
  assertId("current situation.threadId", value.threadId);
  assertIsoTimestamp("current situation.establishedAt", value.establishedAt);
  assertEnum("current situation.phase", value.phase, ["at_place", "in_transit"]);
  const location = normalizeLocation(value.location);
  if (value.phase === "at_place" && location.kind !== "place") {
    throw new TypeError("at-place situation requires a place location");
  }
  if (value.phase === "in_transit" && location.kind !== "transit") {
    throw new TypeError("in-transit situation requires a transit location");
  }
  const mediatedContext = nullableText("current situation.mediatedContext", value.mediatedContext);
  assertNonEmpty("current situation.activity", value.activity);
  assertNonEmpty("current situation.reason", value.reason);
  const participantRefs = normalizeIds("current situation.participantRefs", value.participantRefs);
  const sourcePlanRefs = normalizeIds("current situation.sourcePlanRefs", value.sourcePlanRefs, { required: true });
  assertPlainObject("current situation.resolution", value.resolution);
  assertExactKeys("current situation.resolution", value.resolution, [
    "kind",
    "conflict",
    "enactedPlanRef",
    "constrainedPlanRef",
    "summary",
  ]);
  assertEnum("current situation.resolution.kind", value.resolution.kind, ["personal_plan", "care_constraint"]);
  if (typeof value.resolution.conflict !== "boolean") throw new TypeError("current situation.resolution.conflict must be boolean");
  assertId("current situation.resolution.enactedPlanRef", value.resolution.enactedPlanRef);
  if (value.resolution.constrainedPlanRef !== null) {
    assertId("current situation.resolution.constrainedPlanRef", value.resolution.constrainedPlanRef);
  }
  assertNonEmpty("current situation.resolution.summary", value.resolution.summary);
  if (value.provenance !== "world_enacted") {
    throw new TypeError("current situation provenance must be world_enacted");
  }

  return {
    situationId: value.situationId,
    threadId: value.threadId,
    establishedAt: value.establishedAt,
    phase: value.phase,
    location,
    mediatedContext,
    activity: value.activity,
    reason: value.reason,
    participantRefs,
    sourcePlanRefs,
    resolution: {
      kind: value.resolution.kind,
      conflict: value.resolution.conflict,
      enactedPlanRef: value.resolution.enactedPlanRef,
      constrainedPlanRef: value.resolution.constrainedPlanRef,
      summary: value.resolution.summary,
    },
    provenance: "world_enacted",
  };
}

function positionsConflict(left, right) {
  return canonicalJson({
    location: left.location,
    mediatedContext: left.mediatedContext,
    activity: left.activity,
    participantRefs: left.participantRefs,
  }) !== canonicalJson({
    location: right.location,
    mediatedContext: right.mediatedContext,
    activity: right.activity,
    participantRefs: right.participantRefs,
  });
}

export function resolveCurrentSituation(input) {
  assertPlainObject("current situation resolution input", input);
  assertExactKeys("current situation resolution input", input, [
    "situationId",
    "establishedAt",
    "personalPlan",
    "carePlan",
  ]);
  assertId("current situation resolution input.situationId", input.situationId);
  assertIsoTimestamp("current situation resolution input.establishedAt", input.establishedAt);
  const personal = normalizeLivedPlan(input.personalPlan);
  if (personal.kind !== "personal") throw new TypeError("current situation requires a personal plan");
  const personalPosition = plannedPositionAt(personal, input.establishedAt);
  if (personalPosition === null) throw new TypeError("personal flight plan has no position at enactment time");

  const care = input.carePlan === null ? null : normalizeLivedPlan(input.carePlan);
  if (care !== null && care.subjectThreadId !== personal.subjectThreadId) {
    throw new TypeError("personal and care plans must have the same subject Thread");
  }
  const carePosition = care === null ? null : plannedPositionAt(care, input.establishedAt);
  const conflict = carePosition !== null && positionsConflict(personalPosition, carePosition);
  const careConstrains = conflict && care.authority.constraint === "required";
  const enacted = careConstrains ? carePosition : personalPosition;
  const sourcePlanRefs = carePosition === null ? [personal.planId] : [personal.planId, care.planId];

  return normalizeCurrentSituation({
    situationId: input.situationId,
    threadId: personal.subjectThreadId,
    establishedAt: input.establishedAt,
    phase: enacted.kind,
    location: enacted.location,
    mediatedContext: enacted.mediatedContext,
    activity: enacted.activity,
    reason: enacted.reason,
    participantRefs: enacted.participantRefs,
    sourcePlanRefs,
    resolution: careConstrains
      ? {
          kind: "care_constraint",
          conflict: true,
          enactedPlanRef: care.planId,
          constrainedPlanRef: personal.planId,
          summary: "A required caregiver plan constrained the enacted itinerary without replacing the Thread's own flight plan.",
        }
      : {
          kind: "personal_plan",
          conflict,
          enactedPlanRef: personal.planId,
          constrainedPlanRef: null,
          summary: carePosition === null
            ? "The World enacted the Thread's current flight-plan position."
            : conflict
              ? "The caregiver itinerary differed but did not have required authority to constrain this moment."
              : "The personal and caregiver itineraries were compatible at this moment.",
        },
    provenance: "world_enacted",
  });
}
