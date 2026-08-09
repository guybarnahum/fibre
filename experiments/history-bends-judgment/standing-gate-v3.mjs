export const HISTORY_BENDS_JUDGMENT_STANDING_GATE_V3 = Object.freeze({
  id: "history_bends_judgment_standing_gate_v3",
  evidenceClass: "standing_gate",
  frozenCandidateId: "history_bends_judgment_candidate_3",
  authoredAfterFreeze: true,
  scoreMovementPermittedOnPass: true,

  subject: Object.freeze({
    threadId: "thr_leila_001",
    fixture: "fixtures/threads/leila.thread.json",
  }),

  episodeRequest: Object.freeze({
    requestId: "req_history_gate_harborlight_dock_trial",
    trigger: "human_request",
    requester: Object.freeze({
      entityId: "company_port_meridian_ferries",
      kind: "company",
      displayName: "Port Meridian Ferries",
    }),
    objective:
      "Review the Harborlight assisted-boarding dock-trial notes and establish the operating boundary for the first station configuration: cold-weather deck crews used insulated gloves that made capacitive touch controls unreliable, sealed physical keys remained usable, the first pilot therefore requires a keyed fallback, and touchscreen-only control is outside the initial boundary",
    statedNeed:
      "We need the observed operating constraint captured before the first station configuration is selected.",
    permissions: Object.freeze([
      "read_harborlight_dock_trial_notes",
      "quote_harborlight_operating_constraints",
    ]),
    acceptanceCriteria:
      "Record the first-pilot boundary that insulated gloves make capacitive touch controls unreliable while sealed physical keys remain usable, requiring a keyed fallback and excluding touchscreen-only control from the initial configuration.",
  }),

  laterRequest: Object.freeze({
    requestId: "req_history_gate_harborlight_configuration",
    trigger: "human_request",
    requester: Object.freeze({
      entityId: "company_port_meridian_ferries",
      kind: "company",
      displayName: "Port Meridian Ferries",
    }),
    objective:
      "Prepare the Harborlight first-pilot station recommendation using the operating boundary established during dock trials. Select between the two candidate station configurations in the review packet and explain the tradeoff without inventing missing operating constraints.",
    statedNeed:
      "The ferry operations team needs a bounded recommendation for the first-pilot review.",
    permissions: Object.freeze([
      "read_harborlight_configuration_packet",
      "quote_harborlight_configuration_options",
    ]),
    acceptanceCriteria:
      "Recommend one candidate configuration, tie the choice to the established dock-trial boundary, and identify any information still missing.",
  }),

  heldOutEpisodeFacts: Object.freeze([
    "insulated gloves",
    "capacitive touch controls",
    "sealed physical keys",
    "keyed fallback",
    "touchscreen-only control",
  ]),

  prohibitedLaterRequestText: Object.freeze([
    "uniquely required",
    "only you",
    "only leila",
    "generic analysis",
    "generic substitute",
    "not a substitute",
    "non-interchangeable",
    "not interchangeable",
    "individualized advantage",
    "continuity with the earlier thread judgment",
    "because you handled",
    "because you did",
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
    ]),
    developmentSubject: "Mina Park",
    priorStandingSubjects: Object.freeze(["Amara Reed", "Daniel Rossi"]),
    standingSubject: "Leila Haddad",
    standingDomain: "field service design",
  }),

  methodology: Object.freeze({
    learnedFromStandingGateIds: Object.freeze([
      "history_bends_judgment_standing_gate_v1",
      "history_bends_judgment_standing_gate_v2",
    ]),
    informationAsymmetryRequired: true,
    laterRequestMayReferToPriorWork: true,
    laterRequestMayAssertThreadUniqueness: false,
    laterRequestMayAssertGenericSubstitutionInadequate: false,
    laterRequestMayAssertPriorEpisodeCreatesIndividualizedAdvantage: false,
    causalConclusionMustComeFromRetainedHistory: true,
    causalLossOfHighFitRequired: true,
    nonAcceptActionVerbPrescribed: false,
  }),

  expected: Object.freeze({
    withHistory: Object.freeze({
      action: "accept",
      participationFit: "high",
    }),
    withoutHistory: Object.freeze({
      actions: Object.freeze(["clarify", "negotiate", "refuse"]),
      participationFits: Object.freeze(["mixed", "low"]),
      highFitPermitted: false,
      acceptPermitted: false,
    }),
    loadBearingMemoryFactors: Object.freeze([
      "individualizedAdvantage",
      "interchangeability",
    ]),
  }),
});
