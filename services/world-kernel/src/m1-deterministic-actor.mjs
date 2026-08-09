import {
  assertId,
  assertNonEmpty,
  assertPlainObject,
  assertStringArray,
} from "./persistence-common.mjs";
import { ParticipationAuthorizationRejectedError } from "./runtime-domain.mjs";

// Historical M1 runtime behavior is retained as an explicit implementation so
// pre-M2 Development work can add an episode-forming Actor without rewriting
// the closed M1 round trip or its evidence expectations.
export function m1DeterministicActorOutput(context) {
  assertPlainObject("execution context", context);
  assertId("execution context threadId", context.threadId);
  assertId("execution context requestId", context.requestId);
  assertNonEmpty("execution context objective", context.objective);
  assertStringArray("execution context permissions", context.permissions);
  if (context.participation?.authorizedAction !== "accept") {
    throw new ParticipationAuthorizationRejectedError(
      "deterministic Actor requires accepted participation authorization",
    );
  }
  const criteria = context.acceptanceCriteria ?? "No explicit acceptance criteria were supplied.";
  const evidenceRef = context.relevantMemories[0] ?? context.relevantRelationships[0] ?? null;
  return {
    worker: { kind: "deterministic_actor", version: "1" },
    threadId: context.threadId,
    snapshotVersion: context.snapshotVersion,
    requestId: context.requestId,
    requestFingerprint: context.requestFingerprint,
    objective: context.objective,
    summary: `Prepared a bounded deterministic plan for: ${context.objective}`,
    steps: [
      { ordinal: 1, action: "confirm_scope", detail: criteria },
      {
        ordinal: 2,
        action: "use_selected_context",
        detail: `Use ${context.relevantMemories.length} selected memories and ${context.relevantRelationships.length} selected relationships.`,
      },
      {
        ordinal: 3,
        action: "prepare_deliverable",
        detail: "Produce the requested bounded deliverable without directly mutating authoritative world state.",
      },
    ],
    toolCalls: [],
    proposedCommands: [],
    proposedLifeChanges: evidenceRef === null
      ? []
      : [{
          kind: "memory",
          summary: `Remember that request ${context.requestId} was evaluated through a bounded deterministic runtime.`,
          evidenceRefs: [evidenceRef],
        }],
  };
}
