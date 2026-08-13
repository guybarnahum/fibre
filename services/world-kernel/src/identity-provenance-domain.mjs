import {
  assertExactKeys,
  assertFiniteNumber,
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
  assertStringArray,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import {
  IDENTITY_ASSERTION_STATUSES,
  IDENTITY_AUTHORSHIP_KINDS,
  IDENTITY_BEHAVIORAL_STATUSES,
  IDENTITY_DOMAIN_REGISTRY_VERSION,
  IDENTITY_PROVENANCE_CLASSES,
  IDENTITY_VISIBILITIES,
  identityDomainDefinition,
} from "./identity-domain-registry.mjs";
import {
  IDENTITY_DOMAIN_REGISTRY_V2_VERSION,
  identityDomainV2Definition,
} from "./identity-domain-registry-v2.mjs";
import {
  assertCurrentClaimDiscipline,
  assertRecordedClaimDiscipline,
  normalizeClaimPredicate,
} from "./identity-claim-discipline.mjs";

export const MAX_IDENTITY_MEANING_BYTES = 2048;
export const MAX_IDENTITY_SOURCE_REFERENCES = 32;

const CLAIM_ID_PATTERN = /^icl_[0-9a-f]{64}$/;
const ASSERTION_ID_PATTERN = /^ias_[0-9a-f]{64}$/;
const KIND_PATTERN = /^[a-z0-9][a-z0-9_]{0,95}$/;
const EVIDENCE_CLASSIFICATIONS = new Set(["exogenous", "endogenous"]);
const SOURCE_MODES = new Set([
  "seed_import",
  "world_event",
  "admin_correction",
  "fibre_derivation",
  "thread_runtime",
]);

export class IdentityConflictError extends Error {}
export class IdentityNotFoundError extends Error {}
export class IdentityHistoryIntegrityError extends Error {}

function identityDefinition(domainId, registryVersion) {
  if (registryVersion === IDENTITY_DOMAIN_REGISTRY_V2_VERSION) {
    return identityDomainV2Definition(domainId);
  }
  return identityDomainDefinition(domainId, { registryVersion });
}

function assertClaimId(name, value) {
  assertNonEmpty(name, value);
  if (!CLAIM_ID_PATTERN.test(value)) {
    throw new TypeError(`${name} must be icl_ followed by 64 lowercase hex characters`);
  }
}

function assertAssertionId(name, value) {
  assertNonEmpty(name, value);
  if (!ASSERTION_ID_PATTERN.test(value)) {
    throw new TypeError(`${name} must be ias_ followed by 64 lowercase hex characters`);
  }
}

function assertKind(name, value) {
  assertNonEmpty(name, value);
  if (!KIND_PATTERN.test(value)) {
    throw new TypeError(`${name} must be lowercase snake_case and at most 96 characters`);
  }
}

function normalizePolicy(name, policy) {
  assertPlainObject(name, policy);
  assertExactKeys(name, policy, ["id", "version"]);
  assertNonEmpty(`${name}.id`, policy.id);
  assertNonEmpty(`${name}.version`, policy.version);
  return { id: policy.id, version: policy.version };
}

function normalizeEntity(name, entity) {
  assertPlainObject(name, entity);
  assertExactKeys(name, entity, ["entityId", "kind", "displayName"]);
  assertId(`${name}.entityId`, entity.entityId);
  assertNonEmpty(`${name}.kind`, entity.kind);
  assertNonEmpty(`${name}.displayName`, entity.displayName);
  return {
    entityId: entity.entityId,
    kind: entity.kind,
    displayName: entity.displayName,
  };
}

function normalizeAuthorship(assertion) {
  const authorship = assertion.authorship;
  assertPlainObject("identity assertion.authorship", authorship);
  assertExactKeys("identity assertion.authorship", authorship, ["kind", "entityId", "policy"]);
  if (!IDENTITY_AUTHORSHIP_KINDS.includes(authorship.kind)) {
    throw new TypeError("identity assertion.authorship.kind is invalid");
  }
  assertId("identity assertion.authorship.entityId", authorship.entityId);
  if (authorship.policy !== undefined) normalizePolicy("identity assertion.authorship.policy", authorship.policy);
  if (authorship.kind === "thread_self_authored" && authorship.entityId !== assertion.threadId) {
    throw new TypeError("Thread-self-authored identity must be authored by the owning Thread");
  }
  const normalized = { kind: authorship.kind, entityId: authorship.entityId };
  if (authorship.policy !== undefined) normalized.policy = normalizePolicy("identity assertion.authorship.policy", authorship.policy);
  return normalized;
}

function normalizeAdmission(admission) {
  assertPlainObject("identity assertion.admission", admission);
  assertExactKeys("identity assertion.admission", admission, [
    "policy",
    "claimDiscipline",
    "admittedBy",
    "evidenceClassification",
    "sourceMode",
  ]);
  const policy = normalizePolicy("identity assertion.admission.policy", admission.policy);
  const admittedBy = normalizeEntity("identity assertion.admission.admittedBy", admission.admittedBy);
  if (!EVIDENCE_CLASSIFICATIONS.has(admission.evidenceClassification)) {
    throw new TypeError("identity assertion.admission.evidenceClassification is invalid");
  }
  if (!SOURCE_MODES.has(admission.sourceMode)) {
    throw new TypeError("identity assertion.admission.sourceMode is invalid");
  }
  const normalized = {
    policy,
    admittedBy,
    evidenceClassification: admission.evidenceClassification,
    sourceMode: admission.sourceMode,
  };
  if (admission.claimDiscipline !== undefined) {
    normalized.claimDiscipline = normalizePolicy(
      "identity assertion.admission.claimDiscipline",
      admission.claimDiscipline,
    );
  }
  return normalized;
}

function normalizeDisputeCorrection(value, status) {
  if (value === undefined) {
    if (status === "disputed" || status === "corrected") {
      throw new TypeError(`${status} identity assertion requires disputeCorrection metadata`);
    }
    return undefined;
  }
  assertPlainObject("identity assertion.disputeCorrection", value);
  assertExactKeys("identity assertion.disputeCorrection", value, [
    "kind",
    "reason",
    "evidenceReferences",
  ]);
  if (value.kind !== "dispute" && value.kind !== "correction") {
    throw new TypeError("identity assertion.disputeCorrection.kind is invalid");
  }
  if (status === "disputed" && value.kind !== "dispute") {
    throw new TypeError("disputed identity assertion requires dispute metadata");
  }
  if (status === "corrected" && value.kind !== "correction") {
    throw new TypeError("corrected identity assertion requires correction metadata");
  }
  assertNonEmpty("identity assertion.disputeCorrection.reason", value.reason);
  assertStringArray(
    "identity assertion.disputeCorrection.evidenceReferences",
    value.evidenceReferences,
  );
  if (value.evidenceReferences.length === 0) {
    throw new TypeError("identity assertion.disputeCorrection.evidenceReferences must not be empty");
  }
  if (new Set(value.evidenceReferences).size !== value.evidenceReferences.length) {
    throw new TypeError("identity assertion.disputeCorrection.evidenceReferences must be unique");
  }
  return {
    kind: value.kind,
    reason: value.reason,
    evidenceReferences: [...value.evidenceReferences],
  };
}

function isLegacyProjectionObservation(candidate, authorship, admission) {
  return candidate.status === "disputed" &&
    candidate.provenanceClass === "fibre_derived" &&
    authorship.kind === "fibre_policy_derived" &&
    authorship.entityId === "fibre.world-kernel" &&
    authorship.policy?.id === "legacy_projection_drift_migration" &&
    admission.policy.id === "legacy_projection_drift_migration" &&
    admission.sourceMode === "fibre_derivation" &&
    admission.evidenceClassification === "exogenous";
}

export function identityClaimId(seed) {
  return `icl_${sha256(canonicalJson(seed))}`;
}

export function identityAssertionId(seed) {
  return `ias_${sha256(canonicalJson(seed))}`;
}

function normalizeIdentityAssertionInternal(
  candidate,
  {
    allowAcceptedCausal = false,
    allowEndogenous = false,
    registryVersion = IDENTITY_DOMAIN_REGISTRY_VERSION,
    admissionMode = "current",
  } = {},
) {
  assertPlainObject("identity assertion", candidate);
  assertExactKeys("identity assertion", candidate, [
    "assertionId",
    "claimId",
    "revision",
    "threadId",
    "domain",
    "kind",
    "claimPredicate",
    "meaning",
    "provenanceClass",
    "authorship",
    "sourceReferences",
    "effectiveAt",
    "recordedAt",
    "visibility",
    "status",
    "supersedesAssertionId",
    "disputeCorrection",
    "projectionClass",
    "behavioralStatus",
    "admission",
  ]);
  assertAssertionId("identity assertion.assertionId", candidate.assertionId);
  assertClaimId("identity assertion.claimId", candidate.claimId);
  assertFiniteNumber("identity assertion.revision", candidate.revision, {
    integer: true,
    minimum: 1,
  });
  assertId("identity assertion.threadId", candidate.threadId);
  const definition = identityDefinition(candidate.domain, registryVersion);
  assertKind("identity assertion.kind", candidate.kind);
  assertNonEmpty("identity assertion.meaning", candidate.meaning);
  if (Buffer.byteLength(candidate.meaning, "utf8") > MAX_IDENTITY_MEANING_BYTES) {
    throw new TypeError(
      `identity assertion.meaning exceeds ${MAX_IDENTITY_MEANING_BYTES} UTF-8 bytes; split the biography into claim-level assertions`,
    );
  }
  if (!IDENTITY_PROVENANCE_CLASSES.includes(candidate.provenanceClass)) {
    throw new TypeError("identity assertion.provenanceClass is invalid");
  }
  const authorship = normalizeAuthorship(candidate);
  const admission = normalizeAdmission(candidate.admission);
  let claimPredicate;
  if (candidate.claimPredicate !== undefined) {
    claimPredicate = normalizeClaimPredicate(candidate.claimPredicate);
  }
  if (registryVersion === IDENTITY_DOMAIN_REGISTRY_V2_VERSION) {
    const disciplineCandidate = { ...candidate, claimPredicate, admission };
    if (admissionMode === "historical") {
      assertRecordedClaimDiscipline(disciplineCandidate);
    } else {
      assertCurrentClaimDiscipline(disciplineCandidate);
    }
  }
  const migrationObservation = isLegacyProjectionObservation(candidate, authorship, admission);
  if (
    !definition.allowedProvenanceClasses.includes(candidate.provenanceClass) &&
    !migrationObservation
  ) {
    throw new TypeError(
      `identity domain ${candidate.domain} does not allow provenance ${candidate.provenanceClass}`,
    );
  }
  if (!definition.allowedAuthorshipKinds.includes(authorship.kind) && !migrationObservation) {
    throw new TypeError(
      `identity domain ${candidate.domain} does not allow authorship ${authorship.kind}`,
    );
  }
  assertStringArray("identity assertion.sourceReferences", candidate.sourceReferences);
  if (candidate.sourceReferences.length === 0) {
    throw new TypeError("identity assertion.sourceReferences must not be empty");
  }
  if (candidate.sourceReferences.length > MAX_IDENTITY_SOURCE_REFERENCES) {
    throw new TypeError(
      `identity assertion.sourceReferences exceeds ${MAX_IDENTITY_SOURCE_REFERENCES} items`,
    );
  }
  if (new Set(candidate.sourceReferences).size !== candidate.sourceReferences.length) {
    throw new TypeError("identity assertion.sourceReferences must be unique");
  }
  candidate.sourceReferences.forEach((reference, index) =>
    assertId(`identity assertion.sourceReferences[${index}]`, reference));
  assertIsoTimestamp("identity assertion.effectiveAt", candidate.effectiveAt);
  assertIsoTimestamp("identity assertion.recordedAt", candidate.recordedAt);
  if (!IDENTITY_VISIBILITIES.includes(candidate.visibility)) {
    throw new TypeError("identity assertion.visibility is invalid");
  }
  if (!IDENTITY_ASSERTION_STATUSES.includes(candidate.status)) {
    throw new TypeError("identity assertion.status is invalid");
  }
  if (candidate.revision === 1) {
    if (candidate.supersedesAssertionId !== undefined) {
      throw new TypeError("identity assertion revision 1 cannot supersede an assertion");
    }
  } else {
    assertAssertionId(
      "identity assertion.supersedesAssertionId",
      candidate.supersedesAssertionId,
    );
  }
  const disputeCorrection = normalizeDisputeCorrection(
    candidate.disputeCorrection,
    candidate.status,
  );
  assertNonEmpty("identity assertion.projectionClass", candidate.projectionClass);
  if (candidate.projectionClass !== definition.projectionSection) {
    throw new TypeError(
      `identity assertion.projectionClass must be ${definition.projectionSection} for domain ${candidate.domain}`,
    );
  }
  if (!IDENTITY_BEHAVIORAL_STATUSES.includes(candidate.behavioralStatus)) {
    throw new TypeError("identity assertion.behavioralStatus is invalid");
  }
  if (candidate.behavioralStatus === "accepted_causal" && !allowAcceptedCausal) {
    throw new TypeError("#38 cannot author accepted_causal identity; #40/#41 standing evidence is required");
  }
  if (!definition.allowedBehavioralStatuses.includes(candidate.behavioralStatus)) {
    if (!(candidate.behavioralStatus === "accepted_causal" && allowAcceptedCausal)) {
      throw new TypeError(
        `identity domain ${candidate.domain} does not allow behavioral status ${candidate.behavioralStatus}`,
      );
    }
  }
  if (admission.evidenceClassification === "endogenous" && !allowEndogenous) {
    throw new TypeError("#38 cannot claim endogenous identity authorship; #42 must earn that evidence");
  }
  if (
    authorship.kind === "thread_self_authored" &&
    admission.evidenceClassification === "endogenous" &&
    admission.sourceMode !== "thread_runtime"
  ) {
    throw new TypeError("endogenous Thread self-authorship requires a Thread runtime source path");
  }

  const normalized = {
    assertionId: candidate.assertionId,
    claimId: candidate.claimId,
    revision: candidate.revision,
    threadId: candidate.threadId,
    domain: candidate.domain,
    kind: candidate.kind,
    ...(claimPredicate === undefined ? {} : { claimPredicate }),
    meaning: candidate.meaning,
    provenanceClass: candidate.provenanceClass,
    authorship,
    sourceReferences: [...candidate.sourceReferences],
    effectiveAt: candidate.effectiveAt,
    recordedAt: candidate.recordedAt,
    visibility: candidate.visibility,
    status: candidate.status,
    projectionClass: candidate.projectionClass,
    behavioralStatus: candidate.behavioralStatus,
    admission,
  };
  if (candidate.supersedesAssertionId !== undefined) {
    normalized.supersedesAssertionId = candidate.supersedesAssertionId;
  }
  if (disputeCorrection !== undefined) normalized.disputeCorrection = disputeCorrection;
  return normalized;
}

export function normalizeIdentityAssertion(candidate, options = {}) {
  return normalizeIdentityAssertionInternal(candidate, {
    ...options,
    admissionMode: "current",
  });
}

export function rehydrateIdentityAssertion(candidate, options = {}) {
  return normalizeIdentityAssertionInternal(candidate, {
    ...options,
    admissionMode: "historical",
  });
}

export function identityAssertionDigest(
  candidate,
  { registryVersion = IDENTITY_DOMAIN_REGISTRY_VERSION } = {},
) {
  const assertion = rehydrateIdentityAssertion(candidate, {
    allowAcceptedCausal: true,
    allowEndogenous: true,
    registryVersion,
  });
  const payload = registryVersion === IDENTITY_DOMAIN_REGISTRY_VERSION
    ? assertion
    : { registryVersion, assertion };
  return `sha256:${sha256(canonicalJson(payload))}`;
}

function bootstrapAdmission() {
  return {
    policy: { id: "legacy_identity_bootstrap", version: "1" },
    admittedBy: {
      entityId: "fibre.world-kernel",
      kind: "institution",
      displayName: "Fibre World Kernel",
    },
    evidenceClassification: "exogenous",
    sourceMode: "seed_import",
  };
}

function bootstrapAssertion(thread, sourceEventId, {
  key,
  domain,
  kind,
  meaning,
  provenanceClass,
  authorshipKind = "genesis_authority",
  behavioralStatus = "context_only",
  visibility = "public",
}) {
  const claimId = identityClaimId({ threadId: thread.threadId, source: "legacy_seed", key });
  const recordedAt = thread.provenance.createdAt;
  const base = {
    claimId,
    revision: 1,
    threadId: thread.threadId,
    domain,
    kind,
    meaning,
    provenanceClass,
    authorship: {
      kind: authorshipKind,
      entityId: authorshipKind === "thread_self_authored"
        ? thread.threadId
        : thread.provenance.createdBy,
    },
    sourceReferences: [sourceEventId],
    effectiveAt: recordedAt,
    recordedAt,
    visibility,
    status: "current",
    projectionClass: identityDomainDefinition(domain, { registryVersion: "1" }).projectionSection,
    behavioralStatus,
    admission: bootstrapAdmission(),
  };
  return normalizeIdentityAssertion({
    ...base,
    assertionId: identityAssertionId({
      claimId,
      revision: 1,
      meaning,
      recordedAt,
    }),
  }, { registryVersion: "1" });
}

function snakeKey(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 64) || "trait";
}

