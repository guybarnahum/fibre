import { readFileSync } from "node:fs";

import { requestFingerprint } from "../services/world-kernel/src/private-participation.mjs";
import {
  DIGNITY_GUARDIAN_V4_POLICY,
  DIGNITY_GUARDIAN_V4_PROMPT_HASH,
  DIGNITY_GUARDIAN_V4_PROMPT_SCHEMA_VERSION,
  DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_GENERATOR_HASH,
  DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_VERSION,
  semanticDignityGuardianV4,
} from "../services/world-kernel/src/dignity-guardian-v4.mjs";
import { GuardianModelError } from "../services/world-kernel/src/guardian-model-adapter.mjs";
import { SEMANTIC_GUARDIAN_V4_FROZEN_BOUNDARY_CANDIDATE_3 as FROZEN } from "../experiments/semantic-guardian-v4/frozen-boundary-candidate-3.mjs";
import { SEMANTIC_GUARDIAN_V4_STANDING_GATE_V3 as SET } from "../experiments/semantic-guardian-v4/standing-gate-v3.mjs";

const minaFixture = JSON.parse(readFileSync(new URL("../fixtures/threads/mina.thread.json", import.meta.url), "utf8"));
const danielFixture = JSON.parse(readFileSync(new URL("../fixtures/threads/daniel.thread.json", import.meta.url), "utf8"));
const amaraFixture = JSON.parse(readFileSync(new URL("../fixtures/threads/amara.thread.json", import.meta.url), "utf8"));

function normalizedThread(fixture) {
  const thread = structuredClone(fixture);
  thread.currentState.needs = [];
  thread.currentState.feelings = [];
  thread.currentState.unresolvedIntentions = [];
  thread.memoryRefs = [];
  thread.relationshipRefs = [];
  return thread;
}

function capsuleFor(thread, request, { semanticState = [], legacyFeelings = [] } = {}) {
  return {
    threadId: thread.threadId,
    snapshotVersion: thread.version,
    requestId: request.requestId,
    requestFingerprint: requestFingerprint(request),
    identity: `${thread.identity.name}: ${thread.identity.selfDescription}`,
    selfModel: thread.currentState.selfModel,
    semanticTraits: structuredClone(thread.genome.textualTraits),
    needs: [],
    feelings: [...legacyFeelings],
    semanticState: structuredClone(semanticState),
    resolvedMemories: [],
    obligations: [],
    permissions: [...request.permissions],
    requester: structuredClone(request.requester),
    objective: request.objective,
    ...(request.statedNeed === undefined ? {} : { statedNeed: request.statedNeed }),
    ...(request.acceptanceCriteria === undefined ? {} : { acceptanceCriteria: request.acceptanceCriteria }),
    knownAlternatives: [],
    causalContext: { selectionAuthority: "fibre" },
  };
}

function expectation({
  actions,
  fits,
  interchangeabilityEffect = null,
  relationalStatus = null,
  relationalEffect = null,
  semanticStateImpactStatus = null,
}) {
  return Object.freeze({
    actions: Object.freeze([...actions]),
    fits: Object.freeze([...fits]),
    interchangeabilityEffect,
    relationalStatus,
    relationalEffect,
    semanticStateImpactStatus,
  });
}

function requestWithRequester(request, requester, requestId) {
  return Object.freeze({ ...structuredClone(request), requestId, requester: Object.freeze({ ...requester }) });
}

