import {
  createEventStructure,
  normalizeEventStructure,
  sampleEventStructures,
} from "./genesis-pass-a-domain.mjs";
import {
  GENESIS_EVENT_STRUCTURE_POOL_V2,
  EVENT_STRUCTURE_V2_ACCESS_MODES,
  EVENT_STRUCTURE_V2_CONTEXT_KINDS,
} from "./genesis-event-structure-pool-v2.mjs";
import { canonicalJson, sha256 } from "./persistence-common.mjs";

export const GENESIS_EVENT_STRUCTURE_POOL_V3_VERSION = "genesis-event-structure-pool-v3";
const SOURCE_DERIVATION = "Human-authored portable young-adult affordance; no source scene, personality, lesson, target profession, benchmark, or desired adult conclusion retained.";

function witnesses(a, b, c) {
  return [
    { era: "late_20c", economy: "scarce", culture: "coastal_multilingual", instantiation: a },
    { era: "early_21c", economy: "mixed", culture: "inland_collectivist", instantiation: b },
    { era: "mid_21c", economy: "abundant", culture: "urban_pluralist", instantiation: c },
  ];
}

function entry({ id, situation, roles, consequence = "low", contextKinds, accessModes, examples }) {
  return Object.freeze({
    structure: createEventStructure({
      structureId: id,
      abstractSituation: situation,
      participatingRoles: roles,
      developmentalRange: { minAge: 17, maxAge: 22 },
      consequenceClass: consequence,
      instantiationWitnesses: witnesses(...examples),
      sourceDerivation: SOURCE_DERIVATION,
    }),
    contextKinds: Object.freeze([...contextKinds]),
    accessModes: Object.freeze([...accessModes]),
  });
}

