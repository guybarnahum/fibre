import {
  assertId,
  assertIsoTimestamp,
} from "./persistence-common.mjs";
import { M1LifecycleWorldKernelService } from "./lifecycle-hardening-service.mjs";
import {
  ParticipationAuthorizationRejectedError,
  newOpaqueId,
} from "./runtime-domain.mjs";
import {
  ExpressionRejectedError,
  audienceResponseDigest,
  authorizationRecordDigest,
  buildAudienceResponse,
  buildDisclosureStrategy,
  buildNonExecutionAuthorization,
  disclosureOperationDigest,
  disclosureStrategyDigest,
  nonExecutionAuthorizationOperationDigest,
  normalizeDisclosureRequest,
  normalizeNonExecutionAuthorizationRequest,
  normalizeResponseRequest,
  responseOperationDigest,
} from "./expression-domain.mjs";

function isoFromClock(clock) {
  const value = clock();
  const iso = value instanceof Date ? value.toISOString() : value;
  assertIsoTimestamp("expression clock", iso);
  return iso;
}

export class M1ExpressionWorldKernelService extends M1LifecycleWorldKernelService {
  #expressionStore;
  #expressionClock;

  constructor(
    worldStore,
    runtimeStore,
    freezeStore,
    lifecycleStore,
    expressionStore,
    options = {},
  ) {
    super(worldStore, runtimeStore, freezeStore, lifecycleStore, options);
    if (expressionStore === null || typeof expressionStore !== "object") {
      throw new TypeError("expressionStore is required");
    }
    for (const method of [
      "storageMetadata",
      "getAuthorization",
      "getAuthorizationForRequest",
      "getAuthorizationByOperation",
      "recordNonExecutionAuthorization",
      "getDisclosureStrategy",
      "getDisclosureByOperation",
      "recordDisclosure",
      "getAudienceResponse",
      "getResponseByOperation",
      "recordAudienceResponse",
      "getExpressionChain",
      "listExpressionSummaries",
      "verifyExpressionIntegrity",
    ]) {
      if (typeof expressionStore[method] !== "function") {
        throw new TypeError(`expressionStore.${method} is required`);
      }
    }
    const clock = options.clock ?? (() => new Date());
    if (typeof clock !== "function") throw new TypeError("expression clock must be a function");
    this.#expressionStore = expressionStore;
    this.#expressionClock = clock;
  }

  #now() {
    return isoFromClock(this.#expressionClock);
  }

  health() {
    return {
      ...super.health(),
      expressionProfileVersion: 1,
      expressionStorage: this.#expressionStore.storageMetadata(),
    };
  }

  issueNonExecutionAuthorization(threadId, requestId, request) {
    assertId("threadId", threadId);
    assertId("requestId", requestId);
    const normalized = normalizeNonExecutionAuthorizationRequest(request);

    try {
      this.assertObligationsUnspent(
        threadId,
        normalized.decision.obligationReferences,
      );
    } catch (error) {
      if (error instanceof ParticipationAuthorizationRejectedError) {
        throw new ExpressionRejectedError(error.message);
      }
      throw error;
    }

    const operationDigest = nonExecutionAuthorizationOperationDigest(
      threadId,
      requestId,
      normalized,
    );
    const prior = this.#expressionStore.getAuthorizationByOperation(
      normalized.operationId,
      operationDigest,
    );
    if (prior !== null) return { authorization: prior, idempotent: true };

