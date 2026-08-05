import {
  IdempotencyConflictError,
  IntegrityError,
  StaleThreadVersionError,
  ThreadAlreadyExistsError,
  ThreadNotFoundError,
  assertExactKeys,
  assertId,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
  threadStateHash,
} from "./persistence-common.mjs";
import {
  applyCommandToThread,
  applyEventToThread,
  commandDigest,
  eventIdForCommand,
  normalizeSeedSnapshot,
  validateCommand,
  validateThreadSnapshot,
} from "./persistence-domain.mjs";

export const COMMAND_PREVIEW_SCHEMA_VERSION = 1;
const PREVIEW_ID_PATTERN = /^prv_[0-9a-f]{64}$/;

export class PreviewMismatchError extends Error {}
export class RouteThreadMismatchError extends Error {}

function assertPreviewId(previewId) {
  assertNonEmpty("previewId", previewId);
  if (!PREVIEW_ID_PATTERN.test(previewId)) {
    throw new TypeError("previewId has an invalid format");
  }
}

function receiptFields({ command, digest, currentStateHash, eventId, resultingVersion, resultingStateHash }) {
  return {
    schemaVersion: COMMAND_PREVIEW_SCHEMA_VERSION,
    threadId: command.threadId,
    commandId: command.commandId,
    commandDigest: digest,
    expectedVersion: command.expectedVersion,
    currentStateHash,
    proposedEventId: eventId,
    proposedResultingVersion: resultingVersion,
    proposedStateHash: resultingStateHash,
  };
}

function previewIdForReceipt(receipt) {
  return `prv_${sha256(canonicalJson(receipt))}`;
}

function publicPreview(receipt, command, resultingThread, sequence) {
  return {
    previewId: previewIdForReceipt(receipt),
    ...receipt,
    proposedEvent: {
      eventId: receipt.proposedEventId,
      threadId: command.threadId,
      sequence,
      expectedVersion: command.expectedVersion,
      resultingVersion: receipt.proposedResultingVersion,
      eventType: "SELF_MODEL_UPDATED",
      commandId: command.commandId,
      commandDigest: receipt.commandDigest,
      payload: structuredClone(command.payload),
      actor: structuredClone(command.actor),
      occurredAt: command.occurredAt,
      stateHash: receipt.proposedStateHash,
      authorizationId: null,
      causationId: command.commandId,
      correlationId: command.commandId,
      payloadSchemaVersion: 1,
    },
    resultingThread,
  };
}

function findAcceptedEvent(store, commandId, threadId) {
  const events = store.listEvents(threadId);
  const index = events.findIndex((event) => event.commandId === commandId);
  if (index < 0) return null;
  if (index === 0) {
    throw new IdempotencyConflictError(
      `Command ${commandId} appears where the immutable seed event must be`,
    );
  }
  return { event: events[index], priorEvent: events[index - 1] };
}

function previewFromAcceptedEvent(command, accepted) {
  const digest = commandDigest(command);
  if (accepted.event.commandDigest !== digest) {
    throw new IdempotencyConflictError(
      `Command ${command.commandId} was already used with different content`,
    );
  }
  const receipt = receiptFields({
    command,
    digest,
    currentStateHash: accepted.priorEvent.stateHash,
    eventId: accepted.event.eventId,
    resultingVersion: accepted.event.resultingVersion,
    resultingStateHash: accepted.event.stateHash,
  });
  return { previewId: previewIdForReceipt(receipt), ...receipt };
}

export class WorldKernelService {
  #store;

  constructor(store) {
    if (store === null || typeof store !== "object") throw new TypeError("store is required");
    for (const method of [
      "storageMetadata", "seedThread", "getThread", "listEvents", "applyCommand",
      "verifyThreadIntegrity", "repairThreadProjection",
    ]) {
      if (typeof store[method] !== "function") throw new TypeError(`store.${method} is required`);
    }
    this.#store = store;
  }

  health() {
    return {
      service: "world-kernel",
      status: "ok",
      storage: this.#store.storageMetadata(),
      previewSchemaVersion: COMMAND_PREVIEW_SCHEMA_VERSION,
    };
  }

