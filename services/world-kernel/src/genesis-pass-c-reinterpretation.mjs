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
import {
  GENESIS_PASS_C_INPUT_VERSION,
  GENESIS_PASS_C_POLICY,
  PASS_C_REINTERPRETATION_RELATIONS,
  normalizePassCInput,
} from "./genesis-pass-c-domain.mjs";

const RELATION_PRECEDENCE = Object.freeze([...PASS_C_REINTERPRETATION_RELATIONS]);

function uniqueRefs(name, values) {
  assertStringArray(name, values);
  if (new Set(values).size !== values.length) throw new TypeError(`${name} must contain unique references`);
  values.forEach((value, index) => assertId(`${name}[${index}]`, value));
  return [...values].sort();
}

function optionalRef(name, value) {
  if (value === null) return null;
  assertId(name, value);
  return value;
}

function normalizeRelationFacts(candidate) {
  assertPlainObject("reinterpretation relationFacts", candidate);
  assertExactKeys("reinterpretation relationFacts", candidate, [
    "targetStructureRef",
    "triggerStructureRef",
    "targetStructureFamilyRef",
    "triggerStructureFamilyRef",
    "sharedPersonRefs",
    "sharedRelationshipRefs",
    "sharedIntellectualSourceRefs",
  ]);
  return Object.freeze({
    targetStructureRef: optionalRef("relationFacts.targetStructureRef", candidate.targetStructureRef),
    triggerStructureRef: optionalRef("relationFacts.triggerStructureRef", candidate.triggerStructureRef),
    targetStructureFamilyRef: optionalRef("relationFacts.targetStructureFamilyRef", candidate.targetStructureFamilyRef),
    triggerStructureFamilyRef: optionalRef("relationFacts.triggerStructureFamilyRef", candidate.triggerStructureFamilyRef),
    sharedPersonRefs: uniqueRefs("relationFacts.sharedPersonRefs", candidate.sharedPersonRefs),
    sharedRelationshipRefs: uniqueRefs("relationFacts.sharedRelationshipRefs", candidate.sharedRelationshipRefs),
    sharedIntellectualSourceRefs: uniqueRefs("relationFacts.sharedIntellectualSourceRefs", candidate.sharedIntellectualSourceRefs),
  });
}

function addUtcYears(isoTimestamp, years) {
  const date = new Date(isoTimestamp);
  const month = date.getUTCMonth();
  date.setUTCFullYear(date.getUTCFullYear() + years);
  // JavaScript rolls Feb 29 into March when the target year is not leap. Treat the
  // calendar anniversary as Feb 28 rather than granting an extra day of eligibility.
  if (month === 1 && date.getUTCMonth() === 2) date.setUTCDate(0);
  return date.toISOString();
}

function structureRelation(facts) {
  const sameStructure = facts.targetStructureRef !== null && facts.targetStructureRef === facts.triggerStructureRef;
  const sameFamily = facts.targetStructureFamilyRef !== null && facts.targetStructureFamilyRef === facts.triggerStructureFamilyRef;
  return sameStructure || sameFamily;
}

export function reinterpretationRelationFromFacts(factsCandidate) {
  const facts = normalizeRelationFacts(factsCandidate);
  const matches = {
    same_structure_family: structureRelation(facts),
    same_person_or_relationship: facts.sharedPersonRefs.length > 0 || facts.sharedRelationshipRefs.length > 0,
    same_intellectual_source: facts.sharedIntellectualSourceRefs.length > 0,
  };
  return RELATION_PRECEDENCE.find((relation) => matches[relation]) ?? null;
}

export function reinterpretationOpportunityId({ threadId, memoryRef, priorMeaningFormedAt, triggerEpisodeRef }) {
  assertId("reinterpretation threadId", threadId);
  assertId("reinterpretation memoryRef", memoryRef);
  assertIsoTimestamp("reinterpretation priorMeaningFormedAt", priorMeaningFormedAt);
  assertId("reinterpretation triggerEpisodeRef", triggerEpisodeRef);
  return `reop_${sha256(canonicalJson({
    threadId,
    memoryRef,
    priorMeaningFormedAt,
    triggerEpisodeRef,
    policyVersion: GENESIS_PASS_C_POLICY.version,
  })).slice(0, 48)}`;
}

export function evaluateReinterpretationOpportunity(candidate) {
  assertPlainObject("reinterpretation opportunity", candidate);
  assertExactKeys("reinterpretation opportunity", candidate, [
    "threadId",
    "memoryRef",
    "priorMeaningFormedAt",
    "trigger",
    "relationFacts",
  ]);
  assertId("reinterpretation.threadId", candidate.threadId);
  assertId("reinterpretation.memoryRef", candidate.memoryRef);
  assertIsoTimestamp("reinterpretation.priorMeaningFormedAt", candidate.priorMeaningFormedAt);
  assertPlainObject("reinterpretation.trigger", candidate.trigger);
  assertExactKeys("reinterpretation.trigger", candidate.trigger, ["episodeRef", "occurredAt", "observableAction"]);
  assertId("reinterpretation.trigger.episodeRef", candidate.trigger.episodeRef);
  assertIsoTimestamp("reinterpretation.trigger.occurredAt", candidate.trigger.occurredAt);
  assertNonEmpty("reinterpretation.trigger.observableAction", candidate.trigger.observableAction);
  const relationFacts = normalizeRelationFacts(candidate.relationFacts);
  const relation = reinterpretationRelationFromFacts(relationFacts);
  const minimumTriggerAt = addUtcYears(candidate.priorMeaningFormedAt, GENESIS_PASS_C_POLICY.reinterpretationMinimumYears);
  const ageEligible = Date.parse(candidate.trigger.occurredAt) >= Date.parse(minimumTriggerAt);
  const relationEligible = relation !== null;
  const eligible = ageEligible && relationEligible;
  const opportunityId = reinterpretationOpportunityId({
    threadId: candidate.threadId,
    memoryRef: candidate.memoryRef,
    priorMeaningFormedAt: candidate.priorMeaningFormedAt,
    triggerEpisodeRef: candidate.trigger.episodeRef,
  });
  return Object.freeze({
    opportunityId,
    threadId: candidate.threadId,
    memoryRef: candidate.memoryRef,
    priorMeaningFormedAt: candidate.priorMeaningFormedAt,
    trigger: structuredClone(candidate.trigger),
    relationFacts,
    minimumTriggerAt,
    ageEligible,
    relationEligible,
    eligible,
    relation,
  });
}

