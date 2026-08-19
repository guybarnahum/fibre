import {
  assertExactKeys,
  assertId,
  assertIsoTimestamp,
  assertPlainObject,
  assertStringArray,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";

export const GENESIS_ORIGIN_AUTHORITY_KINDS = Object.freeze([
  "living_source_consent",
  "subject_status_attestation",
]);

export const GENESIS_ORIGIN_AUTHORITY_SUBJECT_STATUSES = Object.freeze([
  "living",
  "deceased",
  "fictional",
]);

function assertEnum(name, value, allowed) {
  if (!allowed.includes(value)) throw new TypeError(`${name} is invalid`);
}

export function normalizeGenesisOriginAuthority(candidate) {
  assertPlainObject("Genesis origin authority", candidate);
  assertExactKeys("Genesis origin authority", candidate, [
    "authorityRef",
    "authorityKind",
    "sourcePartyId",
    "subjectStatus",
    "assertedAt",
    "provenanceRefs",
  ]);
  assertId("Genesis origin authority.authorityRef", candidate.authorityRef);
  assertEnum("Genesis origin authority.authorityKind", candidate.authorityKind, GENESIS_ORIGIN_AUTHORITY_KINDS);
  assertId("Genesis origin authority.sourcePartyId", candidate.sourcePartyId);
  assertEnum("Genesis origin authority.subjectStatus", candidate.subjectStatus, GENESIS_ORIGIN_AUTHORITY_SUBJECT_STATUSES);
  assertIsoTimestamp("Genesis origin authority.assertedAt", candidate.assertedAt);
  assertStringArray("Genesis origin authority.provenanceRefs", candidate.provenanceRefs);
  if (candidate.provenanceRefs.length === 0) {
    throw new TypeError("Genesis origin authority requires at least one provenanceRef");
  }
  if (new Set(candidate.provenanceRefs).size !== candidate.provenanceRefs.length) {
    throw new TypeError("Genesis origin authority.provenanceRefs must not contain duplicates");
  }

  if (candidate.authorityKind === "living_source_consent" && candidate.subjectStatus !== "living") {
    throw new TypeError("living_source_consent requires subjectStatus=living");
  }
  if (candidate.authorityKind === "subject_status_attestation" && !["deceased", "fictional"].includes(candidate.subjectStatus)) {
    throw new TypeError("subject_status_attestation requires deceased or fictional subject status");
  }

  return Object.freeze({
    authorityRef: candidate.authorityRef,
    authorityKind: candidate.authorityKind,
    sourcePartyId: candidate.sourcePartyId,
    subjectStatus: candidate.subjectStatus,
    assertedAt: candidate.assertedAt,
    provenanceRefs: Object.freeze([...candidate.provenanceRefs]),
  });
}

export function genesisOriginAuthorityDigest(candidate) {
  return `sha256:${sha256(canonicalJson(normalizeGenesisOriginAuthority(candidate)))}`;
}