export function legacySeedIdentityAssertions(thread, { sourceEventId = thread?.provenance?.lastEventId } = {}) {
  assertPlainObject("legacy Thread", thread);
  assertId("legacy Thread.threadId", thread.threadId);
  assertPlainObject("legacy Thread.identity", thread.identity);
  assertPlainObject("legacy Thread.provenance", thread.provenance);
  assertId("legacy identity sourceEventId", sourceEventId);
  assertIsoTimestamp("legacy Thread.provenance.createdAt", thread.provenance.createdAt);
  assertNonEmpty("legacy Thread.provenance.createdBy", thread.provenance.createdBy);

  const assertions = [
    bootstrapAssertion(thread, sourceEventId, {
      key: "identity.name",
      domain: "passport_name",
      kind: "canonical_name",
      meaning: thread.identity.name,
      provenanceClass: "birth_created",
    }),
    bootstrapAssertion(thread, sourceEventId, {
      key: "identity.originOrientation",
      domain: "passport_origin",
      kind: "origin_orientation",
      meaning: thread.identity.originOrientation ?? "original",
      provenanceClass: "birth_created",
    }),
    bootstrapAssertion(thread, sourceEventId, {
      key: "identity.selfDescription",
      domain: "self_authored_identity",
      kind: "self_description",
      meaning: thread.identity.selfDescription,
      provenanceClass: "self_authored",
      authorshipKind: "thread_self_authored",
      behavioralStatus: "candidate_causal",
    }),
  ];

  if (typeof thread.identity.birthCity === "string" && thread.identity.birthCity.length > 0) {
    assertions.push(bootstrapAssertion(thread, sourceEventId, {
      key: "identity.birthCity",
      domain: "geography",
      kind: "birth_place",
      meaning: thread.identity.birthCity,
      provenanceClass: "geographic",
    }));
  }
  if (typeof thread.identity.currentWorkCity === "string" && thread.identity.currentWorkCity.length > 0) {
    assertions.push(bootstrapAssertion(thread, sourceEventId, {
      key: "identity.currentWorkCity",
      domain: "geography",
      kind: "legacy_current_work_place",
      meaning: thread.identity.currentWorkCity,
      provenanceClass: "geographic",
    }));
  }
  if (Array.isArray(thread.identity.culture)) {
    thread.identity.culture.forEach((meaning, index) => {
      if (typeof meaning !== "string" || meaning.length === 0) return;
      assertions.push(bootstrapAssertion(thread, sourceEventId, {
        key: `identity.culture.${index}`,
        domain: "upbringing_culture",
        kind: "legacy_cultural_formation",
        meaning,
        provenanceClass: "upbringing_cultural",
      }));
    });
  }
  if (typeof thread.identity.portraitRef === "string" && thread.identity.portraitRef.length > 0) {
    assertions.push(bootstrapAssertion(thread, sourceEventId, {
      key: "identity.portraitRef",
      domain: "embodiment",
      kind: "legacy_portrait_reference",
      meaning: `Legacy portrait asset reference: ${thread.identity.portraitRef}`,
      provenanceClass: "generated_embodiment",
      behavioralStatus: "presentation_only",
    }));
  }
  if (typeof thread.identity.voiceRef === "string" && thread.identity.voiceRef.length > 0) {
    assertions.push(bootstrapAssertion(thread, sourceEventId, {
      key: "identity.voiceRef",
      domain: "embodiment",
      kind: "legacy_voice_reference",
      meaning: `Legacy voice asset reference: ${thread.identity.voiceRef}`,
      provenanceClass: "generated_embodiment",
      behavioralStatus: "presentation_only",
    }));
  }
  if (thread.genome?.textualTraits && typeof thread.genome.textualTraits === "object") {
    for (const [trait, meaning] of Object.entries(thread.genome.textualTraits)) {
      if (typeof meaning !== "string" || meaning.length === 0) continue;
      assertions.push(bootstrapAssertion(thread, sourceEventId, {
        key: `genome.textualTraits.${trait}`,
        domain: "inherited_disposition",
        kind: `legacy_genome_trait_${snakeKey(trait)}`,
        meaning,
        provenanceClass: "inherited",
        behavioralStatus: "candidate_causal",
        visibility: "private",
      }));
    }
  }
  return assertions;
}