function chronologyStableOrder(left, right) {
  return left.trigger.occurredAt.localeCompare(right.trigger.occurredAt)
    || left.trigger.episodeRef.localeCompare(right.trigger.episodeRef)
    || left.memoryRef.localeCompare(right.memoryRef)
    || left.opportunityId.localeCompare(right.opportunityId);
}

export function scheduleReinterpretationOpportunities(candidates) {
  if (!Array.isArray(candidates)) throw new TypeError("reinterpretation candidates must be an array");
  const evaluated = candidates.map(evaluateReinterpretationOpportunity);
  const opportunityIds = new Set();
  for (const opportunity of evaluated) {
    if (opportunityIds.has(opportunity.opportunityId)) {
      throw new TypeError(`duplicate reinterpretation opportunity ${opportunity.opportunityId}`);
    }
    opportunityIds.add(opportunity.opportunityId);
  }

  const byThread = new Map();
  for (const opportunity of evaluated) {
    const items = byThread.get(opportunity.threadId) ?? [];
    items.push(opportunity);
    byThread.set(opportunity.threadId, items);
  }

  const decisions = [];
  for (const [threadId, items] of byThread.entries()) {
    const eligible = items.filter((item) => item.eligible).sort(chronologyStableOrder);
    const runIds = new Set(
      eligible.slice(0, GENESIS_PASS_C_POLICY.reinterpretationRunCapPerThread).map((item) => item.opportunityId),
    );
    for (const item of items) {
      const run = item.eligible && runIds.has(item.opportunityId);
      decisions.push(Object.freeze({
        ...item,
        threadId,
        run,
        skippedByCap: item.eligible && !run,
        disposition: !item.eligible ? "ineligible" : run ? "run" : "skipped_by_cap",
      }));
    }
  }
  return Object.freeze(decisions.sort((left, right) =>
    left.threadId.localeCompare(right.threadId) || chronologyStableOrder(left, right)));
}

export function passCTriggerFromScheduledOpportunity(candidate) {
  assertPlainObject("scheduled reinterpretation opportunity", candidate);
  if (candidate.disposition !== "run" || candidate.run !== true || candidate.eligible !== true) {
    throw new TypeError("Pass-C trigger may be built only from a scheduled run opportunity");
  }
  if (!PASS_C_REINTERPRETATION_RELATIONS.includes(candidate.relation)) {
    throw new TypeError("scheduled reinterpretation relation is invalid");
  }
  return Object.freeze({
    episodeRef: candidate.trigger.episodeRef,
    occurredAt: candidate.trigger.occurredAt,
    observableAction: candidate.trigger.observableAction,
    relation: candidate.relation,
  });
}

export function buildScheduledReinterpretationPassCInput({
  scheduledOpportunity,
  targetMemory,
  priorMeaning,
  formation,
}) {
  const trigger = passCTriggerFromScheduledOpportunity(scheduledOpportunity);
  return normalizePassCInput({
    inputVersion: GENESIS_PASS_C_INPUT_VERSION,
    mode: "reinterpretation",
    targetMemory,
    formation,
    priorMeaning,
    trigger,
    policyWitness: { policyVersion: GENESIS_PASS_C_POLICY.version },
  });
}

export function summarizeReinterpretationSchedule(decisions) {
  if (!Array.isArray(decisions)) throw new TypeError("reinterpretation schedule must be an array");
  return Object.freeze({
    candidates: decisions.length,
    eligible: decisions.filter((item) => item.eligible).length,
    run: decisions.filter((item) => item.run).length,
    skippedByCap: decisions.filter((item) => item.skippedByCap).length,
    ineligible: decisions.filter((item) => !item.eligible).length,
  });
}

export function reinterpretationAccountingByThread(decisions) {
  if (!Array.isArray(decisions)) throw new TypeError("reinterpretation schedule must be an array");
  const byThread = new Map();
  for (const decision of decisions) {
    assertId("reinterpretation accounting threadId", decision.threadId);
    const items = byThread.get(decision.threadId) ?? [];
    items.push(decision);
    byThread.set(decision.threadId, items);
  }
  return Object.freeze([...byThread.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([threadId, items]) => {
      const eligible = items.filter((item) => item.eligible).sort(chronologyStableOrder);
      const run = eligible.filter((item) => item.run);
      const skipped = eligible.filter((item) => item.skippedByCap);
      return Object.freeze({
        threadId,
        reinterpretationEligibleCount: eligible.length,
        reinterpretationRunCount: run.length,
        reinterpretationSkippedByCapCount: skipped.length,
        eligibleOpportunityRefs: Object.freeze(eligible.map((item) => item.opportunityId)),
        runOpportunityRefs: Object.freeze(run.map((item) => item.opportunityId)),
        skippedByCapOpportunityRefs: Object.freeze(skipped.map((item) => item.opportunityId)),
      });
    }));
}
