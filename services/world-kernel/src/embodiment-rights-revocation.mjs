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

export function embodimentRightsRevocationId(seed) {
  return `err_${sha256(canonicalJson(seed))}`;
}

export function normalizeEmbodimentRightsRevocation(value) {
  assertPlainObject("embodiment rights revocation", value);
  assertExactKeys("embodiment rights revocation", value, [
    "revocationId", "threadId", "authorityId", "reason", "evidenceReferences", "recordedAt",
  ]);
  assertId("embodiment rights revocation.revocationId", value.revocationId);
  assertId("embodiment rights revocation.threadId", value.threadId);
  assertId("embodiment rights revocation.authorityId", value.authorityId);
  assertNonEmpty("embodiment rights revocation.reason", value.reason);
  if (Buffer.byteLength(value.reason, "utf8") < 16) {
    throw new TypeError("embodiment rights revocation.reason must contain at least 16 UTF-8 bytes");
  }
  assertStringArray("embodiment rights revocation.evidenceReferences", value.evidenceReferences);
  if (value.evidenceReferences.length === 0) throw new TypeError("embodiment rights revocation.evidenceReferences must not be empty");
  if (new Set(value.evidenceReferences).size !== value.evidenceReferences.length) throw new TypeError("embodiment rights revocation.evidenceReferences must be unique");
  value.evidenceReferences.forEach((reference, index) => assertId(`embodiment rights revocation.evidenceReferences[${index}]`, reference));
  assertIsoTimestamp("embodiment rights revocation.recordedAt", value.recordedAt);
  return {
    revocationId: value.revocationId,
    threadId: value.threadId,
    authorityId: value.authorityId,
    reason: value.reason,
    evidenceReferences: [...value.evidenceReferences],
    recordedAt: value.recordedAt,
  };
}
