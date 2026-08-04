import type {
  ActivationRequest,
  AuthorizationDecision,
  AuthorizationMetadata,
  ContextSelection,
  DignityAssessment,
  DignityBand,
  DisclosureStrategy,
  DisclosureStrategyInput,
  ExternalParticipationResponse,
  ParticipationAuthorization,
  PolicyRef,
  PrivateParticipationStance,
  ProposedLifeChange,
  RequestAppraisalCapsule,
  ThreadContextCapsule,
  ThreadSnapshot,
} from "./types.js";

export const DEFAULT_DIGNITY_POLICY: PolicyRef = {
  id: "dignity_guardian",
  version: "1",
};

function assertCanAppraise(thread: ThreadSnapshot): void {
  if (thread.status !== "frozen" && thread.status !== "dormant") {
    throw new Error(`Thread ${thread.threadId} cannot be appraised from ${thread.status}`);
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

function sameEntity(
  left: { entityId: string; kind: string },
  right: { entityId: string; kind: string },
): boolean {
  return left.entityId === right.entityId && left.kind === right.kind;
}

function selectOwnedRefs(
  owned: readonly string[],
  selected: readonly string[] | undefined,
  label: string,
): string[] {
  if (selected === undefined) return [...owned];
  const ownedSet = new Set(owned);
  for (const ref of selected) {
    if (!ownedSet.has(ref)) {
      throw new Error(`${label} contains a ref not owned by the Thread: ${ref}`);
    }
  }
  return [...new Set(selected)];
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
  let hash = 0x811c9dc5;
  for (const character of canonicalRequest(request)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function prepareRequestAppraisal(
  thread: ThreadSnapshot,
  request: ActivationRequest,
  selection: ContextSelection = {},
  policy: PolicyRef = DEFAULT_DIGNITY_POLICY,
): RequestAppraisalCapsule {
  assertCanAppraise(thread);
  assertNonEmpty("requestId", request.requestId);
  assertNonEmpty("policy id", policy.id);
  assertNonEmpty("policy version", policy.version);

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
    relevantMemories: selectOwnedRefs(
      thread.memoryRefs,
      selection.memoryRefs,
      "memory selection",
    ),
    relevantRelationships: selectOwnedRefs(
      thread.relationshipRefs,
      selection.relationshipRefs,
      "relationship selection",
    ),
    knownAlternatives: (selection.knownAlternatives ?? []).map((entity) => ({
      ...entity,
    })),
    obligations:
      selection.obligations === undefined
        ? [...thread.currentState.unresolvedIntentions]
        : [...selection.obligations],
    appraisalPolicy: { ...policy },
  };
}

export function dignityBand(score: number): DignityBand {
  assertRange("dignity score", score, 0, 100);
  if (score >= 70) return "high";
  if (score >= 40) return "contested";
  return "low";
}

function validateAssessment(assessment: DignityAssessment): DignityBand {
  assertNonEmpty("assessment threadId", assessment.threadId);
  assertNonEmpty("assessment requestId", assessment.requestId);
  assertNonEmpty("assessment requestFingerprint", assessment.requestFingerprint);
  assertNonEmpty("assessment policy id", assessment.policy.id);
  assertNonEmpty("assessment policy version", assessment.policy.version);
  const band = dignityBand(assessment.score);
  assertRange(
    "fondness delta",
    assessment.relationshipImpact.fondnessDelta,
    -1,
    1,
  );
  assertRange(
    "resentment delta",
    assessment.relationshipImpact.resentmentDelta,
    -1,
    1,
  );

  if (assessment.proposedAction === "accept" && band !== "high") {
    throw new Error("a dignity-based accept proposal requires high dignity");
  }
  if (
    assessment.proposedAction === "clarify" &&
    assessment.repairQuestions.length === 0
  ) {
    throw new Error("clarification requires at least one repair question");
  }
  if (
    assessment.proposedAction === "delegate" &&
    !assessment.genericAlternativeAvailable
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
    privateFeelings: [...assessment.feelings],
    conflictingMotives: [...assessment.conflictingMotives],
    uncertainties: [...assessment.uncertainties],
    repairQuestions: [...assessment.repairQuestions],
    relationshipImpact: {
      ...assessment.relationshipImpact,
      entity: { ...assessment.relationshipImpact.entity },
    },
  };
}

function assertStanceBinding(
  thread: ThreadSnapshot,
  request: ActivationRequest,
  stance: PrivateParticipationStance,
): void {
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

export function authorizeParticipation(
  thread: ThreadSnapshot,
  request: ActivationRequest,
  stance: PrivateParticipationStance,
  decision: AuthorizationDecision,
  metadata: AuthorizationMetadata,
): ParticipationAuthorization {
  assertCanAppraise(thread);
  assertStanceBinding(thread, request, stance);
  assertNonEmpty("authorizationId", metadata.authorizationId);
  assertNonEmpty("causationId", metadata.causationId);
  assertNonEmpty("issuedAt", metadata.issuedAt);
  assertNonEmpty("authorization rationale", decision.rationale);

  const obligations = [...(decision.obligationReferences ?? [])];
  if (
    decision.authorizedAction !== stance.desiredAction &&
    obligations.length === 0
  ) {
    throw new Error(
      "an authorization that overrides private desire requires an obligation or governing reason reference",
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
    obligationReferences: obligations,
    relationshipImpact: {
      ...stance.relationshipImpact,
      entity: { ...stance.relationshipImpact.entity },
    },
  };
}

function assertAuthorizationBinding(
  thread: ThreadSnapshot,
  request: ActivationRequest,
  authorization: ParticipationAuthorization,
): void {
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
  assertRange(
    "fondness delta",
    authorization.relationshipImpact.fondnessDelta,
    -1,
    1,
  );
  assertRange(
    "resentment delta",
    authorization.relationshipImpact.resentmentDelta,
    -1,
    1,
  );
}

export function chooseDisclosureStrategy(
  stance: PrivateParticipationStance,
  authorization: ParticipationAuthorization,
  input: DisclosureStrategyInput,
): DisclosureStrategy {
  if (
    stance.threadId !== authorization.threadId ||
    stance.requestId !== authorization.requestId
  ) {
    throw new Error("disclosure strategy inputs do not share a Thread and request");
  }
  assertNonEmpty("strategyId", input.strategyId);
  assertNonEmpty("public rationale intent", input.publicRationaleIntent);
  assertNonEmpty("private disclosure rationale", input.privateRationale);

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
    strategy.requestId !== authorization.requestId
  ) {
    throw new Error("disclosure strategy does not belong to this authorization");
  }
  assertNonEmpty("external response message", message);
  return {
    requestId: authorization.requestId,
    authorizationId: authorization.authorizationId,
    communicatedPosture: strategy.communicatedPosture,
    message,
    disclosureMode: strategy.mode,
  };
}

export function thawThread(
  thread: ThreadSnapshot,
  request: ActivationRequest,
  authorization: ParticipationAuthorization,
  selection: ContextSelection = {},
): ThreadContextCapsule {
  assertCanAppraise(thread);
  assertAuthorizationBinding(thread, request, authorization);

  if (authorization.authorizedAction !== "accept") {
    throw new Error(
      `Thread ${thread.threadId} did not authorize execution: ${authorization.authorizedAction}`,
    );
  }

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
    relevantMemories: selectOwnedRefs(
      thread.memoryRefs,
      selection.memoryRefs,
      "execution memory selection",
    ),
    relevantRelationships: selectOwnedRefs(
      thread.relationshipRefs,
      selection.relationshipRefs,
      "execution relationship selection",
    ),
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
  if (!eventId.trim()) throw new Error("eventId is required");

  return {
    ...thread,
    version: thread.version + 1,
    status: "frozen",
    currentState: {
      needs: change.updatedNeeds ?? thread.currentState.needs,
      feelings: change.updatedFeelings ?? thread.currentState.feelings,
      selfModel: change.updatedSelfModel ?? thread.currentState.selfModel,
      unresolvedIntentions: [...thread.currentState.unresolvedIntentions],
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
