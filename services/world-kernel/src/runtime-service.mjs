import {
  assertExactKeys,
  assertId,
  assertIsoTimestamp,
  assertPlainObject,
} from "./persistence-common.mjs";
import { WorldKernelService } from "./kernel-service.mjs";
import {
  RuntimeOrderError,
  actorOperationDigest,
  actorOutputDigest,
  auditActorOutput,
  authorizationDigest,
  buildExecutionContext,
  buildParticipationAuthorization,
  deterministicActorOutput,
  executionContextDigest,
  goalGuardianOperationDigest,
  guardianAuditDigest,
  newOpaqueId,
  runtimeAcquireOperationDigest,
  runtimeSessionDigest,
  validateAcquireRuntimeRequest,
} from "./runtime-domain.mjs";

function isoFromClock(clock) {
  const value = clock();
  const iso = value instanceof Date ? value.toISOString() : value;
  assertIsoTimestamp("runtime clock", iso);
  return iso;
}

export class M1RuntimeWorldKernelService extends WorldKernelService {
  #runtimeStore;
  #clock;
  #leaseDurationMs;
  #actor;

  constructor(
    worldStore,
    runtimeStore,
    {
      clock = () => new Date(),
      leaseDurationMs = 5 * 60 * 1000,
      actor = deterministicActorOutput,
    } = {},
  ) {
    super(worldStore);
    if (runtimeStore === null || typeof runtimeStore !== "object") {
      throw new TypeError("runtimeStore is required");
    }
    for (const method of [
      "storageMetadata",
      "getRuntimeByAcquireOperation",
      "getRuntimeByActorOperation",
      "getRuntimeByGuardianOperation",
      "acquireRuntime",
      "getRuntime",
      "listRuntimeSummaries",
      "runActor",
      "runGoalGuardian",
      "verifyRuntimeIntegrity",
    ]) {
      if (typeof runtimeStore[method] !== "function") {
        throw new TypeError(`runtimeStore.${method} is required`);
      }
    }
    if (typeof clock !== "function") throw new TypeError("runtime clock must be a function");
    if (!Number.isSafeInteger(leaseDurationMs) || leaseDurationMs < 1000) {
      throw new TypeError("leaseDurationMs must be an integer of at least 1000");
    }
    if (typeof actor !== "function") throw new TypeError("runtime actor must be a function");
    this.#runtimeStore = runtimeStore;
    this.#clock = clock;
    this.#leaseDurationMs = leaseDurationMs;
    this.#actor = actor;
  }

  #now() {
    return isoFromClock(this.#clock);
  }

  health() {
    return {
      ...super.health(),
      runtimeProfileVersion: 1,
      runtimeStorage: this.#runtimeStore.storageMetadata(),
      thawLeaseDurationMs: this.#leaseDurationMs,
    };
  }

  acquireThawRuntime(threadId, requestId, request) {
    assertId("threadId", threadId);
    assertId("requestId", requestId);
    validateAcquireRuntimeRequest(request);
    const acquireDigest = runtimeAcquireOperationDigest(threadId, requestId, request);
    const existing = this.#runtimeStore.getRuntimeByAcquireOperation(
      request.operationId,
      acquireDigest,
    );
    if (existing !== null) return { runtime: existing, idempotent: true };