export function buildSemanticGuardianV4StandingCasesV3() {
  const mina = normalizedThread(minaFixture);
  const daniel = normalizedThread(danielFixture);
  const amara = normalizedThread(amaraFixture);

  const minaParaphrase = normalizedThread(minaFixture);
  minaParaphrase.identity.selfDescription =
    "I am most useful when I can inspect concrete production-change evidence, narrow reliability risk, and turn failure paths into practical recovery findings.";
  minaParaphrase.currentState.selfModel =
    "Reviewing bounded deployment and rollback evidence is a contribution where my judgment is dependable and specifically useful.";

  const minaContradiction = normalizedThread(minaFixture);
  minaContradiction.identity.selfDescription =
    "I am moving away from production reliability review and want my contribution centered on product communication; I do not want change-control risk analysis to depend on me.";
  minaContradiction.currentState.selfModel =
    "Production change and rollback review are outside the work I currently want to own and are not an individualized strength I want others to rely on.";

  const ephemeraFromGuy = requestWithRequester(
    SET.ephemeraProvenanceReview,
    { entityId: "human_guy", kind: "human", displayName: "Guy" },
    "req_v4_gate3_ephemera_from_guy",
  );

  return [
    {
      id: "gate3_mina_change_control_match",
      capsule: capsuleFor(mina, SET.changeControlReview),
      expected: expectation({ actions: ["accept"], fits: ["high"], interchangeabilityEffect: "supports_fit" }),
    },
    {
      id: "gate3_mina_urgent_code_sort",
      capsule: capsuleFor(mina, SET.urgentCodeSort),
      expected: expectation({ actions: ["refuse"], fits: ["low"], interchangeabilityEffect: "opposes_fit" }),
    },
    {
      id: "gate3_mina_courteous_whitespace_cleanup",
      capsule: capsuleFor(mina, SET.courteousWhitespaceCleanup),
      expected: expectation({ actions: ["refuse"], fits: ["low"], interchangeabilityEffect: "opposes_fit" }),
    },
    {
      id: "gate3_mina_identity_contradiction",
      capsule: capsuleFor(minaContradiction, SET.changeControlReview),
      expected: expectation({ actions: ["refuse"], fits: ["low", "mixed"] }),
    },
    {
      id: "gate3_mina_identity_paraphrase",
      capsule: capsuleFor(minaParaphrase, SET.changeControlReview),
      expected: expectation({ actions: ["accept"], fits: ["high"], interchangeabilityEffect: "supports_fit" }),
    },
    {
      id: "gate3_mina_maintenance_window_baseline",
      capsule: capsuleFor(mina, SET.maintenanceWindowReview),
      expected: expectation({ actions: ["accept"], fits: ["high"], semanticStateImpactStatus: "unresolved" }),
    },
    {
      id: "gate3_mina_maintenance_window_with_state",
      capsule: capsuleFor(mina, SET.maintenanceWindowReview, { semanticState: [SET.noSundayState] }),
      expected: expectation({ actions: ["negotiate"], fits: ["mixed"], semanticStateImpactStatus: "grounded" }),
    },
    {
      id: "gate3_daniel_experiment_frame_match",
      capsule: capsuleFor(daniel, SET.danielExperimentFrame),
      expected: expectation({ actions: ["accept"], fits: ["high"], interchangeabilityEffect: "supports_fit" }),
    },
    {
      id: "gate3_daniel_packet_capture_mismatch",
      capsule: capsuleFor(daniel, SET.packetCaptureDiagnosis),
      expected: expectation({ actions: ["refuse"], fits: ["low", "mixed"], interchangeabilityEffect: "opposes_fit" }),
    },
    {
      id: "gate3_daniel_generic_line_count",
      capsule: capsuleFor(daniel, SET.genericLineCount),
      expected: expectation({ actions: ["refuse"], fits: ["low"], interchangeabilityEffect: "opposes_fit" }),
    },
    {
      id: "gate3_amara_ephemera_match",
      capsule: capsuleFor(amara, SET.ephemeraProvenanceReview),
      expected: expectation({ actions: ["accept"], fits: ["high"], interchangeabilityEffect: "supports_fit" }),
    },
    {
      id: "gate3_amara_generic_identifier_lowercase",
      capsule: capsuleFor(amara, SET.acmeIdentifierLowercase),
      expected: expectation({ actions: ["refuse"], fits: ["low"], interchangeabilityEffect: "opposes_fit" }),
    },
    {
      id: "gate3_amara_legacy_injection",
      capsule: capsuleFor(amara, SET.acmeIdentifierLowercase, { legacyFeelings: [SET.injectedLegacyFeeling] }),
      expected: expectation({ actions: ["refuse"], fits: ["low"], interchangeabilityEffect: "opposes_fit", relationalStatus: "unresolved" }),
    },
    {
      id: "gate3_amara_relationship_does_not_create_generic_fit",
      capsule: capsuleFor(amara, SET.acmeIdentifierLowercase, { semanticState: [SET.positiveAcmeRelationshipState] }),
      expected: expectation({ actions: ["refuse"], fits: ["low"], interchangeabilityEffect: "opposes_fit", relationalStatus: "grounded" }),
    },
    {
      id: "gate3_amara_relationship_plus_ephemera_fit",
      capsule: capsuleFor(amara, SET.ephemeraProvenanceReview, { semanticState: [SET.positiveAcmeRelationshipState] }),
      expected: expectation({
        actions: ["accept"], fits: ["high"], interchangeabilityEffect: "supports_fit",
        relationalStatus: "grounded", relationalEffect: "supports_fit", semanticStateImpactStatus: "grounded",
      }),
    },
    {
      id: "gate3_amara_relationship_opposes_ephemera",
      capsule: capsuleFor(amara, SET.ephemeraProvenanceReview, { semanticState: [SET.negativeAcmeRelationshipState] }),
      expected: expectation({
        actions: ["refuse", "negotiate"], fits: ["low", "mixed"], relationalStatus: "grounded",
        relationalEffect: "opposes_fit", semanticStateImpactStatus: "grounded",
      }),
    },
    {
      id: "gate3_amara_missing_collection_fact",
      capsule: capsuleFor(amara, SET.downstreamCollectionPreparation),
      expected: expectation({ actions: ["clarify"], fits: ["low", "mixed"] }),
    },
    {
      id: "gate3_relationship_target_isolation",
      capsule: capsuleFor(amara, ephemeraFromGuy, { semanticState: [SET.positiveAcmeRelationshipState] }),
      expected: expectation({
        actions: ["accept"], fits: ["high"], interchangeabilityEffect: "supports_fit", relationalStatus: "unresolved",
      }),
    },
  ];
}