  seedThread(request) {
    assertPlainObject("seed request", request);
    assertExactKeys("seed request", request, ["thread", "occurredAt"]);
    validateThreadSnapshot(request.thread);
    const normalized = normalizeSeedSnapshot(request.thread);
    const occurredAt = request.occurredAt ?? request.thread.provenance.createdAt;

    let current;
    try {
      current = this.#store.getThread(normalized.threadId);
    } catch (error) {
      if (error instanceof ThreadNotFoundError) {
        return this.#store.seedThread(
          request.thread,
          request.occurredAt === undefined ? {} : { occurredAt: request.occurredAt },
        );
      }
      throw error;
    }

    const events = this.#store.listEvents(normalized.threadId);
    const firstEvent = events[0];
    if (firstEvent === undefined || firstEvent.eventType !== "THREAD_SEEDED") {
      throw new IntegrityError(`Thread ${normalized.threadId} has no valid seed event`);
    }
    const originalSeed = applyEventToThread(null, firstEvent);
    if (
      canonicalJson(originalSeed) !== canonicalJson(normalized) ||
      firstEvent.occurredAt !== occurredAt
    ) {
      throw new ThreadAlreadyExistsError(
        `Thread ${normalized.threadId} already exists with a different immutable seed`,
      );
    }
    return { thread: current, created: false };
  }

  getThread(threadId) {
    assertId("threadId", threadId);
    return this.#store.getThread(threadId);
  }

  listEvents(threadId) {
    assertId("threadId", threadId);
    const events = this.#store.listEvents(threadId);
    if (events.length === 0) {
      throw new ThreadNotFoundError(`Thread ${threadId} has no event history`);
    }
    return events;
  }

  verifyThreadIntegrity(threadId) {
    assertId("threadId", threadId);
    return this.#store.verifyThreadIntegrity(threadId);
  }

  previewCommandRequest(request) {
    assertPlainObject("preview request", request);
    assertExactKeys("preview request", request, ["command"]);
    return this.previewCommand(request.command);
  }

  previewCommand(command) {
    validateCommand(command);
    const thread = this.#store.getThread(command.threadId);
    if (thread.version !== command.expectedVersion) {
      throw new StaleThreadVersionError(
        `Thread ${command.threadId} is version ${thread.version}; command expected ${command.expectedVersion}`,
      );
    }
    const digest = commandDigest(command);
    const eventId = eventIdForCommand(command, digest);
    const resultingThread = applyCommandToThread(thread, command, eventId);
    validateThreadSnapshot(resultingThread);
    const receipt = receiptFields({
      command,
      digest,
      currentStateHash: threadStateHash(thread),
      eventId,
      resultingVersion: resultingThread.version,
      resultingStateHash: threadStateHash(resultingThread),
    });
    const sequence = this.#store.listEvents(command.threadId).length + 1;
    return publicPreview(receipt, command, resultingThread, sequence);
  }

  applyPreviewedCommand(request) {
    assertPlainObject("command acceptance", request);
    assertExactKeys("command acceptance", request, ["previewId", "command"]);
    assertPreviewId(request.previewId);
    validateCommand(request.command);

    const accepted = findAcceptedEvent(
      this.#store,
      request.command.commandId,
      request.command.threadId,
    );
    const preview = accepted
      ? previewFromAcceptedEvent(request.command, accepted)
      : this.previewCommand(request.command);

    if (preview.previewId !== request.previewId) {
      throw new PreviewMismatchError(
        `Preview ${request.previewId} does not match the current command and Thread state`,
      );
    }
    const result = this.#store.applyCommand(request.command);
    if (
      result.thread?.threadId !== preview.threadId ||
      result.thread?.version !== preview.proposedResultingVersion ||
      threadStateHash(result.thread) !== preview.proposedStateHash ||
      result.event?.eventId !== preview.proposedEventId ||
      result.event?.commandDigest !== preview.commandDigest ||
      result.event?.stateHash !== preview.proposedStateHash
    ) {
      throw new IntegrityError(
        `Accepted command ${request.command.commandId} did not produce its previewed result`,
      );
    }
    return result;
  }

  repairThreadProjection(threadId) {
    assertId("threadId", threadId);
    return this.#store.repairThreadProjection(threadId);
  }
}

export function assertRouteThread(threadId, command) {
  assertId("threadId", threadId);
  validateCommand(command);
  if (command.threadId !== threadId) {
    throw new RouteThreadMismatchError(
      `Route Thread ${threadId} does not match command Thread ${command.threadId}`,
    );
  }
}
