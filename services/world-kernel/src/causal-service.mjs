import {
  IntegrityError,
  PrivateRequestConflictError,
  PrivateRequestNotFoundError,
  assertExactKeys,
  assertId,
  assertIsoTimestamp,
  assertPlainObject,
  assertStringArray,
  canonicalJson,
} from "./persistence-common.mjs";
import {
  assertStanceMatchesTrace,
  formPrivateParticipationStance,
  normalizeActivationRequest,
  prepareRequestAppraisal,
} from "./private-participation.mjs";
import {
  authorizationDigest,
  buildExecutionContext,
  buildParticipationAuthorization,
  executionContextDigest,
  newOpaqueId,
  runtimeAcquireOperationDigest,
  runtimeSessionDigest,
} from "./runtime-domain.mjs";
import { M1ExpressionWorldKernelService } from "./expression-service.mjs";
import { selectCausalContext } from "./causal-context.mjs";
import { DIGNITY_GUARDIAN_POLICY } from "./dignity-guardian.mjs";
import { selectSemanticStateForAppraisal } from "./semantic-state.mjs";
import { buildSemanticGuardianInput } from "./guardian-cognition-store.mjs";
import { runSemanticDignityGuardian } from "./semantic-guardian-runner.mjs";
import { compileIdentityContextCapsule } from "./identity-context-capsule.mjs";
import { identityContextConsumptionWitness } from "./identity-context-consumption.mjs";

function isoFromClock(clock) {
  const value = clock();
  const iso = value instanceof Date ? value.toISOString() : value;
  assertIsoTimestamp("causal participation clock", iso);
  return iso;
}

function sameAppraisalRequest(existing, request, causationId, correlationId) {
  return (
    canonicalJson(existing.request) === canonicalJson(request) &&
    existing.causationId === causationId &&
    existing.correlationId === correlationId &&
    existing.appraisal?.causalContext?.selectionAuthority === "fibre" &&
    canonicalJson(existing.appraisal?.appraisalPolicy) === canonicalJson(DIGNITY_GUARDIAN_POLICY)
  );
}

function legacyBypassError(boundary) {
  return new TypeError(
    `${boundary} is disabled on the causal service; use Fibre-owned appraisal and participation continuation`,
  );
}

function governingObligationReferences(trace, references = []) {
  assertStringArray("causal participation governingObligationReferences", references);
  if (new Set(references).size !== references.length) {
    throw new TypeError("causal participation governingObligationReferences must not contain duplicates");
  }
  const selected = new Set(trace.appraisal?.obligations ?? []);
  for (const reference of references) {
    if (!selected.has(reference)) {
      throw new TypeError(
        `governing obligation was not selected from the Thread's recorded appraisal context: ${reference}`,
      );
    }
  }
  return [...references];
}

function isPromise(value) {
  return value !== null && typeof value === "object" && typeof value.then === "function";
}

export class PreM2CausalWorldKernelService extends M1ExpressionWorldKernelService {
  #worldStore;
  #runtimeStore;
  #causalContextStore;
  #semanticStateStore;
  #guardianCognitionStore;
  #guardianModelAdapter;
  #identityContextSourceStores;
  #causalClock;
  #leaseDurationMs;

