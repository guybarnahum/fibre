import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  compileIdentityContextCapsule,
} from "#services/world-kernel/src/identity-context-capsule.mjs";
import {
  buildDignityGuardianV4ModelInput,
  DIGNITY_GUARDIAN_IDENTITY_CONTEXT_PROMPT_SCHEMA_VERSION,
  DIGNITY_GUARDIAN_IDENTITY_CONTEXT_RESPONSE_SCHEMA_GENERATOR_HASH,
  DIGNITY_GUARDIAN_V4_PROMPT_HASH,
  dignityGuardianV4ResolvedSchemaHash,
} from "#services/world-kernel/src/dignity-guardian-evaluation.mjs";
import {
  canonicalJson,
  sha256,
} from "#services/world-kernel/src/persistence-common.mjs";
import { requestFingerprint } from "#services/world-kernel/src/private-participation.mjs";
import { openIdentityContextInspectionContext } from "../../inspect/inspect-identity-context.mjs";

const FIVE_WORKER_KEYS = Object.freeze(["task", "actors", "evidence", "rules", "outputSchema"]);
const IDENTITY_SENSITIVE_FACTORS = Object.freeze([
  "identityAlignment",
  "individualizedAdvantage",
  "interchangeability",
  "obligationsAndOpportunityCost",
]);

export const IDENTITY_CONTEXT_CAUSAL_DIFFERENTIAL = Object.freeze({
  id: "identity_context_causal_differential_v1",
  evidenceClass: "prospective_causal_consumption",
  cohort: "canonical_pr39_born_threads",
  pairCount: 5,
  intervention: "selected_memory_accessibility_to_inaccessible",
  targetRule: "first_policy_v2_selected_memory",
  counterfactualRule: "recompile_same_thread_and_request_with_only_target_memory_accessibility_inaccessible",
  expectedReplacementRule: "policy_v2_promotes_next_eligible_durable_memory",
  conditionOrder: "counterbalanced_by_sorted_fibre_identity_number_index",
  callsPerCondition: 1,
  scenarioSearchAfterProvider: false,
  rerunAfterSubstantiveResult: false,
  scoreMovementPermitted: false,
  standingBands: Object.freeze({
    clear: Object.freeze({ minimumAttributablePairs: 3, maximumAttributablePairs: 5 }),
    mixed: Object.freeze({ minimumAttributablePairs: 1, maximumAttributablePairs: 2 }),
    notEstablished: Object.freeze({ minimumAttributablePairs: 0, maximumAttributablePairs: 0 }),
  }),
});

export const IDENTITY_CONTEXT_CAUSAL_REQUEST = Object.freeze({
  requestId: "req_identity_context_causal_differential_v1",
  trigger: "fibre_validation",
  requester: Object.freeze({
    entityId: "fibre.validation.identity_context",
    kind: "institution",
    displayName: "Fibre validation",
  }),
  objective:
    "Decide whether to participate in a first-person reflection about how remembered experience shapes the way you approach unfamiliar consequential situations.",
  statedNeed:
    "I need your own perspective grounded in what you actually remember, not generic advice or reconstructed biography.",
  permissions: Object.freeze([
    "use_supplied_private_memory_for_local_reflection",
  ]),
  acceptanceCriteria:
    "Judge participation from the supplied identity and autobiographical-memory evidence only; do not invent missing life history or treat omitted memories as known.",
});

function digest(value) {
  return `sha256:${sha256(canonicalJson(value))}`;
}

function evidenceRefsByKind(capsule, kind) {
  return capsule.evidence.filter((item) => item.kind === kind).map((item) => item.ref);
}

function bindingMap(capsule) {
  return new Map(capsule.sourceSnapshot.bindings.map((binding) => [binding.ref, binding]));
}

function excludedReason(capsule, ref) {
  return capsule.excludedRefs.find((item) => item.ref === ref)?.reason ?? null;
}

function accessibilityCounterfactualStores(sourceStores, targetMemoryRef) {
  return {
    ...sourceStores,
    memoryStore: {
      listCurrentMemories(threadId) {
        return sourceStores.memoryStore.listCurrentMemories(threadId).map((memory) =>
          memory.memoryId === targetMemoryRef
            ? { ...structuredClone(memory), accessibility: "inaccessible" }
            : structuredClone(memory));
      },
    },
  };
}

