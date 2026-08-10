import {
  assertExactKeys,
  assertId,
  assertIsoTimestamp,
  assertPlainObject,
} from "./persistence-common.mjs";
import { PreM2CausalWorldKernelService } from "./causal-service.mjs";
import { selectCausalContext } from "./causal-context.mjs";
import {
  authorizationDigest,
  buildExecutionContext,
  executionContextDigest,
  newOpaqueId,
  runtimeAcquireOperationDigest,
  runtimeSessionDigest,
} from "./runtime-domain.mjs";
import {
  buildStructuredParticipationAuthorization,
  structuredApplicabilityOperationId,
  structuredRuntimeRationale,
} from "./structured-runtime-authority.mjs";
import { ObligationNotFoundError } from "./obligation-store.mjs";

function isoFromClock(clock) {
  const value = clock();
  const iso = value instanceof Date ? value.toISOString() : value;
  assertIsoTimestamp("structured causal participation clock", iso);
  return iso;
}

function assertObligationId(value) {
  if (typeof value !== "string" || !/^obl_[0-9a-f]{64}$/.test(value)) {
    throw new TypeError("governingObligationId must be obl_ followed by 64 lowercase hex characters");
  }
}

export class StructuredObligationCausalWorldKernelService extends PreM2CausalWorldKernelService {
  #worldStore;
  #runtimeStore;
  #causalContextStore;
  #applicabilityStore;
  #structuredClock;
  #structuredLeaseDurationMs;

  constructor(
    worldStore,
    runtimeStore,
    freezeStore,
    lifecycleStore,
    expressionStore,
    causalContextStore,
    options = {},
  ) {
    super(
      worldStore,
      runtimeStore,
      freezeStore,
      lifecycleStore,
      expressionStore,
      causalContextStore,
      options,
    );
    const applicabilityStore = options.applicabilityStore;
    if (applicabilityStore === null || typeof applicabilityStore !== "object") {
      throw new TypeError("applicabilityStore is required for Structured Obligation authority");
    }
    for (const method of ["decideApplicability", "getDecision"]) {
      if (typeof applicabilityStore[method] !== "function") {
        throw new TypeError(`applicabilityStore.${method} is required for Structured Obligation authority`);
      }
    }
    const clock = options.clock ?? (() => new Date());
    if (typeof clock !== "function") {
      throw new TypeError("structured causal participation clock must be a function");
    }
    const leaseDurationMs = options.leaseDurationMs ?? 5 * 60 * 1000;
    if (!Number.isSafeInteger(leaseDurationMs) || leaseDurationMs < 1000) {
      throw new TypeError("leaseDurationMs must be an integer of at least 1000");
    }
    this.#worldStore = worldStore;
    this.#runtimeStore = runtimeStore;
    this.#causalContextStore = causalContextStore;
    this.#applicabilityStore = applicabilityStore;
    this.#structuredClock = clock;
    this.#structuredLeaseDurationMs = leaseDurationMs;
  }

  #now() {
    return isoFromClock(this.#structuredClock);
  }

  #contextForThread(thread) {
    const worldThreads = this.#causalContextStore
      .listThreadIds()
      .map((threadId) => this.#worldStore.getThread(threadId));
    const memoryRecords = this.#causalContextStore.listMemoryRecords(thread.threadId);
    return selectCausalContext({ thread, worldThreads, memoryRecords });
  }

  health() {
    return {
      ...super.health(),
      causalParticipationProfileVersion: 4,
      obligationOverrideAuthority: "fibre_structured_applicability",
      obligationNominationAuthority: "attention_only",
      obligationConsentSemantics: "compulsion_preserves_private_stance",
    };
  }