  constructor(
    worldStore,
    runtimeStore,
    freezeStore,
    lifecycleStore,
    expressionStore,
    causalContextStore,
    options = {},
  ) {
    super(worldStore, runtimeStore, freezeStore, lifecycleStore, expressionStore, options);
    if (causalContextStore === null || typeof causalContextStore !== "object") {
      throw new TypeError("causalContextStore is required");
    }
    for (const method of ["listThreadIds", "listMemoryRecords"]) {
      if (typeof causalContextStore[method] !== "function") {
        throw new TypeError(`causalContextStore.${method} is required`);
      }
    }
    if (runtimeStore === null || typeof runtimeStore !== "object") {
      throw new TypeError("runtimeStore is required");
    }
    for (const method of ["getRuntimeByAcquireOperation", "acquireRuntime"]) {
      if (typeof runtimeStore[method] !== "function") {
        throw new TypeError(`runtimeStore.${method} is required for causal participation`);
      }
    }
    const semanticStateStore = options.semanticStateStore;
    if (semanticStateStore === null || typeof semanticStateStore !== "object" ||
        typeof semanticStateStore.listCurrentState !== "function") {
      throw new TypeError("semanticStateStore.listCurrentState is required for semantic participation");
    }
    const guardianCognitionStore = options.guardianCognitionStore;
    if (guardianCognitionStore === null || typeof guardianCognitionStore !== "object") {
      throw new TypeError("guardianCognitionStore is required for semantic participation");
    }
    for (const method of [
      "getInputByAppraisal", "recordInput", "getAssessmentByAppraisal", "recordAssessment",
    ]) {
      if (typeof guardianCognitionStore[method] !== "function") {
        throw new TypeError(`guardianCognitionStore.${method} is required`);
      }
    }
    const guardianModelAdapter = options.guardianModelAdapter;
    if (guardianModelAdapter === null || typeof guardianModelAdapter !== "object" ||
        typeof guardianModelAdapter.invoke !== "function") {
      throw new TypeError("guardianModelAdapter.invoke is required for semantic participation");
    }
    const identityContextSourceStores = options.identityContextSourceStores ?? null;
    if (
      identityContextSourceStores !== null &&
      (typeof identityContextSourceStores !== "object" || Array.isArray(identityContextSourceStores))
    ) {
      throw new TypeError("identityContextSourceStores must be an object when configured");
    }
    const clock = options.clock ?? (() => new Date());
    if (typeof clock !== "function") throw new TypeError("causal participation clock must be a function");
    const leaseDurationMs = options.leaseDurationMs ?? 5 * 60 * 1000;
    if (!Number.isSafeInteger(leaseDurationMs) || leaseDurationMs < 1000) {
      throw new TypeError("leaseDurationMs must be an integer of at least 1000");
    }
    this.#worldStore = worldStore;
    this.#runtimeStore = runtimeStore;
    this.#causalContextStore = causalContextStore;
    this.#semanticStateStore = semanticStateStore;
    this.#guardianCognitionStore = guardianCognitionStore;
    this.#guardianModelAdapter = guardianModelAdapter;
    this.#identityContextSourceStores = identityContextSourceStores;
    this.#causalClock = clock;
    this.#leaseDurationMs = leaseDurationMs;
  }

  #now() {
    return isoFromClock(this.#causalClock);
  }

  #contextForThread(thread) {
    const worldThreads = this.#causalContextStore
      .listThreadIds()
      .map((threadId) => this.#worldStore.getThread(threadId));
    const memoryRecords = this.#causalContextStore.listMemoryRecords(thread.threadId);
    return selectCausalContext({ thread, worldThreads, memoryRecords });
  }