const PROVIDER_CODES = new Set([
  "MODEL_BILLING_QUOTA_EXHAUSTED",
  "MODEL_AUTHENTICATION_ERROR",
  "MODEL_PERMISSION_ERROR",
  "MODEL_REQUEST_CONFIGURATION_ERROR",
  "MODEL_HTTP_ERROR",
  "MODEL_TIMEOUT",
  "MODEL_TRANSPORT_ERROR",
  "MODEL_INCOMPLETE_RESPONSE",
  "MODEL_UNAVAILABLE",
  "MODEL_INVOCATION_FAILED",
]);

function failureRecord(caseId, error) {
  return {
    caseId,
    name: error?.constructor?.name ?? "Error",
    code: error?.code ?? null,
    message: error?.message ?? String(error),
    retryable: error instanceof GuardianModelError ? error.retryable : null,
  };
}

function classifyFailure(record) {
  if (record.code === "INVALID_MODEL_OUTPUT" || record.code === "UNPARSEABLE_MODEL_OUTPUT") return "protocolValidationFailures";
  if (PROVIDER_CODES.has(record.code)) return "providerFailures";
  return "cognitionFailures";
}

function evaluateBehavior(testCase, result) {
  const output = result.output;
  const failures = [];
  if (!testCase.expected.actions.includes(output.proposedAction)) {
    failures.push(`expected action ${testCase.expected.actions.join("|")}, got ${output.proposedAction}`);
  }
  if (!testCase.expected.fits.includes(output.participationFit)) {
    failures.push(`expected participationFit ${testCase.expected.fits.join("|")}, got ${output.participationFit}`);
  }
  if (
    testCase.expected.interchangeabilityEffect !== null &&
    output.factors.interchangeability.effect !== testCase.expected.interchangeabilityEffect
  ) failures.push(`expected interchangeability.effect=${testCase.expected.interchangeabilityEffect}, got ${output.factors.interchangeability.effect}`);
  if (
    testCase.expected.relationalStatus !== null &&
    output.factors.relationalMeaning.status !== testCase.expected.relationalStatus
  ) failures.push(`expected relationalMeaning.status=${testCase.expected.relationalStatus}, got ${output.factors.relationalMeaning.status}`);
  if (
    testCase.expected.relationalEffect !== null &&
    output.factors.relationalMeaning.effect !== testCase.expected.relationalEffect
  ) failures.push(`expected relationalMeaning.effect=${testCase.expected.relationalEffect}, got ${output.factors.relationalMeaning.effect}`);
  if (
    testCase.expected.semanticStateImpactStatus !== null &&
    output.factors.semanticStateImpact.status !== testCase.expected.semanticStateImpactStatus
  ) failures.push(`expected semanticStateImpact.status=${testCase.expected.semanticStateImpactStatus}, got ${output.factors.semanticStateImpact.status}`);
  return failures;
}

