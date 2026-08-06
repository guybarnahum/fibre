import {
  assertId,
  assertIsoTimestamp,
} from "./persistence-common.mjs";
import { M1FreezeWorldKernelService } from "./freeze-service.mjs";
import {
  ParticipationAuthorizationRejectedError,
  newOpaqueId,
} from "./runtime-domain.mjs";
import {
  RuntimeAbandonRejectedError,
  assertFreezeRationaleBounds,
  normalizeRuntimeAbandonRequest,
  runtimeAbandonOperationDigest,
  runtimeAbandonRecordDigest,
} from "./lifecycle-hardening-domain.mjs";

function isoFromClock(clock) {
  const value = clock();
  const iso = value instanceof Date ? value.toISOString() : value;
  assertIsoTimestamp("lifecycle clock", iso);
  return iso;
}

export class M1LifecycleWorldKernelService extends M1FreezeWorldKernelService {
  #lifecycleStore;
  #lifecycleClock;

  constructor(worldStore, runtimeStore, freezeStore, lifecycleStore, options = {}) {
    super(worldStore, runtimeStore, freezeStore, options);
    if (lifecycleStore === null || typeof lifecycleStore !== "object") {
      throw new TypeError("lifecycleStore is required");
    }
    for (const method of [
      "storageMetadata",
      "getRuntimeAbandonmentByOperation",
      "getRuntimeAbandonment",
      "assertObligationsUnspent",
      "abandonRejectedRuntime",
      "verifyRuntimeAbandonment",
      "verifyMemoryProjectionIntegrity",
    ]) {
      if (typeof lifecycleStore[method] !== "function") {
        throw new TypeError(`lifecycleStore.${method} is required`);
      }
    }
    const clock = options.clock ?? (() => new Date());
    if (typeof clock !== "function") throw new TypeError("lifecycle clock must be a function");
    this.#lifecycleStore = lifecycleStore;
    this.#lifecycleClock = clock;
  }

  #now() {
    return isoFromClock(this.#lifecycleClock);
  }

  health() {
    return {
      ...super.health(),
      kernelTime: this.#now(),
      lifecycleClosureProfileVersion: 1,
      lifecycleClosureStorage: this.#lifecycleStore.storageMetadata(),
    };
  }

  acquireThawRuntime(threadId, requestId, request) {
    const obligationReferences = request?.decision?.obligationReferences;
    this.#lifecycleStore.assertObligationsUnspent(threadId, obligationReferences);
    try {
      return super.acquireThawRuntime(threadId, requestId, request);
    } catch (error) {
      if (/authorization obligation was already discharged/i.test(error?.message ?? "")) {
        throw new ParticipationAuthorizationRejectedError(error.message);
      }
      throw error;
    }
  }

  freezeRuntime(threadId, sessionId, request) {
    assertFreezeRationaleBounds(request);
    return super.freezeRuntime(threadId, sessionId, request);
  }

  abandonRejectedRuntime(threadId, sessionId, request) {
    assertId("threadId", threadId);
    assertId("sessionId", sessionId);
    const normalized = normalizeRuntimeAbandonRequest(request);
    const operationDigest = runtimeAbandonOperationDigest(
      threadId,
      sessionId,
      normalized,
    );
    const prior = this.#lifecycleStore.getRuntimeAbandonmentByOperation(
      normalized.operationId,
      operationDigest,
    );
    if (prior !== null) {
      return {
        abandonment: prior,
        runtime: this.getRuntime(threadId, sessionId),
        idempotent: true,
      };
    }

    const runtime = this.getRuntime(threadId, sessionId);
    if (runtime.goalGuardianAudit === null) {
      throw new RuntimeAbandonRejectedError(
        `Runtime session ${sessionId} has no Goal Guardian audit`,
      );
    }
    const abandonedAt = this.#now();
    const abandonment = {
      abandonmentId: newOpaqueId("abd"),
      operationId: normalized.operationId,
      operationDigest,
      sessionId,
      threadId,
      requestId: runtime.requestId,
      authorizationId: runtime.authorization.authorizationId,
      goalGuardianAuditId: runtime.goalGuardianAudit.auditId,
      reason: "guardian_rejected",
      abandonedAt,
      causationId: normalized.causationId,
      correlationId: normalized.correlationId,
    };
    const result = this.#lifecycleStore.abandonRejectedRuntime({
      operationId: normalized.operationId,
      operationDigest,
      sessionId,
      threadId,
      requestId: runtime.requestId,
      authorizationId: runtime.authorization.authorizationId,
      goalGuardianAuditId: runtime.goalGuardianAudit.auditId,
      abandonedAt,
      abandonment,
      recordDigest: runtimeAbandonRecordDigest(abandonment),
    });
    return {
      ...result,
      runtime: this.getRuntime(threadId, sessionId),
    };
  }

  getRuntimeAbandonment(threadId, sessionId) {
    assertId("threadId", threadId);
    assertId("sessionId", sessionId);
    return this.#lifecycleStore.getRuntimeAbandonment(threadId, sessionId);
  }

  verifyRuntimeAbandonment(threadId, sessionId) {
    assertId("threadId", threadId);
    assertId("sessionId", sessionId);
    return {
      ...this.#lifecycleStore.verifyRuntimeAbandonment(threadId, sessionId),
      runtime: this.getRuntime(threadId, sessionId),
    };
  }

  verifyThreadIntegrity(threadId) {
    const integrity = super.verifyThreadIntegrity(threadId);
    const thread = this.getThread(threadId);
    return {
      ...integrity,
      memoryProjection: this.#lifecycleStore.verifyMemoryProjectionIntegrity(
        threadId,
        thread,
      ),
    };
  }
}