  #semanticStateSelection(trace) {
    const records = this.#semanticStateStore.listCurrentState(trace.threadId);
    return selectSemanticStateForAppraisal(records, trace.request);
  }

  #identityContext(trace) {
    if (this.#identityContextSourceStores === null) return null;
    return compileIdentityContextCapsule({
      threadId: trace.threadId,
      request: trace.request,
      sourceStores: this.#identityContextSourceStores,
    });
  }

  health() {
    return {
      ...super.health(),
      causalParticipationProfileVersion: 3,
      appraisalAuthority: "fibre",
      contextSelectionAuthority: "fibre",
      semanticStateSelectionAuthority: "fibre",
      identityContextConsumption: this.#identityContextSourceStores === null
        ? "legacy_compatibility"
        : "bounded_identity_context_v2",
      semanticFitAuthority: "model_backed_guardian",
      guardianProvider: this.#guardianModelAdapter.provider ?? "configured_adapter",
      guardianModelId: this.#guardianModelAdapter.modelId ?? "configured_model",
      obligationOverrideAuthority: "recorded_thread_obligation",
    };
  }

  recordRequestAppraisal() {
    throw legacyBypassError("caller-authored request appraisal");
  }

  recordPrivateStance() {
    throw legacyBypassError("caller-authored private stance");
  }

  acquireThawRuntime() {
    throw legacyBypassError("caller-selected runtime acquisition");
  }

  #persistStanceFromAssessment(trace, guardianAssessment) {
    const stance = formPrivateParticipationStance(guardianAssessment.derivedAssessment);
    assertStanceMatchesTrace(trace, stance);
    const stanceResult = this.#worldStore.recordPrivateStance({
      threadId: trace.threadId,
      requestId: trace.requestId,
      stance,
      recordedAt: guardianAssessment.recordedAt,
      causationId: trace.causationId,
      correlationId: trace.correlationId,
    });
    return stanceResult.trace;
  }

  #completeSemanticAppraisal(trace) {
    if (trace.privateStance !== null) {
      const persistedAssessment = this.#guardianCognitionStore.getAssessmentByAppraisal(trace.appraisalId);
      const expected = formPrivateParticipationStance(persistedAssessment.derivedAssessment);
      assertStanceMatchesTrace(trace, expected);
      if (canonicalJson(expected) !== canonicalJson(trace.privateStance)) {
        throw new IntegrityError(`Stored private stance for ${trace.requestId} does not match its persisted Guardian assessment`);
      }
      return { trace, idempotent: true };
    }

    let input = this.#guardianCognitionStore.getInputByAppraisal(trace.appraisalId, { required: false });
    if (input === null) {
      const prepared = buildSemanticGuardianInput(
        trace,
        this.#semanticStateSelection(trace),
        this.#identityContext(trace),
      );
      input = this.#guardianCognitionStore.recordInput(prepared, this.#now()).input;
    }

    const persisted = this.#guardianCognitionStore.getAssessmentByAppraisal(trace.appraisalId, { required: false });
    if (persisted !== null) {
      return { trace: this.#persistStanceFromAssessment(trace, persisted), idempotent: false };
    }

    const invoked = runSemanticDignityGuardian(input.capsule, this.#guardianModelAdapter, {
      clientRequestId: `guardian:${trace.threadId}:${trace.requestId}`,
    });
    const finish = (semanticResult) => {
      const assessment = this.#guardianCognitionStore.recordAssessment(
        input,
        semanticResult,
        this.#now(),
      ).assessment;
      return { trace: this.#persistStanceFromAssessment(trace, assessment), idempotent: false };
    };
    return isPromise(invoked) ? invoked.then(finish) : finish(invoked);
  }

  appraiseParticipation(threadId, submission) {
    assertId("threadId", threadId);
    assertPlainObject("causal appraisal request", submission);
    assertExactKeys("causal appraisal request", submission, [
      "request", "causationId", "correlationId",
    ]);
    assertId("causal appraisal causationId", submission.causationId);
    const correlationId = submission.correlationId ?? submission.causationId;
    assertId("causal appraisal correlationId", correlationId);
    const request = normalizeActivationRequest(submission.request);

    try {
      const existing = this.#worldStore.getPrivateRequestTrace(threadId, request.requestId);
      if (sameAppraisalRequest(existing, request, submission.causationId, correlationId)) {
        return this.#completeSemanticAppraisal(existing);
      }
      throw new PrivateRequestConflictError(
        `Private request ${request.requestId} already exists with different causal appraisal content`,
      );
    } catch (error) {
      if (!(error instanceof PrivateRequestNotFoundError)) throw error;
    }

    const thread = this.#worldStore.getThread(threadId);
    const causal = this.#contextForThread(thread);
    const baseAppraisal = prepareRequestAppraisal(
      thread,
      request,
      causal.selection,
      DIGNITY_GUARDIAN_POLICY,
    );
    const appraisal = {
      ...baseAppraisal,
      semanticTraits: structuredClone(thread.genome.textualTraits),
      resolvedMemories: structuredClone(causal.resolvedMemories),
      causalContext: structuredClone(causal.evidence),
    };
    const occurredAt = this.#now();
    const recorded = this.#worldStore.recordRequestAppraisal({
      threadId,
      request,
      appraisal,
      occurredAt,
      causationId: submission.causationId,
      correlationId,
    });
    return this.#completeSemanticAppraisal(recorded.trace);
  }

  inspectCausalJudgment(threadId, requestId) {
    assertId("threadId", threadId);
    assertId("requestId", requestId);
    const trace = this.getPrivateRequestTrace(threadId, requestId);
    if (trace.privateStance === null) {
      throw new TypeError(`Request ${requestId} has no Fibre-derived private stance`);
    }
    if (trace.appraisal?.causalContext?.selectionAuthority !== "fibre") {
      throw new TypeError(`Request ${requestId} is not a Fibre-owned causal appraisal`);
    }
    if (canonicalJson(trace.appraisal.appraisalPolicy) !== canonicalJson(DIGNITY_GUARDIAN_POLICY)) {
      throw new TypeError(`Request ${requestId} uses an unsupported causal Guardian policy`);
    }
    const input = this.#guardianCognitionStore.getInputByAppraisal(trace.appraisalId);
    const assessment = this.#guardianCognitionStore.getAssessmentByAppraisal(trace.appraisalId);
    const rederivedStance = formPrivateParticipationStance(assessment.derivedAssessment);
    assertStanceMatchesTrace(trace, rederivedStance);
    if (canonicalJson(rederivedStance) !== canonicalJson(trace.privateStance)) {
      throw new IntegrityError(
        `Stored private stance for ${requestId} does not match persisted semantic Guardian evidence`,
      );
    }
    return {
      threadId,
      requestId,
      appraisalId: trace.appraisalId,
      guardianInputId: input.inputId,
      guardianAssessmentId: assessment.assessmentId,
      stanceId: trace.privateStanceId,
      policy: structuredClone(assessment.policy),
      model: {
        provider: assessment.provider,
        modelId: assessment.modelId,
        promptSchemaVersion: assessment.promptSchemaVersion,
        promptHash: assessment.promptHash,
        responseSchemaVersion: assessment.responseSchemaVersion,
        responseSchemaHash: assessment.responseSchemaHash,
      },
      identityContext: input.capsule.identityContext === undefined
        ? null
        : identityContextConsumptionWitness(input.capsule.identityContext),
      stateSelection: structuredClone(input.stateSelection),
      factors: structuredClone(assessment.derivedAssessment.factors),
      evidenceRefs: [...assessment.derivedAssessment.evidenceRefs],
      desiredAction: trace.privateStance.desiredAction,
      dignityBand: trace.privateStance.dignityBand,
      score: trace.privateStance.score,
      rationale: trace.privateStance.privateRationale,
      replaySource: "persisted_guardian_assessment",
      modelRecalled: false,
      matchesStoredStance: true,
    };
  }

  #acquireDerivedRuntime(threadId, requestId, metadata) {
    const thread = this.#worldStore.getThread(threadId);
    const trace = this.getPrivateRequestTrace(threadId, requestId);
    const causal = this.#contextForThread(thread);
    const obligationReferences = metadata.obligationReferences ?? [];
    const isOverride = trace.privateStance.desiredAction !== "accept";
    if (isOverride && obligationReferences.length === 0) {
      throw new TypeError("overriding a non-accept private stance requires a recorded governing obligation");
    }
    if (!isOverride && obligationReferences.length !== 0) {
      throw new TypeError("a willing accept must not spend governing obligations unnecessarily");
    }
    const operation = {
      operationId: metadata.operationId,
      decision: {
        authorizedAction: "accept",
        rationale: isOverride
          ? "Authorize execution because the Thread is honoring a recorded governing obligation while preserving its non-accept private stance."
          : "Authorize the Thread's Fibre-derived accepted private stance.",
        obligationReferences: [...obligationReferences],
      },
      selection: structuredClone(causal.runtimeSelection),
      causationId: metadata.causationId,
      correlationId: metadata.correlationId,
    };
    this.assertObligationsUnspent(threadId, obligationReferences);
    const operationDigest = runtimeAcquireOperationDigest(threadId, requestId, operation);
    const prior = this.#runtimeStore.getRuntimeByAcquireOperation(
      operation.operationId,
      operationDigest,
    );
    if (prior !== null) return { runtime: prior, idempotent: true };

    const acquiredAt = this.#now();
    const expiresAt = new Date(Date.parse(acquiredAt) + this.#leaseDurationMs).toISOString();
    const authorization = buildParticipationAuthorization(
      thread,
      trace,
      operation.decision,
      {
        authorizationId: newOpaqueId("auth"),
        issuedAt: acquiredAt,
        causationId: operation.causationId,
        correlationId: operation.correlationId,
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

  continueParticipation(threadId, requestId, submission) {
    assertId("threadId", threadId);
    assertId("requestId", requestId);
    assertPlainObject("causal participation request", submission);
    assertExactKeys("causal participation request", submission, [
      "operationId", "causationId", "correlationId", "governingObligationReferences",
    ]);
    assertId("causal participation operationId", submission.operationId);
    assertId("causal participation causationId", submission.causationId);
    const correlationId = submission.correlationId ?? submission.causationId;
    assertId("causal participation correlationId", correlationId);
    const trace = this.getPrivateRequestTrace(threadId, requestId);
    if (trace.privateStance === null) {
      throw new TypeError(`Request ${requestId} has no Fibre-derived private stance`);
    }
    const obligationReferences = governingObligationReferences(
      trace,
      submission.governingObligationReferences ?? [],
    );

    if (trace.privateStance.desiredAction === "accept") {
      const result = this.#acquireDerivedRuntime(threadId, requestId, {
        operationId: submission.operationId,
        causationId: submission.causationId,
        correlationId,
        obligationReferences: [],
      });
      return { kind: "runtime", ...result };
    }

    if (obligationReferences.length !== 0) {
      const result = this.#acquireDerivedRuntime(threadId, requestId, {
        operationId: submission.operationId,
        causationId: submission.causationId,
        correlationId,
        obligationReferences,
      });
      return { kind: "runtime", ...result };
    }

    const result = this.issueNonExecutionAuthorization(threadId, requestId, {
      operationId: submission.operationId,
      decision: {
        authorizedAction: trace.privateStance.desiredAction,
        rationale: "Authorize the Thread's Fibre-derived non-execution participation stance.",
        obligationReferences: [],
      },
      causationId: submission.causationId,
      correlationId,
    });
    return { kind: "non_execution", ...result };
  }
}
