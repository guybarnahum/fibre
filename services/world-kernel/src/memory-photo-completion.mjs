import {
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
} from "./persistence-common.mjs";
import { normalizeMemoryVisualCompanion } from "./memory-visual-companion.mjs";

export const MEMORY_PHOTO_ASSET_ISSUES = Object.freeze([
  "asset_missing",
  "hash_mismatch",
]);

function currentCompanion(identityStore, threadId, memoryRef) {
  if (
    identityStore === null ||
    typeof identityStore !== "object" ||
    typeof identityStore.getMemoryVisualCompanionHistory !== "function" ||
    typeof identityStore.recordMemoryVisualCompanion !== "function"
  ) {
    throw new TypeError("identityStore must expose memory visual history and recording");
  }
  assertId("threadId", threadId);
  assertId("memoryRef", memoryRef);
  return identityStore.getMemoryVisualCompanionHistory(threadId, memoryRef).at(-1).companion;
}

function nextRevision(current, patch, recordedAt) {
  assertIsoTimestamp("recordedAt", recordedAt);
  return normalizeMemoryVisualCompanion({
    ...current,
    ...patch,
    revision: current.revision + 1,
    recordedAt,
    supersedesRevision: current.revision,
  });
}

function unavailableRevision(current, reason, recordedAt) {
  assertNonEmpty("memory photo unavailable reason", reason);
  return nextRevision(current, {
    status: "unavailable_with_reason",
    assetRef: null,
    unavailableReason: reason,
  }, recordedAt);
}

function rendererInput(current) {
  return Object.freeze({
    threadId: current.threadId,
    memoryRef: current.memoryRef,
    photoPrompt: current.photoPrompt,
    photoPromptDigest: current.photoPromptDigest,
    sourceReferences: Object.freeze([...current.sourceReferences]),
    representationKind: current.representationKind,
    truthStatus: current.truthStatus,
  });
}

/**
 * Resolve one Thread memory's synthetic-photo obligation using its already-durable
 * prompt. Fibre owns the prompt, provenance and truth status; the renderer only
 * returns a replaceable cache locator.
 */
export async function completeMemoryPhoto({
  identityStore,
  threadId,
  memoryRef,
  recordedAt,
  render,
  regenerate = false,
}) {
  const current = currentCompanion(identityStore, threadId, memoryRef);
  assertIsoTimestamp("recordedAt", recordedAt);

  if (current.status === "available" && !regenerate) {
    return {
      companion: current,
      idempotent: true,
      rendered: false,
    };
  }
  if (current.representationKind !== "synthetic_reconstruction") {
    throw new TypeError("captured memory photos are evidence and cannot be regenerated as synthetic media");
  }
  if (typeof render !== "function") {
    throw new TypeError("render must be a function");
  }

  let rendered;
  try {
    rendered = await render(rendererInput(current));
    if (rendered === null || typeof rendered !== "object" || Array.isArray(rendered)) {
      throw new TypeError("renderer result must be an object");
    }
    assertNonEmpty("renderer result.assetRef", rendered.assetRef);
    assertNonEmpty("renderer result.generatedBy", rendered.generatedBy);
  } catch {
    const failed = unavailableRevision(current, "provider_failure", recordedAt);
    return {
      ...identityStore.recordMemoryVisualCompanion(failed),
      rendered: false,
      failure: "provider_failure",
    };
  }

  const available = nextRevision(current, {
    status: "available",
    assetRef: rendered.assetRef,
    unavailableReason: undefined,
    provenance: {
      ...current.provenance,
      generatedBy: rendered.generatedBy,
    },
  }, recordedAt);
  return {
    ...identityStore.recordMemoryVisualCompanion(available),
    rendered: true,
  };
}

/**
 * Fulfill every currently outstanding synthetic memory-photo obligation for a
 * Thread. This is intentionally a simple loop, not a queue or media workflow.
 * Captured-photo evidence is never auto-replaced with synthetic media.
 */
export async function completeOutstandingMemoryPhotos({
  identityStore,
  threadId,
  recordedAt,
  render,
}) {
  if (typeof identityStore?.listMemoryVisualCompanions !== "function") {
    throw new TypeError("identityStore must expose current memory visual companions");
  }
  assertId("threadId", threadId);
  assertIsoTimestamp("recordedAt", recordedAt);
  if (typeof render !== "function") throw new TypeError("render must be a function");

  const current = identityStore.listMemoryVisualCompanions(threadId);
  const results = [];
  let alreadyAvailable = 0;
  let completed = 0;
  let failed = 0;
  let capturedOutstanding = 0;

  for (const { companion } of current) {
    if (companion.status === "available") {
      alreadyAvailable += 1;
      continue;
    }
    if (companion.representationKind !== "synthetic_reconstruction") {
      capturedOutstanding += 1;
      continue;
    }
    const result = await completeMemoryPhoto({
      identityStore,
      threadId,
      memoryRef: companion.memoryRef,
      recordedAt,
      render,
    });
    results.push(result);
    if (result.companion.status === "available") completed += 1;
    else failed += 1;
  }

  return {
    threadId,
    memoryCount: current.length,
    attempted: results.length,
    completed,
    failed,
    alreadyAvailable,
    capturedOutstanding,
    results,
  };
}

/**
 * Record that the replaceable cached photo no longer satisfies the memory-photo
 * obligation. The memory, prompt, source evidence and truth status are unchanged.
 */
export function reportMemoryPhotoAssetIssue({
  identityStore,
  threadId,
  memoryRef,
  issue,
  recordedAt,
}) {
  if (!MEMORY_PHOTO_ASSET_ISSUES.includes(issue)) {
    throw new TypeError(`memory photo asset issue must be one of: ${MEMORY_PHOTO_ASSET_ISSUES.join(", ")}`);
  }
  const current = currentCompanion(identityStore, threadId, memoryRef);
  assertIsoTimestamp("recordedAt", recordedAt);

  if (current.status === "unavailable_with_reason" && current.unavailableReason === issue) {
    return {
      companion: current,
      idempotent: true,
    };
  }
  if (current.status !== "available") {
    throw new TypeError("only an available memory photo can be invalidated as missing or corrupt");
  }

  return identityStore.recordMemoryVisualCompanion(
    unavailableRevision(current, issue, recordedAt),
  );
}