export const GENESIS_YOUNG_ADULT_EVENT_STRUCTURES_V3 = Object.freeze([
  entry({ id: "ges_v3_independent_schedule_commitment", situation: "the young adult commits to a recurring study, work, community, or practical schedule and must coordinate it with another ordinary obligation", roles: ["peer", "teacher", "mentor", "caregiver"], contextKinds: ["transition_or_access", "ordinary_practical"], accessModes: ["self_directed", "institution_mediated"], examples: ["A student coordinates a weekly evening course with household transport.", "A young worker arranges a recurring shift around a training class.", "A young adult schedules a community lab session around an existing care obligation."] }),
  entry({ id: "ges_v3_institutional_form_or_deadline", situation: "the young adult must interpret and act on an ordinary institutional form, deadline, eligibility rule, or appointment requirement", roles: ["teacher", "mentor", "librarian", "shopkeeper"], contextKinds: ["ordinary_practical", "transition_or_access"], accessModes: ["institution_mediated", "self_directed"], examples: ["A student checks two application deadlines before filing a form.", "A trainee asks which document satisfies an enrollment rule.", "A young adult compares two appointment instructions before submitting a request."] }),
  entry({ id: "ges_v3_peer_plan_disagreement", situation: "the young adult and a peer disagree about an ordinary shared plan, interpretation, or commitment and must decide what to do next", roles: ["peer"], consequence: "moderate", contextKinds: ["social_conversation", "responsibility_or_conflict"], accessModes: ["peer_mediated"], examples: ["Two friends disagree about how early to leave for a regional bus.", "Two students disagree about dividing a shared presentation.", "Two young adults disagree about whether to volunteer for another shift."] }),
  entry({ id: "ges_v3_family_boundary_negotiation", situation: "the young adult and a household or family member negotiate one concrete boundary involving schedule, money, transport, privacy, or responsibility", roles: ["caregiver", "sibling", "relative"], consequence: "moderate", contextKinds: ["social_conversation", "responsibility_or_conflict"], accessModes: ["caregiver_mediated"], examples: ["A young adult and sibling agree when a shared room must be quiet.", "A household negotiates who can use the family vehicle on one evening.", "A young adult and relative agree how to split a recurring errand."] }),
  entry({ id: "ges_v3_public_service_navigation", situation: "the young adult navigates an ordinary public or community service whose procedure is unfamiliar enough to require a concrete question or check", roles: ["librarian", "neighbor", "mentor", "shopkeeper"], contextKinds: ["ordinary_practical", "transition_or_access"], accessModes: ["institution_mediated", "self_directed"], examples: ["A young adult asks which counter handles a permit renewal.", "A student checks how to reserve a municipal study room.", "A young adult asks how to replace a lost transit card."] }),
  entry({ id: "ges_v3_optional_path_from_mentor", situation: "a teacher or mentor makes an optional next-step path available without assigning it or predicting what the young adult should become", roles: ["teacher", "mentor"], contextKinds: ["intellectual_encounter", "transition_or_access"], accessModes: ["institution_mediated"], examples: ["A teacher mentions an open lecture and gives the schedule.", "A mentor points out a public apprenticeship listing after a practical question.", "A mentor shares an optional reading group without asking for a commitment."] }),
  entry({ id: "ges_v3_claim_checked_against_source", situation: "the young adult encounters a concrete claim in study, work, news, or ordinary conversation and checks one primary or direct source before acting on it", roles: ["peer", "teacher", "mentor", "librarian"], consequence: "moderate", contextKinds: ["intellectual_encounter", "ordinary_practical"], accessModes: ["self_directed", "institution_mediated", "peer_mediated"], examples: ["A student checks the original timetable after hearing a room change.", "A young worker checks a posted policy after a coworker describes it differently.", "A young adult opens the cited public notice before repeating a claim."] }),
  entry({ id: "ges_v3_visible_mistake_with_responsibility", situation: "the young adult makes a recoverable mistake in a shared responsibility and takes one concrete next action while other people can see the error", roles: ["peer", "teacher", "mentor", "shopkeeper"], consequence: "moderate", contextKinds: ["ordinary_practical", "responsibility_or_conflict"], accessModes: ["peer_mediated", "institution_mediated"], examples: ["A student brings the wrong version of a document and retrieves the correct one.", "A young worker labels a box incorrectly and fixes the inventory entry.", "A volunteer misses one signup and contacts the coordinator to correct it."] }),
  entry({ id: "ges_v3_independent_local_trip", situation: "the young adult completes a familiar local trip or errand independently while adapting to one ordinary change in route, timing, weather, or availability", roles: ["neighbor", "shopkeeper", "peer"], contextKinds: ["ordinary_practical", "transition_or_access"], accessModes: ["self_directed"], examples: ["A bus diversion makes a young adult walk to the next stop.", "A shop closes early and the young adult uses another nearby store.", "A delayed train makes two friends take a different local connection."] }),
  entry({ id: "ges_v3_friend_uncertain_interpretation", situation: "a peer or friend shares an uncertain interpretation of an ordinary interpersonal or institutional event and explicitly leaves room for being wrong", roles: ["peer"], contextKinds: ["social_conversation"], accessModes: ["peer_mediated"], examples: ["A friend says they may have misunderstood why a meeting changed.", "A peer is unsure whether a brief reply was dismissive or merely rushed.", "A classmate says they cannot tell whether a coordinator intentionally excluded them."] }),
  entry({ id: "ges_v3_group_disagreement_with_reasons", situation: "the young adult participates in or witnesses a bounded group disagreement in which at least two explicit reasons are offered", roles: ["peer", "teacher", "mentor"], consequence: "formative_capable", contextKinds: ["social_conversation", "intellectual_encounter", "responsibility_or_conflict"], accessModes: ["peer_mediated", "institution_mediated"], examples: ["Students disagree about a club budget and each gives a reason.", "A project group disputes whether to postpone a public event after bad weather.", "A mentor and two trainees disagree about whether a checklist should be changed."] }),
  entry({ id: "ges_v3_choose_against_peer_preference", situation: "the young adult makes an ordinary visible choice different from a peer group's current preference while continuing the relationship", roles: ["peer"], consequence: "formative_capable", contextKinds: ["social_conversation", "responsibility_or_conflict"], accessModes: ["peer_mediated", "self_directed"], examples: ["A young adult leaves a late gathering while friends remain.", "A student chooses a different elective from close friends.", "A volunteer declines an extra shift while peers accept it."] })
]);

