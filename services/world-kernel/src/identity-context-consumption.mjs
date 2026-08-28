import {
  assertId,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";
import { IDENTITY_CONTEXT_PROJECTION_POLICY } from "./identity-context-capsule.mjs";

const HASH = /^sha256:[0-9a-f]{64}$/;
const EVIDENCE_KINDS = new Set(["identity", "memory", "current_state"]);

function digest(value) {
  return `sha256:${sha256(canonicalJson(value))}`;
}

function assertHash(name, value) {
  if (typeof value !== "string" || !HASH.test(value)) {
    throw new TypeError(`${name} is invalid`);
  }
}

function assertUniqueStrings(name, value) {
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
  for (const [index, item] of value.entries()) assertId(`${name}[${index}]`, item);
  if (new Set(value).size !== value.length) throw new TypeError(`${name} must contain unique refs`);
}

function assertSourceSnapshot(identityContext) {
  assertPlainObject("identity context sourceSnapshot", identityContext.sourceSnapshot);
  const { sourceSnapshotDigest, ...body } = identityContext.sourceSnapshot;
  assertHash("identity context sourceSnapshotDigest", sourceSnapshotDigest);
  if (digest(body) !== sourceSnapshotDigest) {
    throw new TypeError("identity context source snapshot digest does not match its body");
  }
  if (!Array.isArray(identityContext.sourceSnapshot.bindings)) {
    throw new TypeError("identity context sourceSnapshot.bindings must be an array");
  }
  const bindingRefs = identityContext.sourceSnapshot.bindings.map((binding, index) => {
    assertPlainObject(`identity context sourceSnapshot.bindings[${index}]`, binding);
    assertId(`identity context sourceSnapshot.bindings[${index}].ref`, binding.ref);
    assertNonEmpty(`identity context sourceSnapshot.bindings[${index}].kind`, binding.kind);
    assertHash(
      `identity context sourceSnapshot.bindings[${index}].contentDigest`,
      binding.contentDigest,
    );
    return binding.ref;
  });
  if (new Set(bindingRefs).size !== bindingRefs.length) {
    throw new TypeError("identity context source bindings must contain unique refs");
  }
  return new Set(bindingRefs);
}

export function assertIdentityContextConsumption(identityContext, expected = {}) {
  assertPlainObject("identity context consumption", identityContext);
  assertId("identity context threadId", identityContext.threadId);
  if (!Number.isSafeInteger(identityContext.snapshotVersion) || identityContext.snapshotVersion < 1) {
    throw new TypeError("identity context snapshotVersion is invalid");
  }
  assertId("identity context requestId", identityContext.requestId);
  assertHash("identity context requestFingerprint", identityContext.requestFingerprint);
  if (identityContext.selectionAuthority !== "fibre") {
    throw new TypeError("identity context selectionAuthority must be fibre");
  }
  assertPlainObject("identity context projectionPolicy", identityContext.projectionPolicy);
  if (
    identityContext.projectionPolicy.id !== IDENTITY_CONTEXT_PROJECTION_POLICY.id ||
    identityContext.projectionPolicy.version !== IDENTITY_CONTEXT_PROJECTION_POLICY.version
  ) {
    throw new TypeError("identity context projection policy is not the current bounded policy");
  }

  const bindingRefs = assertSourceSnapshot(identityContext);
  assertUniqueStrings("identity context includedRefs", identityContext.includedRefs);
  if (!Array.isArray(identityContext.excludedRefs)) {
    throw new TypeError("identity context excludedRefs must be an array");
  }
  const excludedRefs = identityContext.excludedRefs.map((item, index) => {
    assertPlainObject(`identity context excludedRefs[${index}]`, item);
    assertId(`identity context excludedRefs[${index}].ref`, item.ref);
    assertNonEmpty(`identity context excludedRefs[${index}].kind`, item.kind);
    assertNonEmpty(`identity context excludedRefs[${index}].reason`, item.reason);
    return item.ref;
  });
  if (new Set(excludedRefs).size !== excludedRefs.length) {
    throw new TypeError("identity context excludedRefs must contain unique refs");
  }

  if (!Array.isArray(identityContext.evidence)) {
    throw new TypeError("identity context evidence must be an array");
  }
  const evidenceRefs = identityContext.evidence.map((item, index) => {
    assertPlainObject(`identity context evidence[${index}]`, item);
    assertId(`identity context evidence[${index}].ref`, item.ref);
    if (!EVIDENCE_KINDS.has(item.kind)) {
      throw new TypeError(`identity context evidence[${index}].kind is invalid`);
    }
    assertNonEmpty(`identity context evidence[${index}].text`, item.text);
    return item.ref;
  });
  if (new Set(evidenceRefs).size !== evidenceRefs.length) {
    throw new TypeError("identity context evidence must contain unique refs");
  }
  if (canonicalJson([...evidenceRefs].sort()) !== canonicalJson([...identityContext.includedRefs].sort())) {
    throw new TypeError("identity context evidence refs do not match includedRefs");
  }

  const partition = [...identityContext.includedRefs, ...excludedRefs];
  if (new Set(partition).size !== partition.length || partition.length !== bindingRefs.size) {
    throw new TypeError("identity context included/excluded refs do not partition source bindings");
  }
  for (const ref of partition) {
    if (!bindingRefs.has(ref)) throw new TypeError(`identity context ref ${ref} has no source binding`);
  }

  if (!Number.isSafeInteger(identityContext.evidenceBytes) || identityContext.evidenceBytes < 0) {
    throw new TypeError("identity context evidenceBytes is invalid");
  }
  const measuredBytes = identityContext.evidence.reduce(
    (total, item) => total + Buffer.byteLength(item.text, "utf8"),
    0,
  );
  if (measuredBytes !== identityContext.evidenceBytes) {
    throw new TypeError("identity context evidenceBytes does not match evidence text");
  }

  const { capsuleDigest, ...body } = identityContext;
  assertHash("identity context capsuleDigest", capsuleDigest);
  if (digest(body) !== capsuleDigest) {
    throw new TypeError("identity context capsule digest does not match its body");
  }

  for (const [name, actual, wanted] of [
    ["threadId", identityContext.threadId, expected.threadId],
    ["snapshotVersion", identityContext.snapshotVersion, expected.snapshotVersion],
    ["requestId", identityContext.requestId, expected.requestId],
    ["requestFingerprint", identityContext.requestFingerprint, expected.requestFingerprint],
  ]) {
    if (wanted !== undefined && actual !== wanted) {
      throw new TypeError(`identity context ${name} does not match its Guardian request`);
    }
  }
  return identityContext;
}

export function guardianIndividualEvidence(identityContext) {
  assertIdentityContextConsumption(identityContext);
  return identityContext.evidence
    .filter((item) => item.kind === "identity" || item.kind === "memory")
    .map((item) => ({ ...item }));
}

export function identityContextConsumptionWitness(identityContext) {
  assertIdentityContextConsumption(identityContext);
  return {
    projectionPolicy: { ...identityContext.projectionPolicy },
    capsuleDigest: identityContext.capsuleDigest,
    sourceSnapshotDigest: identityContext.sourceSnapshot.sourceSnapshotDigest,
    includedRefs: [...identityContext.includedRefs],
  };
}
