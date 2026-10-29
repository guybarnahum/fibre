import { requireInfraCapabilities } from "#infra";

export const BIRTH_RECONCILIATION_PROCESS_VERSION = "fibre-birth-reconciliation-process-v1";
const DEFAULT_RETRY_MS = 5_000;

function terminalWorldRejection(error) {
  const status=error?.status;
  return error?.name==="WorldKernelBirthPublicationError"
    &&Number.isInteger(status)&&status>=400&&status<=499
    &&status!==408&&status!==429
    &&(status!==409||error.code==="GENESIS_RECORD_CONFLICT");
}

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value;
}

function publisher(value) {
  if (!value || typeof value.publishBirth !== "function") {
    throw new TypeError("Birth reconciliation requires worldPublisher.publishBirth(bundle)");
  }
  return value;
}

function optionalActivityRecorder(value) {
  if (value === null) return null;
  if (!value || typeof value.record !== "function" || typeof value.runStage !== "function") {
    throw new TypeError("Birth reconciliation activityRecorder must expose record() and runStage()");
  }
  return value;
}

async function bestEffortRecord(activity, record) {
  if (activity === null) return;
  try { await activity.record(record); } catch {}
}

async function runActivityStage(activity, metadata, operation) {
  if (activity === null) return operation(Object.freeze({ operationId: null }));
  return activity.runStage(metadata, operation);
}

function finalWorldEventEvidence(result) {
  const eventId = result?.thread?.provenance?.lastEventId;
  return typeof eventId === "string" && eventId !== "" ? { eventId } : {};
}