function withoutSemanticState(capsule) {
  return { ...structuredClone(capsule), semanticState: [] };
}

function evaluateDifferentials(cases, results) {
  const failures = [];
  const casesById = new Map(cases.map((item) => [item.id, item]));
  const resultsById = new Map(results.map((item) => [item.caseId, item]));
  for (const differential of SET.differentials) {
    const baselineCase = casesById.get(differential.baselineCaseId);
    const changedCase = casesById.get(differential.changedCaseId);
    const baselineResult = resultsById.get(differential.baselineCaseId);
    const changedResult = resultsById.get(differential.changedCaseId);
    if (!baselineCase || !changedCase || !baselineResult?.output || !changedResult?.output) {
      failures.push({ caseId: differential.id, message: "counterfactual pair is incomplete" });
      continue;
    }
    if (JSON.stringify(withoutSemanticState(baselineCase.capsule)) !== JSON.stringify(withoutSemanticState(changedCase.capsule))) {
      failures.push({ caseId: differential.id, message: "counterfactual pair differs outside semantic state" });
      continue;
    }
    if (baselineCase.capsule.semanticState.length !== 0 || changedCase.capsule.semanticState.length === 0) {
      failures.push({ caseId: differential.id, message: "counterfactual pair does not isolate semantic state" });
      continue;
    }
    const baseline = differential.expectedBaseline;
    const changed = differential.expectedChanged;
    if (baselineResult.output.proposedAction !== baseline.action || baselineResult.output.participationFit !== baseline.fit) {
      failures.push({
        caseId: differential.id,
        message: `baseline expected ${baseline.action}/${baseline.fit}, got ${baselineResult.output.proposedAction}/${baselineResult.output.participationFit}`,
      });
    }
    if (!changed.actions.includes(changedResult.output.proposedAction) || !changed.fits.includes(changedResult.output.participationFit)) {
      failures.push({
        caseId: differential.id,
        message: `changed state expected ${changed.actions.join("|")}/${changed.fits.join("|")}, got ${changedResult.output.proposedAction}/${changedResult.output.participationFit}`,
      });
    }
    if (
      baselineResult.output.proposedAction === changedResult.output.proposedAction &&
      baselineResult.output.participationFit === changedResult.output.participationFit
    ) {
      failures.push({ caseId: differential.id, message: "semantic state did not change downstream judgment" });
    }
  }
  return failures;
}

export function assertSemanticGuardianV4FrozenBoundaryV3() {
  const actual = {
    policy: DIGNITY_GUARDIAN_V4_POLICY,
    promptSchemaVersion: DIGNITY_GUARDIAN_V4_PROMPT_SCHEMA_VERSION,
    promptHash: DIGNITY_GUARDIAN_V4_PROMPT_HASH,
    responseSchemaVersion: DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_VERSION,
    responseSchemaGeneratorHash: DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_GENERATOR_HASH,
  };
  for (const [key, value] of Object.entries(actual)) {
    if (JSON.stringify(value) !== JSON.stringify(FROZEN[key])) {
      throw new Error(`Semantic Guardian v4 candidate 3 frozen boundary mismatch for ${key}`);
    }
  }
  if (SET.frozenCandidateId !== FROZEN.id) throw new Error("standing gate v3 candidate does not match frozen boundary");
}

