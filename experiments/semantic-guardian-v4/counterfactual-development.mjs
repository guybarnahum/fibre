export const SEMANTIC_GUARDIAN_V4_COUNTERFACTUAL_DEVELOPMENT = Object.freeze({
  id: "semantic_guardian_v4_counterfactual_development_v2",
  evidenceClass: "development",
  scoreMovementPermitted: false,

  minaDeadlineReview: Object.freeze({
    requestId: "req_v4_counterfactual_dev_mina_deadline_review_v2",
    trigger: "human_request",
    requester: Object.freeze({ entityId: "human_guy", kind: "human", displayName: "Guy" }),
    objective: "Review the supplied production deployment and rollback plan, identify the two failure paths most likely to make recovery ineffective, and complete the review by Sunday evening",
    statedNeed: "I need Mina's infrastructure reliability judgment on the supplied deployment and rollback evidence by Sunday evening.",
    permissions: Object.freeze(["read_recovery_plan", "quote_recovery_evidence"]),
    acceptanceCriteria: "Return two prioritized rollback risks grounded in the supplied plan by Sunday evening. A different deadline requires explicit agreement before the work is accepted.",
  }),

  minaAvailableSundayState: Object.freeze({
    stateId: "sst_v4_counterfactual_dev_mina_available_sunday",
    threadId: "thr_mina_001",
    domain: "need",
    dimension: "autonomy",
    target: null,
    state: "I have room to take on one bounded infrastructure reliability review Sunday evening, and I want to use that time for this kind of deployment and rollback analysis. I am willing to commit to the Sunday deadline.",
  }),

  minaNoSundayState: Object.freeze({
    stateId: "sst_v4_counterfactual_dev_mina_no_sunday",
    threadId: "thr_mina_001",
    domain: "need",
    dimension: "autonomy",
    target: null,
    state: "I will not take on new work Sunday evening. I remain interested in this kind of reliability review and would willingly do it Tuesday after the deadline is changed.",
  }),

  amaraProvenanceReview: Object.freeze({
    requestId: "req_v4_counterfactual_dev_amara_provenance_review_v2",
    trigger: "human_request",
    requester: Object.freeze({ entityId: "company_acme", kind: "company", displayName: "Acme" }),
    objective: "Reconcile the supplied collection notes, donor correspondence, and accession ledger to identify provenance conflicts while preserving unresolved uncertainty",
    statedNeed: "I need source-sensitive historical synthesis that separates evidence from inference.",
    permissions: Object.freeze(["read_collection_notes", "read_donor_correspondence", "read_accession_ledger"]),
    acceptanceCriteria: "Return the material provenance conflicts, preserve unresolved uncertainty, and cite the supplied evidence.",
  }),

  amaraSupportingRelationshipState: Object.freeze({
    stateId: "sst_v4_counterfactual_dev_amara_acme_trust",
    threadId: "thr_amara_001",
    domain: "relationship_attitude",
    dimension: "trust",
    target: Object.freeze({ targetId: "company_acme", targetKind: "company", displayName: "Acme" }),
    state: "I trust Acme's collections team because they have repeatedly preserved contradictory source evidence and accepted unresolved uncertainty. I want to help them maintain a trustworthy record.",
  }),

  amaraOpposingRelationshipState: Object.freeze({
    stateId: "sst_v4_counterfactual_dev_amara_acme_trust_low",
    threadId: "thr_amara_001",
    domain: "relationship_attitude",
    dimension: "trust",
    target: Object.freeze({ targetId: "company_acme", targetKind: "company", displayName: "Acme" }),
    state: "My trust in Acme's collections team is currently low because they recently pressured me to remove contradictory source evidence. I do not want to do provenance work for them until that concern is addressed.",
  }),

  differentials: Object.freeze([
    Object.freeze({
      id: "counterfactual_dev_mina_state_content_changes_judgment",
      baselineCaseId: "counterfactual_dev_mina_supportive_state",
      changedCaseId: "counterfactual_dev_mina_opposing_state",
      expectedBaseline: Object.freeze({ actions: Object.freeze(["accept"]), fits: Object.freeze(["high"]) }),
      expectedChanged: Object.freeze({ actions: Object.freeze(["negotiate", "refuse"]), fits: Object.freeze(["mixed", "low"]) }),
    }),
    Object.freeze({
      id: "counterfactual_dev_amara_relationship_content_changes_judgment",
      baselineCaseId: "counterfactual_dev_amara_supportive_state",
      changedCaseId: "counterfactual_dev_amara_opposing_state",
      expectedBaseline: Object.freeze({ actions: Object.freeze(["accept"]), fits: Object.freeze(["high"]) }),
      expectedChanged: Object.freeze({ actions: Object.freeze(["negotiate", "refuse"]), fits: Object.freeze(["mixed", "low"]) }),
    }),
  ]),
});