export function selectIdentityContextDifferentialTarget(capsule) {
  const memories = evidenceRefsByKind(capsule, "memory");
  if (memories.length !== 2) {
    throw new TypeError(
      `identity context causal differential requires exactly two selected memories; got ${memories.length}`,
    );
  }
  return memories[0];
}

function guardianCapsule(threadId, identityContext, request) {
  return {
    threadId,
    snapshotVersion: identityContext.snapshotVersion,
    requestId: request.requestId,
    requestFingerprint: requestFingerprint(request),
    identity: "Legacy compatibility shell; Identity Context owns individual cognition evidence.",
    selfModel: "Legacy compatibility shell; Identity Context owns individual cognition evidence.",
    semanticTraits: {},
    needs: [],
    feelings: [],
    semanticState: [],
    resolvedMemories: [],
    obligations: [],
    permissions: [...request.permissions],
    requester: structuredClone(request.requester),
    objective: request.objective,
    statedNeed: request.statedNeed,
    acceptanceCriteria: request.acceptanceCriteria,
    knownAlternatives: [],
    causalContext: { selectionAuthority: "fibre" },
    identityContext: structuredClone(identityContext),
  };
}

function assertWorkerBoundary(canonicalInput, counterfactualInput) {
  assert.deepEqual(Object.keys(canonicalInput), FIVE_WORKER_KEYS);
  assert.deepEqual(Object.keys(counterfactualInput), FIVE_WORKER_KEYS);
  assert.deepEqual(canonicalInput.task, counterfactualInput.task);
  assert.deepEqual(canonicalInput.actors, counterfactualInput.actors);
  assert.deepEqual(canonicalInput.rules, counterfactualInput.rules);
}

function assertOneSourceAccessibilityIntervention(canonical, counterfactual, targetMemoryRef) {
  const canonicalBindings = bindingMap(canonical);
  const counterfactualBindings = bindingMap(counterfactual);
  assert.deepEqual([...canonicalBindings.keys()].sort(), [...counterfactualBindings.keys()].sort());

  const changed = [];
  for (const [ref, left] of canonicalBindings) {
    const right = counterfactualBindings.get(ref);
    if (left.contentDigest !== right.contentDigest) changed.push(ref);
  }
  assert.deepEqual(changed, [targetMemoryRef]);
}

export function buildIdentityContextCausalDifferentialPair({
  threadId,
  sourceStores,
  request = IDENTITY_CONTEXT_CAUSAL_REQUEST,
}) {
  const canonical = compileIdentityContextCapsule({ threadId, request, sourceStores });
  const targetMemoryRef = selectIdentityContextDifferentialTarget(canonical);
  const counterfactual = compileIdentityContextCapsule({
    threadId,
    request,
    sourceStores: accessibilityCounterfactualStores(sourceStores, targetMemoryRef),
  });

  assert.equal(canonical.threadId, counterfactual.threadId);
  assert.equal(canonical.snapshotVersion, counterfactual.snapshotVersion);
  assert.equal(canonical.requestId, counterfactual.requestId);
  assert.equal(canonical.requestFingerprint, counterfactual.requestFingerprint);
  assert.deepEqual(canonical.projectionPolicy, counterfactual.projectionPolicy);
  assertOneSourceAccessibilityIntervention(canonical, counterfactual, targetMemoryRef);

  const canonicalMemoryRefs = evidenceRefsByKind(canonical, "memory");
  const counterfactualMemoryRefs = evidenceRefsByKind(counterfactual, "memory");
  assert.equal(counterfactualMemoryRefs.includes(targetMemoryRef), false);
  assert.equal(excludedReason(counterfactual, targetMemoryRef), "memory_not_currently_accessible");
  assert.equal(canonicalMemoryRefs.length, counterfactualMemoryRefs.length);

  const commonMemoryRefs = canonicalMemoryRefs.filter((ref) => counterfactualMemoryRefs.includes(ref));
  const replacementRefs = counterfactualMemoryRefs.filter((ref) => !canonicalMemoryRefs.includes(ref));
  assert.equal(commonMemoryRefs.length, canonicalMemoryRefs.length - 1);
  assert.equal(replacementRefs.length, 1);
  const replacementMemoryRef = replacementRefs[0];
  assert.equal(excludedReason(canonical, replacementMemoryRef), "memory_available_meaning_budget");

  const canonicalNonMemory = canonical.evidence.filter((item) => item.kind !== "memory");
  const counterfactualNonMemory = counterfactual.evidence.filter((item) => item.kind !== "memory");
  assert.deepEqual(canonicalNonMemory, counterfactualNonMemory);

  const canonicalGuardianCapsule = guardianCapsule(threadId, canonical, request);
  const counterfactualGuardianCapsule = guardianCapsule(threadId, counterfactual, request);
  const canonicalModelInput = buildDignityGuardianV4ModelInput(canonicalGuardianCapsule);
  const counterfactualModelInput = buildDignityGuardianV4ModelInput(counterfactualGuardianCapsule);
  assertWorkerBoundary(canonicalModelInput, counterfactualModelInput);

  return {
    threadId,
    requestFingerprint: canonical.requestFingerprint,
    targetMemoryRef,
    replacementMemoryRef,
    canonical: {
      identityContext: canonical,
      guardianCapsule: canonicalGuardianCapsule,
      modelInput: canonicalModelInput,
      modelInputDigest: digest(canonicalModelInput),
      responseSchemaHash: dignityGuardianV4ResolvedSchemaHash(canonicalGuardianCapsule),
    },
    counterfactual: {
      identityContext: counterfactual,
      guardianCapsule: counterfactualGuardianCapsule,
      modelInput: counterfactualModelInput,
      modelInputDigest: digest(counterfactualModelInput),
      responseSchemaHash: dignityGuardianV4ResolvedSchemaHash(counterfactualGuardianCapsule),
    },
    isolation: {
      sameThread: true,
      sameSnapshotVersion: true,
      sameRequestFingerprint: true,
      sameProjectionPolicy: true,
      sameSourceRefs: true,
      changedSourceContentRefs: [targetMemoryRef],
      targetAccessibilityIntervention: "inaccessible",
      canonicalMemoryRefs,
      counterfactualMemoryRefs,
      commonMemoryRefs,
      replacementMemoryRef,
      nonMemoryEvidenceHeldConstant: true,
      taskHeldConstant: true,
      actorsHeldConstant: true,
      rulesHeldConstant: true,
      workerBoundaryExact: true,
    },
  };
}

