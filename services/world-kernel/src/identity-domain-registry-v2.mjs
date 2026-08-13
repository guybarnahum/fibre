import { canonicalJson, sha256 } from "./persistence-common.mjs";
import { IDENTITY_DOMAIN_REGISTRIES } from "./identity-domain-registry.mjs";
import { IDENTITY_ATOMIC_CLAIM_POLICY } from "./identity-claim-discipline.mjs";

export const IDENTITY_DOMAIN_REGISTRY_V2_VERSION = "2";

const V1 = IDENTITY_DOMAIN_REGISTRIES["1"];

function disciplined(definition) {
  return Object.freeze({
    ...definition,
    claimDiscipline: Object.freeze({ ...IDENTITY_ATOMIC_CLAIM_POLICY }),
  });
}

function v2Domain({
  projectionSection,
  description,
  provenance,
  authorship,
  behavioral = ["candidate_causal", "context_only"],
  singletonKinds = [],
  mutationRule,
}) {
  return disciplined(Object.freeze({
    projectionSection,
    description,
    allowedProvenanceClasses: Object.freeze([...provenance]),
    allowedAuthorshipKinds: Object.freeze([...authorship]),
    allowedBehavioralStatuses: Object.freeze([...behavioral]),
    singletonKinds: Object.freeze([...singletonKinds]),
    mutationRule,
  }));
}

const inheritedV1 = Object.fromEntries(
  Object.entries(V1).map(([domainId, definition]) => [domainId, disciplined(definition)]),
);

export const IDENTITY_DOMAIN_REGISTRY_V2 = Object.freeze({
  ...inheritedV1,

  lineage_relation: v2Domain({
    projectionSection: "lineage",
    description: "One explicit parent, child, sibling, adoption, sponsorship, or source-lineage relation.",
    provenance: ["inherited", "relational", "birth_created", "echo_source"],
    authorship: ["genesis_authority", "relationship_shared_world_source", "fibre_policy_derived", "admin_correction"],
    behavioral: ["context_only"],
    mutationRule: "One assertion represents one relation between exact parties; lineage alone never implies personality.",
  }),

  family_role: v2Domain({
    projectionSection: "lineage",
    description: "One family or household role grounded in an explicit relationship/world record.",
    provenance: ["relational", "birth_created", "historical_experienced"],
    authorship: ["genesis_authority", "relationship_shared_world_source", "fibre_policy_derived", "admin_correction"],
    behavioral: ["candidate_causal", "context_only"],
    mutationRule: "Role and relationship facts remain separate from behavioral meaning or binding authority.",
  }),

  ancestral_origin: v2Domain({
    projectionSection: "lineage",
    description: "One explicit ancestral-origin fact with provenance; never a stereotype or inferred character trait.",
    provenance: ["inherited", "birth_created", "echo_source"],
    authorship: ["genesis_authority", "human_sponsor_source", "fibre_policy_derived", "admin_correction"],
    behavioral: ["context_only"],
    mutationRule: "Origin facts may be corrected from evidence but cannot directly mint preferences, values, competence, or willingness.",
  }),

  cultural_formation: v2Domain({
    projectionSection: "culture",
    description: "One lived cultural formation claim grounded in household, ritual, migration, regional, or other explicit experience.",
    provenance: ["upbringing_cultural", "historical_experienced", "echo_source", "self_authored"],
    authorship: ["genesis_authority", "human_sponsor_source", "relationship_shared_world_source", "thread_self_authored", "fibre_policy_derived", "admin_correction"],
    mutationRule: "One assertion carries one formation claim; demographic labels cannot substitute for lived meaning.",
  }),

  geography_residence: v2Domain({
    projectionSection: "geography",
    description: "One residence interval or residence event in the Thread life timeline.",
    provenance: ["geographic", "historical_experienced", "echo_source"],
    authorship: ["genesis_authority", "institutional_source", "fibre_policy_derived", "admin_correction"],
    behavioral: ["context_only"],
    mutationRule: "One assertion represents one place/interval fact; personal meaning belongs in place_meaning.",
  }),

  geography_work: v2Domain({
    projectionSection: "geography",
    description: "One work-location interval or event, kept separate from residence and place meaning.",
    provenance: ["geographic", "historical_experienced", "institutional_role", "echo_source"],
    authorship: ["institutional_source", "genesis_authority", "fibre_policy_derived", "admin_correction"],
    behavioral: ["context_only"],
    mutationRule: "Work place is situated history, not root identity.",
  }),

  place_meaning: v2Domain({
    projectionSection: "geography",
    description: "One Thread interpretation of what a particular place means in its life.",
    provenance: ["geographic", "historical_experienced", "self_authored", "echo_source"],
    authorship: ["thread_self_authored", "genesis_authority", "human_sponsor_source", "fibre_policy_derived", "admin_correction"],
    mutationRule: "Place meaning may change without rewriting the underlying geography fact.",
  }),

  embodiment_visual: v2Domain({
    projectionSection: "embodiment",
    description: "One versioned visual embodiment representation or source identity claim.",
    provenance: ["generated_embodiment", "echo_source", "self_authored"],
    authorship: ["embodiment_generator_tool", "genesis_authority", "human_sponsor_source", "thread_self_authored", "admin_correction"],
    behavioral: ["presentation_only", "context_only"],
    mutationRule: "Visual embodiment is versioned and provenance-bound; appearance cannot imply character or competence.",
  }),

  embodiment_voice: v2Domain({
    projectionSection: "embodiment",
    description: "One versioned voice embodiment representation or source identity claim.",
    provenance: ["generated_embodiment", "echo_source", "self_authored"],
    authorship: ["embodiment_generator_tool", "genesis_authority", "human_sponsor_source", "thread_self_authored", "admin_correction"],
    behavioral: ["presentation_only", "context_only"],
    mutationRule: "Voice is versioned and provenance-bound; accent or vocal style cannot imply values, competence, or willingness.",
  }),

  memory_interpretation: v2Domain({
    projectionSection: "history",
    description: "One autobiographical interpretation linked to a durable memory record, distinct from historical event truth.",
    provenance: ["historical_experienced", "self_authored", "fibre_derived"],
    authorship: ["thread_self_authored", "fibre_policy_derived", "genesis_authority", "admin_correction"],
    mutationRule: "Memory interpretation may supersede earlier memory meaning but cannot rewrite historical evidence.",
  }),
});

export const IDENTITY_DOMAIN_REGISTRY_V2_DIGEST = `sha256:${sha256(canonicalJson({
  version: IDENTITY_DOMAIN_REGISTRY_V2_VERSION,
  domains: IDENTITY_DOMAIN_REGISTRY_V2,
}))}`;

export function identityDomainV2Definition(domainId) {
  const definition = IDENTITY_DOMAIN_REGISTRY_V2[domainId];
  if (definition === undefined) {
    throw new TypeError(`unknown identity domain ${domainId} in registry version 2`);
  }
  return definition;
}