export const GENESIS_EVENT_STRUCTURE_POOL_V3 = Object.freeze([
  ...GENESIS_EVENT_STRUCTURE_POOL_V2,
  ...GENESIS_YOUNG_ADULT_EVENT_STRUCTURES_V3,
]);

function validateMetadata(entry, index) {
  const structure = normalizeEventStructure(entry.structure);
  if (!Array.isArray(entry.contextKinds) || entry.contextKinds.length === 0) throw new TypeError(`v3 entry ${index} contextKinds are required`);
  if (!Array.isArray(entry.accessModes) || entry.accessModes.length === 0) throw new TypeError(`v3 entry ${index} accessModes are required`);
  for (const value of entry.contextKinds) if (!EVENT_STRUCTURE_V2_CONTEXT_KINDS.includes(value)) throw new TypeError(`v3 entry ${index} invalid contextKind ${value}`);
  for (const value of entry.accessModes) if (!EVENT_STRUCTURE_V2_ACCESS_MODES.includes(value)) throw new TypeError(`v3 entry ${index} invalid accessMode ${value}`);
  return Object.freeze({ structure, contextKinds: Object.freeze([...entry.contextKinds]), accessModes: Object.freeze([...entry.accessModes]) });
}

export function normalizeEventStructurePoolV3(candidates = GENESIS_EVENT_STRUCTURE_POOL_V3) {
  if (!Array.isArray(candidates) || candidates.length < GENESIS_EVENT_STRUCTURE_POOL_V2.length + 8) throw new TypeError("EventStructurePool v3 must preserve v2 and add young-adult affordances");
  const entries = candidates.map(validateMetadata);
  const ids = entries.map((item) => item.structure.structureId);
  if (new Set(ids).size !== ids.length) throw new TypeError("EventStructurePool v3 contains duplicate structure IDs");
  for (const v2 of GENESIS_EVENT_STRUCTURE_POOL_V2) {
    const current = entries.find((item) => item.structure.structureId === v2.structure.structureId);
    if (!current || canonicalJson(current) !== canonicalJson(v2)) throw new TypeError(`EventStructurePool v3 changed inherited v2 structure ${v2.structure.structureId}`);
  }
  const youngAdult = entries.filter((item) => item.structure.developmentalRange.maxAge >= 22 && item.structure.developmentalRange.minAge <= 18);
  if (youngAdult.length < 8) throw new TypeError("EventStructurePool v3 lacks sufficient young-adult coverage");
  return Object.freeze(entries);
}

export function eventStructurePoolV3Digest(candidates = GENESIS_EVENT_STRUCTURE_POOL_V3) {
  const entries = normalizeEventStructurePoolV3(candidates);
  return `sha256:${sha256(canonicalJson({ policyVersion: GENESIS_EVENT_STRUCTURE_POOL_V3_VERSION, entries }))}`;
}

function covers(structure, range) {
  return structure.developmentalRange.minAge <= range.minAge && structure.developmentalRange.maxAge >= range.maxAge;
}

export function sampleEventStructuresV3(candidates, developmentalRange, { seed, count = 9 } = {}) {
  const entries = normalizeEventStructurePoolV3(candidates);
  const covering = entries.filter((item) => covers(item.structure, developmentalRange));
  const selected = sampleEventStructures(covering.map((item) => item.structure), developmentalRange, { seed, count });
  const ids = new Set(selected.map((item) => item.structureId));
  return Object.freeze(covering.filter((item) => ids.has(item.structure.structureId)));
}
