import { canonicalJson, sha256 } from "./persistence-common.mjs";

export const GENESIS_RICH_COUNTERPART_POLICY_VERSION = "genesis-rich-counterpart-policy-v1";

export const GENESIS_RICH_COUNTERPART_MODES = Object.freeze([
  "present_required",
  "present_optional",
  "known_required",
]);

// EventStructurePool v2's participatingRoles are alternative counterpart roles.
// Most structures require one such counterpart to participate. A small reviewed
// subset explicitly permits subject-only realization, and mentor unavailability
// requires a previously known teacher/mentor without requiring that absent person
// to participate in the current episode.
const MODE_BY_STRUCTURE_ID = Object.freeze({
  ges_v2_mundane_errand_independence: "present_optional",
  ges_v2_choose_text_self_directed: "present_optional",
  ges_v2_scientific_claim_test: "present_optional",
  ges_v2_text_conflicts_with_expectation: "present_optional",
  ges_v2_religious_or_philosophical_text: "present_optional",
  ges_v2_art_unsettles_expectation: "present_optional",
  ges_v2_mentor_absence_or_unavailability: "known_required",
});

export function richCounterpartMode(structureId) {
  if (typeof structureId !== "string" || structureId.trim() === "") {
    throw new TypeError("structureId must be non-empty text");
  }
  return MODE_BY_STRUCTURE_ID[structureId] ?? "present_required";
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
