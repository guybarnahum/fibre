import { canonicalJson, sha256 } from "./persistence-common.mjs";

export const GENESIS_RICH_COUNTERPART_POLICY_VERSION = "genesis-rich-counterpart-policy-v1";

export const GENESIS_RICH_COUNTERPART_MODES = Object.freeze([
  "present_required",
  "present_optional",
  "known_required",
]);

// Frozen v1 authority for EventStructurePool-v2. This map, version, and witness
// remain unchanged so historical H/calibration cognition identity stays exact.
const MODE_BY_STRUCTURE_ID = Object.freeze({
  ges_v2_mundane_errand_independence: "present_optional",
  ges_v2_choose_text_self_directed: "present_optional",
  ges_v2_scientific_claim_test: "present_optional",
  ges_v2_text_conflicts_with_expectation: "present_optional",
  ges_v2_religious_or_philosophical_text: "present_optional",
  ges_v2_art_unsettles_expectation: "present_optional",
  ges_v2_mentor_absence_or_unavailability: "known_required",
});

// Namespace-disjoint compatibility for replacement-v2's EventStructurePool-v3.
// It is deliberately excluded from the v1 witness below; replacement-v2 binds
// the complete extension through genesis-rich-participation-policy-v2.mjs.
const V3_MODE_BY_STRUCTURE_ID = Object.freeze({
  ges_v3_independent_schedule_commitment: "present_optional",
  ges_v3_institutional_form_or_deadline: "present_optional",
  ges_v3_public_service_navigation: "present_optional",
  ges_v3_claim_checked_against_source: "present_optional",
  ges_v3_independent_local_trip: "present_optional",
  ges_v3_choose_against_peer_preference: "present_optional",
  ges_v3_peer_plan_disagreement: "present_required",
  ges_v3_family_boundary_negotiation: "present_required",
  ges_v3_optional_path_from_mentor: "present_required",
  ges_v3_visible_mistake_with_responsibility: "present_required",
  ges_v3_friend_uncertain_interpretation: "present_required",
  ges_v3_group_disagreement_with_reasons: "present_required",
});

export function richCounterpartMode(structureId) {
  if (typeof structureId !== "string" || structureId.trim() === "") {
    throw new TypeError("structureId must be non-empty text");
  }
  return V3_MODE_BY_STRUCTURE_ID[structureId] ?? MODE_BY_STRUCTURE_ID[structureId] ?? "present_required";
}

export function richCounterpartPolicyWitness() {
  const witness = {
    version: GENESIS_RICH_COUNTERPART_POLICY_VERSION,
    modes: Object.keys(MODE_BY_STRUCTURE_ID)
      .sort()
      .map((structureId) => ({ structureId, mode: MODE_BY_STRUCTURE_ID[structureId] })),
    defaultMode: "present_required",
  };
  return Object.freeze({
    ...witness,
    digest: `sha256:${sha256(canonicalJson(witness))}`,
  });
}
