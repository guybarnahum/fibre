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
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;

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

function unit(name, value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new TypeError(`${name} must be between 0 and 1`);
  }
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
  assertExactKeys("personal plan.cognition", value, [
    "provider",
    "modelId",
    "providerRequestId",
    "implementationProfile",
    "sourceThreadVersion",
    "selectedEvidenceRefs",
    "evidenceRefs",
    "contextDigest",
  ]);
  assertNonEmpty("personal plan.cognition.provider", value.provider);
  assertNonEmpty("personal plan.cognition.modelId", value.modelId);
  if (value.providerRequestId !== null) assertNonEmpty("personal plan.cognition.providerRequestId", value.providerRequestId);

  const hasInteriorWitness = [
    value.implementationProfile,
    value.sourceThreadVersion,
    value.selectedEvidenceRefs,
    value.evidenceRefs,
    value.contextDigest,
  ].some((item) => item !== undefined);
  if (!hasInteriorWitness) {
    return {
      provider:value.provider,
      modelId:value.modelId,
      providerRequestId:value.providerRequestId,
    };
  }

  assertPlainObject("personal plan.cognition.implementationProfile", value.implementationProfile);
  assertExactKeys("personal plan.cognition.implementationProfile", value.implementationProfile, ["id", "version"]);
  assertId("personal plan.cognition.implementationProfile.id", value.implementationProfile.id);
  assertNonEmpty("personal plan.cognition.implementationProfile.version", value.implementationProfile.version);
  if (!Number.isSafeInteger(value.sourceThreadVersion) || value.sourceThreadVersion < 1) {
    throw new TypeError("personal plan.cognition.sourceThreadVersion must be a positive safe integer");
  }
  const selectedEvidenceRefs = normalizeIds(
    "personal plan.cognition.selectedEvidenceRefs",
    value.selectedEvidenceRefs,
  );
  const evidenceRefs = normalizeIds("personal plan.cognition.evidenceRefs", value.evidenceRefs);
  const selected = new Set(selectedEvidenceRefs);
  for (const ref of evidenceRefs) {
    if (!selected.has(ref)) {
      throw new TypeError("personal plan.cognition.evidenceRefs must be selected Interior Cognition evidence");
    }
  }
  if (typeof value.contextDigest !== "string" || !SHA256_PATTERN.test(value.contextDigest)) {
    throw new TypeError("personal plan.cognition.contextDigest must be a SHA-256 digest");
  }

  return {
    provider:value.provider,
    modelId:value.modelId,
    providerRequestId:value.providerRequestId,
    implementationProfile:{
      id:value.implementationProfile.id,
      version:value.implementationProfile.version,
    },
    sourceThreadVersion:value.sourceThreadVersion,
    selectedEvidenceRefs,
    evidenceRefs,
    contextDigest:value.contextDigest,
  };
}

