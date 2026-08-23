import { canonicalJson, sha256 } from "./persistence-common.mjs";
import {
  GENESIS_RICH_COUNTERPART_MODES,
  richCounterpartMode,
  richCounterpartPolicyWitness,
} from "./genesis-rich-participation-policy.mjs";

export const GENESIS_RICH_COUNTERPART_POLICY_V2_VERSION = "genesis-rich-counterpart-policy-v2";
export { GENESIS_RICH_COUNTERPART_MODES };

// Replacement-v2 adds young-adult EventStructurePool-v3 affordances without
// mutating the frozen v1 policy used by historical H/calibration cognition.
// Structures whose own reviewed accessModes include self_directed may be
// realized without an external counterpart; genuinely interpersonal structures
// remain counterpart-required. All non-v3 structure IDs delegate to v1 exactly.
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

export function richCounterpartModeV2(structureId) {
  if (typeof structureId !== "string" || structureId.trim() === "") {
    throw new TypeError("structureId must be non-empty text");
  }
  return V3_MODE_BY_STRUCTURE_ID[structureId] ?? richCounterpartMode(structureId);
}

export function richCounterpartPolicyV2Witness() {
  const base = richCounterpartPolicyWitness();
  const witness = {
    version: GENESIS_RICH_COUNTERPART_POLICY_V2_VERSION,
    inheritedPolicy: {
      version: base.version,
      digest: base.digest,
    },
    v3Modes: Object.keys(V3_MODE_BY_STRUCTURE_ID)
      .sort()
      .map((structureId) => ({ structureId, mode: V3_MODE_BY_STRUCTURE_ID[structureId] })),
    inheritedFallback: "delegate_to_v1",
  };
  return Object.freeze({
    ...witness,
    digest: `sha256:${sha256(canonicalJson(witness))}`,
  });
}