    const thread = this.getThread(threadId);
    const trace = this.getPrivateRequestTrace(threadId, requestId);
    const issuedAt = this.#now();
    const authorization = buildNonExecutionAuthorization(
      thread,
      trace,
      normalized,
      {
        authorizationId: newOpaqueId("auth"),
        issuedAt,
      },
    );
    const operation = {
      kind: "non_execution_participation_authorization",
      ...normalized,
    };
    return this.#expressionStore.recordNonExecutionAuthorization({
      operationId: normalized.operationId,
      operation,
      operationDigest,
      threadId,
      requestId,
      appraisalId: trace.appraisalId,
      stanceId: trace.privateStanceId,
      stanceDigest: trace.privateStanceDigest,
      snapshotVersion: trace.snapshotVersion,
      threadStateHash: trace.threadStateHash,
      requestFingerprint: trace.requestFingerprint,
      authorization,
      authorizationDigest: authorizationRecordDigest(authorization),
    });
  }

  getParticipationAuthorization(threadId, requestId) {
    assertId("threadId", threadId);
    assertId("requestId", requestId);
    return this.#expressionStore.getAuthorizationForRequest(threadId, requestId);
  }

  recordDisclosureStrategy(threadId, requestId, request) {
    assertId("threadId", threadId);
    assertId("requestId", requestId);
    const normalized = normalizeDisclosureRequest(request);
    const operationDigest = disclosureOperationDigest(threadId, requestId, normalized);
    const prior = this.#expressionStore.getDisclosureByOperation(
      normalized.operationId,
      operationDigest,
    );
    if (prior !== null) return { disclosure: prior, idempotent: true };

    const trace = this.getPrivateRequestTrace(threadId, requestId);
    const authorization = this.#expressionStore.getAuthorization(
      threadId,
      normalized.authorizationId,
    );
    const recordedAt = this.#now();
    const strategy = buildDisclosureStrategy(
      trace,
      authorization.authorization,
      normalized,
      {
        strategyId: newOpaqueId("dsc"),
        recordedAt,
      },
    );
    return this.#expressionStore.recordDisclosure({
      operationId: normalized.operationId,
      operation: normalized,
      operationDigest,
      threadId,
      requestId,
      snapshotVersion: trace.snapshotVersion,
      threadStateHash: trace.threadStateHash,
      requestFingerprint: trace.requestFingerprint,
      appraisalId: trace.appraisalId,
      stanceId: trace.privateStanceId,
      authorizationId: authorization.authorization.authorizationId,
      authorizationDigest: authorization.authorizationDigest,
      strategy,
      strategyDigest: disclosureStrategyDigest(strategy),
    });
  }

  getDisclosureStrategy(threadId, requestId) {
    assertId("threadId", threadId);
    assertId("requestId", requestId);
    return this.#expressionStore.getDisclosureStrategy(threadId, requestId);
  }

  recordAudienceResponse(threadId, requestId, request) {
    assertId("threadId", threadId);
    assertId("requestId", requestId);
    const normalized = normalizeResponseRequest(request);
    const operationDigest = responseOperationDigest(threadId, requestId, normalized);
    const prior = this.#expressionStore.getResponseByOperation(
      normalized.operationId,
      operationDigest,
    );
    if (prior !== null) return { response: prior, idempotent: true };

    const disclosure = this.#expressionStore.getDisclosureStrategy(threadId, requestId);
    const recordedAt = this.#now();
    const response = buildAudienceResponse(
      disclosure.strategy,
      normalized,
      {
        responseId: newOpaqueId("rsp"),
        recordedAt,
      },
    );
    return this.#expressionStore.recordAudienceResponse({
      operationId: normalized.operationId,
      operation: normalized,
      operationDigest,
      threadId,
      requestId,
      strategyId: disclosure.strategy.strategyId,
      strategyDigest: disclosure.strategyDigest,
      authorizationId: disclosure.strategy.authorizationId,
      response,
      responseDigest: audienceResponseDigest(response),
    });
  }

  getAudienceResponse(threadId, requestId) {
    assertId("threadId", threadId);
    assertId("requestId", requestId);
    return this.#expressionStore.getAudienceResponse(threadId, requestId);
  }

  getExpressionChain(threadId, requestId) {
    assertId("threadId", threadId);
    assertId("requestId", requestId);
    return this.#expressionStore.getExpressionChain(threadId, requestId);
  }

  listExpressionSummaries(threadId) {
    assertId("threadId", threadId);
    this.getThread(threadId);
    return this.#expressionStore.listExpressionSummaries(threadId);
  }

  verifyExpressionIntegrity(threadId, requestId) {
    assertId("threadId", threadId);
    assertId("requestId", requestId);
    return this.#expressionStore.verifyExpressionIntegrity(threadId, requestId);
  }
}