  #acquireStructuredRuntime(threadId, requestId, submission, applicabilityRecord = null) {
    const thread = this.#worldStore.getThread(threadId);
    const trace = this.getPrivateRequestTrace(threadId, requestId);
    const causal = this.#contextForThread(thread);
    const rationale = structuredRuntimeRationale(trace, applicabilityRecord);
    const operation = {
      operationId: submission.operationId,
      decision: {
        authorizedAction: "accept",
        rationale,
        obligationReferences: [],
      },
      selection: structuredClone(causal.runtimeSelection),
      causationId: submission.causationId,
      correlationId: submission.correlationId,
    };
    const operationDigest = runtimeAcquireOperationDigest(threadId, requestId, operation);
    const prior = this.#runtimeStore.getRuntimeByAcquireOperation(
      operation.operationId,
      operationDigest,
    );
    if (prior !== null) return { runtime: prior, idempotent: true };

    const acquiredAt = this.#now();
    const expiresAt = new Date(
      Date.parse(acquiredAt) + this.#structuredLeaseDurationMs,
    ).toISOString();
    const authorization = buildStructuredParticipationAuthorization(
      thread,
      trace,
      applicabilityRecord,
      {
        authorizationId: newOpaqueId("auth"),
        issuedAt: acquiredAt,
        causationId: submission.causationId,
        correlationId: submission.correlationId,
      },
    );
    const baseContext = buildExecutionContext(
      thread,
      trace,
      authorization,
      causal.runtimeSelection,
    );
    const context = {
      ...baseContext,
      semanticTraits: structuredClone(thread.genome.textualTraits),
      resolvedMemories: structuredClone(causal.resolvedMemories),
      causalContext: structuredClone(causal.evidence),
    };
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
      operationId: operation.operationId,
      operation,
      operationDigest,
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

  #alignedNonExecution(threadId, requestId, trace, submission, applicability = null) {
    const result = this.issueNonExecutionAuthorization(threadId, requestId, {
      operationId: submission.operationId,
      decision: {
        authorizedAction: trace.privateStance.desiredAction,
        rationale: applicability === null
          ? "Authorize the Thread's Fibre-derived non-execution participation stance."
          : `The nominated Structured Obligation does not govern this request (${applicability.decision.reasonCode}); preserve the Thread's private stance.`,
        obligationReferences: [],
      },
      causationId: submission.causationId,
      correlationId: submission.correlationId,
    });
    return {
      kind: "non_execution",
      ...(applicability === null ? {} : { applicability }),
      ...result,
    };
  }

  continueParticipation(threadId, requestId, submission) {
    assertId("threadId", threadId);
    assertId("requestId", requestId);
    assertPlainObject("structured causal participation request", submission);
    assertExactKeys("structured causal participation request", submission, [
      "operationId",
      "causationId",
      "correlationId",
      "governingObligationId",
    ]);
    assertId("structured causal participation operationId", submission.operationId);
    assertId("structured causal participation causationId", submission.causationId);
    const correlationId = submission.correlationId ?? submission.causationId;
    assertId("structured causal participation correlationId", correlationId);
    if (submission.governingObligationId !== undefined) {
      assertObligationId(submission.governingObligationId);
    }
    const normalized = {
      operationId: submission.operationId,
      causationId: submission.causationId,
      correlationId,
    };
    const trace = this.getPrivateRequestTrace(threadId, requestId);
    if (trace.privateStance === null) {
      throw new TypeError(`Request ${requestId} has no Fibre-derived private stance`);
    }

    if (trace.privateStance.desiredAction === "accept") {
      if (submission.governingObligationId !== undefined) {
        throw new TypeError(
          "a willing accept must not invoke obligation authority unnecessarily",
        );
      }
      const result = this.#acquireStructuredRuntime(
        threadId,
        requestId,
        normalized,
        null,
      );
      return { kind: "runtime", ...result };
    }

    if (submission.governingObligationId === undefined) {
      return this.#alignedNonExecution(threadId, requestId, trace, normalized);
    }

    let applicability;
    try {
      applicability = this.#applicabilityStore.decideApplicability({
        operationId: structuredApplicabilityOperationId(submission.operationId),
        threadId,
        requestId,
        obligationId: submission.governingObligationId,
        nominationSource: "caller",
        decidedAt: this.#now(),
        causationId: submission.causationId,
        correlationId,
      });
    } catch (error) {
      if (error instanceof ObligationNotFoundError) {
        throw new TypeError(
          `nominated Structured Obligation ${submission.governingObligationId} was not found for Thread ${threadId}`,
        );
      }
      throw error;
    }

    if (applicability.decision.result !== "applies") {
      return this.#alignedNonExecution(
        threadId,
        requestId,
        trace,
        normalized,
        applicability,
      );
    }

    const result = this.#acquireStructuredRuntime(
      threadId,
      requestId,
      normalized,
      applicability,
    );
    return { kind: "runtime", applicability, ...result };
  }
}
