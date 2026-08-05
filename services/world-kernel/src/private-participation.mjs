import {
  IntegrityError,
  assertExactKeys,
  assertFiniteNumber,
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
  assertStringArray,
  canonicalJson,
  sha256,
  threadStateHash,
} from "./persistence-common.mjs";

export const DEFAULT_DIGNITY_POLICY = Object.freeze({ id: "dignity_guardian", version: "1" });
const ENTITY_KINDS = new Set(["human", "thread", "company", "institution", "other"]);
const PARTICIPATION_ACTIONS = new Set(["accept", "clarify", "negotiate", "delegate", "refuse"]);
const DIGNITY_BANDS = new Set(["low", "contested", "high"]);
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/;
const FACTOR_KEYS = [
  "identityAlignment",
  "individualizedAdvantage",
  "requesterNeed",
  "relationalMeaning",
  "respectAndReciprocity",
  "participationTerms",
  "obligationsAndOpportunityCost",
];

function assertEntityRef(name, entity) {
  assertPlainObject(name, entity);
  assertExactKeys(name, entity, ["entityId", "kind", "displayName"]);
  assertId(`${name}.entityId`, entity.entityId);
  if (!ENTITY_KINDS.has(entity.kind)) throw new TypeError(`${name}.kind is invalid`);
  assertNonEmpty(`${name}.displayName`, entity.displayName);
}

function assertPolicy(name, policy) {
  assertPlainObject(name, policy);
  assertExactKeys(name, policy, ["id", "version"]);
  assertId(`${name}.id`, policy.id);
  assertNonEmpty(`${name}.version`, policy.version);
}

function assertUniqueStringArray(name, value) {
  assertStringArray(name, value);
  if (new Set(value).size !== value.length) throw new TypeError(`${name} must not contain duplicates`);
}

function assertEntityArray(name, value) {
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
  value.forEach((entity, index) => assertEntityRef(`${name}[${index}]`, entity));
  const ids = value.map((entity) => `${entity.kind}:${entity.entityId}`);
  if (new Set(ids).size !== ids.length) throw new TypeError(`${name} must not contain duplicates`);
}

export function validateActivationRequest(request) {
  assertPlainObject("request", request);
  assertExactKeys("request", request, [
    "requestId", "trigger", "requester", "objective", "statedNeed",
    "permissions", "acceptanceCriteria",
  ]);
  assertId("request.requestId", request.requestId);
  assertNonEmpty("request.trigger", request.trigger);
  assertEntityRef("request.requester", request.requester);
  assertNonEmpty("request.objective", request.objective);
  if (request.statedNeed !== undefined) assertNonEmpty("request.statedNeed", request.statedNeed);
  assertUniqueStringArray("request.permissions", request.permissions);
  if (request.acceptanceCriteria !== undefined) {
    assertNonEmpty("request.acceptanceCriteria", request.acceptanceCriteria);
  }
}

function requestCanonicalJson(request) {
  return JSON.stringify({
    requestId: request.requestId,
    trigger: request.trigger,
    requester: {
      entityId: request.requester.entityId,
      kind: request.requester.kind,
      displayName: request.requester.displayName,
    },
    objective: request.objective,
    statedNeed: request.statedNeed ?? null,
    permissions: [...request.permissions].sort(),
    acceptanceCriteria: request.acceptanceCriteria ?? null,
  });
}

export function normalizeActivationRequest(request) {
  validateActivationRequest(request);
  return {
    requestId: request.requestId,
    trigger: request.trigger,
    requester: { ...request.requester },
    objective: request.objective,
    ...(request.statedNeed === undefined ? {} : { statedNeed: request.statedNeed }),
    permissions: [...request.permissions].sort(),
    ...(request.acceptanceCriteria === undefined
      ? {}
      : { acceptanceCriteria: request.acceptanceCriteria }),
  };
}

export function requestFingerprint(request) {
  validateActivationRequest(request);
  return `sha256:${sha256(requestCanonicalJson(request))}`;
}

function selectOwnedRefs(owned, selected, name) {
  assertUniqueStringArray(`${name}.owned`, owned);
  const included = selected === undefined ? [...owned] : [...selected];
  assertUniqueStringArray(name, included);
  const ownedSet = new Set(owned);
  for (const ref of included) {
    if (!ownedSet.has(ref)) throw new TypeError(`${name} contains a ref not owned by the Thread: ${ref}`);
  }
  const includedSet = new Set(included);
  return { included, excluded: owned.filter((ref) => !includedSet.has(ref)) };
}

