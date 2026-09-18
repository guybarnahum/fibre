import { projectNewbornThreadPresentation } from "./newborn-presentation-projector.mjs";

const RETRY_BASE_MS = 5_000;
const RETRY_MAX_MS = 300_000;

function method(name, target, member) {
  if (target === null || typeof target !== "object" || typeof target[member] !== "function") {
    throw new TypeError(`${name} must implement ${member}()`);
  }
  return target;
}

function optionalActivityRecorder(value) {
  if (value === null) return null;
  if (!value || typeof value.record !== "function" || typeof value.runStage !== "function") {
    throw new TypeError("Genesis presentation activityRecorder must expose record() and runStage()");
  }
  return value;
}

async function bestEffortRecord(activity, record) {
  if (activity === null) return;
  try { await activity.record(record); } catch {}
}

async function runActivityStage(activity, metadata, operation) {
  if (activity === null) return operation();
  return activity.runStage(metadata, operation);
}

function retryDelayMs(attemptCount) {
  if (!Number.isSafeInteger(attemptCount) || attemptCount <= 0) return 0;
  return Math.min(RETRY_MAX_MS, RETRY_BASE_MS * (2 ** Math.min(16, attemptCount - 1)));
}

function retryEligible(entry, observedAt) {
  if (entry.lastError?.retryable === false) return false;
  if (entry.attemptCount <= 0 || entry.lastAttemptAt === null) return true;
  const observedMs = Date.parse(observedAt);
  const lastAttemptMs = Date.parse(entry.lastAttemptAt);
  if (!Number.isFinite(observedMs) || !Number.isFinite(lastAttemptMs)) return true;
  return observedMs - lastAttemptMs >= retryDelayMs(entry.attemptCount);
}

function errorResult(entry, recorded) {
  return Object.freeze({
    genesisId: entry.genesisId,
    threadId: entry.threadId,
    delivered: false,
    state: recorded.state,
    attemptCount: recorded.attemptCount,
    error: recorded.lastError,
  });
}

