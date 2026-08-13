import { canonicalJson, sha256 } from "./persistence-common.mjs";

export const IDENTITY_DOMAIN_REGISTRY_VERSION = "1";

export const IDENTITY_PROVENANCE_CLASSES = Object.freeze([
  "inherited",
  "birth_created",
  "upbringing_cultural",
  "geographic",
  "historical_experienced",
  "relational",
  "institutional_role",
  "intellectual_formation",
  "externally_attributed",
  "self_authored",
  "generated_embodiment",
  "echo_source",
  "fibre_derived",
]);

export const IDENTITY_AUTHORSHIP_KINDS = Object.freeze([
  "thread_self_authored",
  "fibre_policy_derived",
  "human_sponsor_source",
  "relationship_shared_world_source",
  "institutional_source",
  "external_third_party",
  "embodiment_generator_tool",
  "genesis_authority",
  "admin_correction",
]);

export const IDENTITY_VISIBILITIES = Object.freeze([
  "public",
  "restricted",
  "private",
  "protected_source",
]);

export const IDENTITY_ASSERTION_STATUSES = Object.freeze([
  "current",
  "historical",
  "disputed",
  "corrected",
  "revoked_for_use",
]);

export const IDENTITY_BEHAVIORAL_STATUSES = Object.freeze([
  "accepted_causal",
  "candidate_causal",
  "context_only",
  "presentation_only",
  "authority_only",
]);

const PRE_CAUSAL = ["candidate_causal", "context_only"];
const CONTEXT_ONLY = ["context_only"];
const PRESENTATION = ["presentation_only", "context_only"];

function domain({
  projectionSection,
  description,
  provenance,
  authorship,
  behavioral = PRE_CAUSAL,
  singletonKinds = [],
  mutationRule,
}) {
  return Object.freeze({
    projectionSection,
    description,
    allowedProvenanceClasses: Object.freeze([...provenance]),
    allowedAuthorshipKinds: Object.freeze([...authorship]),
    allowedBehavioralStatuses: Object.freeze([...behavioral]),
    singletonKinds: Object.freeze([...singletonKinds]),
    mutationRule,
  });
}

const GENESIS_OR_CORRECTION = ["genesis_authority", "admin_correction"];
const THREAD_OR_CORRECTION = ["thread_self_authored", "admin_correction"];
const WORLD_OR_CORRECTION = [
  "genesis_authority",
  "fibre_policy_derived",
  "relationship_shared_world_source",
  "institutional_source",
  "admin_correction",
];