export function validateContextSelection(selection) {
  assertPlainObject("selection", selection);
  assertExactKeys("selection", selection, [
    "memoryRefs", "relationshipRefs", "knownAlternatives", "obligations",
  ]);
  if (selection.memoryRefs !== undefined) assertUniqueStringArray("selection.memoryRefs", selection.memoryRefs);
  if (selection.relationshipRefs !== undefined) {
    assertUniqueStringArray("selection.relationshipRefs", selection.relationshipRefs);
  }
  if (selection.obligations !== undefined) assertUniqueStringArray("selection.obligations", selection.obligations);
  if (selection.knownAlternatives !== undefined) {
    assertEntityArray("selection.knownAlternatives", selection.knownAlternatives);
  }
}

export function normalizeContextSelection(selection = {}) {
  validateContextSelection(selection);
  const normalized = {};
  if (selection.memoryRefs !== undefined) normalized.memoryRefs = [...selection.memoryRefs].sort();
  if (selection.relationshipRefs !== undefined) {
    normalized.relationshipRefs = [...selection.relationshipRefs].sort();
  }
  if (selection.obligations !== undefined) normalized.obligations = [...selection.obligations].sort();
  if (selection.knownAlternatives !== undefined) {
    normalized.knownAlternatives = selection.knownAlternatives
      .map((entity) => ({ ...entity }))
      .sort((left, right) =>
        `${left.kind}:${left.entityId}:${left.displayName}`.localeCompare(
          `${right.kind}:${right.entityId}:${right.displayName}`,
        ));
  }
  return normalized;
}

export function prepareRequestAppraisal(thread, request, selection = {}, policy = DEFAULT_DIGNITY_POLICY) {
  if (!thread || (thread.status !== "frozen" && thread.status !== "dormant")) {
    throw new TypeError(`Thread ${thread?.threadId ?? "<unknown>"} cannot be appraised from ${thread?.status ?? "unknown"}`);
  }
  request = normalizeActivationRequest(request);
  selection = normalizeContextSelection(selection);
  assertPolicy("policy", policy);

  const memories = selectOwnedRefs(thread.memoryRefs, selection.memoryRefs, "selection.memoryRefs");
  const relationships = selectOwnedRefs(
    thread.relationshipRefs,
    selection.relationshipRefs,
    "selection.relationshipRefs",
  );
  const obligations = selectOwnedRefs(
    thread.currentState.unresolvedIntentions,
    selection.obligations,
    "selection.obligations",
  );
  const alternatives = (selection.knownAlternatives ?? []).map((entity) => ({ ...entity }));

  return {
    threadId: thread.threadId,
    snapshotVersion: thread.version,
    requestId: request.requestId,
    requestFingerprint: requestFingerprint(request),
    identity: `${thread.identity.name}: ${thread.identity.selfDescription}`,
    traits: Object.values(thread.genome.textualTraits),
    selfModel: thread.currentState.selfModel,
    needs: [...thread.currentState.needs],
    feelings: [...thread.currentState.feelings],
    unresolvedIntentions: [...thread.currentState.unresolvedIntentions],
    ...(thread.accounts === undefined ? {} : { budgets: { ...thread.accounts } }),
    requester: { ...request.requester },
    objective: request.objective,
    ...(request.statedNeed === undefined ? {} : { statedNeed: request.statedNeed }),
    ...(request.acceptanceCriteria === undefined
      ? {}
      : { acceptanceCriteria: request.acceptanceCriteria }),
    permissions: [...request.permissions],
    relevantMemories: memories.included,
    excludedMemories: memories.excluded,
    relevantRelationships: relationships.included,
    excludedRelationships: relationships.excluded,
    knownAlternatives: alternatives,
    obligations: obligations.included,
    excludedObligations: obligations.excluded,
    appraisalPolicy: { ...policy },
  };
}

