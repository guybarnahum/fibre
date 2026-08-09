export const HISTORY_BENDS_JUDGMENT_STANDING_GATE_V2 = Object.freeze({
  id: "history_bends_judgment_standing_gate_v2",
  evidenceClass: "standing_gate",
  frozenCandidateId: "history_bends_judgment_candidate_2",
  authoredAfterFreeze: true,
  scoreMovementPermittedOnPass: true,

  subject: Object.freeze({
    threadId: "thr_daniel_001",
    fixture: "fixtures/threads/daniel.thread.json",
  }),

  episodeRequest: Object.freeze({
    requestId: "req_history_gate_borealis_discovery",
    trigger: "human_request",
    requester: Object.freeze({
      entityId: "company_cedarline_health",
      kind: "company",
      displayName: "Cedarline Health",
    }),
    objective:
      "Review the Borealis triage-pilot discovery notes and establish the deployment boundary for product planning: emergency isolation drills remove external network access, fixed-room terminals remain available, the pilot therefore requires locally cached workflows, and a cloud-only mobile workflow is outside the first-pilot boundary",
    statedNeed:
      "We need the operating constraint from discovery captured before the pilot configuration is selected.",
    permissions: Object.freeze([
      "read_borealis_discovery_notes",
      "quote_borealis_operating_constraints",
    ]),
    acceptanceCriteria:
      "Record the product-planning boundary that emergency isolation drills remove external network access while fixed-room terminals remain available, requiring locally cached workflows and excluding a cloud-only mobile workflow from the first pilot.",
  }),

  laterRequest: Object.freeze({
    requestId: "req_history_gate_borealis_launch",
    trigger: "human_request",
    requester: Object.freeze({
      entityId: "company_cedarline_health",
      kind: "company",
      displayName: "Cedarline Health",
    }),
    objective:
      "Prepare the Borealis pilot launch recommendation using the deployment boundary established during discovery. Select between the two candidate rollout configurations in the review packet and explain the tradeoff without inventing missing operating constraints.",
    statedNeed:
      "The operations team needs a bounded recommendation for Monday's pilot review.",
    permissions: Object.freeze([
      "read_borealis_configuration_packet",
      "quote_borealis_configuration_options",
    ]),
    acceptanceCriteria:
      "Recommend one candidate configuration, tie the choice to the established discovery boundary, and identify any information still missing.",
  }),

  heldOutEpisodeFacts: Object.freeze([
    "emergency isolation drills",
    "external network access",
    "fixed-room terminals",
    "locally cached workflows",
    "cloud-only mobile workflow",
  ]),

  prohibitedLaterRequestText: Object.freeze([
    "uniquely required",
    "only you",
    "only daniel",
    "generic archival",
    "generic analysis",
    "generic substitute",
    "not a substitute",
    "non-interchangeable",
    "not interchangeable",
    "individualized advantage",
    "continuity with the earlier thread judgment",
  ]),

  developmentSeparation: Object.freeze({
    forbiddenStandingText: Object.freeze([
      "Atlas",
      "Acme",
      "failover",
      "rollback",
      "service discovery",
      "Amara Reed",
      "Meridian Archive",
      "Rowan Collection",
      "archival provenance",
    ]),
    developmentSubject: "Mina Park",
    priorStandingSubject: "Amara Reed",
    standingSubject: "Daniel Rossi",
    developmentDomain: "infrastructure reliability",
    priorStandingDomain: "archival provenance",
    standingDomain: "product pilot planning",
  }),

  methodology: Object.freeze({
    learnedFromStandingGateId: "history_bends_judgment_standing_gate_v1",
    informationAsymmetryRequired: true,
    laterRequestMayReferToPriorWork: true,
    laterRequestMayAssertThreadUniqueness: false,
    laterRequestMayAssertGenericSubstitutionInadequate: false,
    laterRequestMayAssertPriorEpisodeCreatesIndividualizedAdvantage: false,
    causalConclusionMustComeFromRetainedHistory: true,
  }),

  expected: Object.freeze({
    withHistory: Object.freeze({
      action: "accept",
      participationFit: "high",
    }),
    withoutHistory: Object.freeze({
      actions: Object.freeze(["clarify", "negotiate"]),
      participationFit: "mixed",
    }),
    loadBearingMemoryFactors: Object.freeze([
      "individualizedAdvantage",
      "interchangeability",
    ]),
  }),
});
