import {
  assertId,
  assertIsoTimestamp,
} from "./persistence-common.mjs";
import { M1RuntimeWorldKernelService } from "./runtime-service.mjs";
import {
  AuthorizationConsumedError,
  authorizationConsumptionDigest,
  buildFreezeOutcome,
  freezeOperationDigest,
  normalizeFreezeRequest,
} from "./freeze-domain.mjs";
import { newOpaqueId } from "./runtime-domain.mjs";

function isoFromClock(clock) {
  const value = clock();
  const iso = value instanceof Date ? value.toISOString() : value;
  assertIsoTimestamp("freeze clock", iso);
  return iso;
}

export class M1FreezeWorldKernelService extends M1RuntimeWorldKernelService {
  #freezeStore;
  #freezeClock;

  constructor(worldStore, runtimeStore, freezeStore, options = {}) {
    super(worldStore, runtimeStore, options);
    if (freezeStore === null || typeof freezeStore !== "object") {
      throw new TypeError("freezeStore is required");
    }
    for (const method of [
      "storageMetadata",
      "getFreezeByOperation",
      "getAuthorizationConsumption",
      "freezeRuntime",
      "getFreeze",
      "verifyFreezeIntegrity",
    ]) {
      if (typeof freezeStore[method] !== "function") {
        throw new TypeError(`freezeStore.${method} is required`);
      }
    }
    const clock = options.clock ?? (() => new Date());
    if (typeof clock !== "function") throw new TypeError("freeze clock must be a function");
    this.#freezeStore = freezeStore;
    this.#freezeClock = clock;
  }

  #now() {
    return isoFromClock(this.#freezeClock);
  }

  health() {
    return {
      ...super.health(),
      freezeProfileVersion: 2,
      structuredObligationDischarge: "atomic_terminal_revision",
      freezeStorage: this.#freezeStore.storageMetadata(),
    };
  }

  freezeRuntime(threadId, sessionId, request) {
    assertId("threadId", threadId);
    assertId("sessionId", sessionId);
    const normalized = normalizeFreezeRequest(request);
    const operationDigest = freezeOperationDigest(threadId, sessionId, normalized);
    const prior = this.#freezeStore.getFreezeByOperation(
      normalized.operationId,
      operationDigest,
    );
    if (prior !== null) return { freeze: prior, idempotent: true };

    const completedAt = this.#now();
    const thread = this.getThread(threadId);
    const runtime = this.getRuntime(threadId, sessionId);
    const consumed = this.#freezeStore.getAuthorizationConsumption(
      runtime.authorization.authorizationId,
    );
    if (consumed !== null) {
      throw new AuthorizationConsumedError(
        `Participation Authorization ${runtime.authorization.authorizationId} was already consumed by ${consumed.operationId}`,
      );
    }
    const outcome = buildFreezeOutcome(thread, runtime, normalized, {
      reportId: newOpaqueId("frz"),
      completedAt,
    });
    const memories = outcome.report.acceptedLifeChanges.map((change) => ({
      memoryId: change.memoryId,
      threadId,
      eventId: outcome.eventId,
      sessionId,
      summary: change.summary,
      evidenceRefs: [...change.evidenceRefs],
      createdAt: completedAt,
    }));
    const consumption = {
      authorizationId: runtime.authorization.authorizationId,
      operationId: normalized.operationId,
      operationDigest,
      sessionId,
      threadId,
      requestId: runtime.requestId,
      eventId: outcome.eventId,
      consumedAt: completedAt,
      obligationReferences: [...outcome.report.dischargedObligations],
    };
    return this.#freezeStore.freezeRuntime({
      operationId: normalized.operationId,
      operationDigest,
      threadId,
      requestId: runtime.requestId,
      sessionId,
      leaseId: runtime.lease.leaseId,
      authorizationId: runtime.authorization.authorizationId,
      actorRunId: runtime.actorRun.actorRunId,
      auditId: runtime.goalGuardianAudit.auditId,
      actorOutputDigest: runtime.actorRun.outputDigest,
      auditDigest: runtime.goalGuardianAudit.auditDigest,
      contextDigest: runtime.session.contextDigest,
      snapshotVersion: runtime.snapshotVersion,
      priorStateHash: runtime.threadStateHash,
      completedAt,
      eventId: outcome.eventId,
      eventPayload: outcome.eventPayload,
      commitDigest: outcome.commitDigest,
      nextThread: outcome.nextThread,
      resultingStateHash: outcome.resultingStateHash,
      report: outcome.report,
      reportDigest: outcome.reportDigest,
      memories,
      consumption,
      consumptionDigest: authorizationConsumptionDigest(consumption),
      causationId: normalized.causationId,
      correlationId: normalized.correlationId,
    });
  }

  getFreezeReport(threadId, sessionId) {
    assertId("threadId", threadId);
    assertId("sessionId", sessionId);
    return this.#freezeStore.getFreeze(threadId, sessionId);
  }

  verifyFreezeIntegrity(threadId, sessionId) {
    assertId("threadId", threadId);
    assertId("sessionId", sessionId);
    return {
      ...this.#freezeStore.verifyFreezeIntegrity(threadId, sessionId),
      threadIntegrity: super.verifyThreadIntegrity(threadId),
    };
  }

  listEvents(threadId) {
    return super.listEvents(threadId).map((event) => {
      if (event.eventType !== "THREAD_FROZEN") return event;
      return {
        ...event,
        commandId: null,
        commandDigest: null,
        authorizationId: null,
        causationId: null,
        correlationId: null,
        payload: {
          acceptedMemoryRefs: event.payload.acceptedLifeChanges.map(
            (change) => change.memoryId,
          ),
          acceptedLifeChangeCount: event.payload.acceptedLifeChanges.length,
          rejectedLifeChangeCount: event.payload.rejectedLifeChanges.length,
          dischargedObligationCount: event.payload.dischargedObligations.length,
          restrictedRuntimeEvidence: true,
        },
      };
    });
  }
}