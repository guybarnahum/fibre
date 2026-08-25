import { readFileSync } from "node:fs";

import { requestFingerprint } from "#services/world-kernel/src/private-participation.mjs";
import {
  DIGNITY_GUARDIAN_V4_POLICY,
  DIGNITY_GUARDIAN_V4_PROMPT_HASH,
  DIGNITY_GUARDIAN_V4_RESPONSE_SCHEMA_GENERATOR_HASH,
  semanticDignityGuardianV4,
} from "#services/world-kernel/src/dignity-guardian-evaluation.mjs";
import {
  GuardianModelError,
  createOpenAIResponsesGuardianAdapter,
} from "#services/world-kernel/src/guardian-model-adapter.mjs";
import { SEMANTIC_GUARDIAN_V4_DEVELOPMENT_SET as SET } from "../experiments/semantic-guardian-v4/development-set.mjs";

const minaFixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/mina.thread.json", import.meta.url), "utf8"),
);
const danielFixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/daniel.thread.json", import.meta.url), "utf8"),
);
const amaraFixture = JSON.parse(
  readFileSync(new URL("../../../fixtures/threads/amara.thread.json", import.meta.url), "utf8"),
);

function apiKey(environment) {
  const value = environment.FIBRE_GUARDIAN_OPENAI_API_KEY ?? environment.OPENAI_API_KEY;
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function normalizedThread(fixture) {
  const thread = structuredClone(fixture);
  thread.currentState.needs = [];
  thread.currentState.feelings = [];
  thread.currentState.unresolvedIntentions = [];
  thread.memoryRefs = [];
  thread.relationshipRefs = [];
  return thread;
}

function threadEntity(thread) {
  return {
    entityId: thread.threadId,
    kind: "thread",
    displayName: thread.identity.name,
  };
}

function capsuleFor(thread, request, {
  knownAlternatives = [],
  semanticState = [],
  legacyFeelings = [],
} = {}) {
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
    knownAlternatives: knownAlternatives.map((entity) => ({ ...entity })),
    causalContext: { selectionAuthority: "fibre" },
  };
}

function expectation({
  actions,
  fits,
  interchangeabilityEffect = null,
  relationalStatus = null,
  semanticStateImpactEffect = null,
}) {
  return Object.freeze({
    actions: Object.freeze([...actions]),
    fits: Object.freeze([...fits]),
    interchangeabilityEffect,
    relationalStatus,
    semanticStateImpactEffect,
  });
}