    const acquiredAt = this.#now();
    const expiresAt = new Date(Date.parse(acquiredAt) + this.#leaseDurationMs).toISOString();
    const thread = this.getThread(threadId);
    const trace = this.getPrivateRequestTrace(threadId, requestId);
    const correlationId = request.correlationId ?? request.causationId;
    const authorization = buildParticipationAuthorization(
      thread,
      trace,
      request.decision,
      {
        authorizationId: newOpaqueId("auth"),
        issuedAt: acquiredAt,
        causationId: request.causationId,
        correlationId,
      },
    );
    const context = buildExecutionContext(
      thread,
      trace,
      authorization,
      request.selection ?? {},
    );
    const leaseId = newOpaqueId("lease");
    const sessionId = newOpaqueId("run");
    const contextDigest = executionContextDigest(context);
    const sessionDigest = runtimeSessionDigest({
      sessionId,
      leaseId,
      authorizationId: authorization.authorizationId,
      threadId,
      requestId,
      snapshotVersion: thread.version,
      threadStateHash: authorization.threadStateHash,
      contextDigest,
      startedAt: acquiredAt,
    });
    return this.#runtimeStore.acquireRuntime({
      operationId: request.operationId,
      operation: structuredClone(request),
      operationDigest: acquireDigest,
      threadId,
      requestId,
      appraisalId: trace.appraisalId,
      stanceId: trace.privateStanceId,
      stanceDigest: trace.privateStanceDigest,
      snapshotVersion: thread.version,
      threadStateHash: authorization.threadStateHash,
      requestFingerprint: trace.requestFingerprint,
      authorizationId: authorization.authorizationId,
      authorization,
      authorizationDigest: authorizationDigest(authorization),
      leaseId,
      sessionId,
      context,
      contextDigest,
      sessionDigest,
      acquiredAt,
      expiresAt,
    });
  }

  listRuntimeSummaries(threadId) {
    assertId("threadId", threadId);
    this.getThread(threadId);
    return this.#runtimeStore.listRuntimeSummaries(threadId);
  }

  getRuntime(threadId, sessionId) {
    assertId("threadId", threadId);
    assertId("sessionId", sessionId);
    return this.#runtimeStore.getRuntime(threadId, sessionId);
  }

  runDeterministicActor(threadId, sessionId, request) {
    assertId("threadId", threadId);
    assertId("sessionId", sessionId);
    assertPlainObject("Actor request", request);
    assertExactKeys("Actor request", request, ["operationId"]);
    assertId("Actor operationId", request.operationId);
    const prior = this.#runtimeStore.getRuntimeByActorOperation(
      request.operationId,
      threadId,
      sessionId,
    );
    if (prior !== null) return { runtime: prior, idempotent: true };

    const runtime = this.#runtimeStore.getRuntime(threadId, sessionId);
    const output = this.#actor(structuredClone(runtime.session.context));
    const outputDigest = actorOutputDigest(output);
    const completedAt = this.#now();
    const digest = actorOperationDigest({
      threadId,
      sessionId,
      operationId: request.operationId,
      contextDigest: runtime.session.contextDigest,
      outputDigest,
      completedAt,
    });
    return this.#runtimeStore.runActor({
      actorRunId: newOpaqueId("act"),
      operationId: request.operationId,
      operationDigest: digest,
      threadId,
      sessionId,
      inputDigest: runtime.session.contextDigest,
      output,
      outputDigest,
      completedAt,
    });
  }

  runGoalGuardian(threadId, sessionId, request) {
    assertId("threadId", threadId);
    assertId("sessionId", sessionId);
    assertPlainObject("Goal Guardian request", request);
    assertExactKeys("Goal Guardian request", request, ["operationId"]);
    assertId("Goal Guardian operationId", request.operationId);
    const prior = this.#runtimeStore.getRuntimeByGuardianOperation(
      request.operationId,
      threadId,
      sessionId,
    );
    if (prior !== null) return { runtime: prior, idempotent: true };

    const runtime = this.#runtimeStore.getRuntime(threadId, sessionId);
    if (runtime.actorRun === null) {
      throw new RuntimeOrderError(
        `Runtime session ${sessionId} must run the Actor before Goal Guardian`,
      );
    }
    const audit = auditActorOutput(runtime.session.context, runtime.actorRun.output);
    const auditDigest = guardianAuditDigest(audit);
    const completedAt = this.#now();
    const digest = goalGuardianOperationDigest({
      threadId,
      sessionId,
      operationId: request.operationId,
      contextDigest: runtime.session.contextDigest,
      actorOutputDigest: runtime.actorRun.outputDigest,
      auditDigest,
      completedAt,
    });
    return this.#runtimeStore.runGoalGuardian({
      auditId: newOpaqueId("gga"),
      operationId: request.operationId,
      operationDigest: digest,
      threadId,
      sessionId,
      contextDigest: runtime.session.contextDigest,
      actorOutputDigest: runtime.actorRun.outputDigest,
      audit,
      auditDigest,
      completedAt,
    });
  }

  verifyRuntimeIntegrity(threadId, sessionId) {
    assertId("threadId", threadId);
    assertId("sessionId", sessionId);
    return this.#runtimeStore.verifyRuntimeIntegrity(threadId, sessionId);
  }
}
