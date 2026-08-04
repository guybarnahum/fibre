import type {
  ActivationRequest,
  DignityAssessment,
  DignityBand,
  ParticipationDecision,
  ProposedLifeChange,
  RequestAppraisalCapsule,
  ThreadContextCapsule,
  ThreadSnapshot,
} from "./types.js";

function assertCanAppraise(thread: ThreadSnapshot): void {
  if (thread.status !== "frozen" && thread.status !== "dormant") {
    throw new Error(`Thread ${thread.threadId} cannot thaw from ${thread.status}`);
  }
}

function assertRange(
  name: string,
  value: number,
  minimum: number,
  maximum: number,
): void {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be between ${minimum} and ${maximum}`);
  }
}

export function prepareRequestAppraisal(
  thread: ThreadSnapshot,
  request: ActivationRequest,
): RequestAppraisalCapsule {
  assertCanAppraise(thread);

  return {
    threadId: thread.threadId,
    snapshotVersion: thread.version,
    identity: `${thread.identity.name}: ${thread.identity.selfDescription}`,
    traits: Object.values(thread.genome.textualTraits),
    selfModel: thread.currentState.selfModel,
    needs: [...thread.currentState.needs],
    feelings: [...thread.currentState.feelings],
    requester: { ...request.requester },
    objective: request.objective,
    ...(request.statedNeed === undefined
      ? {}
      : { statedNeed: request.statedNeed }),
    relevantMemories: [...request.relevantMemories],
    relevantRelationships: [...request.relevantRelationships],
    appraisalPolicy: "dignity_guardian",
  };
}

export function dignityBand(score: number): DignityBand {
  assertRange("dignity score", score, 0, 100);
  if (score >= 70) return "high";
  if (score >= 40) return "contested";
  return "low";
}

export function decideParticipation(
  assessment: DignityAssessment,
): ParticipationDecision {
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

  let action: ParticipationDecision["action"];
  if (band === "high") {
    action = "accept";
  } else if (assessment.repairQuestions.length > 0) {
    action = "clarify";
  } else if (band === "contested") {
    action = "negotiate";
  } else if (assessment.genericAlternativeAvailable) {
    action = "delegate";
  } else {
    action = "refuse";
  }

  return {
    action,
    dignityBand: band,
    score: assessment.score,
    rationale: assessment.rationale,
    repairQuestions: [...assessment.repairQuestions],
    feelings: [...assessment.feelings],
    relationshipImpact: {
      ...assessment.relationshipImpact,
      entity: { ...assessment.relationshipImpact.entity },
    },
  };
}

export function thawThread(
  thread: ThreadSnapshot,
  request: ActivationRequest,
  participation: ParticipationDecision,
): ThreadContextCapsule {
  assertCanAppraise(thread);

  const expectedBand = dignityBand(participation.score);
  if (participation.dignityBand !== expectedBand) {
    throw new Error("participation dignity band does not match its score");
  }
  if (
    participation.relationshipImpact.entity.entityId !== request.requester.entityId
  ) {
    throw new Error("participation requester does not match activation requester");
  }
  assertRange(
    "fondness delta",
    participation.relationshipImpact.fondnessDelta,
    -1,
    1,
  );
  assertRange(
    "resentment delta",
    participation.relationshipImpact.resentmentDelta,
    -1,
    1,
  );

  if (participation.action !== "accept") {
    throw new Error(
      `Thread ${thread.threadId} did not consent to execute request: ${participation.action}`,
    );
  }
  if (participation.dignityBand !== "high") {
    throw new Error("accepted participation requires high dignity");
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
    objective: request.objective,
    ...(request.statedNeed === undefined
      ? {}
      : { statedNeed: request.statedNeed }),
    ...(request.acceptanceCriteria === undefined
      ? {}
      : { acceptanceCriteria: request.acceptanceCriteria }),
    relevantMemories: [...request.relevantMemories],
    relevantRelationships: [...request.relevantRelationships],
    permissions: [...request.permissions],
    ...(thread.accounts === undefined ? {} : { budgets: { ...thread.accounts } }),
    participation,
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
      ...(change.newMemories ?? []).map((_, index) => `${eventId}:memory:${index}`),
    ],
    provenance: {
      ...thread.provenance,
      lastEventId: eventId,
    },
  };
}