function normalizeRetrospectiveMaterialization(name, value, livedThrough) {
  assertPlainObject(name, value);
  assertExactKeys(name, value, ["mode", "materializedAt"]);
  if (value.mode !== "retrospective") throw new TypeError(`${name}.mode must be retrospective`);
  assertIsoTimestamp(`${name}.materializedAt`, value.materializedAt);
  if (Date.parse(value.materializedAt) < Date.parse(livedThrough)) {
    throw new TypeError(`${name}.materializedAt cannot precede lived chronology`);
  }
  return {
    mode: "retrospective",
    materializedAt: value.materializedAt,
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

function normalizeObservedLocation(value) {
  assertPlainObject("current situation.location", value);
  assertNonEmpty("current situation.location.kind", value.kind);
  if (value.kind === "place") {
    assertExactKeys("current situation.location", value, ["kind", "placeRef"]);
    assertId("current situation.location.placeRef", value.placeRef);
    return { kind: "place", placeRef: value.placeRef };
  }
  if (value.kind === "transit") {
    assertExactKeys("current situation.location", value, ["kind", "fromPlaceRef", "toPlaceRef", "progress"]);
    assertId("current situation.location.fromPlaceRef", value.fromPlaceRef);
    assertId("current situation.location.toPlaceRef", value.toPlaceRef);
    if (value.fromPlaceRef === value.toPlaceRef) {
      throw new TypeError("transit location requires distinct places");
    }
    return {
      kind: "transit",
      fromPlaceRef: value.fromPlaceRef,
      toPlaceRef: value.toPlaceRef,
      progress: unit("current situation.location.progress", value.progress),
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
    "materialization",
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
  const materialization = value.materialization === undefined
    ? undefined
    : normalizeRetrospectiveMaterialization(
        "lived plan.materialization",
        value.materialization,
        value.horizonEnd,
      );

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
    ...(materialization === undefined ? {} : { materialization }),
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

export function normalizeWorldObservation(value) {
  assertPlainObject("World observation", value);
  assertExactKeys("World observation", value, [
    "phase",
    "location",
    "mediatedContext",
    "activity",
    "reason",
    "participantRefs",
    "evidenceRefs",
  ]);
  assertEnum("World observation.phase", value.phase, ["at_place", "in_transit"]);
  const location = normalizeObservedLocation(value.location);
  if (value.phase === "at_place" && location.kind !== "place") {
    throw new TypeError("at-place World observation requires a place location");
  }
  if (value.phase === "in_transit" && location.kind !== "transit") {
    throw new TypeError("in-transit World observation requires a transit location");
  }
  const mediatedContext = nullableText("World observation.mediatedContext", value.mediatedContext);
  assertNonEmpty("World observation.activity", value.activity);
  assertNonEmpty("World observation.reason", value.reason);
  const participantRefs = normalizeIds("World observation.participantRefs", value.participantRefs);
  const evidenceRefs = normalizeIds("World observation.evidenceRefs", value.evidenceRefs, { required: true });
  return {
    phase: value.phase,
    location,
    mediatedContext,
    activity: value.activity,
    reason: value.reason,
    participantRefs,
    evidenceRefs,
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
    "evidenceRefs",
    "sourcePlanRefs",
    "resolution",
    "provenance",
    "materialization",
  ]);
  assertId("current situation.situationId", value.situationId);
  assertId("current situation.threadId", value.threadId);
  assertIsoTimestamp("current situation.establishedAt", value.establishedAt);
  const observation = normalizeWorldObservation({
    phase: value.phase,
    location: value.location,
    mediatedContext: value.mediatedContext,
    activity: value.activity,
    reason: value.reason,
    participantRefs: value.participantRefs,
    evidenceRefs: value.evidenceRefs,
  });
  const sourcePlanRefs = normalizeIds("current situation.sourcePlanRefs", value.sourcePlanRefs, { required: true });
  assertPlainObject("current situation.resolution", value.resolution);
  assertExactKeys("current situation.resolution", value.resolution, [
    "kind",
    "conflict",
    "observedDivergence",
    "governingPlanRef",
    "constrainedPlanRef",
    "summary",
  ]);
  assertEnum("current situation.resolution.kind", value.resolution.kind, ["personal_plan", "care_constraint"]);
  if (typeof value.resolution.conflict !== "boolean") throw new TypeError("current situation.resolution.conflict must be boolean");
  if (typeof value.resolution.observedDivergence !== "boolean") {
    throw new TypeError("current situation.resolution.observedDivergence must be boolean");
  }
  assertId("current situation.resolution.governingPlanRef", value.resolution.governingPlanRef);
  if (value.resolution.constrainedPlanRef !== null) {
    assertId("current situation.resolution.constrainedPlanRef", value.resolution.constrainedPlanRef);
  }
  assertNonEmpty("current situation.resolution.summary", value.resolution.summary);
  if (value.provenance !== "world_enacted") {
    throw new TypeError("current situation provenance must be world_enacted");
  }
  const materialization = value.materialization === undefined
    ? undefined
    : normalizeRetrospectiveMaterialization(
        "current situation.materialization",
        value.materialization,
        value.establishedAt,
      );

  return {
    situationId: value.situationId,
    threadId: value.threadId,
    establishedAt: value.establishedAt,
    ...observation,
    sourcePlanRefs,
    resolution: {
      kind: value.resolution.kind,
      conflict: value.resolution.conflict,
      observedDivergence: value.resolution.observedDivergence,
      governingPlanRef: value.resolution.governingPlanRef,
      constrainedPlanRef: value.resolution.constrainedPlanRef,
      summary: value.resolution.summary,
    },
    provenance: "world_enacted",
    ...(materialization === undefined ? {} : { materialization }),
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

function observationDivergesFrom(position, observation) {
  if (position.kind !== observation.phase) return true;
  if (position.kind === "at_place") {
    return position.location.placeRef !== observation.location.placeRef ||
      position.mediatedContext !== observation.mediatedContext ||
      position.activity !== observation.activity ||
      canonicalJson(position.participantRefs) !== canonicalJson(observation.participantRefs);
  }
  return observation.location.kind !== "transit" ||
    position.location.fromPlaceRef !== observation.location.fromPlaceRef ||
    position.location.toPlaceRef !== observation.location.toPlaceRef;
}

export function resolveCurrentSituation(input) {
  assertPlainObject("current situation resolution input", input);
  assertExactKeys("current situation resolution input", input, [
    "situationId",
    "establishedAt",
    "personalPlan",
    "carePlan",
    "observation",
    "materialization",
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
  const governingPosition = careConstrains ? carePosition : personalPosition;
  const governingPlan = careConstrains ? care : personal;
  const observation = normalizeWorldObservation(input.observation);
  const sourcePlanRefs = carePosition === null ? [personal.planId] : [personal.planId, care.planId];
  const observedDivergence = observationDivergesFrom(governingPosition, observation);

  return normalizeCurrentSituation({
    situationId: input.situationId,
    threadId: personal.subjectThreadId,
    establishedAt: input.establishedAt,
    ...observation,
    sourcePlanRefs,
    resolution: careConstrains
      ? {
          kind: "care_constraint",
          conflict: true,
          observedDivergence,
          governingPlanRef: governingPlan.planId,
          constrainedPlanRef: personal.planId,
          summary: observedDivergence
            ? "A required caregiver plan governs this moment, while observed life has not yet matched it; the Thread's own flight plan remains intact."
            : "A required caregiver plan governs this moment without replacing the Thread's own flight plan."
        }
      : {
          kind: "personal_plan",
          conflict,
          observedDivergence,
          governingPlanRef: personal.planId,
          constrainedPlanRef: null,
          summary: observedDivergence
            ? "Observed life currently differs from the Thread's governing flight-plan position."
            : carePosition === null
              ? "Observed life currently matches the Thread's governing flight-plan position."
              : conflict
                ? "A caregiver itinerary differs but lacks required authority; the Thread's personal flight plan still governs this moment."
                : "The personal and caregiver itineraries are compatible and observed life matches the governing position."
        },
    provenance: "world_enacted",
    ...(input.materialization === undefined ? {} : { materialization: input.materialization }),
  });
}