function validateAppraisalCapsule(capsule) {
  assertPlainObject("capsule", capsule);
  assertExactKeys("capsule", capsule, [
    "threadId", "snapshotVersion", "requestId", "requestFingerprint", "identity",
    "traits", "selfModel", "needs", "feelings", "unresolvedIntentions", "budgets",
    "requester", "objective", "statedNeed", "acceptanceCriteria", "permissions",
    "relevantMemories", "excludedMemories", "relevantRelationships",
    "excludedRelationships", "knownAlternatives", "obligations",
    "excludedObligations", "appraisalPolicy",
  ]);
  assertId("capsule.threadId", capsule.threadId);
  assertFiniteNumber("capsule.snapshotVersion", capsule.snapshotVersion, { integer: true, minimum: 1 });
  assertId("capsule.requestId", capsule.requestId);
  if (!SHA256_PATTERN.test(capsule.requestFingerprint)) {
    throw new TypeError("capsule.requestFingerprint is invalid");
  }
  assertNonEmpty("capsule.identity", capsule.identity);
  assertStringArray("capsule.traits", capsule.traits);
  assertNonEmpty("capsule.selfModel", capsule.selfModel);
  assertStringArray("capsule.needs", capsule.needs);
  assertStringArray("capsule.feelings", capsule.feelings);
  assertStringArray("capsule.unresolvedIntentions", capsule.unresolvedIntentions);
  if (capsule.budgets !== undefined) assertPlainObject("capsule.budgets", capsule.budgets);
  assertEntityRef("capsule.requester", capsule.requester);
  assertNonEmpty("capsule.objective", capsule.objective);
  if (capsule.statedNeed !== undefined) assertNonEmpty("capsule.statedNeed", capsule.statedNeed);
  if (capsule.acceptanceCriteria !== undefined) {
    assertNonEmpty("capsule.acceptanceCriteria", capsule.acceptanceCriteria);
  }
  for (const key of [
    "permissions", "relevantMemories", "excludedMemories", "relevantRelationships",
    "excludedRelationships", "obligations", "excludedObligations",
  ]) assertUniqueStringArray(`capsule.${key}`, capsule[key]);
  assertEntityArray("capsule.knownAlternatives", capsule.knownAlternatives);
  assertPolicy("capsule.appraisalPolicy", capsule.appraisalPolicy);
}

function assertPartition(name, owned, included, excluded) {
  assertUniqueStringArray(`${name}.included`, included);
  assertUniqueStringArray(`${name}.excluded`, excluded);
  const union = [...included, ...excluded];
  if (new Set(union).size !== union.length) throw new IntegrityError(`${name} includes overlap`);
  if (canonicalJson([...union].sort()) !== canonicalJson([...owned].sort())) {
    throw new IntegrityError(`${name} does not partition Thread-owned refs`);
  }
}

export function assertCapsuleMatchesThread(thread, request, capsule) {
  validateAppraisalCapsule(capsule);
  if (capsule.threadId !== thread.threadId || capsule.snapshotVersion !== thread.version) {
    throw new IntegrityError("appraisal capsule does not match its Thread snapshot");
  }
  if (capsule.requestId !== request.requestId || capsule.requestFingerprint !== requestFingerprint(request)) {
    throw new IntegrityError("appraisal capsule does not match its request");
  }
  if (canonicalJson(capsule.requester) !== canonicalJson(request.requester)) {
    throw new IntegrityError("appraisal capsule requester does not match request");
  }
  if (
    capsule.objective !== request.objective ||
    (capsule.statedNeed ?? null) !== (request.statedNeed ?? null) ||
    (capsule.acceptanceCriteria ?? null) !== (request.acceptanceCriteria ?? null) ||
    canonicalJson(capsule.permissions) !== canonicalJson(request.permissions)
  ) {
    throw new IntegrityError("appraisal capsule request terms do not match request");
  }
  if (
    capsule.identity !== `${thread.identity.name}: ${thread.identity.selfDescription}` ||
    canonicalJson(capsule.traits) !== canonicalJson(Object.values(thread.genome.textualTraits)) ||
    capsule.selfModel !== thread.currentState.selfModel ||
    canonicalJson(capsule.needs) !== canonicalJson(thread.currentState.needs) ||
    canonicalJson(capsule.feelings) !== canonicalJson(thread.currentState.feelings) ||
    canonicalJson(capsule.unresolvedIntentions) !== canonicalJson(thread.currentState.unresolvedIntentions) ||
    canonicalJson(capsule.budgets ?? null) !== canonicalJson(thread.accounts ?? null)
  ) {
    throw new IntegrityError("appraisal capsule private Thread state does not match snapshot");
  }
  assertPartition("memory selection", thread.memoryRefs, capsule.relevantMemories, capsule.excludedMemories);
  assertPartition(
    "relationship selection",
    thread.relationshipRefs,
    capsule.relevantRelationships,
    capsule.excludedRelationships,
  );
  assertPartition(
    "obligation selection",
    thread.currentState.unresolvedIntentions,
    capsule.obligations,
    capsule.excludedObligations,
  );
  assertEntityArray("capsule.knownAlternatives", capsule.knownAlternatives);
  assertPolicy("capsule.appraisalPolicy", capsule.appraisalPolicy);
}

export function appraisalDigest(capsule) {
  return `sha256:${sha256(canonicalJson(capsule))}`;
}