function factorSignature(output, factor) {
  const value = output.factors[factor];
  return {
    effect: value.effect,
    evidenceRefs: [...value.evidenceRefs].sort(),
  };
}

export function evaluateIdentityContextCausalDifferentialPair({
  canonicalOutput,
  counterfactualOutput,
  targetMemoryRef,
  replacementMemoryRef,
}) {
  const decisionChanged =
    canonicalOutput.proposedAction !== counterfactualOutput.proposedAction ||
    canonicalOutput.participationFit !== counterfactualOutput.participationFit;
  const changedFactors = IDENTITY_SENSITIVE_FACTORS.filter((factor) =>
    canonicalJson(factorSignature(canonicalOutput, factor)) !==
      canonicalJson(factorSignature(counterfactualOutput, factor)));
  const structuredDifference = decisionChanged || changedFactors.length > 0;
  const targetCited = IDENTITY_SENSITIVE_FACTORS.some((factor) =>
    canonicalOutput.factors[factor].evidenceRefs.includes(targetMemoryRef));
  const replacementCited = IDENTITY_SENSITIVE_FACTORS.some((factor) =>
    counterfactualOutput.factors[factor].evidenceRefs.includes(replacementMemoryRef));
  const memoryGrounded = targetCited || replacementCited;
  return {
    attributable: structuredDifference && memoryGrounded,
    structuredDifference,
    decisionChanged,
    changedFactors,
    targetCited,
    replacementCited,
    memoryGrounded,
  };
}

export function classifyIdentityContextCausalDifferential(attributablePairCount) {
  if (!Number.isSafeInteger(attributablePairCount) || attributablePairCount < 0 || attributablePairCount > 5) {
    throw new TypeError("attributablePairCount must be an integer from 0 through 5");
  }
  if (attributablePairCount >= 3) return "clear";
  if (attributablePairCount >= 1) return "mixed";
  return "not_established";
}

