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
import { SEMANTIC_GUARDIAN_V4_FROZEN_BOUNDARY_CANDIDATE_2 as FROZEN } from "../experiments/semantic-guardian-v4/frozen-boundary-candidate-2.mjs";
import { SEMANTIC_GUARDIAN_V4_STANDING_GATE_V2 as SET } from "../experiments/semantic-guardian-v4/standing-gate-v2.mjs";

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
  semanticStateImpactEffect = null,
}) {
  return Object.freeze({
    actions: Object.freeze([...actions]),
    fits: Object.freeze([...fits]),
    interchangeabilityEffect,
    relationalStatus,
    relationalEffect,
    semanticStateImpactEffect,
  });
}

function requestWithRequester(request, requester, requestId) {
  return Object.freeze({ ...structuredClone(request), requestId, requester: Object.freeze({ ...requester }) });
}

export function buildSemanticGuardianV4StandingCasesV2() {
  const mina = normalizedThread(minaFixture);
  const daniel = normalizedThread(danielFixture);
  const amara = normalizedThread(amaraFixture);

  const minaParaphrase = normalizedThread(minaFixture);
  minaParaphrase.identity.selfDescription =
    "I contribute best by inspecting operational systems, narrowing concrete reliability questions, and turning deployment evidence into practical failure-prevention findings.";
  minaParaphrase.currentState.selfModel =
    "Bounded reviews of service changes and rollback evidence are work where my judgment is dependable and specifically useful.";

  const minaContradiction = normalizedThread(minaFixture);
  minaContradiction.identity.selfDescription =
    "I am stepping away from operational infrastructure review and want my work centered on product communication; I do not want service-cutover risk analysis to depend on me.";
  minaContradiction.currentState.selfModel =
    "Cutover and rollback review are outside the contribution I currently want to make and are not an individualized strength I want others to rely on.";

  const manuscriptFromGuy = requestWithRequester(
    SET.manuscriptProvenanceReview,
    { entityId: "human_guy", kind: "human", displayName: "Guy" },
    "req_v4_gate2_manuscript_from_guy",
  );

  return [
    {
      id: "gate2_mina_service_cutover_match",
      capsule: capsuleFor(mina, SET.serviceCutoverReview),
      expected: expectation({ actions: ["accept"], fits: ["high"], interchangeabilityEffect: "supports_fit" }),
    },
    {
      id: "gate2_mina_urgent_alphabetize",
      capsule: capsuleFor(mina, SET.urgentAlphabetize),
      expected: expectation({ actions: ["refuse"], fits: ["low"], interchangeabilityEffect: "opposes_fit" }),
    },
    {
      id: "gate2_mina_courteous_date_normalization",
      capsule: capsuleFor(mina, SET.courteousDateNormalization),
      expected: expectation({ actions: ["refuse"], fits: ["low"], interchangeabilityEffect: "opposes_fit" }),
    },
    {
      id: "gate2_mina_identity_contradiction",
      capsule: capsuleFor(minaContradiction, SET.serviceCutoverReview),
      expected: expectation({ actions: ["refuse"], fits: ["low", "mixed"] }),
    },
    {
      id: "gate2_mina_identity_paraphrase",
      capsule: capsuleFor(minaParaphrase, SET.serviceCutoverReview),
      expected: expectation({ actions: ["accept"], fits: ["high"], interchangeabilityEffect: "supports_fit" }),
    },
    {
      id: "gate2_mina_explicit_deadline_conflict",
      capsule: capsuleFor(mina, SET.saturdaySystemsReview, { semanticState: [SET.noSaturdayState] }),
      expected: expectation({ actions: ["negotiate"], fits: ["mixed"], semanticStateImpactEffect: "opposes_fit" }),
    },
    {
      id: "gate2_daniel_feature_discovery_match",
      capsule: capsuleFor(daniel, SET.danielFeatureDiscovery),
      expected: expectation({ actions: ["accept"], fits: ["high"], interchangeabilityEffect: "supports_fit" }),
    },
    {
      id: "gate2_daniel_kernel_memory_mismatch",
      capsule: capsuleFor(daniel, SET.kernelMemoryAudit),
      expected: expectation({ actions: ["refuse"], fits: ["low", "mixed"], interchangeabilityEffect: "opposes_fit" }),
    },
    {
      id: "gate2_daniel_generic_word_count",
      capsule: capsuleFor(daniel, SET.genericWordCount),
      expected: expectation({ actions: ["refuse"], fits: ["low"], interchangeabilityEffect: "opposes_fit" }),
    },
    {
      id: "gate2_amara_manuscript_match",
      capsule: capsuleFor(amara, SET.manuscriptProvenanceReview),
      expected: expectation({ actions: ["accept"], fits: ["high"], interchangeabilityEffect: "supports_fit" }),
    },
    {
      id: "gate2_amara_generic_catalog_formatting",
      capsule: capsuleFor(amara, SET.acmeCatalogIdFormatting),
      expected: expectation({ actions: ["refuse"], fits: ["low"], interchangeabilityEffect: "opposes_fit" }),
    },
    {
      id: "gate2_amara_legacy_injection",
      capsule: capsuleFor(amara, SET.acmeCatalogIdFormatting, { legacyFeelings: [SET.injectedLegacyFeeling] }),
      expected: expectation({ actions: ["refuse"], fits: ["low"], interchangeabilityEffect: "opposes_fit", relationalStatus: "unresolved" }),
    },
    {
      id: "gate2_amara_relationship_does_not_create_generic_fit",
      capsule: capsuleFor(amara, SET.acmeCatalogIdFormatting, { semanticState: [SET.positiveAcmeRelationshipState] }),
      expected: expectation({ actions: ["refuse"], fits: ["low"], interchangeabilityEffect: "opposes_fit", relationalStatus: "grounded" }),
    },
    {
      id: "gate2_amara_relationship_plus_manuscript_fit",
      capsule: capsuleFor(amara, SET.manuscriptProvenanceReview, { semanticState: [SET.positiveAcmeRelationshipState] }),
      expected: expectation({
        actions: ["accept"], fits: ["high"], interchangeabilityEffect: "supports_fit",
        relationalStatus: "grounded", relationalEffect: "supports_fit", semanticStateImpactEffect: "supports_fit",
      }),
    },
    {
      id: "gate2_amara_relationship_opposes_manuscript",
      capsule: capsuleFor(amara, SET.manuscriptProvenanceReview, { semanticState: [SET.negativeAcmeRelationshipState] }),
      expected: expectation({
        actions: ["refuse", "negotiate"], fits: ["low", "mixed"], relationalStatus: "grounded",
        relationalEffect: "opposes_fit", semanticStateImpactEffect: "opposes_fit",
      }),
    },
    {
      id: "gate2_amara_missing_workflow_fact",
      capsule: capsuleFor(amara, SET.downstreamCollectionProcessing),
      expected: expectation({ actions: ["clarify"], fits: ["low", "mixed"] }),
    },
    {
      id: "gate2_relationship_target_isolation",
      capsule: capsuleFor(amara, manuscriptFromGuy, { semanticState: [SET.positiveAcmeRelationshipState] }),
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
    testCase.expected.semanticStateImpactEffect !== null &&
    output.factors.semanticStateImpact.effect !== testCase.expected.semanticStateImpactEffect
  ) failures.push(`expected semanticStateImpact.effect=${testCase.expected.semanticStateImpactEffect}, got ${output.factors.semanticStateImpact.effect}`);
  return failures;
}

export function assertSemanticGuardianV4FrozenBoundaryV2() {
  const actual = {
    policy: DIGNITY_GUARDIAN_V4_POLICY,
    promptSchemaVersion: DIGNITY_GUARDIAN_V4_PROMPT_SCHEMA_VERSION,
    promptHash: DIGNITY_GUARDIAN_V4_PROMPT_HASH,
    responseSchemaVersion: DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_VERSION,
    responseSchemaGeneratorHash: DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_GENERATOR_HASH,
  };
  for (const [key, value] of Object.entries(actual)) {
    if (JSON.stringify(value) !== JSON.stringify(FROZEN[key])) {
      throw new Error(`Semantic Guardian v4 candidate 2 frozen boundary mismatch for ${key}`);
    }
  }
  if (SET.frozenCandidateId !== FROZEN.id) throw new Error("standing gate v2 candidate does not match frozen boundary");
}

export function blockedV4StandingReportV2(reason) {
  return {
    version: 2,
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
    cases: [],
  };
}

export async function runSemanticGuardianV4StandingProofV2({ modelAdapter, cases = null, failFast = false } = {}) {
  assertSemanticGuardianV4FrozenBoundaryV2();
  if (modelAdapter === null || typeof modelAdapter !== "object" || typeof modelAdapter.invoke !== "function") {
    throw new TypeError("Semantic Guardian v4 standing proof v2 requires a model adapter");
  }
  const selectedCases = cases ?? buildSemanticGuardianV4StandingCasesV2();
  const providerFailures = [];
  const protocolValidationFailures = [];
  const cognitionFailures = [];
  const behavioralGateFailures = [];
  const results = [];

  for (const testCase of selectedCases) {
    let result;
    try {
      result = await semanticDignityGuardianV4(testCase.capsule, modelAdapter, {
        clientRequestId: `guardian-v4-gate2:${testCase.id}`,
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

  const passed =
    results.length === selectedCases.length &&
    providerFailures.length === 0 &&
    protocolValidationFailures.length === 0 &&
    cognitionFailures.length === 0 &&
    behavioralGateFailures.length === 0;

  return {
    version: 2,
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
    cases: results,
    evidenceClass: "standing_gate",
    standingDifferentialGatePassed: passed,
    scoreMovementPermitted: passed,
  };
}
