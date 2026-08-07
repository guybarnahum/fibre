import {
  assertId,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";

export const CAUSAL_CONTEXT_POLICY = Object.freeze({
  id: "fibre_owned_attention",
  version: "1",
});

export const MEMORY_RESOLUTION_POLICY = Object.freeze({
  id: "durable_memory_summary",
  version: "1",
});

export const WORLD_ALTERNATIVE_POLICY = Object.freeze({
  id: "shared_relationship_thread_directory",
  version: "1",
});

function threadEntity(thread) {
  return {
    entityId: thread.threadId,
    kind: "thread",
    displayName: thread.identity.name,
  };
}

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function sharesRelationshipReference(thread, candidate) {
  const owned = new Set(thread.relationshipRefs);
  return candidate.relationshipRefs.some((reference) => owned.has(reference));
}

export function selectCausalContext({ thread, worldThreads, memoryRecords }) {
  assertPlainObject("causal context input", { thread, worldThreads, memoryRecords });
  assertId("causal context threadId", thread.threadId);
  if (!Array.isArray(worldThreads)) throw new TypeError("worldThreads must be an array");
  if (!Array.isArray(memoryRecords)) throw new TypeError("memoryRecords must be an array");

  const ownedMemoryRefs = sortedUnique(thread.memoryRefs);
  const memoryById = new Map(
    memoryRecords.map((memory) => {
      if (memory.threadId !== thread.threadId) {
        throw new TypeError(`memory ${memory.memoryId} does not belong to ${thread.threadId}`);
      }
      return [memory.memoryId, memory];
    }),
  );
  const relevantMemoryRefs = ownedMemoryRefs.filter((memoryId) => memoryById.has(memoryId));
  const unresolvedMemoryRefs = ownedMemoryRefs.filter((memoryId) => !memoryById.has(memoryId));
  const resolvedMemories = relevantMemoryRefs.map((memoryId) => structuredClone(memoryById.get(memoryId)));

  // M1 has relationship references but no durable relationship aggregate/content yet.
  // Opaque relationship IDs remain excluded as semantic cognition. V1 may use a
  // shared durable reference only as a world-resolution predicate for whether
  // another real Thread is a known collaboration alternative.
  const relationshipRefs = [];

  const alternatives = worldThreads
    .filter((candidate) =>
      candidate.threadId !== thread.threadId &&
      candidate.status !== "retired" &&
      sharesRelationshipReference(thread, candidate))
    .sort((left, right) => left.threadId.localeCompare(right.threadId))
    .map(threadEntity);

  const alternativeEvidence = alternatives.map((entity) => ({
    entity: structuredClone(entity),
    resolutionPolicy: { ...WORLD_ALTERNATIVE_POLICY },
  }));

  const selection = {
    memoryRefs: relevantMemoryRefs,
    relationshipRefs,
    obligations: [...thread.currentState.unresolvedIntentions].sort(),
    knownAlternatives: alternatives,
  };

  return {
    selection,
    runtimeSelection: {
      memoryRefs: [...relevantMemoryRefs],
      relationshipRefs: [...relationshipRefs],
    },
    resolvedMemories,
    evidence: {
      selectionAuthority: "fibre",
      selectionPolicy: { ...CAUSAL_CONTEXT_POLICY },
      memoryResolutionPolicy: { ...MEMORY_RESOLUTION_POLICY },
      worldResolutionPolicy: { ...WORLD_ALTERNATIVE_POLICY },
      unresolvedMemoryRefs,
      excludedRelationshipRefs: sortedUnique(thread.relationshipRefs),
      alternativeEvidence,
      selectionDigest: `sha256:${sha256(canonicalJson(selection))}`,
    },
  };
}