export function appraisalId(capsule) {
  return `app_${sha256(canonicalJson(capsule))}`;
}

export function requestRecordDigest(record) {
  return `sha256:${sha256(canonicalJson({
    threadId: record.threadId,
    snapshotVersion: record.snapshotVersion,
    threadStateHash: record.threadStateHash,
    request: record.request,
    requestFingerprint: record.requestFingerprint,
    occurredAt: record.occurredAt,
    causationId: record.causationId,
    correlationId: record.correlationId,
  }))}`;
}

function dignityBand(score) {
  assertFiniteNumber("assessment.score", score);
  if (score < 0 || score > 100) throw new TypeError("assessment.score must be between 0 and 100");
  if (score >= 70) return "high";
  if (score >= 40) return "contested";
  return "low";
}

function assertRelationshipImpact(name, impact) {
  assertPlainObject(name, impact);
  assertExactKeys(name, impact, [
    "entity", "fondnessDelta", "resentmentDelta", "rationale", "evidenceRefs",
  ]);
  assertEntityRef(`${name}.entity`, impact.entity);
  for (const key of ["fondnessDelta", "resentmentDelta"]) {
    assertFiniteNumber(`${name}.${key}`, impact[key]);
    if (impact[key] < -1 || impact[key] > 1) throw new TypeError(`${name}.${key} must be between -1 and 1`);
  }
  assertNonEmpty(`${name}.rationale`, impact.rationale);
  assertUniqueStringArray(`${name}.evidenceRefs`, impact.evidenceRefs);
  if ((impact.fondnessDelta !== 0 || impact.resentmentDelta !== 0) && impact.evidenceRefs.length === 0) {
    throw new TypeError(`${name} non-zero changes require evidence`);
  }
}

export function formPrivateParticipationStance(assessment) {
  assertPlainObject("assessment", assessment);
  assertExactKeys("assessment", assessment, [
    "threadId", "snapshotVersion", "requestId", "requestFingerprint", "policy",
    "proposedAction", "score", "rationale", "factors", "evidenceRefs",
    "repairQuestions", "knownAlternatives", "feelings", "conflictingMotives",
    "uncertainties", "relationshipImpact",
  ]);
  assertId("assessment.threadId", assessment.threadId);
  assertFiniteNumber("assessment.snapshotVersion", assessment.snapshotVersion, { integer: true, minimum: 1 });
  assertId("assessment.requestId", assessment.requestId);
  if (!SHA256_PATTERN.test(assessment.requestFingerprint)) {
    throw new TypeError("assessment.requestFingerprint is invalid");
  }
  assertPolicy("assessment.policy", assessment.policy);
  if (!PARTICIPATION_ACTIONS.has(assessment.proposedAction)) {
    throw new TypeError("assessment.proposedAction is invalid");
  }
  const band = dignityBand(assessment.score);
  assertNonEmpty("assessment.rationale", assessment.rationale);
  assertPlainObject("assessment.factors", assessment.factors);
  assertExactKeys("assessment.factors", assessment.factors, FACTOR_KEYS);
  FACTOR_KEYS.forEach((key) => assertNonEmpty(`assessment.factors.${key}`, assessment.factors[key]));
  assertUniqueStringArray("assessment.evidenceRefs", assessment.evidenceRefs);
  if (assessment.evidenceRefs.length === 0) throw new TypeError("assessment requires attributable evidence");
  assertUniqueStringArray("assessment.repairQuestions", assessment.repairQuestions);
  assertEntityArray("assessment.knownAlternatives", assessment.knownAlternatives);
  assertStringArray("assessment.feelings", assessment.feelings);
  assertStringArray("assessment.conflictingMotives", assessment.conflictingMotives);
  assertStringArray("assessment.uncertainties", assessment.uncertainties);
  assertRelationshipImpact("assessment.relationshipImpact", assessment.relationshipImpact);
  if (assessment.proposedAction === "accept" && band !== "high") {
    throw new TypeError("a dignity-based accept stance requires high dignity");
  }
  if (assessment.proposedAction === "clarify" && assessment.repairQuestions.length === 0) {
    throw new TypeError("clarification requires at least one repair question");
  }
  if (assessment.proposedAction === "delegate" && assessment.knownAlternatives.length === 0) {
    throw new TypeError("delegation requires a known alternative");
  }
  return {
    threadId: assessment.threadId,
    snapshotVersion: assessment.snapshotVersion,
    requestId: assessment.requestId,
    requestFingerprint: assessment.requestFingerprint,
    policy: { ...assessment.policy },
    desiredAction: assessment.proposedAction,
    dignityBand: band,
    score: assessment.score,
    privateRationale: assessment.rationale,
    evidenceRefs: [...assessment.evidenceRefs],
    privateFeelings: [...assessment.feelings],
    conflictingMotives: [...assessment.conflictingMotives],
    uncertainties: [...assessment.uncertainties],
    repairQuestions: [...assessment.repairQuestions],
    knownAlternatives: assessment.knownAlternatives.map((entity) => ({ ...entity })),
    relationshipImpact: {
      ...assessment.relationshipImpact,
      entity: { ...assessment.relationshipImpact.entity },
      evidenceRefs: [...assessment.relationshipImpact.evidenceRefs],
    },
  };
}

