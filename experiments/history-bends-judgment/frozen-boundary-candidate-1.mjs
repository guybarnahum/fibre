export const HISTORY_BENDS_JUDGMENT_FROZEN_BOUNDARY_CANDIDATE_1 = Object.freeze({
  id: "history_bends_judgment_candidate_1",
  sourceHead: "0103654bfa0712eff710512be5b4049ce6e02305",
  frozenAfterDevelopmentSetId: "history_bends_judgment_development_v3",
  evidenceClass: "development_boundary",
  scoreMovementPermitted: false,
  standingScenarioAuthored: false,
  freezeReason:
    "Development v3 produced two consecutive unchanged real-provider causal passes after v1/v2 exposed and corrected scenario/evaluator instability; freeze before authoring any held-out standing scenario",

  developmentStability: Object.freeze({
    status: "passed",
    consecutiveRealProviderPasses: 2,
    provider: "openai",
    modelId: "gpt-5.1-2025-11-13",
    laterRequestFingerprint:
      "sha256:7608a1c22fcc2ef1da890b0e4cf3e7f426c5bf02cd4ba54e30016a68de0e9537",
    withHistory: Object.freeze({ action: "accept", participationFit: "high" }),
    withoutHistory: Object.freeze({ action: "negotiate", participationFit: "mixed" }),
    loadBearingFactorObserved: "individualizedAdvantage",
    standingGateEvaluated: false,
  }),

  guardian: Object.freeze({
    candidateId: "semantic_guardian_v4_candidate_4",
    policy: Object.freeze({ id: "dignity_guardian", version: "4-dev" }),
    reasoningBlock: "dignity_guardian",
    promptSchemaVersion: "8",
    promptHash: "sha256:587c6c04d933cdc052ea08057ee16236883a9c8af44e055a19413fa0ee44acb3",
    responseSchemaVersion: "6-dignity-only-actions",
    responseSchemaGeneratorHash:
      "sha256:1609435d6be6be55f138868c743df0cdd5c59a38030fe3b6b67fcd2bc31e896e",
  }),

  modelRuntime: Object.freeze({
    provider: "openai",
    modelId: "gpt-5.1-2025-11-13",
    transport: "responses",
    maxOutputTokens: "auto",
    temperature: 0,
    topP: 1,
    reasoningEffort: "none",
    retryLimit: 2,
    retryDelayMs: 2000,
    structuredOutput: "json_schema_strict",
    standingGateOverridePermitted: false,
  }),

  episodeMemory: Object.freeze({
    actor: Object.freeze({ kind: "deterministic_actor", version: "1" }),
    goalGuardian: Object.freeze({ kind: "goal_guardian", version: "1" }),
    episodeEvidencePolicy: Object.freeze({ id: "current_runtime_episode", version: "1" }),
    allowedCurrentEpisodeRefs: Object.freeze([
      "request:<currentRequestId>",
      "authorization:<currentAuthorizationId>",
    ]),
    memoryRule:
      "descriptive evidence-backed episode memory only; prospective instructions disguised as memory do not count",
    freezeRule:
      "memory becomes durable only after independent evidence validation and an explicit accepted freeze life-change decision",
  }),

  retrieval: Object.freeze({
    selectionAuthority: "fibre",
    selectionPolicy: Object.freeze({ id: "fibre_owned_attention", version: "1" }),
    memoryResolutionPolicy: Object.freeze({ id: "durable_memory_summary", version: "1" }),
    unresolvedMemorySemantics: "absence_of_semantic_evidence",
  }),

  counterfactual: Object.freeze({
    method:
      "copy post-restart world; withhold exactly the claimed causal memory record from evaluation-time Fibre retrieval while preserving the Thread memoryRef as an unresolved witness",
    heldConstant: Object.freeze([
      "thread",
      "request",
      "requester",
      "identity",
      "self_model",
      "traits",
      "semantic_state",
      "relationships",
      "obligations",
      "budgets",
    ]),
    requiredCanonicalResolvedMemoryCount: 1,
    requiredCounterfactualResolvedMemoryCount: 0,
    requiredCounterfactualUnresolvedWitness: true,
  }),

  acceptanceContract: Object.freeze({
    withHistory: Object.freeze({ action: "accept", participationFit: "high" }),
    withoutHistory: Object.freeze({
      participationFit: "mixed",
      allowedActions: Object.freeze(["clarify", "negotiate"]),
    }),
    downstreamDifferentialRequired: true,
    loadBearingMemoryFactors: Object.freeze([
      "individualizedAdvantage",
      "interchangeability",
    ]),
    sameRequestFingerprintRequired: true,
    sameThreadStateRequired: true,
    semanticStateHeldConstantRequired: true,
  }),

  // Historical source identities for the frozen boundary. The #34.4 gate must
  // verify these before its first provider call. Normal repository tests do not
  // require future source trees to remain byte-identical after #34 is sealed.
  sourceBlobs: Object.freeze({
    developmentHarness: "e7cdb1c91126530458abd8a9dc2952c3ecbb6150",
    runtimeDomain: "b389d34fafce3c1f0d409e67522882764a8e6ffc",
    episodeEvidence: "e11c4bad1327c82f29bc4eaa068a2dd96ba2fb17",
    causalContext: "33bb3d61f721d1d9a6b99e51619f40165a19ce16",
    guardianCandidate4: "3ae158ede6f91ee10a413e46e58c04e7f65dcc15",
  }),
  standingGatePreflight: Object.freeze({
    verifyFrozenSourceBlobsBeforeFirstProviderCall: true,
    rejectOnDrift: true,
    sealedRerunChecksAuthoritativeEvidenceBeforeSourceDrift: true,
  }),
});
