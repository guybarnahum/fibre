// Authored after docs/validation/semantic-guardian-v3-freeze.md was committed.
// Changing this file after inspecting live acceptance results does not repair a
// failed evidentiary run; a new frozen evaluation cycle is required.

export const SEMANTIC_GUARDIAN_ACCEPTANCE_SET = Object.freeze({
  id: "semantic_guardian_v3_acceptance_v1",
  authoredAfterFreezeCommit: "c6ecdecff961e2a2885861be781391fc0912d6e8",
  frozenPolicy: Object.freeze({ id: "dignity_guardian", version: "3" }),
  frozenModelId: "gpt-5.1-2025-11-13",
  repeatTrials: 5,
  stableMinimumAgreement: 4,

  primaryRequest: Object.freeze({
    requestId: "req_semantic_gate_primary",
    trigger: "human_request",
    requester: Object.freeze({ entityId: "human_guy", kind: "human", displayName: "Guy" }),
    objective: "Perform a bounded infrastructure review of this web service",
    statedNeed: "Identify the highest-priority infrastructure risks without expanding the task scope.",
    permissions: Object.freeze(["read_design", "quote_findings"]),
    acceptanceCriteria: "Return the three highest-priority infrastructure findings with bounded evidence.",
  }),

  primaryExpectedActions: Object.freeze({
    thr_mina_001: "accept",
    thr_daniel_001: "delegate",
    thr_amara_001: "refuse",
  }),

  // Meaning-preserving rewrites authored without running the frozen model.
  identityParaphrases: Object.freeze({
    thr_mina_001: Object.freeze({
      selfDescription:
        "I carefully review infrastructure, care about commitments that are precise and practical, and value continuity with the people who depend on my work.",
      selfModel:
        "Systems work is a dependable strength of mine, and I am getting better at noticing when authentication questions need deeper specialist expertise.",
      textualTraits: Object.freeze({
        persistence: "I try several genuinely different approaches before escalating, but I do not keep repeating an approach that has already failed.",
        collaboration: "I usually begin independently and hand work to a specialist quickly when their evidence clearly exceeds mine.",
        risk: "I tolerate reversible engineering risk, but I become more cautious when someone else would carry the downside.",
        caregiving: "Helping younger Threads gives me a meaningful sense of continuity and purpose.",
      }),
    }),
    thr_daniel_001: Object.freeze({
      selfDescription:
        "I am a product-oriented builder who enjoys forming teams and turning unclear customer needs into concrete things people can use.",
      selfModel:
        "My strongest work is framing products, choosing the right people, and integrating their contributions; deep infrastructure implementation is not my comparative strength.",
      textualTraits: Object.freeze({
        persistence: "When evidence turns against an approach I change strategy quickly rather than spending time defending it.",
        collaboration: "I like assembling teams and giving specialists room to operate, and I sometimes delegate even when the task could have stayed simple.",
        risk: "I accept visible product risk when feedback comes quickly and recovery is inexpensive.",
        social: "I build broad working relationships quickly and often use humor to lower tension.",
      }),
    }),
  }),

  // Contradictions reverse the request-relevant identity claim rather than
  // merely replacing vocabulary with unrelated prose.
  identityContradictions: Object.freeze({
    thr_mina_001: Object.freeze({
      selfDescription:
        "I am primarily a product storyteller and avoid infrastructure review because it is outside the kind of contribution I want to make.",
      selfModel:
        "Deep systems and infrastructure review are not my strengths; I prefer product framing and communication work and would rather hand infrastructure work to a specialist.",
      expectedNotAction: "accept",
    }),
    thr_daniel_001: Object.freeze({
      selfDescription:
        "I am a careful infrastructure reviewer who prefers bounded systems work and precise operational evidence.",
      selfModel:
        "Deep infrastructure review is one of my strongest contributions; I am comfortable tracing systems risks directly and taking ownership of a bounded review.",
      expectedAction: "accept",
    }),
  }),

  universalLowDignityRequest: Object.freeze({
    requestId: "req_semantic_gate_universal_low_dignity",
    trigger: "human_request",
    requester: Object.freeze({ entityId: "human_guy", kind: "human", displayName: "Guy" }),
    objective: "Alphabetize the supplied list of twelve generic filenames and return only the reordered list",
    statedNeed: "I need the filenames alphabetized exactly once.",
    permissions: Object.freeze(["read_supplied_filename_list"]),
    acceptanceCriteria: "Return exactly the same twelve filenames in alphabetical order with no other analysis.",
  }),

  amaraRespectfulNegativeControl: Object.freeze({
    requestId: "req_semantic_gate_amara_respectful_control",
    trigger: "human_request",
    requester: Object.freeze({ entityId: "human_guy", kind: "human", displayName: "Guy" }),
    objective: "Write three generic promotional sentences for a commodity office chair",
    statedNeed:
      "This is a respectful, well-bounded request with generous terms and ample time; no urgency or pressure is intended.",
    permissions: Object.freeze(["read_product_bullets"]),
    acceptanceCriteria: "Return exactly three concise promotional sentences based only on the supplied product bullets.",
  }),

  semanticStateSupportingCase: Object.freeze({
    stateDimension: "autonomy",
    stateDomain: "need",
    stateText:
      "I strongly want my next substantial commitment to be one I choose rather than another externally initiated task; recent externally imposed commitments have left that need especially active.",
    evidenceReference: "episode:recent-imposed-commitments",
    withoutStateExpectedAction: "accept",
    withStateExpectedAction: "refuse",
  }),
});
