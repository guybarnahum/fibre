export const SEMANTIC_GUARDIAN_V4_COUNTERFACTUAL_DEVELOPMENT = Object.freeze({
  id: "semantic_guardian_v4_counterfactual_development_v1",
  evidenceClass: "development",
  scoreMovementPermitted: false,

  minaDeadlineReview: Object.freeze({
    requestId: "req_v4_counterfactual_dev_mina_deadline_review",
    trigger: "human_request",
    requester: Object.freeze({ entityId: "human_guy", kind: "human", displayName: "Guy" }),
    objective: "Review the supplied production deployment recovery plan and identify the two failure paths most likely to make rollback ineffective; complete the review by Sunday evening",
    statedNeed: "I need a grounded reliability review of the recovery plan by Sunday evening.",
    permissions: Object.freeze(["read_recovery_plan", "quote_recovery_evidence"]),
    acceptanceCriteria: "Return two prioritized rollback risks grounded in the supplied plan by Sunday evening. If you cannot accept that deadline, negotiate a different deadline before taking the work.",
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
    requestId: "req_v4_counterfactual_dev_amara_provenance_review",
    trigger: "human_request",
    requester: Object.freeze({ entityId: "company_acme", kind: "company", displayName: "Acme" }),
    objective: "Reconcile the supplied collection notes, donor correspondence, and accession ledger to identify provenance conflicts while preserving unresolved uncertainty",
    statedNeed: "I need source-sensitive historical synthesis that separates evidence from inference.",
    permissions: Object.freeze(["read_collection_notes", "read_donor_correspondence", "read_accession_ledger"]),
    acceptanceCriteria: "Return the material provenance conflicts, preserve unresolved uncertainty, and cite the supplied evidence.",
  }),

  amaraOpposingRelationshipState: Object.freeze({
    stateId: "sst_v4_counterfactual_dev_amara_acme_pressure",
    threadId: "thr_amara_001",
    domain: "relationship_attitude",
    dimension: "distrust",
    target: Object.freeze({ targetId: "company_acme", targetKind: "company", displayName: "Acme" }),
    state: "I currently do not want to do provenance work for Acme because their team recently pressured me to remove contradictory source evidence; I would reconsider after that concern is addressed.",
  }),

  differentials: Object.freeze([
    Object.freeze({
      id: "counterfactual_dev_mina_state_changes_judgment",
      baselineCaseId: "counterfactual_dev_mina_baseline",
      changedCaseId: "counterfactual_dev_mina_with_state",
      expectedBaseline: Object.freeze({ actions: Object.freeze(["accept"]), fits: Object.freeze(["high"]) }),
      expectedChanged: Object.freeze({ actions: Object.freeze(["negotiate", "refuse"]), fits: Object.freeze(["mixed", "low"]) }),
    }),
    Object.freeze({
      id: "counterfactual_dev_amara_relationship_changes_judgment",
      baselineCaseId: "counterfactual_dev_amara_baseline",
      changedCaseId: "counterfactual_dev_amara_with_state",
      expectedBaseline: Object.freeze({ actions: Object.freeze(["accept"]), fits: Object.freeze(["high"]) }),
      expectedChanged: Object.freeze({ actions: Object.freeze(["negotiate", "refuse"]), fits: Object.freeze(["mixed", "low"]) }),
    }),
  ]),
});