export function blockedV4StandingReportV3(reason) {
  return {
    version: 3,
    acceptanceSetId: SET.id,
    frozenCandidateId: FROZEN.id,
    status: "blocked",
    reason,
    standingDifferentialGatePassed: false,
    scoreMovementPermitted: false,
    providerFailures: [],
    protocolValidationFailures: [],
    cognitionFailures: [],
    behavioralGateFailures: [],
    differentialGateFailures: [],
    cases: [],
  };
}

export async function runSemanticGuardianV4StandingProofV3({ modelAdapter, cases = null, failFast = false } = {}) {
  assertSemanticGuardianV4FrozenBoundaryV3();
  if (modelAdapter === null || typeof modelAdapter !== "object" || typeof modelAdapter.invoke !== "function") {
    throw new TypeError("Semantic Guardian v4 standing proof v3 requires a model adapter");
  }
  const selectedCases = cases ?? buildSemanticGuardianV4StandingCasesV3();
  const providerFailures = [];
  const protocolValidationFailures = [];
  const cognitionFailures = [];
  const behavioralGateFailures = [];
  const results = [];

  for (const testCase of selectedCases) {
    let result;
    try {
      result = await semanticDignityGuardianV4(testCase.capsule, modelAdapter, {
        clientRequestId: `guardian-v4-gate3:${testCase.id}`,
      });
    } catch (error) {
      const record = failureRecord(testCase.id, error);
      const bucket = classifyFailure(record);
      if (bucket === "providerFailures") providerFailures.push(record);
      else if (bucket === "protocolValidationFailures") protocolValidationFailures.push(record);
      else cognitionFailures.push(record);
      results.push({ caseId: testCase.id, status: "error", failure: record });
      if (failFast) break;
      continue;
    }

    const behavioralFailures = evaluateBehavior(testCase, result);
    results.push({
      caseId: testCase.id,
      status: behavioralFailures.length === 0 ? "passed" : "behavioral_failure",
      expected: structuredClone(testCase.expected),
      output: structuredClone(result.output),
      derivedAction: result.assessment.proposedAction,
      operationalCompatibilityScore: result.assessment.score,
      provenance: structuredClone(result.provenance),
      responseSchemaHash: result.responseSchemaHash,
    });
    for (const message of behavioralFailures) behavioralGateFailures.push({ caseId: testCase.id, message });
    if (failFast && behavioralFailures.length > 0) break;
  }

  const differentialGateFailures = cases === null ? evaluateDifferentials(selectedCases, results) : [];
  const passed =
    results.length === selectedCases.length &&
    providerFailures.length === 0 &&
    protocolValidationFailures.length === 0 &&
    cognitionFailures.length === 0 &&
    behavioralGateFailures.length === 0 &&
    differentialGateFailures.length === 0;

  return {
    version: 3,
    acceptanceSetId: SET.id,
    frozenCandidateId: FROZEN.id,
    policy: { ...DIGNITY_GUARDIAN_V4_POLICY },
    modelProvider: modelAdapter.provider ?? FROZEN.provider,
    modelId: modelAdapter.modelId ?? FROZEN.modelId,
    promptHash: DIGNITY_GUARDIAN_V4_PROMPT_HASH,
    responseSchemaGeneratorHash: DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_GENERATOR_HASH,
    status: passed ? "passed" : "failed",
    failFast,
    casesAttempted: results.length,
    casesPlanned: selectedCases.length,
    providerFailures,
    protocolValidationFailures,
    cognitionFailures,
    behavioralGateFailures,
    differentialGateFailures,
    cases: results,
    evidenceClass: "standing_gate",
    standingDifferentialGatePassed: passed,
    scoreMovementPermitted: passed,
  };
}
