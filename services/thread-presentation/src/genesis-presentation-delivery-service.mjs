import { projectNewbornThreadPresentation } from "./newborn-presentation-projector.mjs";

function method(name, target, member) {
  if (target === null || typeof target !== "object" || typeof target[member] !== "function") {
    throw new TypeError(`${name} must implement ${member}()`);
  }
  return target;
}

function errorResult(entry, error, recorded) {
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
  now = () => new Date().toISOString(),
} = {}) {
  const world = method("worldReader", worldReader, "getThread");
  const registry = method("civilRegistry", civilRegistry, "getCivilRegistrationByThreadId");
  const queue = method("outbox", outbox, "listPending");
  method("outbox", outbox, "get");
  method("outbox", outbox, "recordFailure");
  method("outbox", outbox, "markDelivered");
  const publisher = method("presentationPublisher", presentationPublisher, "publishGenesisPresentation");
  if (typeof projector !== "function") throw new TypeError("projector must be a function");
  if (typeof now !== "function") throw new TypeError("now must be a function");

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

    try {
      const thread = world.getThread(entry.threadId);
      const civilRegistration = registry.getCivilRegistrationByThreadId(entry.threadId);
      const bundle = projector({
        thread,
        manifest: entry.manifest,
        civilRegistration,
      });
      const publication = await publisher.publishGenesisPresentation({
        genesisId: entry.genesisId,
        publicationDigest: entry.publicationDigest,
        bundle,
      });
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
      return errorResult(entry, error, recorded);
    }
  }

  return Object.freeze({
    async deliverGenesis(genesisId) {
      const entry = queue.get(genesisId);
      if (entry === null) throw new Error(`Genesis presentation outbox record ${genesisId} was not found`);
      return deliverEntry(entry);
    },

    async deliverPending({ limit = 100 } = {}) {
      const pending = queue.listPending({ limit });
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
