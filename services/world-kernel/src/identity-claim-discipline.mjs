import {
  assertExactKeys,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
} from "./persistence-common.mjs";

export const IDENTITY_ATOMIC_CLAIM_POLICY_V1 = Object.freeze({
  id: "identity_atomic_material_proposition",
  version: "1",
});

export const IDENTITY_ATOMIC_CLAIM_POLICY_V2 = Object.freeze({
  id: "identity_atomic_material_proposition",
  version: "2",
});

// Current write policy. Historical rows never validate against this moving alias;
// they dispatch through the immutable policy witness stored with the row.
export const IDENTITY_ATOMIC_CLAIM_POLICY = IDENTITY_ATOMIC_CLAIM_POLICY_V2;

export const IDENTITY_CLAIM_STRUCTURE = "subject_predicate_object:1";
export const MAX_CLAIM_PREDICATE_BYTES = 120;

const LIST_OR_PARAGRAPH_PATTERN = /(?:\r|\n|^\s*[-*•]\s|\n\s*\d+[.)]\s)/m;
const MULTI_SENTENCE_PATTERN = /[.!?]\s+[A-Za-z0-9]/;
const EXPLICIT_BUNDLE_PATTERN = /(?:;|\u2014|\u2013|\b(?:and also|as well as|separately|in addition|additionally|another fact|also has|secondly|thirdly)\b)/i;
const MULTI_AND_CHAIN_PATTERN = /\band\b[^\r\n.!?;—–]*\band\b/i;
const PREDICATE_PATTERN = /^[a-z0-9][a-z0-9_]{0,63}$/;
const PREDICATE_COMPONENT_BUNDLE_PATTERN = /(?:\r|\n|;|\u2014|\u2013|\s+and\s+)/i;

function policyKey(policy) {
  return `${policy.id}:${policy.version}`;
}

function normalizePolicy(name, policy) {
  assertPlainObject(name, policy);
  assertExactKeys(name, policy, ["id", "version"]);
  assertNonEmpty(`${name}.id`, policy.id);
  assertNonEmpty(`${name}.version`, policy.version);
  return { id: policy.id, version: policy.version };
}

export function assertSingleMaterialProposition(meaning) {
  assertNonEmpty("identity assertion.meaning", meaning);
  if (LIST_OR_PARAGRAPH_PATTERN.test(meaning)) {
    throw new TypeError(
      "identity assertion.meaning must be one material proposition, not a paragraph/list bundle",
    );
  }
  if (MULTI_SENTENCE_PATTERN.test(meaning)) {
    throw new TypeError(
      "identity assertion.meaning must be one material proposition; split independently falsifiable sentences into separate assertions",
    );
  }
  if (EXPLICIT_BUNDLE_PATTERN.test(meaning)) {
    throw new TypeError(
      "identity assertion.meaning appears to bundle independently addressable propositions; split the claim",
    );
  }
  return meaning;
}

export function normalizeClaimPredicate(value) {
  assertPlainObject("identity assertion.claimPredicate", value);
  assertExactKeys("identity assertion.claimPredicate", value, ["subject", "predicate", "object"]);
  assertNonEmpty("identity assertion.claimPredicate.subject", value.subject);
  assertNonEmpty("identity assertion.claimPredicate.predicate", value.predicate);
  assertNonEmpty("identity assertion.claimPredicate.object", value.object);
  if (!PREDICATE_PATTERN.test(value.predicate)) {
    throw new TypeError(
      "identity assertion.claimPredicate.predicate must be one lowercase snake_case predicate",
    );
  }
  for (const [name, component] of [
    ["subject", value.subject],
    ["object", value.object],
  ]) {
    if (PREDICATE_COMPONENT_BUNDLE_PATTERN.test(component)) {
      throw new TypeError(
        `identity assertion.claimPredicate.${name} must identify one subject/object, not a compound proposition`,
      );
    }
  }
  const normalized = {
    subject: value.subject,
    predicate: value.predicate,
    object: value.object,
  };
  if (Buffer.byteLength(canonicalJson(normalized), "utf8") > MAX_CLAIM_PREDICATE_BYTES) {
    throw new TypeError(
      `identity assertion.claimPredicate exceeds ${MAX_CLAIM_PREDICATE_BYTES} UTF-8 bytes`,
    );
  }
  return normalized;
}

function assertAtomicV1(assertion) {
  assertPlainObject("identity assertion", assertion);
  assertSingleMaterialProposition(assertion.meaning);
  normalizeClaimPredicate(assertion.claimPredicate);
  return assertion;
}

function assertAtomicV2(assertion) {
  assertAtomicV1(assertion);
  if (MULTI_AND_CHAIN_PATTERN.test(assertion.meaning)) {
    throw new TypeError(
      "identity assertion.meaning appears to chain multiple independently addressable propositions with repeated conjunctions; split the claim",
    );
  }
  return assertion;
}

const HISTORICAL_DISCIPLINE_VALIDATORS = Object.freeze({
  [policyKey(IDENTITY_ATOMIC_CLAIM_POLICY_V1)]: assertAtomicV1,
  [policyKey(IDENTITY_ATOMIC_CLAIM_POLICY_V2)]: assertAtomicV2,
});

export function assertRecordedClaimDiscipline(assertion) {
  assertPlainObject("identity assertion", assertion);
  assertPlainObject("identity assertion.admission", assertion.admission);
  const witness = normalizePolicy(
    "identity assertion.admission.claimDiscipline",
    assertion.admission.claimDiscipline,
  );
  const validator = HISTORICAL_DISCIPLINE_VALIDATORS[policyKey(witness)];
  if (validator === undefined) {
    throw new TypeError(
      `unknown historical identity claim discipline ${policyKey(witness)}`,
    );
  }
  return validator(assertion);
}

export function assertCurrentClaimDiscipline(assertion) {
  assertPlainObject("identity assertion", assertion);
  assertPlainObject("identity assertion.admission", assertion.admission);
  const witness = normalizePolicy(
    "identity assertion.admission.claimDiscipline",
    assertion.admission.claimDiscipline,
  );
  if (policyKey(witness) !== policyKey(IDENTITY_ATOMIC_CLAIM_POLICY)) {
    throw new TypeError(
      `new registry v2 identity assertions require current claim discipline ${policyKey(IDENTITY_ATOMIC_CLAIM_POLICY)}`,
    );
  }
  return assertRecordedClaimDiscipline(assertion);
}

// Compatibility alias for existing callers: this is a write-time admission check.
export const assertRegistryV2ClaimDiscipline = assertCurrentClaimDiscipline;
