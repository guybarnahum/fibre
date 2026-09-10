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
export const PRESENCE_MODES = Object.freeze(["physical", "mediated"]);
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

function activeAt(plan, at) {
  return Date.parse(plan.authoredAt) <= Date.parse(at) &&
    (plan.validUntil === null || Date.parse(plan.validUntil) >= Date.parse(at));
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
  const unresolvedIntentions = [...(thread.currentState?.unresolvedIntentions ?? [])];
  assertStringArray("Thread.currentState.needs", needs);
  assertStringArray("Thread.currentState.unresolvedIntentions", unresolvedIntentions);

  return {
    threadId: thread.threadId,
    birthDate,
    ageYears,
    selfDescription: thread.identity.selfDescription,
    needs,
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
    "validUntil",
    "physicalPlaceRef",
    "presenceMode",
    "mediatedContext",
    "activity",
    "purpose",
    "companionRefs",
    "sourceReferences",
    "authority",
  ]);
  assertId("lived plan.planId", value.planId);
  assertEnum("lived plan.kind", value.kind, LIVED_PLAN_KINDS);
  assertId("lived plan.subjectThreadId", value.subjectThreadId);
  const owner = normalizeOwner(value.owner);
  assertIsoTimestamp("lived plan.authoredAt", value.authoredAt);
  if (value.validUntil !== null) {
    assertIsoTimestamp("lived plan.validUntil", value.validUntil);
    if (Date.parse(value.validUntil) < Date.parse(value.authoredAt)) {
      throw new TypeError("lived plan.validUntil cannot precede authoredAt");
    }
  }
  assertId("lived plan.physicalPlaceRef", value.physicalPlaceRef);
  assertEnum("lived plan.presenceMode", value.presenceMode, PRESENCE_MODES);
  const mediatedContext = nullableText("lived plan.mediatedContext", value.mediatedContext);
  if (value.presenceMode === "physical" && mediatedContext !== null) {
    throw new TypeError("physical plan cannot carry mediatedContext");
  }
  if (value.presenceMode === "mediated" && mediatedContext === null) {
    throw new TypeError("mediated plan requires mediatedContext");
  }
  assertNonEmpty("lived plan.activity", value.activity);
  assertNonEmpty("lived plan.purpose", value.purpose);
  const companionRefs = normalizeIds("lived plan.companionRefs", value.companionRefs);
  const sourceReferences = normalizeIds("lived plan.sourceReferences", value.sourceReferences, { required: true });

  let authority;
  if (value.kind === "personal") {
    if (owner.kind !== "thread" || owner.partyId !== value.subjectThreadId) {
      throw new TypeError("personal plan must be owned by its subject Thread");
    }
    if (value.authority !== undefined) throw new TypeError("personal plan cannot carry care authority");
  } else {
    if (owner.partyId === value.subjectThreadId) {
      throw new TypeError("care plan owner must be distinct from its subject Thread");
    }
    if (value.authority === undefined) throw new TypeError("care plan requires authority");
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
    validUntil: value.validUntil,
    physicalPlaceRef: value.physicalPlaceRef,
    presenceMode: value.presenceMode,
    mediatedContext,
    activity: value.activity,
    purpose: value.purpose,
    companionRefs,
    sourceReferences,
    ...(authority === undefined ? {} : { authority }),
  };
}

export function normalizeCurrentSituation(value) {
  assertPlainObject("current situation", value);
  assertExactKeys("current situation", value, [
    "situationId",
    "threadId",
    "establishedAt",
    "physicalPlaceRef",
    "presenceMode",
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
  assertId("current situation.physicalPlaceRef", value.physicalPlaceRef);
  assertEnum("current situation.presenceMode", value.presenceMode, PRESENCE_MODES);
  const mediatedContext = nullableText("current situation.mediatedContext", value.mediatedContext);
  if (value.presenceMode === "physical" && mediatedContext !== null) {
    throw new TypeError("physical situation cannot carry mediatedContext");
  }
  if (value.presenceMode === "mediated" && mediatedContext === null) {
    throw new TypeError("mediated situation requires mediatedContext");
  }
  assertNonEmpty("current situation.activity", value.activity);
  assertNonEmpty("current situation.reason", value.reason);
  const participantRefs = normalizeIds("current situation.participantRefs", value.participantRefs);
  const sourcePlanRefs = normalizeIds("current situation.sourcePlanRefs", value.sourcePlanRefs, { required: true });
  assertPlainObject("current situation.resolution", value.resolution);
  assertExactKeys("current situation.resolution", value.resolution, ["kind", "summary"]);
  assertEnum("current situation.resolution.kind", value.resolution.kind, ["personal_plan", "care_constraint"]);
  assertNonEmpty("current situation.resolution.summary", value.resolution.summary);
  if (value.provenance !== "world_enacted") {
    throw new TypeError("current situation provenance must be world_enacted");
  }

  return {
    situationId: value.situationId,
    threadId: value.threadId,
    establishedAt: value.establishedAt,
    physicalPlaceRef: value.physicalPlaceRef,
    presenceMode: value.presenceMode,
    mediatedContext,
    activity: value.activity,
    reason: value.reason,
    participantRefs,
    sourcePlanRefs,
    resolution: {
      kind: value.resolution.kind,
      summary: value.resolution.summary,
    },
    provenance: "world_enacted",
  };
}

export function livedPlansConflict(leftCandidate, rightCandidate) {
  const left = normalizeLivedPlan(leftCandidate);
  const right = normalizeLivedPlan(rightCandidate);
  const intention = (plan) => canonicalJson({
    physicalPlaceRef: plan.physicalPlaceRef,
    presenceMode: plan.presenceMode,
    mediatedContext: plan.mediatedContext,
    activity: plan.activity,
    companionRefs: plan.companionRefs,
  });
  return intention(left) !== intention(right);
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
  if (!activeAt(personal, input.establishedAt)) throw new TypeError("personal plan is not active at enactment");

  const care = input.carePlan === null ? null : normalizeLivedPlan(input.carePlan);
  if (care !== null) {
    if (care.kind !== "care") throw new TypeError("carePlan must be a care plan");
    if (care.subjectThreadId !== personal.subjectThreadId) {
      throw new TypeError("personal and care plans must have the same subject Thread");
    }
    if (!activeAt(care, input.establishedAt)) throw new TypeError("care plan is not active at enactment");
  }

  const conflict = care !== null && livedPlansConflict(personal, care);
  const careConstrains = conflict && care.authority.constraint === "required";
  const enacted = careConstrains ? care : personal;
  const sourcePlanRefs = care === null ? [personal.planId] : [personal.planId, care.planId];

  return normalizeCurrentSituation({
    situationId: input.situationId,
    threadId: personal.subjectThreadId,
    establishedAt: input.establishedAt,
    physicalPlaceRef: enacted.physicalPlaceRef,
    presenceMode: enacted.presenceMode,
    mediatedContext: enacted.mediatedContext,
    activity: enacted.activity,
    reason: enacted.purpose,
    participantRefs: enacted.companionRefs,
    sourcePlanRefs,
    resolution: careConstrains
      ? {
          kind: "care_constraint",
          summary: "A required caregiver plan constrained what happened without replacing the Thread's personal plan.",
        }
      : {
          kind: "personal_plan",
          summary: care === null
            ? "The World enacted the Thread's current personal plan."
            : "The caregiver plan did not constrain this enactment; the Thread's personal plan remained enacted.",
        },
    provenance: "world_enacted",
  });
}
