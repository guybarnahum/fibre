import { assertNonEmpty, assertPlainObject } from "./persistence-common.mjs";

export const IDENTITY_ATOMIC_CLAIM_POLICY = Object.freeze({
  id: "identity_atomic_material_proposition",
  version: "1",
});

const LIST_OR_PARAGRAPH_PATTERN = /(?:\r|\n|^\s*[-*•]\s|\n\s*\d+[.)]\s)/m;
const MULTI_SENTENCE_PATTERN = /[.!?]\s+[A-Z0-9]/;
const EXPLICIT_BUNDLE_PATTERN = /\b(?:separately|in addition|additionally|another fact|also has|and also|secondly|thirdly)\b/i;

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

export function assertAtomicClaimAdmission(admission) {
  assertPlainObject("identity assertion.admission", admission);
  assertPlainObject("identity assertion.admission.policy", admission.policy);
  if (
    admission.policy.id !== IDENTITY_ATOMIC_CLAIM_POLICY.id ||
    admission.policy.version !== IDENTITY_ATOMIC_CLAIM_POLICY.version
  ) {
    throw new TypeError(
      `registry v2 identity assertions require ${IDENTITY_ATOMIC_CLAIM_POLICY.id}:${IDENTITY_ATOMIC_CLAIM_POLICY.version} admission`,
    );
  }
  return admission;
}

export function assertRegistryV2ClaimDiscipline(assertion) {
  assertPlainObject("identity assertion", assertion);
  assertSingleMaterialProposition(assertion.meaning);
  assertAtomicClaimAdmission(assertion.admission);
  return assertion;
}
