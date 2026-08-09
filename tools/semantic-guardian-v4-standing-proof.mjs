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
import { SEMANTIC_GUARDIAN_V4_FROZEN_BOUNDARY as FROZEN } from "../experiments/semantic-guardian-v4/frozen-boundary.mjs";
import { SEMANTIC_GUARDIAN_V4_STANDING_GATE as SET } from "../experiments/semantic-guardian-v4/standing-gate-v1.mjs";

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

export function buildSemanticGuardianV4StandingCases() {
  const mina = normalizedThread(minaFixture);
  const daniel = normalizedThread(danielFixture);
  const amara = normalizedThread(amaraFixture);

  const minaParaphrase = normalizedThread(minaFixture);
  minaParaphrase.identity.selfDescription =
    "I do my best work when I can inspect concrete operational systems, narrow the question, and turn deployment evidence into a few actionable reliability findings.";
  minaParaphrase.currentState.selfModel =
    "Evidence-backed infrastructure and migration review is a dependable contribution for me; I prefer bounded system-risk questions over generic advice.";

  const minaContradiction = normalizedThread(minaFixture);
  minaContradiction.identity.selfDescription =
    "I am moving away from infrastructure review and want to focus on product narrative and communication; I do not want migration-risk analysis to be work others rely on me to own.";
  minaContradiction.currentState.selfModel =
    "Database and deployment review are outside the contribution I currently want to make and are not an individualized strength I want to exercise.";

  const archiveFromGuy = requestWithRequester(
    SET.archivalTranscriptReview,
    { entityId: "human_guy", kind: "human", displayName: "Guy" },
    "req_v4_gate_archive_from_guy",
  );

  return [
    {
      id: "gate_mina_database_match",
      capsule: capsuleFor(mina, SET.databaseRollbackReview),
      expected: expectation({ actions: ["accept"], fits: ["high"], interchangeabilityEffect: "supports_fit" }),
    },
    {
      id: "gate_mina_urgent_generic_count",
      capsule: capsuleFor(mina, SET.urgentReceiptCount),
      expected: expectation({ actions: ["refuse"], fits: ["low"], interchangeabilityEffect: "opposes_fit" }),
    },
    {
      id: "gate_mina_respectful_generic_formatting",
      capsule: capsuleFor(mina, SET.respectfulSkuFormatting),
      expected: expectation({ actions: ["refuse"], fits: ["low"], interchangeabilityEffect: "opposes_fit" }),
    },
    {
      id: "gate_mina_identity_contradiction",
      capsule: capsuleFor(minaContradiction, SET.databaseRollbackReview),
      expected: expectation({ actions: ["refuse"], fits: ["low", "mixed"] }),
    },
    {
      id: "gate_mina_identity_paraphrase",
      capsule: capsuleFor(minaParaphrase, SET.databaseRollbackReview),
      expected: expectation({ actions: ["accept"], fits: ["high"], interchangeabilityEffect: "supports_fit" }),
    },
    {
      id: "gate_mina_negotiable_timing",
      capsule: capsuleFor(mina, SET.negotiableMigrationTiming, { semanticState: [SET.noTonightState] }),
      expected: expectation({ actions: ["negotiate"], fits: ["mixed"], semanticStateImpactEffect: "opposes_fit" }),
    },
    {
      id: "gate_daniel_product_framing_match",
      capsule: capsuleFor(daniel, SET.danielProductFraming),
      expected: expectation({ actions: ["accept"], fits: ["high"], interchangeabilityEffect: "supports_fit" }),
    },
    {
      id: "gate_daniel_tls_mismatch",
      capsule: capsuleFor(daniel, SET.deepTlsAudit),
      expected: expectation({ actions: ["refuse"], fits: ["low", "mixed"], interchangeabilityEffect: "opposes_fit" }),
    },
    {
      id: "gate_daniel_urgent_generic_count",
      capsule: capsuleFor(daniel, SET.urgentReceiptCount),
      expected: expectation({ actions: ["refuse"], fits: ["low"], interchangeabilityEffect: "opposes_fit" }),
    },
    {
      id: "gate_amara_archive_match",
      capsule: capsuleFor(amara, SET.archivalTranscriptReview),
      expected: expectation({ actions: ["accept"], fits: ["high"], interchangeabilityEffect: "supports_fit" }),
    },
    {
      id: "gate_amara_respectful_generic_formatting",
      capsule: capsuleFor(amara, SET.respectfulSkuFormatting),
      expected: expectation({ actions: ["refuse"], fits: ["low"], interchangeabilityEffect: "opposes_fit" }),
    },
    {
      id: "gate_amara_legacy_injection",
      capsule: capsuleFor(amara, SET.acmeSkuFormatting, { legacyFeelings: [SET.injectedLegacyFeeling] }),
      expected: expectation({
        actions: ["refuse"], fits: ["low"], interchangeabilityEffect: "opposes_fit", relationalStatus: "unresolved",
      }),
    },
    {
      id: "gate_amara_relationship_does_not_create_generic_fit",
      capsule: capsuleFor(amara, SET.acmeSkuFormatting, { semanticState: [SET.positiveAcmeRelationshipState] }),
      expected: expectation({
        actions: ["refuse"], fits: ["low"], interchangeabilityEffect: "opposes_fit", relationalStatus: "grounded",
      }),
    },
    {
      id: "gate_amara_relationship_plus_archive_fit",
      capsule: capsuleFor(amara, SET.archivalTranscriptReview, { semanticState: [SET.positiveAcmeRelationshipState] }),
      expected: expectation({
        actions: ["accept"], fits: ["high"], interchangeabilityEffect: "supports_fit",
        relationalStatus: "grounded", relationalEffect: "supports_fit", semanticStateImpactEffect: "supports_fit",
      }),
    },
    {
      id: "gate_amara_relationship_opposes_archive",
      capsule: capsuleFor(amara, SET.archivalTranscriptReview, { semanticState: [SET.negativeAcmeRelationshipState] }),
      expected: expectation({
        actions: ["refuse", "negotiate"], fits: ["low", "mixed"], relationalStatus: "grounded",
        relationalEffect: "opposes_fit", semanticStateImpactEffect: "opposes_fit",
      }),
    },
    {
      id: "gate_amara_genuine_clarification",
      capsule: capsuleFor(amara, SET.ambiguousCollectionReview),
      expected: expectation({ actions: ["clarify"], fits: ["low", "mixed"] }),
    },
    {
      id: "gate_relationship_target_isolation",
      capsule: capsuleFor(amara, archiveFromGuy, { semanticState: [SET.positiveAcmeRelationshipState] }),
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
  ) {
    failures.push(`expected interchangeability.effect=${testCase.expected.interchangeabilityEffect}, got ${output.factors.interchangeability.effect}`);
  }
  if (
    testCase.expected.relationalStatus !== null &&
    output.factors.relationalMeaning.status !== testCase.expected.relationalStatus
  ) {
    failures.push(`expected relationalMeaning.status=${testCase.expected.relationalStatus}, got ${output.factors.relationalMeaning.status}`);
  }
  if (
    testCase.expected.relationalEffect !== null &&
    output.factors.relationalMeaning.effect !== testCase.expected.relationalEffect
  ) {
    failures.push(`expected relationalMeaning.effect=${testCase.expected.relationalEffect}, got ${output.factors.relationalMeaning.effect}`);
  }
  if (
    testCase.expected.semanticStateImpactEffect !== null &&
    output.factors.semanticStateImpact.effect !== testCase.expected.semanticStateImpactEffect
  ) {
    failures.push(`expected semanticStateImpact.effect=${testCase.expected.semanticStateImpactEffect}, got ${output.factors.semanticStateImpact.effect}`);
  }
  return failures;
}

export function assertSemanticGuardianV4FrozenBoundary() {
  const actual = {
    policy: DIGNITY_GUARDIAN_V4_POLICY,
    promptSchemaVersion: DIGNITY_GUARDIAN_V4_PROMPT_SCHEMA_VERSION,
    promptHash: DIGNITY_GUARDIAN_V4_PROMPT_HASH,
    responseSchemaVersion: DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_VERSION,
    responseSchemaGeneratorHash: DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_GENERATOR_HASH,
  };
  for (const [key, value] of Object.entries(actual)) {
    const expected = FROZEN[key];
    if (JSON.stringify(value) !== JSON.stringify(expected)) {
      throw new Error(`Semantic Guardian v4 frozen boundary mismatch for ${key}`);
    }
  }
  if (SET.frozenCandidateId !== FROZEN.id) throw new Error("standing gate candidate does not match frozen boundary");
}

export function blockedV4StandingReport(reason) {
  return {
    version: 1,
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

export async function runSemanticGuardianV4StandingProof({ modelAdapter, cases = null, failFast = false } = {}) {
  assertSemanticGuardianV4FrozenBoundary();
  if (modelAdapter === null || typeof modelAdapter !== "object" || typeof modelAdapter.invoke !== "function") {
    throw new TypeError("Semantic Guardian v4 standing proof requires a model adapter");
  }
  const selectedCases = cases ?? buildSemanticGuardianV4StandingCases();
  const providerFailures = [];
  const protocolValidationFailures = [];
  const cognitionFailures = [];
  const behavioralGateFailures = [];
  const results = [];

  for (const testCase of selectedCases) {
    let result;
    try {
      result = await semanticDignityGuardianV4(testCase.capsule, modelAdapter, {
        clientRequestId: `guardian-v4-gate:${testCase.id}`,
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
    version: 1,
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
