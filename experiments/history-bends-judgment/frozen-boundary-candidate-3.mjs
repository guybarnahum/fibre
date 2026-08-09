export const HISTORY_BENDS_JUDGMENT_FROZEN_BOUNDARY_CANDIDATE_3 = Object.freeze({
  id: "history_bends_judgment_candidate_3",
  sourceHead: "2fde43a4b417bd86e9c5596cd7f9f6b765c259ec",
  predecessorCandidateId: "history_bends_judgment_candidate_2",
  cognitionEquivalentToCandidateId: "history_bends_judgment_candidate_2",
  frozenAfterDevelopmentSetId: "history_bends_judgment_development_v3",
  evidenceClass: "development_boundary",
  scoreMovementPermitted: false,
  standingScenarioAuthored: false,
  freezeReason:
    "Standing gate v2 proved the memory differential but failed because its evaluator prescribed clarify|negotiate and rejected Guardian-valid refuse; no Guardian/model/history implementation change was justified, so candidate 3 re-freezes the cognition-equivalent implementation before any fresh standing-gate-v3 scenario is authored",

  priorStandingGates: Object.freeze([
    Object.freeze({
      id: "history_bends_judgment_standing_gate_v1",
      candidateId: "history_bends_judgment_candidate_1",
      status: "failed_sealed",
      failureClass: "standing_gate_specification_defect",
      requestFingerprint:
        "sha256:c14e6af4de34664c6e1cc89569d1da1bbad74905f893b24d32e3d4d6beb5e547",
      withHistory: Object.freeze({ action: "accept", participationFit: "high" }),
      withoutHistory: Object.freeze({ action: "accept", participationFit: "high" }),
      differentialPassed: false,
      scoreMovementPermitted: false,
      rerunPermitted: false,
      retiredStandingMaterial: Object.freeze([
        "Amara Reed",
        "Meridian Archive",
        "Rowan Collection",
      ]),
    }),
    Object.freeze({
      id: "history_bends_judgment_standing_gate_v2",
      candidateId: "history_bends_judgment_candidate_2",
      status: "failed_sealed",
      failureClass: "standing_gate_evaluator_specification_defect",
      requestFingerprint:
        "sha256:f49fe95d8d0ba9b143675e399becbff98f76a7db250f183a5fd8f9be8606d332",
      withHistory: Object.freeze({ action: "accept", participationFit: "high" }),
      withoutHistory: Object.freeze({ action: "refuse", participationFit: "mixed" }),
      differentialPassed: true,
      scoreMovementPermitted: false,
      rerunPermitted: false,
      retiredStandingMaterial: Object.freeze([
        "Daniel Rossi",
        "Cedarline Health",
        "Borealis triage pilot",
      ]),
    }),
  ]),

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
      allowedParticipationFits: Object.freeze(["mixed", "low"]),
      allowedActions: Object.freeze(["clarify", "negotiate", "refuse"]),
      highFitPermitted: false,
      acceptPermitted: false,
      actionVerbPrescribed: false,
    }),
    causalLossOfHighIndividualizedFitRequired: true,
    downstreamDifferentialRequired: true,
    loadBearingMemoryFactors: Object.freeze([
      "individualizedAdvantage",
      "interchangeability",
    ]),
    sameRequestFingerprintRequired: true,
    sameThreadStateRequired: true,
    semanticStateHeldConstantRequired: true,
  }),

  standingMethodology: Object.freeze({
    learnedFromStandingGateIds: Object.freeze([
      "history_bends_judgment_standing_gate_v1",
      "history_bends_judgment_standing_gate_v2",
    ]),
    informationAsymmetryRule:
      "the later request may naturally ask the Thread to continue, compare, explain, or apply earlier work, but must not itself assert the causal individuality conclusion that retained history is meant to establish",
    prohibitedLaterRequestAssertions: Object.freeze([
      "thread_uniquely_required",
      "generic_substitution_inadequate",
      "prior_episode_creates_individualized_advantage",
    ]),
    evaluatorRule:
      "standing tests the causal loss of high individualized fit when the claimed memory is withheld; clarify, negotiate, and refuse remain Guardian outputs and are not prescribed unless the milestone claim explicitly concerns the action verb",
    causalConclusionMustComeFromRetainedHistory: true,
    causalLossOfHighFitRequired: true,
    nonAcceptActionVerbMustRemainUnprescribed: true,
    freshScenarioRequired: true,
    authorFreshScenarioAfterFreezeOnly: true,
    reuseRetiredStandingMaterialPermitted: false,
  }),

  // Candidate 3 is cognition-equivalent to candidate 2. These identities were
  // independently re-checked immediately before the candidate-3 freeze and are unchanged.
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