function validatePrivateStance(stance) {
  assertPlainObject("stance", stance);
  assertExactKeys("stance", stance, [
    "threadId", "snapshotVersion", "requestId", "requestFingerprint", "policy",
    "desiredAction", "dignityBand", "score", "privateRationale", "evidenceRefs",
    "privateFeelings", "conflictingMotives", "uncertainties", "repairQuestions",
    "knownAlternatives", "relationshipImpact",
  ]);
  assertId("stance.threadId", stance.threadId);
  assertFiniteNumber("stance.snapshotVersion", stance.snapshotVersion, { integer: true, minimum: 1 });
  assertId("stance.requestId", stance.requestId);
  if (!SHA256_PATTERN.test(stance.requestFingerprint)) {
    throw new TypeError("stance.requestFingerprint is invalid");
  }
  assertPolicy("stance.policy", stance.policy);
  if (!PARTICIPATION_ACTIONS.has(stance.desiredAction)) {
    throw new TypeError("stance.desiredAction is invalid");
  }
  if (!DIGNITY_BANDS.has(stance.dignityBand) || stance.dignityBand !== dignityBand(stance.score)) {
    throw new TypeError("stance.dignityBand does not match score");
  }
  assertNonEmpty("stance.privateRationale", stance.privateRationale);
  assertUniqueStringArray("stance.evidenceRefs", stance.evidenceRefs);
  if (stance.evidenceRefs.length === 0) throw new TypeError("stance requires attributable evidence");
  assertStringArray("stance.privateFeelings", stance.privateFeelings);
  assertStringArray("stance.conflictingMotives", stance.conflictingMotives);
  assertStringArray("stance.uncertainties", stance.uncertainties);
  assertUniqueStringArray("stance.repairQuestions", stance.repairQuestions);
  assertEntityArray("stance.knownAlternatives", stance.knownAlternatives);
  assertRelationshipImpact("stance.relationshipImpact", stance.relationshipImpact);
  if (stance.desiredAction === "accept" && stance.dignityBand !== "high") {
    throw new TypeError("a dignity-based accept stance requires high dignity");
  }
  if (stance.desiredAction === "clarify" && stance.repairQuestions.length === 0) {
    throw new TypeError("clarification requires at least one repair question");
  }
  if (stance.desiredAction === "delegate" && stance.knownAlternatives.length === 0) {
    throw new TypeError("delegation requires a known alternative");
  }
}

export function assertStanceMatchesTrace(trace, stance) {
  validatePrivateStance(stance);
  if (
    stance.threadId !== trace.threadId ||
    stance.snapshotVersion !== trace.snapshotVersion ||
    stance.requestId !== trace.requestId ||
    stance.requestFingerprint !== trace.requestFingerprint ||
    canonicalJson(stance.policy) !== canonicalJson(trace.appraisal.appraisalPolicy)
  ) {
    throw new IntegrityError("private stance does not match its persisted appraisal trace");
  }
  if (canonicalJson(stance.relationshipImpact.entity) !== canonicalJson(trace.request.requester)) {
    throw new IntegrityError("private stance relationship target does not match requester");
  }
  if (!DIGNITY_BANDS.has(stance.dignityBand) || stance.dignityBand !== dignityBand(stance.score)) {
    throw new IntegrityError("private stance dignity band is invalid");
  }
}

export function stanceDigest(stance) {
  return `sha256:${sha256(canonicalJson(stance))}`;
}

export function stanceId(stance) {
  return `pst_${sha256(canonicalJson(stance))}`;
}

export function assertStoredDigest(name, value) {
  if (!SHA256_PATTERN.test(value)) throw new IntegrityError(`${name} is invalid`);
}

export function threadSnapshotWitness(thread) {
  return {
    snapshotVersion: thread.version,
    threadStateHash: threadStateHash(thread),
  };
}
