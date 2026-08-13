import {
  assertExactKeys,
  assertId,
  assertIsoTimestamp,
  assertNonEmpty,
  assertPlainObject,
  assertStringArray,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import { EMBODIMENT_KINDS, EMBODIMENT_VISIBILITIES } from "./embodiment-domain.mjs";

export const EMBODIMENT_RIGHTS_AUTHORITY_KINDS = Object.freeze([
  "explicit_consent",
  "public_domain_source",
]);

function assertEnum(name, value, allowed) {
  if (!allowed.includes(value)) throw new TypeError(`${name} is invalid`);
}

export function embodimentRightsAuthorityId(seed) {
  return `era_${sha256(canonicalJson(seed))}`;
}

export function normalizeEmbodimentRightsAuthority(value) {
  assertPlainObject("embodiment rights authority", value);
  assertExactKeys("embodiment rights authority", value, [
    "authorityId",
    "threadId",
    "authorityKind",
    "sourcePartyId",
    "permittedKinds",
    "maxVisibility",
    "evidenceReferences",
    "recordedAt",
  ]);
  assertId("embodiment rights authority.authorityId", value.authorityId);
  assertId("embodiment rights authority.threadId", value.threadId);
  assertEnum("embodiment rights authority.authorityKind", value.authorityKind, EMBODIMENT_RIGHTS_AUTHORITY_KINDS);
  assertId("embodiment rights authority.sourcePartyId", value.sourcePartyId);
  assertStringArray("embodiment rights authority.permittedKinds", value.permittedKinds);
  if (value.permittedKinds.length === 0) throw new TypeError("embodiment rights authority.permittedKinds must not be empty");
  if (new Set(value.permittedKinds).size !== value.permittedKinds.length) throw new TypeError("embodiment rights authority.permittedKinds must be unique");
  value.permittedKinds.forEach((kind) => assertEnum("embodiment rights authority.permittedKinds[]", kind, EMBODIMENT_KINDS));
  assertEnum("embodiment rights authority.maxVisibility", value.maxVisibility, EMBODIMENT_VISIBILITIES);
  assertStringArray("embodiment rights authority.evidenceReferences", value.evidenceReferences);
  if (value.evidenceReferences.length === 0) throw new TypeError("embodiment rights authority.evidenceReferences must not be empty");
  if (new Set(value.evidenceReferences).size !== value.evidenceReferences.length) throw new TypeError("embodiment rights authority.evidenceReferences must be unique");
  value.evidenceReferences.forEach((reference, index) => assertId(`embodiment rights authority.evidenceReferences[${index}]`, reference));
  assertIsoTimestamp("embodiment rights authority.recordedAt", value.recordedAt);
  return {
    authorityId: value.authorityId,
    threadId: value.threadId,
    authorityKind: value.authorityKind,
    sourcePartyId: value.sourcePartyId,
    permittedKinds: [...value.permittedKinds].sort(),
    maxVisibility: value.maxVisibility,
    evidenceReferences: [...value.evidenceReferences],
    recordedAt: value.recordedAt,
  };
}