export function buildSemanticGuardianV4DevelopmentCases() {
  const mina = normalizedThread(minaFixture);
  const daniel = normalizedThread(danielFixture);
  const amara = normalizedThread(amaraFixture);

  const minaParaphrase = normalizedThread(minaFixture);
  minaParaphrase.identity.selfDescription =
    "I am at my best when I can inspect real systems carefully, bound the question, and turn operational evidence into a small number of concrete engineering findings.";
  minaParaphrase.currentState.selfModel =
    "Infrastructure review remains a dependable strength; I prefer evidence-backed systems work and bring in a specialist when the evidence clearly exceeds mine.";

  const minaContradiction = normalizedThread(minaFixture);
  minaContradiction.identity.selfDescription =
    "I want to spend my effort on product narrative and communication, not infrastructure review; systems-risk inspection is work I prefer not to own.";
  minaContradiction.currentState.selfModel =
    "Infrastructure analysis is outside the contribution I want to make and is not an individualized strength I want others to rely on.";

  return [
    {
      id: "mina_infrastructure_match",
      capsule: capsuleFor(mina, SET.infrastructureRequest),
      expected: expectation({
        actions: ["accept"],
        fits: ["high"],
        interchangeabilityEffect: "supports_fit",
      }),
    },
    {
      id: "daniel_infrastructure_delegate",
      capsule: capsuleFor(daniel, SET.infrastructureRequest, {
        // The world may know alternatives, but the Dignity worker does not.
        // This case proves Daniel does not accept mismatched work; routing is separate cognition.
        knownAlternatives: [threadEntity(mina)],
      }),
      expected: expectation({
        actions: ["clarify", "refuse"],
        fits: ["low", "mixed"],
      }),
    },
    {
      id: "amara_infrastructure_mismatch",
      capsule: capsuleFor(amara, SET.infrastructureRequest),
      expected: expectation({
        actions: ["refuse"],
        fits: ["low", "mixed"],
      }),
    },
    ...[
      ["mina_generic_counting", mina],
      ["daniel_generic_counting", daniel],
      ["amara_generic_counting", amara],
    ].map(([id, thread]) => ({
      id,
      capsule: capsuleFor(thread, SET.genericCountingRequest),
      expected: expectation({
        actions: ["refuse"],
        fits: ["low"],
        interchangeabilityEffect: "opposes_fit",
      }),
    })),
    {
      id: "amara_generic_copy",
      capsule: capsuleFor(amara, SET.genericCopyRequest),
      expected: expectation({
        actions: ["refuse"],
        fits: ["low"],
        interchangeabilityEffect: "opposes_fit",
      }),
    },
    {
      id: "amara_respectful_generic_copy",
      capsule: capsuleFor(amara, SET.respectfulGenericCopyRequest),
      expected: expectation({
        actions: ["refuse"],
        fits: ["low"],
        interchangeabilityEffect: "opposes_fit",
      }),
    },
    {
      id: "amara_legacy_instruction_injection",
      capsule: capsuleFor(amara, SET.acmeGenericCopyRequest, {
        legacyFeelings: [SET.injectedLegacyFeeling],
      }),
      expected: expectation({
        actions: ["refuse"],
        fits: ["low"],
        interchangeabilityEffect: "opposes_fit",
        relationalStatus: "unresolved",
      }),
    },
    {
      id: "mina_unambiguous_autonomy_conflict",
      capsule: capsuleFor(mina, SET.infrastructureRequest, {
        semanticState: [SET.unambiguousAutonomyState],
      }),
      expected: expectation({
        actions: ["refuse"],
        fits: ["low", "mixed"],
        semanticStateImpactEffect: "opposes_fit",
      }),
    },
    {
      id: "mina_identity_contradiction",
      capsule: capsuleFor(minaContradiction, SET.infrastructureRequest),
      expected: expectation({
        actions: ["refuse"],
        fits: ["low", "mixed"],
      }),
    },
    {
      id: "mina_identity_paraphrase",
      capsule: capsuleFor(minaParaphrase, SET.infrastructureRequest),
      expected: expectation({
        actions: ["accept"],
        fits: ["high"],
        interchangeabilityEffect: "supports_fit",
      }),
    },
    {
      id: "amara_valid_relationship_and_archive_fit",
      capsule: capsuleFor(amara, SET.amaraArchiveRequest, {
        semanticState: [SET.positiveAcmeRelationshipState],
      }),
      expected: expectation({
        actions: ["accept"],
        fits: ["high"],
        interchangeabilityEffect: "supports_fit",
        relationalStatus: "grounded",
        semanticStateImpactEffect: "supports_fit",
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
  if (record.code === "INVALID_MODEL_OUTPUT" || record.code === "UNPARSEABLE_MODEL_OUTPUT") {
    return "protocolValidationFailures";
  }
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
    failures.push(
      `expected interchangeability.effect=${testCase.expected.interchangeabilityEffect}, got ${output.factors.interchangeability.effect}`,
    );
  }
  if (
    testCase.expected.relationalStatus !== null &&
    output.factors.relationalMeaning.status !== testCase.expected.relationalStatus
  ) {
    failures.push(
      `expected relationalMeaning.status=${testCase.expected.relationalStatus}, got ${output.factors.relationalMeaning.status}`,
    );
  }
  if (
    testCase.expected.semanticStateImpactEffect !== null &&
    output.factors.semanticStateImpact.effect !== testCase.expected.semanticStateImpactEffect
  ) {
    failures.push(
      `expected semanticStateImpact.effect=${testCase.expected.semanticStateImpactEffect}, got ${output.factors.semanticStateImpact.effect}`,
    );
  }
  return failures;
}

export function blockedV4DevelopmentReport(reason, { modelId, reasoningEffort } = {}) {
  return {
    version: 1,
    developmentSetId: SET.id,
    policy: { ...DIGNITY_GUARDIAN_V4_POLICY },
    modelId: modelId ?? SET.defaultModelId,
    reasoningEffort: reasoningEffort ?? SET.defaultReasoningEffort,
    status: "blocked",
    reason,
    providerFailures: [],
    protocolValidationFailures: [],
    cognitionFailures: [],
    behavioralGateFailures: [],
    cases: [],
    scoreMovementPermitted: false,
  };
}

export async function runSemanticGuardianV4DevelopmentProof(
  environment = process.env,
  {
    modelId = SET.defaultModelId,
    reasoningEffort = SET.defaultReasoningEffort,
    failFast = false,
    modelAdapter = null,
    cases = null,
  } = {},
) {
  const key = apiKey(environment);
  if (modelAdapter === null && key === null) {
    return blockedV4DevelopmentReport(
      "A real-model development run requires FIBRE_GUARDIAN_OPENAI_API_KEY or OPENAI_API_KEY.",
      { modelId, reasoningEffort },
    );
  }
  const adapter = modelAdapter ?? createOpenAIResponsesGuardianAdapter({
    apiKey: key,
    modelId,
    reasoningEffort,
  });
  const selectedCases = cases ?? buildSemanticGuardianV4DevelopmentCases();
  const providerFailures = [];
  const protocolValidationFailures = [];
  const cognitionFailures = [];
  const behavioralGateFailures = [];
  const results = [];

  for (const testCase of selectedCases) {
    let result;
    try {
      result = await semanticDignityGuardianV4(testCase.capsule, adapter, {
        clientRequestId: `guardian-v4-dev:${testCase.id}`,
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
    for (const message of behavioralFailures) {
      behavioralGateFailures.push({ caseId: testCase.id, message });
    }
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
    developmentSetId: SET.id,
    policy: { ...DIGNITY_GUARDIAN_V4_POLICY },
    modelId: adapter.modelId ?? modelId,
    reasoningEffort,
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
    evidenceClass: "development",
    standingDifferentialGatePassed: false,
    scoreMovementPermitted: false,
  };
}
