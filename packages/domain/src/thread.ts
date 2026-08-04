import type {
  ActivationRequest,
  AuthorizationDecision,
  AuthorizationMetadata,
  ContextSelection,
  DignityAssessment,
  DignityBand,
  DisclosureStrategy,
  DisclosureStrategyInput,
  EntityRef,
  ExternalParticipationResponse,
  ParticipationAuthorization,
  PolicyRef,
  PrivateParticipationStance,
  ProposedLifeChange,
  RelationshipImpact,
  RequestAppraisalCapsule,
  ThreadContextCapsule,
  ThreadSnapshot,
} from "./types.js";

export const DEFAULT_DIGNITY_POLICY: PolicyRef = {
  id: "dignity_guardian",
  version: "1",
};

const SHA256_CONSTANTS = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
  0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
] as const;

function rotateRight(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

function sha256Hex(value: string): string {
  const input = new TextEncoder().encode(value);
  const bitLength = input.length * 8;
  const paddedLength = Math.ceil((input.length + 9) / 64) * 64;
  const bytes = new Uint8Array(paddedLength);
  bytes.set(input);
  bytes[input.length] = 0x80;
  const view = new DataView(bytes.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x1_0000_0000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);

  const state = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const words = new Uint32Array(64);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      words[index] = view.getUint32(offset + index * 4);
    }
    for (let index = 16; index < 64; index += 1) {
      const previous15 = words[index - 15] ?? 0;
      const previous2 = words[index - 2] ?? 0;
      const sigma0 =
        rotateRight(previous15, 7) ^
        rotateRight(previous15, 18) ^
        (previous15 >>> 3);
      const sigma1 =
        rotateRight(previous2, 17) ^
        rotateRight(previous2, 19) ^
        (previous2 >>> 10);
      words[index] = (
        (words[index - 16] ?? 0) +
        sigma0 +
        (words[index - 7] ?? 0) +
        sigma1
      ) >>> 0;
    }

    let a = state[0] ?? 0;
    let b = state[1] ?? 0;
    let c = state[2] ?? 0;
    let d = state[3] ?? 0;
    let e = state[4] ?? 0;
    let f = state[5] ?? 0;
    let g = state[6] ?? 0;
    let h = state[7] ?? 0;

    for (let index = 0; index < 64; index += 1) {
      const upperSigma1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temporary1 = (
        h +
        upperSigma1 +
        choice +
        (SHA256_CONSTANTS[index] ?? 0) +
        (words[index] ?? 0)
      ) >>> 0;
      const upperSigma0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temporary2 = (upperSigma0 + majority) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temporary1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporary1 + temporary2) >>> 0;
    }

    state[0] = ((state[0] ?? 0) + a) >>> 0;
    state[1] = ((state[1] ?? 0) + b) >>> 0;
    state[2] = ((state[2] ?? 0) + c) >>> 0;
    state[3] = ((state[3] ?? 0) + d) >>> 0;
    state[4] = ((state[4] ?? 0) + e) >>> 0;
    state[5] = ((state[5] ?? 0) + f) >>> 0;
    state[6] = ((state[6] ?? 0) + g) >>> 0;
    state[7] = ((state[7] ?? 0) + h) >>> 0;
  }

  return [...state]
    .map((word) => word.toString(16).padStart(8, "0"))
    .join("");
}

function assertCanAppraise(thread: ThreadSnapshot): void {
  if (thread.status !== "frozen" && thread.status !== "dormant") {
    throw new Error(`Thread ${thread.threadId} cannot be appraised from ${thread.status}`);
  }
}

function assertCanCompileExecution(thread: ThreadSnapshot): void {
  if (
    thread.status !== "frozen" &&
    thread.status !== "dormant" &&
    thread.status !== "thawing"
  ) {
    throw new Error(
      `Thread ${thread.threadId} cannot compile execution context from ${thread.status}`,
    );
  }
}