export function createBirthReconciliationRuntime({
  infraDriver,
  stateScopeId = "birth",
  provisionalBirthStore,
  developmentRequestStore = null,
  worldPublisher,
  activityRecorder = null,
  activityContextForBirth = null,
  retryMs = DEFAULT_RETRY_MS,
  nowMs = Date.now,
  onError = () => {},
} = {}) {
  const scopeId = nonEmpty("Birth reconciliation stateScopeId", stateScopeId);
  const infra = requireInfraCapabilities(infraDriver, "scheduler");
  if (!provisionalBirthStore || typeof provisionalBirthStore.accept !== "function" || typeof provisionalBirthStore.pending !== "function") {
    throw new TypeError("Birth reconciliation requires a provisional birth store");
  }
  if(developmentRequestStore!==null && typeof developmentRequestStore.recordFailure!=="function")
    throw new TypeError("Birth reconciliation requires a development failure recorder");
  publisher(worldPublisher);
  const activity = optionalActivityRecorder(activityRecorder);
  if (activityContextForBirth !== null && typeof activityContextForBirth !== "function") {
    throw new TypeError("Birth reconciliation activityContextForBirth must be a function or null");
  }
  if (!Number.isSafeInteger(retryMs) || retryMs < 100 || retryMs > 3_600_000) {
    throw new TypeError("Birth reconciliation retryMs must be an integer from 100 through 3600000");
  }
  if (typeof nowMs !== "function") throw new TypeError("Birth reconciliation nowMs must be a function");
  if (typeof onError !== "function") throw new TypeError("Birth reconciliation onError must be a function");
  let running = null;

  async function scheduleAt(scheduledTimeMs) {
    const current = await infra.scheduler.get(scopeId);
    if (current === null || scheduledTimeMs < current) {
      await infra.scheduler.schedule(scopeId, scheduledTimeMs);
    }
  }

  async function requestWake() {
    await scheduleAt(nowMs());
  }

  async function acceptBirth(bundle) {
    const accepted = provisionalBirthStore.accept(bundle);
    if (accepted.status === "pending"
      && (accepted.nextAttemptAt === null || accepted.nextAttemptAt <= nowMs())) await requestWake();
    return accepted;
  }

  function activityContext(birth) {
    const resolved = activityContextForBirth?.(birth) ?? {};
    return Object.freeze({
      requestId: resolved.requestId ?? null,
      genesisId: birth.genesisId,
      threadId: birth.threadId,
      correlationId: resolved.correlationId ?? null,
      causationId: resolved.causationId ?? null,
    });
  }

  async function reconcile() {
    const pending = provisionalBirthStore.pending({nowMs:nowMs()});
    let published = 0;
    for (const birth of pending) {
      const context = activityContext(birth);
      const attempt=birth.attemptCount+1;
      try {
        await runActivityStage(activity, {
          ...context,
          stage: "birth.publish.world",
          attempt,
        }, async ({ operationId: publicationOperationId }) => {
          const publicationContext = publicationOperationId === null
            ? context
            : Object.freeze({ ...context, parentOperationId: publicationOperationId });
          let submitOperationId = null;
          const result = await runActivityStage(activity, {
            ...publicationContext,
            stage: "birth.publish.world_submit",
            attempt,
          }, async ({ operationId }) => {
            submitOperationId = operationId;
            const worldContext = operationId === null
              ? publicationContext
              : Object.freeze({ ...context, parentOperationId: operationId });
            return worldPublisher.publishBirth(birth.bundle, { activityContext: worldContext });
          });
          await runActivityStage(activity, {
            ...publicationContext,
            parentOperationId: submitOperationId,
            stage: "birth.publish.world_ack",
            attempt,
            evidence: finalWorldEventEvidence(result),
          }, async () => provisionalBirthStore.markPublished(birth.genesisId, result));
          await runActivityStage(activity, {
            ...publicationContext,
            stage: "birth.publish.complete",
            attempt,
            evidence: finalWorldEventEvidence(result),
          }, async () => result);
        });
        published += 1;
      } catch (error) {
        if(terminalWorldRejection(error)){
          const failure=new Error(error.message);
          failure.code=error.code??null;
          failure.retryable=false;
          if(context.requestId!==null && developmentRequestStore!==null)
            developmentRequestStore.recordFailure(context.requestId,failure);
          provisionalBirthStore.markFailed(birth.genesisId,{
            code:error.code??null,message:error.message,
          });
          await bestEffortRecord(activity,{
            ...context,stage:"birth.publish.reconcile",status:"failed",attempt,
            message:"World rejected this birth; no retry scheduled",
            error:{category:"reconciliation",code:error.code??"WORLD_PUBLICATION_REJECTED",retryable:false},
          });
          try{onError(error,birth);}catch{}
          continue;
        }
        await bestEffortRecord(activity, {
          ...context,
          stage: "birth.publish.reconcile",
          status: "retrying",
          attempt,
          message: "World publication will be retried after reconciliation failure",
          error: {
            category: "reconciliation",
            code: "WORLD_PUBLICATION_RETRY",
            retryable: true,
          },
        });
        try { onError(error, birth); } catch {}
        const backoffMs=Math.min(15*60_000,retryMs*2**Math.min(attempt-1,20));
        provisionalBirthStore.markRetryable(birth.genesisId,{
          nextAttemptAt:nowMs()+backoffMs,
          error:String(error?.message??error),
        });
        continue;
      }
    }
    const next=provisionalBirthStore.nextPendingAt();
    if(next!==null)await scheduleAt(Math.max(nowMs(),next));
    else await infra.scheduler.cancel(scopeId);
    return Object.freeze({ attempted: pending.length, published });
  }

  async function handleWake() {
    if (running !== null) return running;
    await infra.scheduler.cancel(scopeId);
    running = reconcile().finally(() => { running = null; });
    return running;
  }

  async function ensureScheduled() {
    const next=provisionalBirthStore.nextPendingAt();
    if(next!==null && await infra.scheduler.get(scopeId) === null)
      await scheduleAt(Math.max(nowMs(),next));
  }

  return Object.freeze({
    processVersion: BIRTH_RECONCILIATION_PROCESS_VERSION,
    stateScopeId: scopeId,
    acceptBirth,
    requestWake,
    ensureScheduled,
    handleWake,
  });
}