export function createGenesisPresentationDeliveryService({
  worldReader,
  civilRegistry,
  outbox,
  presentationPublisher,
  projector = projectNewbornThreadPresentation,
  activityRecorder = null,
  activityContextForEntry = null,
  now = () => new Date().toISOString(),
} = {}) {
  const world = method("worldReader", worldReader, "getThread");
  const registry = method("civilRegistry", civilRegistry, "getCivilRegistrationByThreadId");
  const queue = method("outbox", outbox, "listPending");
  method("outbox", outbox, "get");
  method("outbox", outbox, "getByThreadId");
  method("outbox", outbox, "recordFailure");
  method("outbox", outbox, "markDelivered");
  const publisher = method("presentationPublisher", presentationPublisher, "publishGenesisPresentation");
  method("presentationPublisher", presentationPublisher, "reconcileIdentityProjection");
  const activity = optionalActivityRecorder(activityRecorder);
  if (activityContextForEntry !== null && typeof activityContextForEntry !== "function") {
    throw new TypeError("Genesis presentation activityContextForEntry must be a function or null");
  }
  if (typeof projector !== "function") throw new TypeError("projector must be a function");
  if (typeof now !== "function") throw new TypeError("now must be a function");

  function activityContext(entry) {
    const supplied = activityContextForEntry?.(entry) ?? {};
    return Object.freeze({
      requestId: supplied.requestId ?? null,
      genesisId: entry.genesisId,
      threadId: entry.threadId,
    });
  }

  function projectEntry(entry) {
    const thread = world.getThread(entry.threadId);
    const civilRegistration = registry.getCivilRegistrationByThreadId(entry.threadId);
    return projector({ thread, manifest:entry.manifest, civilRegistration });
  }

  async function deliverEntry(entry) {
    if (entry.state === "delivered") {
      return Object.freeze({
        genesisId: entry.genesisId,
        threadId: entry.threadId,
        delivered: true,
        reused: true,
        state: entry.state,
        attemptCount: entry.attemptCount,
      });
    }

    const context = activityContext(entry);
    const attempt = Math.max(1, entry.attemptCount + 1);
    if (entry.attemptCount > 0) {
      await bestEffortRecord(activity, {
        ...context,
        stage: "presentation.snapshot.publish",
        status: "retrying",
        attempt,
        message: "Retrying Genesis presentation delivery",
      });
    }
    try {
      const bundle = projectEntry(entry);
      const publication = await runActivityStage(activity, {
        ...context,
        stage: "presentation.snapshot.publish",
        attempt,
      }, async () => publisher.publishGenesisPresentation({
        genesisId: entry.genesisId,
        publicationDigest: entry.publicationDigest,
        bundle,
      }));
      const deliveredAt = now();
      const delivered = queue.markDelivered(entry.genesisId, { deliveredAt });
      return Object.freeze({
        genesisId: entry.genesisId,
        threadId: entry.threadId,
        delivered: true,
        reused: publication?.reused === true,
        state: delivered.state,
        attemptCount: delivered.attemptCount,
        presentation: publication ?? null,
      });
    } catch (error) {
      const attemptedAt = now();
      const recorded = queue.recordFailure(entry.genesisId, error, { attemptedAt });
      return errorResult(entry, recorded);
    }
  }

  return Object.freeze({
    async deliverGenesis(genesisId) {
      const entry = queue.get(genesisId);
      if (entry === null) throw new Error(`Genesis presentation outbox record ${genesisId} was not found`);
      return deliverEntry(entry);
    },

    async rebuildThreadPresentation(threadId) {
      const entry = queue.getByThreadId(threadId);
      if (entry === null) throw new Error(`Thread ${threadId} has no Genesis presentation outbox record`);
      const bundle = projectEntry(entry);
      const publication = await runActivityStage(activity, {
        ...activityContext(entry),
        stage: "presentation.snapshot.rebuild",
        attempt: 1,
      }, async () => publisher.publishGenesisPresentation({
        genesisId: entry.genesisId,
        publicationDigest: entry.publicationDigest,
        bundle,
      }));
      return Object.freeze({
        genesisId: entry.genesisId,
        threadId: entry.threadId,
        rebuilt: publication?.reused !== true,
        reused: publication?.reused === true,
        presentation: publication ?? null,
      });
    },

    async reconcileThreadPresentationIdentity(threadId) {
      const thread = world.getThread(threadId);
      const registration = registry.getCivilRegistrationByThreadId(threadId);
      if (registration === null) throw new Error(`Thread ${threadId} has no civil registration`);
      const sourceReferences = [
        threadId,
        thread.provenance?.lastEventId ?? null,
      ].filter((value) => typeof value === "string" && value.trim() !== "");
      const projectedAt = now();
      const publication = await publisher.reconcileIdentityProjection({
        threadId,
        projectedAt,
        projection:{
          threadId,
          displayName:thread.identity?.name ?? null,
          birthDate:thread.identity?.birthDate ?? null,
          languages:Array.isArray(thread.identity?.languages) ? thread.identity.languages : [],
          lifecycleStatus:thread.status,
          fibreIdentityNumber:registration.fibreIdentityNumber,
          worldVersion:thread.version,
          sourceReferences,
        },
      });
      return Object.freeze({
        threadId,
        reconciled:publication?.changed === true,
        reused:publication?.changed === false,
        presentation:publication ?? null,
      });
    },

    async deliverPending({ limit = 100 } = {}) {
      const observedAt = now();
      const pending = queue.listPending({ limit }).filter((entry) => retryEligible(entry, observedAt));
      const results = [];
      for (const entry of pending) results.push(await deliverEntry(entry));
      return Object.freeze({
        attempted: results.length,
        delivered: results.filter((result) => result.delivered).length,
        failed: results.filter((result) => !result.delivered).length,
        results: Object.freeze(results),
      });
    },
  });
}