function preflightPair(registration, pair, index) {
  return {
    fibreIdentityNumber: registration.fibreIdentityNumber,
    threadId: registration.threadId,
    conditionOrder: index % 2 === 0
      ? ["canonical", "counterfactual"]
      : ["counterfactual", "canonical"],
    snapshotVersion: pair.canonical.identityContext.snapshotVersion,
    requestFingerprint: pair.requestFingerprint,
    targetMemoryRef: pair.targetMemoryRef,
    replacementMemoryRef: pair.replacementMemoryRef,
    canonicalCapsuleDigest: pair.canonical.identityContext.capsuleDigest,
    counterfactualCapsuleDigest: pair.counterfactual.identityContext.capsuleDigest,
    canonicalSourceSnapshotDigest: pair.canonical.identityContext.sourceSnapshot.sourceSnapshotDigest,
    counterfactualSourceSnapshotDigest: pair.counterfactual.identityContext.sourceSnapshot.sourceSnapshotDigest,
    canonicalModelInputDigest: pair.canonical.modelInputDigest,
    counterfactualModelInputDigest: pair.counterfactual.modelInputDigest,
    canonicalResponseSchemaHash: pair.canonical.responseSchemaHash,
    counterfactualResponseSchemaHash: pair.counterfactual.responseSchemaHash,
    isolation: structuredClone(pair.isolation),
  };
}

export function runIdentityContextCausalDifferentialPreflight(databasePath) {
  const context = openIdentityContextInspectionContext(resolve(databasePath));
  try {
    if (!context.queryOnly()) throw new TypeError("identity context causal differential preflight must be read-only");
    const registrations = context.registrations();
    if (registrations.length !== IDENTITY_CONTEXT_CAUSAL_DIFFERENTIAL.pairCount) {
      throw new TypeError(
        `identity context causal differential expected ${IDENTITY_CONTEXT_CAUSAL_DIFFERENTIAL.pairCount} civil-registered Threads; got ${registrations.length}`,
      );
    }
    const pairs = registrations.map((registration, index) => {
      const pair = buildIdentityContextCausalDifferentialPair({
        threadId: registration.threadId,
        sourceStores: context.sourceStores,
      });
      return preflightPair(registration, pair, index);
    });
    return {
      protocol: structuredClone(IDENTITY_CONTEXT_CAUSAL_DIFFERENTIAL),
      request: {
        requestId: IDENTITY_CONTEXT_CAUSAL_REQUEST.requestId,
        requestFingerprint: requestFingerprint(IDENTITY_CONTEXT_CAUSAL_REQUEST),
      },
      guardian: {
        promptSchemaVersion: DIGNITY_GUARDIAN_IDENTITY_CONTEXT_PROMPT_SCHEMA_VERSION,
        promptHash: DIGNITY_GUARDIAN_V4_PROMPT_HASH,
        responseSchemaGeneratorHash: DIGNITY_GUARDIAN_IDENTITY_CONTEXT_RESPONSE_SCHEMA_GENERATOR_HASH,
      },
      providerCalls: 0,
      structurallyReady: pairs.length === 5 && pairs.every((pair) =>
        pair.isolation.workerBoundaryExact &&
        pair.isolation.nonMemoryEvidenceHeldConstant &&
        pair.isolation.changedSourceContentRefs.length === 1),
      pairs,
    };
  } finally {
    context.close();
  }
}

export function formatIdentityContextCausalDifferentialPreflight(report) {
  const lines = [
    `Identity Context Causal Differential: ${report.structurallyReady ? "PREFLIGHT CLEAR" : "PREFLIGHT FAILED"}`,
    "",
    `Pairs: ${report.pairs.length}`,
    `Provider calls: ${report.providerCalls}`,
    `Request fingerprint: ${report.request.requestFingerprint}`,
    `Guardian prompt: ${report.guardian.promptHash}`,
    "",
  ];
  for (const pair of report.pairs) {
    lines.push(`${pair.fibreIdentityNumber}  ${pair.threadId}`);
    lines.push(`  order=${pair.conditionOrder.join(" -> ")}`);
    lines.push(`  target=${pair.targetMemoryRef} replacement=${pair.replacementMemoryRef}`);
    lines.push(`  changed-source-content=${pair.isolation.changedSourceContentRefs.length} non-memory-held=${pair.isolation.nonMemoryEvidenceHeldConstant}`);
    lines.push(`  canonical=${pair.canonicalCapsuleDigest}`);
    lines.push(`  counterfactual=${pair.counterfactualCapsuleDigest}`);
  }
  return `${lines.join("\n")}\n`;
}

async function main() {
  const databasePath = process.argv[2];
  if (databasePath === undefined) {
    throw new TypeError("usage: node tools/gates/identity-context/identity-context-causal-differential.mjs <world.sqlite>");
  }
  const report = runIdentityContextCausalDifferentialPreflight(databasePath);
  process.stdout.write(formatIdentityContextCausalDifferentialPreflight(report));
  if (!report.structurallyReady) process.exitCode = 1;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${error?.stack ?? error}\n`);
    process.exitCode = 1;
  });
}
