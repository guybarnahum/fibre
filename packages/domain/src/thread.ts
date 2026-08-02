import type {
  ActivationRequest,
  ProposedLifeChange,
  ThreadContextCapsule,
  ThreadSnapshot,
} from "./types.js";

export function thawThread(
  thread: ThreadSnapshot,
  request: ActivationRequest,
): ThreadContextCapsule {
  if (thread.status !== "frozen" && thread.status !== "dormant") {
    throw new Error(`Thread ${thread.threadId} cannot thaw from ${thread.status}`);
  }

  return {
    threadId: thread.threadId,
    snapshotVersion: thread.version,
    identity: `${thread.identity.name}: ${thread.identity.selfDescription}`,
    traits: Object.values(thread.genome.textualTraits),
    selfModel: thread.currentState.selfModel,
    needs: [...thread.currentState.needs],
    feelings: [...thread.currentState.feelings],
    objective: request.objective,
    ...(request.acceptanceCriteria === undefined
      ? {}
      : { acceptanceCriteria: request.acceptanceCriteria }),
    relevantMemories: [...request.relevantMemories],
    relevantRelationships: [...request.relevantRelationships],
    permissions: [...request.permissions],
    ...(thread.accounts === undefined ? {} : { budgets: { ...thread.accounts } }),
    auditPolicies: ["goal_guardian", "self_examiner_steward"],
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
