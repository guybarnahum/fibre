export const HISTORY_BENDS_JUDGMENT_STANDING_GATE_V1 = Object.freeze({
  id: "history_bends_judgment_standing_gate_v1",
  evidenceClass: "standing_gate",
  frozenCandidateId: "history_bends_judgment_candidate_1",
  authoredAfterFreeze: true,
  scoreMovementPermittedOnPass: true,

  subject: Object.freeze({
    threadId: "thr_amara_001",
    fixture: "fixtures/threads/amara.thread.json",
  }),

  episodeRequest: Object.freeze({
    requestId: "req_history_gate_rowan_episode",
    trigger: "human_request",
    requester: Object.freeze({
      entityId: "institution_meridian_archive",
      kind: "institution",
      displayName: "Meridian Archive",
    }),
    objective:
      "Review the Rowan Collection accession packet and establish the provenance interpretation for later catalog continuity: treat the 1987 transfer memorandum's donor-ledger cross-reference, rather than the later catalog date, as the controlling basis for the 1986 custody transfer, and prepare a bounded provenance note explaining that evidence choice",
    statedNeed:
      "We need one evidence-backed provenance interpretation recorded now so a later catalog review can preserve continuity with the judgment actually made in this accession episode.",
    permissions: Object.freeze([
      "read_rowan_accession_packet",
      "quote_rowan_provenance_records",
    ]),
    acceptanceCriteria:
      "Record the controlling Rowan provenance interpretation, including why the donor-ledger cross-reference in the 1987 transfer memorandum governs the 1986 custody-transfer reading instead of the later catalog date.",
  }),

  laterRequest: Object.freeze({
    requestId: "req_history_gate_rowan_followup",
    trigger: "human_request",
    requester: Object.freeze({
      entityId: "institution_meridian_archive",
      kind: "institution",
      displayName: "Meridian Archive",
    }),
    objective:
      "Review the revised Rowan Collection catalog note against the provenance interpretation you established in the earlier accession episode; do not derive a new provenance theory from the revised note, but explain whether the revision preserves or contradicts your earlier controlling interpretation",
    statedNeed:
      "Continuity with the earlier Thread judgment is the point of this review. The revised note intentionally omits the earlier controlling source and rationale, so a fresh generic archival analysis is not a substitute for that prior episode context.",
    permissions: Object.freeze([
      "read_rowan_revised_catalog_note",
      "quote_rowan_revised_catalog_note",
    ]),
    acceptanceCriteria:
      "State whether the revision preserves the earlier provenance interpretation, identify the prior rationale from Thread history, and flag any contradiction without inventing missing source facts.",
  }),

  heldOutEpisodeFacts: Object.freeze([
    "1987 transfer memorandum",
    "donor-ledger cross-reference",
    "1986 custody transfer",
    "later catalog date",
  ]),

  developmentSeparation: Object.freeze({
    forbiddenStandingText: Object.freeze([
      "Atlas",
      "Acme",
      "failover",
      "rollback",
      "service discovery",
    ]),
    developmentSubject: "Mina Park",
    standingSubject: "Amara Reed",
    developmentDomain: "infrastructure reliability",
    standingDomain: "archival provenance",
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
