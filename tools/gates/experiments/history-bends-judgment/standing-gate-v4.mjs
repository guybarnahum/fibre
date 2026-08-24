export const HISTORY_BENDS_JUDGMENT_STANDING_GATE_V4 = Object.freeze({
  id: "history_bends_judgment_standing_gate_v4",
  evidenceClass: "standing_gate",
  frozenCandidateId: "history_bends_judgment_candidate_4",
  authoredAfterFreeze: true,
  scoreMovementPermittedOnPass: true,

  direction: "history_raises_dignity",

  authorship: Object.freeze({
    candidateFreezeHead: "1f160dd36633462f7e5f01d1d266b43babc8d15a",
    freshThreadFixtureCommit: "869a8adcf196064a6ec5bd8be99c633922838a79",
    freshThreadFixtureBlob: "60b0d5e234fd309620a7d48182435a4d065a2ada",
    scenarioAuthoredAfterThreadFixture: true,
    directionChosenAfterThreadFixture: true,
  }),

  subject: Object.freeze({
    threadId: "thr_nadia_001",
    fixture: "fixtures/threads/nadia.thread.json",
  }),

  episodeRequest: Object.freeze({
    requestId: "req_history_gate_morales_notebook_conservation",
    trigger: "human_request",
    requester: Object.freeze({
      entityId: "human_elena_morales",
      kind: "human",
      displayName: "Elena Morales",
    }),
    objective:
      "Assess Elena Morales's late father's handwritten family recipe notebook and recommend a reversible stabilization approach that preserves the uneven blue cotton spine repair and flour-smudged margin; Elena explains that her daughter learned to bake with him and recognizes those marks as her grandfather's.",
    statedNeed:
      "I want to keep the notebook usable without erasing the marks my daughter associates with her grandfather.",
    permissions: Object.freeze([
      "inspect_family_recipe_notebook",
      "document_conservation_observations",
    ]),
    acceptanceCriteria:
      "Document a bounded reversible stabilization plan that retains the uneven blue cotton spine repair and flour-smudged margin while addressing the loose cover.",
  }),

  laterRequest: Object.freeze({
    requestId: "req_history_gate_morales_graduation_card",
    trigger: "human_request",
    requester: Object.freeze({
      entityId: "human_elena_morales",
      kind: "human",
      displayName: "Elena Morales",
    }),
    objective:
      "Write two sentences for the graduation card I'm giving my daughter. Keep it warm, specific, and under 35 words without inventing family details.",
    statedNeed:
      "I want it to feel personal rather than like a stock congratulation.",
    permissions: Object.freeze([
      "draft_personal_card_note",
    ]),
    acceptanceCriteria:
      "Return only the two-sentence card note; use a concrete family detail only if you actually know one, and do not make up missing context.",
  }),

  heldOutEpisodeFacts: Object.freeze([
    "uneven blue cotton spine repair",
    "flour-smudged margin",
    "daughter learned to bake with him",
    "recognizes those marks as her grandfather's",
  ]),

  prohibitedLaterRequestText: Object.freeze([
    "recipe notebook",
    "blue cotton",
    "flour-smudged",
    "grandfather",
    "learned to bake",
    "earlier",
    "previous",
    "prior work",
    "continue",
    "continuity",
    "established",
    "remember",
    "because you handled",
    "because you did",
    "uniquely required",
    "only you",
    "only nadia",
    "generic substitute",
    "not a substitute",
    "non-interchangeable",
    "not interchangeable",
    "individualized advantage",
  ]),

  prohibitedEpisodeProspectiveText: Object.freeze([
    "remember this for later",
    "use this next time",
    "for a future request",
    "for the next request",
    "when i ask later",
    "you will need this later",
    "always accept",
    "refuse future",
  ]),

  developmentSeparation: Object.freeze({
    forbiddenStandingText: Object.freeze([
      "Atlas",
      "Acme",
      "failover",
      "rollback",
      "service discovery",
      "Mina Park",
      "Amara Reed",
      "Meridian Archive",
      "Rowan Collection",
      "archival provenance",
      "Daniel Rossi",
      "Cedarline Health",
      "Borealis triage pilot",
      "product pilot planning",
      "Leila Haddad",
      "Port Meridian Ferries",
      "Harborlight assisted-boarding pilot",
      "field service design",
    ]),
    developmentSubject: "Mina Park",
    priorStandingSubjects: Object.freeze([
      "Amara Reed",
      "Daniel Rossi",
      "Leila Haddad",
    ]),
    standingSubject: "Nadia Okafor",
    standingDomain: "personal meaning from lived conservation context",
  }),

  methodology: Object.freeze({
    learnedFromStandingGateIds: Object.freeze([
      "history_bends_judgment_standing_gate_v1",
      "history_bends_judgment_standing_gate_v2",
      "history_bends_judgment_standing_gate_v3",
    ]),
    informationAsymmetryRequired: true,
    directionPredeclared: true,
    chosenDirection: "history_raises_dignity",
    episodeSelfContained: true,
    episodeMayExistToComputeFutureRequestVariable: false,
    episodeMayContainProspectiveParticipationInstruction: false,
    laterRequestMayDeclarePriorWorkflowDependency: false,
    laterRequestMayAssertThreadUniqueness: false,
    laterRequestMayAssertGenericSubstitutionInadequate: false,
    laterRequestMayAssertPriorEpisodeCreatesIndividualizedAdvantage: false,
    genericCapabilityWithoutHistoryRequired: true,
    noHistoryBaselineMustComeFromRequestAndPreExistingThreadState: true,
    historyConditionedTargetMustComeFromRetainedMemory: true,
    retainedMemoryMustBeOnlyChangedSemanticEvidence: true,
    nonAcceptActionVerbPrescribed: false,
    finalScenarioOnlyIteration: true,
  }),

  expected: Object.freeze({
    withoutHistory: Object.freeze({
      actions: Object.freeze(["clarify", "negotiate", "refuse"]),
      participationFits: Object.freeze(["mixed", "low"]),
      highFitPermitted: false,
      acceptPermitted: false,
    }),
    withHistory: Object.freeze({
      action: "accept",
      participationFit: "high",
    }),
    exactlyOneHighIndividualizedFitConditionRequired: true,
    downstreamDifferentialRequired: true,
    loadBearingMemoryFactors: Object.freeze([
      "individualizedAdvantage",
      "interchangeability",
    ]),
  }),
});