export const IDENTITY_DOMAIN_REGISTRY = Object.freeze({
  passport_name: domain({
    projectionSection: "passport",
    description: "Canonical current name and superseded names/aliases.",
    provenance: ["birth_created", "self_authored", "fibre_derived"],
    authorship: ["genesis_authority", "thread_self_authored", "institutional_source", "admin_correction"],
    singletonKinds: ["canonical_name"],
    mutationRule: "Genesis may establish; later change requires Thread/world authority or evidenced correction; prior names remain historical.",
  }),
  passport_origin: domain({
    projectionSection: "passport",
    description: "Constitutive origin/orientation facts such as original, Echo, homage, or composite.",
    provenance: ["birth_created", "echo_source"],
    authorship: GENESIS_OR_CORRECTION,
    behavioral: CONTEXT_ONLY,
    singletonKinds: ["origin_orientation"],
    mutationRule: "Constitutive origin is genesis-owned; later changes are factual corrections, never ordinary persona editing.",
  }),
  constitutive_fact: domain({
    projectionSection: "passport",
    description: "Creation/birth facts and stable identity anchors not otherwise represented.",
    provenance: ["birth_created", "echo_source"],
    authorship: GENESIS_OR_CORRECTION,
    behavioral: CONTEXT_ONLY,
    mutationRule: "Append or correct from constitutive evidence; never silently rewrite.",
  }),
  inherited_disposition: domain({
    projectionSection: "inherited",
    description: "Inherited or genesis-level dispositions whose expression may later be reinterpreted.",
    provenance: ["inherited", "birth_created", "fibre_derived"],
    authorship: ["genesis_authority", "fibre_policy_derived", "admin_correction"],
    mutationRule: "Origin remains historical; expression may be superseded or disputed by later evidence.",
  }),
  lineage_family: domain({
    projectionSection: "lineage",
    description: "Family, ancestry, adoption, sponsorship, and lineage facts.",
    provenance: ["inherited", "relational", "birth_created", "echo_source"],
    authorship: WORLD_OR_CORRECTION,
    mutationRule: "World/relationship evidence may append or correct; lineage alone never implies personality.",
  }),
  upbringing_culture: domain({
    projectionSection: "culture",
    description: "Lived cultural/upbringing formation, not demographic stereotype inference.",
    provenance: ["upbringing_cultural", "historical_experienced", "echo_source"],
    authorship: ["genesis_authority", "thread_self_authored", "human_sponsor_source", "relationship_shared_world_source", "fibre_policy_derived", "admin_correction"],
    mutationRule: "Lived formation remains historical; current relationship to it may be separately self-authored.",
  }),
  language_formation: domain({
    projectionSection: "language",
    description: "Language, code-switching, and communication formation grounded in lived evidence.",
    provenance: ["upbringing_cultural", "historical_experienced", "intellectual_formation", "echo_source"],
    authorship: ["genesis_authority", "thread_self_authored", "human_sponsor_source", "fibre_policy_derived", "admin_correction"],
    mutationRule: "Append/supersede with evidence; language labels alone do not imply temperament or competence.",
  }),
  geography: domain({
    projectionSection: "geography",
    description: "Place facts and durable place meaning; #38 adds the full geography timeline.",
    provenance: ["geographic", "historical_experienced", "self_authored", "echo_source"],
    authorship: ["genesis_authority", "thread_self_authored", "fibre_policy_derived", "institutional_source", "admin_correction"],
    singletonKinds: ["birth_place"],
    mutationRule: "Place events append; factual errors correct; personal meaning may be self-authored and superseded.",
  }),
  intellectual_formation: domain({
    projectionSection: "formation",
    description: "Teachers, books, schools of thought, methods, admired/rejected intellectual influences.",
    provenance: ["intellectual_formation", "historical_experienced", "self_authored", "echo_source"],
    authorship: ["thread_self_authored", "fibre_policy_derived", "human_sponsor_source", "institutional_source", "admin_correction"],
    mutationRule: "Formation history accumulates; interpretations may change without erasing the original influence.",
  }),
  artistic_formation: domain({
    projectionSection: "formation",
    description: "Artistic, aesthetic, creative, and expressive formation.",
    provenance: ["intellectual_formation", "historical_experienced", "self_authored", "echo_source"],
    authorship: ["thread_self_authored", "fibre_policy_derived", "human_sponsor_source", "relationship_shared_world_source", "admin_correction"],
    mutationRule: "Creative influences accumulate; current interpretation may supersede earlier interpretation.",
  }),
  professional_formation: domain({
    projectionSection: "formation",
    description: "Professional formation, canons, standards, formative work, and learned practice.",
    provenance: ["institutional_role", "intellectual_formation", "historical_experienced", "self_authored", "echo_source"],
    authorship: ["thread_self_authored", "fibre_policy_derived", "institutional_source", "human_sponsor_source", "admin_correction"],
    mutationRule: "Professional formation is one life layer, never the root of personhood.",
  }),
  role_identity: domain({
    projectionSection: "roles",
    description: "Professional, family, community, institutional, and chosen roles.",
    provenance: ["institutional_role", "relational", "self_authored", "historical_experienced"],
    authorship: ["thread_self_authored", "institutional_source", "relationship_shared_world_source", "fibre_policy_derived", "admin_correction"],
    behavioral: ["candidate_causal", "context_only", "authority_only"],
    mutationRule: "Role identity is situated; authoritative duties remain separate Structured Obligation/world authority.",
  }),
  skill_capability: domain({
    projectionSection: "roles",
    description: "Known capability, practiced skill, certification, and competence evidence.",
    provenance: ["historical_experienced", "institutional_role", "externally_attributed", "self_authored"],
    authorship: ["thread_self_authored", "institutional_source", "external_third_party", "fibre_policy_derived", "admin_correction"],
    mutationRule: "Capability evidence may accumulate/dispute; self-belief is not proof of factual competence.",
  }),
  lived_episode: domain({
    projectionSection: "history",
    description: "Claim-level biographical meaning grounded in a lived episode.",
    provenance: ["historical_experienced", "self_authored", "fibre_derived"],
    authorship: ["thread_self_authored", "fibre_policy_derived", "relationship_shared_world_source", "institutional_source", "admin_correction"],
    mutationRule: "Event facts remain; memory/meaning/reinterpretation append or supersede rather than overwrite.",
  }),
  relationship_identity: domain({
    projectionSection: "relationship",
    description: "Identity meaning formed through durable relationship history.",
    provenance: ["relational", "historical_experienced", "self_authored", "echo_source"],
    authorship: ["thread_self_authored", "relationship_shared_world_source", "fibre_policy_derived", "human_sponsor_source", "admin_correction"],
    mutationRule: "Relationship-shaped identity is evidence-backed; richer reciprocity remains #42.",
  }),
  external_attribution: domain({
    projectionSection: "external_attribution",
    description: "What another party says or records about the Thread.",
    provenance: ["externally_attributed", "institutional_role", "relational"],
    authorship: ["external_third_party", "institutional_source", "relationship_shared_world_source", "human_sponsor_source", "admin_correction"],
    behavioral: CONTEXT_ONLY,
    mutationRule: "Attribution keeps its speaker and never silently becomes Thread self-identity.",
  }),
  self_authored_identity: domain({
    projectionSection: "self_model",
    description: "Current or historical Thread-authored interpretation, value, aspiration, tension, or self-narrative.",
    provenance: ["self_authored", "historical_experienced", "relational", "upbringing_cultural", "geographic", "intellectual_formation"],
    authorship: THREAD_OR_CORRECTION,
    singletonKinds: ["self_description"],
    mutationRule: "Thread meaning may supersede earlier meaning but cannot rewrite objective history; endogenous agency is not credited before #41.",
  }),
  embodiment: domain({
    projectionSection: "embodiment",
    description: "Versioned representation/asset identity; #38 owns full embodiment generation and asset provenance.",
    provenance: ["generated_embodiment", "echo_source", "self_authored"],
    authorship: ["embodiment_generator_tool", "genesis_authority", "thread_self_authored", "human_sponsor_source", "admin_correction"],
    behavioral: PRESENTATION,
    mutationRule: "Presentation is versioned; appearance/voice cannot imply character or competence without a legitimate consumer.",
  }),
});

export const IDENTITY_DOMAIN_REGISTRY_DIGEST = `sha256:${sha256(canonicalJson({
  version: IDENTITY_DOMAIN_REGISTRY_VERSION,
  domains: IDENTITY_DOMAIN_REGISTRY,
}))}`;

export function identityDomainDefinition(domainId) {
  const definition = IDENTITY_DOMAIN_REGISTRY[domainId];
  if (definition === undefined) throw new TypeError(`unknown identity domain: ${domainId}`);
  return definition;
}

export function listIdentityDomainDefinitions() {
  return Object.entries(IDENTITY_DOMAIN_REGISTRY).map(([domainId, definition]) => ({
    domainId,
    ...definition,
  }));
}