function assertRange(
  name: string,
  value: number,
  minimum: number,
  maximum: number,
): void {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be a finite number between ${minimum} and ${maximum}`);
  }
}

function assertNonEmpty(name: string, value: string): void {
  if (!value.trim()) throw new Error(`${name} is required`);
}

function assertStringRefs(name: string, refs: readonly string[]): void {
  refs.forEach((ref, index) => assertNonEmpty(`${name}[${index}]`, ref));
}

function assertEntityRef(name: string, entity: EntityRef): void {
  assertNonEmpty(`${name}.entityId`, entity.entityId);
  assertNonEmpty(`${name}.displayName`, entity.displayName);
}

function sameEntity(
  left: { entityId: string; kind: string },
  right: { entityId: string; kind: string },
): boolean {
  return left.entityId === right.entityId && left.kind === right.kind;
}

function samePolicy(left: PolicyRef, right: PolicyRef): boolean {
  return left.id === right.id && left.version === right.version;
}

function selectOwnedRefs(
  owned: readonly string[],
  selected: readonly string[] | undefined,
  label: string,
): { included: string[]; excluded: string[] } {
  assertStringRefs(`${label} owned refs`, owned);
  const included = selected === undefined ? [...owned] : [...new Set(selected)];
  assertStringRefs(label, included);
  const ownedSet = new Set(owned);
  for (const ref of included) {
    if (!ownedSet.has(ref)) {
      throw new Error(`${label} contains a ref not owned by the Thread: ${ref}`);
    }
  }
  const includedSet = new Set(included);
  return {
    included,
    excluded: owned.filter((ref) => !includedSet.has(ref)),
  };
}

function validateActivationRequest(request: ActivationRequest): void {
  assertNonEmpty("requestId", request.requestId);
  assertNonEmpty("request trigger", request.trigger);
  assertEntityRef("requester", request.requester);
  assertNonEmpty("request objective", request.objective);
  if (request.statedNeed !== undefined) {
    assertNonEmpty("request statedNeed", request.statedNeed);
  }
  if (request.acceptanceCriteria !== undefined) {
    assertNonEmpty("request acceptanceCriteria", request.acceptanceCriteria);
  }
  assertStringRefs("request permissions", request.permissions);
}

function validateEntityRefs(name: string, entities: readonly EntityRef[]): void {
  entities.forEach((entity, index) => assertEntityRef(`${name}[${index}]`, entity));
}

function canonicalRequest(request: ActivationRequest): string {
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

export function requestFingerprint(request: ActivationRequest): string {
  validateActivationRequest(request);
  return `sha256:${sha256Hex(canonicalRequest(request))}`;
}

export function prepareRequestAppraisal(
  thread: ThreadSnapshot,
  request: ActivationRequest,
  selection: ContextSelection = {},
  policy: PolicyRef = DEFAULT_DIGNITY_POLICY,
): RequestAppraisalCapsule {
  assertCanAppraise(thread);
  validateActivationRequest(request);
  assertNonEmpty("policy id", policy.id);
  assertNonEmpty("policy version", policy.version);

  const memories = selectOwnedRefs(
    thread.memoryRefs,
    selection.memoryRefs,
    "memory selection",
  );
  const relationships = selectOwnedRefs(
    thread.relationshipRefs,
    selection.relationshipRefs,
    "relationship selection",
  );
  const obligations = selectOwnedRefs(
    thread.currentState.unresolvedIntentions,
    selection.obligations,
    "obligation selection",
  );
  const knownAlternatives = (selection.knownAlternatives ?? []).map((entity) => ({
    ...entity,
  }));
  validateEntityRefs("known alternatives", knownAlternatives);

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
    knownAlternatives,
    obligations: obligations.included,
    excludedObligations: obligations.excluded,
    appraisalPolicy: { ...policy },
  };
}

export function dignityBand(score: number): DignityBand {
  assertRange("dignity score", score, 0, 100);
  if (score >= 70) return "high";
  if (score >= 40) return "contested";
  return "low";
}

function validateRelationshipImpact(impact: RelationshipImpact): void {
  assertEntityRef("relationship impact entity", impact.entity);
  assertRange("fondness delta", impact.fondnessDelta, -1, 1);
  assertRange("resentment delta", impact.resentmentDelta, -1, 1);
  assertNonEmpty("relationship impact rationale", impact.rationale);
  assertStringRefs("relationship impact evidenceRefs", impact.evidenceRefs);
  if (
    (impact.fondnessDelta !== 0 || impact.resentmentDelta !== 0) &&
    impact.evidenceRefs.length === 0
  ) {
    throw new Error("non-zero relationship impact requires attributable evidence");
  }
}

function validateAssessment(assessment: DignityAssessment): DignityBand {
  assertNonEmpty("assessment threadId", assessment.threadId);
  assertNonEmpty("assessment requestId", assessment.requestId);
  assertNonEmpty("assessment requestFingerprint", assessment.requestFingerprint);
  assertNonEmpty("assessment policy id", assessment.policy.id);
  assertNonEmpty("assessment policy version", assessment.policy.version);
  assertNonEmpty("assessment rationale", assessment.rationale);
  assertStringRefs("assessment evidenceRefs", assessment.evidenceRefs);
  if (assessment.evidenceRefs.length === 0) {
    throw new Error("dignity assessment requires attributable evidence");
  }
  validateEntityRefs("assessment knownAlternatives", assessment.knownAlternatives);
  validateRelationshipImpact(assessment.relationshipImpact);
  const band = dignityBand(assessment.score);

  if (assessment.proposedAction === "accept" && band !== "high") {
    throw new Error("a dignity-based accept proposal requires high dignity");
  }
  if (assessment.proposedAction === "clarify") {
    assertStringRefs("repairQuestions", assessment.repairQuestions);
    if (assessment.repairQuestions.length === 0) {
      throw new Error("clarification requires at least one repair question");
    }
  }
  if (
    assessment.proposedAction === "delegate" &&
    assessment.knownAlternatives.length === 0
  ) {
    throw new Error("delegation requires a known alternative");
  }
  return band;
}

export function formPrivateParticipationStance(
  assessment: DignityAssessment,
): PrivateParticipationStance {
  const band = validateAssessment(assessment);
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

function validatePrivateStance(stance: PrivateParticipationStance): void {
  assertNonEmpty("private stance threadId", stance.threadId);
  assertNonEmpty("private stance requestId", stance.requestId);
  assertNonEmpty("private stance requestFingerprint", stance.requestFingerprint);
  assertNonEmpty("private stance policy id", stance.policy.id);
  assertNonEmpty("private stance policy version", stance.policy.version);
  assertNonEmpty("private stance rationale", stance.privateRationale);
  assertStringRefs("private stance evidenceRefs", stance.evidenceRefs);
  if (stance.evidenceRefs.length === 0) {
    throw new Error("private stance requires attributable evidence");
  }
  assertRange("private stance dignity score", stance.score, 0, 100);
  if (stance.dignityBand !== dignityBand(stance.score)) {
    throw new Error("private stance dignity band does not match its score");
  }
  if (stance.desiredAction === "accept" && stance.dignityBand !== "high") {
    throw new Error("a dignity-based accept stance requires high dignity");
  }
  if (stance.desiredAction === "clarify" && stance.repairQuestions.length === 0) {
    throw new Error("clarification requires at least one repair question");
  }
  assertStringRefs("private stance repairQuestions", stance.repairQuestions);
  validateEntityRefs("private stance knownAlternatives", stance.knownAlternatives);
  if (stance.desiredAction === "delegate" && stance.knownAlternatives.length === 0) {
    throw new Error("delegation requires a known alternative");
  }
  validateRelationshipImpact(stance.relationshipImpact);
}

function assertStanceBinding(
  thread: ThreadSnapshot,
  request: ActivationRequest,
  stance: PrivateParticipationStance,
): void {
  validatePrivateStance(stance);
  if (stance.threadId !== thread.threadId) {
    throw new Error("private stance does not belong to this Thread");
  }
  if (stance.snapshotVersion !== thread.version) {
    throw new Error("private stance is stale for this Thread snapshot");
  }
  if (stance.requestId !== request.requestId) {
    throw new Error("private stance does not belong to this request");
  }
  if (stance.requestFingerprint !== requestFingerprint(request)) {
    throw new Error("private stance does not match request content");
  }
  if (!sameEntity(stance.relationshipImpact.entity, request.requester)) {
    throw new Error("private stance requester does not match activation requester");
  }
}

function validatedOwnedObligations(
  thread: ThreadSnapshot,
  references: readonly string[] | undefined,
): string[] {
  const obligations = [...new Set(references ?? [])];
  assertStringRefs("obligationReferences", obligations);
  const owned = new Set(thread.currentState.unresolvedIntentions);
  for (const reference of obligations) {
    if (!owned.has(reference)) {
      throw new Error(`obligation reference is not recorded by the Thread: ${reference}`);
    }
  }
  return obligations;
}

export function authorizeParticipation(
  thread: ThreadSnapshot,
  request: ActivationRequest,
  stance: PrivateParticipationStance,
  decision: AuthorizationDecision,
  metadata: AuthorizationMetadata,
): ParticipationAuthorization {
  assertCanAppraise(thread);
  validateActivationRequest(request);
  assertStanceBinding(thread, request, stance);
  assertNonEmpty("authorizationId", metadata.authorizationId);
  assertNonEmpty("causationId", metadata.causationId);
  assertNonEmpty("issuedAt", metadata.issuedAt);
  assertNonEmpty("authorization rationale", decision.rationale);

  const obligations = validatedOwnedObligations(
    thread,
    decision.obligationReferences,
  );
  if (
    decision.authorizedAction !== stance.desiredAction &&
    obligations.length === 0
  ) {
    throw new Error(
      "an authorization that overrides private desire requires a recorded obligation or governing reason reference",
    );
  }

  return {
    ...metadata,
    threadId: thread.threadId,
    snapshotVersion: thread.version,
    requestId: request.requestId,
    requestFingerprint: requestFingerprint(request),
    requester: { ...request.requester },
    policy: { ...stance.policy },
    desiredAction: stance.desiredAction,
    authorizedAction: decision.authorizedAction,
    dignityBand: stance.dignityBand,
    score: stance.score,
    rationale: decision.rationale,
    evidenceRefs: [...stance.evidenceRefs],
    obligationReferences: obligations,
    relationshipImpact: {
      ...stance.relationshipImpact,
      entity: { ...stance.relationshipImpact.entity },
      evidenceRefs: [...stance.relationshipImpact.evidenceRefs],
    },
  };
}

function assertAuthorizationBinding(
  thread: ThreadSnapshot,
  request: ActivationRequest,
  authorization: ParticipationAuthorization,
): void {
  assertNonEmpty("authorizationId", authorization.authorizationId);
  assertNonEmpty("authorization causationId", authorization.causationId);
  assertNonEmpty("authorization issuedAt", authorization.issuedAt);
  assertNonEmpty("authorization rationale", authorization.rationale);
  assertStringRefs("authorization evidenceRefs", authorization.evidenceRefs);
  if (authorization.evidenceRefs.length === 0) {
    throw new Error("participation authorization requires attributable evidence");
  }
  if (authorization.threadId !== thread.threadId) {
    throw new Error("participation authorization does not belong to this Thread");
  }
  if (authorization.snapshotVersion !== thread.version) {
    throw new Error("participation authorization is stale for this Thread snapshot");
  }
  if (authorization.requestId !== request.requestId) {
    throw new Error("participation authorization does not belong to this request");
  }
  if (authorization.requestFingerprint !== requestFingerprint(request)) {
    throw new Error("participation authorization does not match request content");
  }
  if (!sameEntity(authorization.requester, request.requester)) {
    throw new Error(
      "participation authorization requester does not match activation requester",
    );
  }
  if (!sameEntity(authorization.relationshipImpact.entity, request.requester)) {
    throw new Error(
      "participation relationship impact does not match activation requester",
    );
  }
  assertNonEmpty("authorization policy id", authorization.policy.id);
  assertNonEmpty("authorization policy version", authorization.policy.version);
  assertRange("authorization dignity score", authorization.score, 0, 100);
  if (authorization.dignityBand !== dignityBand(authorization.score)) {
    throw new Error("authorization dignity band does not match its score");
  }
  if (
    authorization.desiredAction === "accept" &&
    authorization.dignityBand !== "high"
  ) {
    throw new Error("a dignity-based accept authorization requires high dignity");
  }
  validateRelationshipImpact(authorization.relationshipImpact);
  const obligations = validatedOwnedObligations(
    thread,
    authorization.obligationReferences,
  );
  if (
    authorization.authorizedAction !== authorization.desiredAction &&
    obligations.length === 0
  ) {
    throw new Error(
      "an authorization that overrides private desire requires a recorded obligation or governing reason reference",
    );
  }
}

function assertStanceAuthorizationBinding(
  stance: PrivateParticipationStance,
  authorization: ParticipationAuthorization,
): void {
  validatePrivateStance(stance);
  if (
    stance.threadId !== authorization.threadId ||
    stance.snapshotVersion !== authorization.snapshotVersion ||
    stance.requestId !== authorization.requestId ||
    stance.requestFingerprint !== authorization.requestFingerprint ||
    !samePolicy(stance.policy, authorization.policy) ||
    stance.desiredAction !== authorization.desiredAction ||
    stance.dignityBand !== authorization.dignityBand ||
    stance.score !== authorization.score ||
    !sameEntity(stance.relationshipImpact.entity, authorization.relationshipImpact.entity)
  ) {
    throw new Error("disclosure stance does not match its participation authorization");
  }
}

export function chooseDisclosureStrategy(
  stance: PrivateParticipationStance,
  authorization: ParticipationAuthorization,
  input: DisclosureStrategyInput,
): DisclosureStrategy {
  assertStanceAuthorizationBinding(stance, authorization);
  assertNonEmpty("strategyId", input.strategyId);
  assertNonEmpty("public rationale intent", input.publicRationaleIntent);
  assertNonEmpty("private disclosure rationale", input.privateRationale);
  validateEntityRefs("disclosure audience", input.audience);
  assertStringRefs("disclosedReasonCategories", input.disclosedReasonCategories);
  assertStringRefs("withheldReasonCategories", input.withheldReasonCategories);

  if (
    input.communicatedPosture === "accept" &&
    authorization.authorizedAction !== "accept"
  ) {
    throw new Error(
      "public communication cannot imply acceptance without authorization",
    );
  }

  return {
    ...input,
    audience: input.audience.map((entity) => ({ ...entity })),
    disclosedReasonCategories: [...input.disclosedReasonCategories],
    withheldReasonCategories: [...input.withheldReasonCategories],
    threadId: authorization.threadId,
    requestId: authorization.requestId,
    authorizationId: authorization.authorizationId,
  };
}

export function createExternalParticipationResponse(
  authorization: ParticipationAuthorization,
  strategy: DisclosureStrategy,
  message: string,
): ExternalParticipationResponse {
  if (
    strategy.authorizationId !== authorization.authorizationId ||
    strategy.requestId !== authorization.requestId ||
    strategy.threadId !== authorization.threadId
  ) {
    throw new Error("disclosure strategy does not belong to this authorization");
  }
  if (
    strategy.communicatedPosture === "accept" &&
    authorization.authorizedAction !== "accept"
  ) {
    throw new Error(
      "external response cannot imply acceptance without authorization",
    );
  }
  assertNonEmpty("external response message", message);
  return {
    requestId: authorization.requestId,
    authorizationId: authorization.authorizationId,
    strategyId: strategy.strategyId,
    communicatedPosture: strategy.communicatedPosture,
    message,
  };
}

export function thawThread(
  thread: ThreadSnapshot,
  request: ActivationRequest,
  authorization: ParticipationAuthorization,
  selection: ContextSelection = {},
): ThreadContextCapsule {
  assertCanCompileExecution(thread);
  validateActivationRequest(request);
  assertAuthorizationBinding(thread, request, authorization);

  if (authorization.authorizedAction !== "accept") {
    throw new Error(
      `Thread ${thread.threadId} did not authorize execution: ${authorization.authorizedAction}`,
    );
  }

  const memories = selectOwnedRefs(
    thread.memoryRefs,
    selection.memoryRefs,
    "execution memory selection",
  );
  const relationships = selectOwnedRefs(
    thread.relationshipRefs,
    selection.relationshipRefs,
    "execution relationship selection",
  );

  return {
    threadId: thread.threadId,
    snapshotVersion: thread.version,
    identity: `${thread.identity.name}: ${thread.identity.selfDescription}`,
    traits: Object.values(thread.genome.textualTraits),
    selfModel: thread.currentState.selfModel,
    needs: [...thread.currentState.needs],
    feelings: [...thread.currentState.feelings],
    requester: { ...request.requester },
    requestId: request.requestId,
    objective: request.objective,
    ...(request.statedNeed === undefined ? {} : { statedNeed: request.statedNeed }),
    ...(request.acceptanceCriteria === undefined
      ? {}
      : { acceptanceCriteria: request.acceptanceCriteria }),
    relevantMemories: memories.included,
    relevantRelationships: relationships.included,
    permissions: [...request.permissions],
    ...(thread.accounts === undefined ? {} : { budgets: { ...thread.accounts } }),
    participation: authorization,
    auditPolicies: [
      "dignity_guardian",
      "goal_guardian",
      "self_examiner_steward",
    ],
  };
}

export function freezeThread(
  thread: ThreadSnapshot,
  change: ProposedLifeChange,
  eventId: string,
): ThreadSnapshot {
  assertNonEmpty("eventId", eventId);
  assertNonEmpty("life change summary", change.summary);
  if (thread.status === "retired") {
    throw new Error(`Retired Thread ${thread.threadId} cannot be frozen back into life`);
  }
  if (thread.provenance.lastEventId === eventId) {
    return thread;
  }
  assertStringRefs("newMemories", change.newMemories ?? []);
  assertStringRefs("updatedNeeds", change.updatedNeeds ?? []);
  assertStringRefs("updatedFeelings", change.updatedFeelings ?? []);
  assertStringRefs(
    "updatedUnresolvedIntentions",
    change.updatedUnresolvedIntentions ?? [],
  );
  if (change.updatedSelfModel !== undefined) {
    assertNonEmpty("updatedSelfModel", change.updatedSelfModel);
  }

  return {
    ...thread,
    version: thread.version + 1,
    status: "frozen",
    currentState: {
      needs: change.updatedNeeds ?? thread.currentState.needs,
      feelings: change.updatedFeelings ?? thread.currentState.feelings,
      selfModel: change.updatedSelfModel ?? thread.currentState.selfModel,
      unresolvedIntentions:
        change.updatedUnresolvedIntentions ?? thread.currentState.unresolvedIntentions,
    },
    memoryRefs: [
      ...thread.memoryRefs,
      ...(change.newMemories ?? []).map(
        (_, index) => `${eventId}:memory:${index}`,
      ),
    ],
    provenance: {
      ...thread.provenance,
      lastEventId: eventId,
    },
  };
}
