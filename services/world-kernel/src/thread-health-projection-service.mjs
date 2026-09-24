const THREAD_HEALTH_PROJECTION_VERSION = "thread-health-v0.2";

function requireMethod(name, value, method) {
  if (!value || typeof value[method] !== "function") {
    throw new TypeError(`${name} must expose ${method}()`);
  }
}

export function createThreadHealthProjectionService({
  projectionStore,
  presentationWitnessReader,
  diagnose,
  now = () => new Date().toISOString(),
} = {}) {
  requireMethod("Thread health projection store", projectionStore, "worldWitness");
  requireMethod("Thread health projection store", projectionStore, "get");
  requireMethod("Thread health projection store", projectionStore, "put");
  requireMethod("Presentation witness reader", presentationWitnessReader, "getSnapshotDigest");
  if (typeof diagnose !== "function") throw new TypeError("Thread health projection requires diagnose()");
  if (typeof now !== "function") throw new TypeError("Thread health projection now must be a function");

  async function currentWitness(threadId) {
    const world = projectionStore.worldWitness(threadId);
    if (world === null) return Object.freeze({
      reconciliation:null,
      witness:null,
    });
    const presentationSnapshotDigest = await presentationWitnessReader.getSnapshotDigest(threadId);
    if (presentationSnapshotDigest === undefined) {
      return Object.freeze({
        reconciliation:world.reconciliation,
        witness:undefined,
      });
    }
    return Object.freeze({
      reconciliation:world.reconciliation,
      witness:Object.freeze({
        projectionVersion:THREAD_HEALTH_PROJECTION_VERSION,
        world:world.diagnosis,
        presentationSnapshotDigest:presentationSnapshotDigest ?? null,
      }),
    });
  }

  return Object.freeze({
    async inspect(threadId) {
      const before = await currentWitness(threadId);
      if (before.witness !== null && before.witness !== undefined) {
        const cached = projectionStore.get(threadId, before.witness);
        if (cached !== null) {
          return Object.freeze({
            diagnosis:cached,
            reconciliation:before.reconciliation,
            cacheHit:true,
          });
        }
      }

      const diagnosis = await diagnose(threadId);
      const after = await currentWitness(threadId);
      if (diagnosis?.exists === true && after.witness !== null && after.witness !== undefined) {
        projectionStore.put(threadId, after.witness, diagnosis, { updatedAt:now() });
      }
      return Object.freeze({
        diagnosis,
        reconciliation:after.reconciliation,
        cacheHit:false,
      });
    },
  });
}

export { THREAD_HEALTH_PROJECTION_VERSION };
