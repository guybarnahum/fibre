import {
  assertExactKeys,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
} from "./persistence-common.mjs";

export const IDENTITY_ATOMIC_CLAIM_POLICY = Object.freeze({
  id: "identity_atomic_material_proposition",
  version: "1",
});

export const IDENTITY_CLAIM_STRUCTURE = "subject_predicate_object:1";
export const MAX_CLAIM_PREDICATE_BYTES = 120;

function policyKey(policy) {
  return `${policy.id}:${policy.version}`;
}

function preWitnessAtomicAdmission(assertion) {
  if (assertion.claimPredicate !== undefined) {
    throw new TypeError("pre-witness identity assertion cannot carry claimPredicate");
  }
  assertPlainObject("identity assertion.admission.policy", assertion.admission.policy);
  if (
    assertion.admission.policy.id !== IDENTITY_ATOMIC_CLAIM_POLICY.id
    || assertion.admission.policy.version !== IDENTITY_ATOMIC_CLAIM_POLICY.version
  ) {
    throw new TypeError("historical identity assertion without claimDiscipline lacks the pre-witness atomic admission policy");
  }
  const meaning=assertion.meaning;
  assertNonEmpty("identity assertion.meaning", meaning);
  if (meaning.includes("\n")) throw new TypeError("identity assertion.meaning must be one material proposition");
  for (let index=0;index<meaning.length-2;index+=1) {
    if (!".!?".includes(meaning[index]) || meaning[index+1]!==" ") continue;
    const next=meaning[index+2];
    if ((next>="A"&&next<="Z")||(next>="0"&&next<="9")) {
      throw new TypeError("identity assertion.meaning must be one material proposition");
    }
  }
  const lower=meaning.toLowerCase();
  for (const marker of [" separately "," in addition "," additionally "," another fact "," also has "," and also "," secondly "," thirdly "]) {
    if (lower.includes(marker)) throw new TypeError("identity assertion.meaning must not bundle independently addressable propositions");
  }
  return assertion;
}


function normalizePolicy(name, policy) {
  assertPlainObject(name, policy);
  assertExactKeys(name, policy, ["id", "version"]);
  assertNonEmpty(`${name}.id`, policy.id);
  assertNonEmpty(`${name}.version`, policy.version);
  return { id: policy.id, version: policy.version };
}

function hasMultipleSentences(text) {
  for (let index = 0; index < text.length - 2; index += 1) {
    if (!".!?".includes(text[index])) continue;
    if (text[index + 1] !== " ") continue;
    const next = text[index + 2];
    if ((next >= "A" && next <= "Z") || (next >= "a" && next <= "z") || (next >= "0" && next <= "9")) return true;
  }
  return false;
}

export function assertSingleMaterialProposition(meaning) {
  assertNonEmpty("identity assertion.meaning", meaning);
  const lower = meaning.toLowerCase();
  if (meaning.includes("\n") || meaning.includes(";") || meaning.includes("—") || meaning.includes("–") || hasMultipleSentences(meaning)) {
    throw new TypeError("identity assertion.meaning must be one material proposition");
  }
  for (const marker of [" and also ", " as well as ", " separately ", " in addition ", " additionally ", " another fact ", " also has ", " secondly ", " thirdly "]) {
    if (lower.includes(marker)) throw new TypeError("identity assertion.meaning must not bundle independently addressable propositions");
  }
  return meaning;
}

function validPredicate(value) {
  if (value.length < 1 || value.length > 64) return false;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const alpha = char >= "a" && char <= "z";
    const digit = char >= "0" && char <= "9";
    if (!alpha && !digit && char !== "_") return false;
    if (index === 0 && char === "_") return false;
  }
  return true;
}

function compoundComponent(value) {
  const lower = value.toLowerCase();
  return value.includes("\n") || value.includes(";") || value.includes("—") || value.includes("–") || lower.includes(" and ");
}

export function normalizeClaimPredicate(value) {
  assertPlainObject("identity assertion.claimPredicate", value);
  assertExactKeys("identity assertion.claimPredicate", value, ["subject", "predicate", "object"]);
  assertNonEmpty("identity assertion.claimPredicate.subject", value.subject);
  assertNonEmpty("identity assertion.claimPredicate.predicate", value.predicate);
  assertNonEmpty("identity assertion.claimPredicate.object", value.object);
  if (!validPredicate(value.predicate)) {
    throw new TypeError("identity assertion.claimPredicate.predicate must be one lowercase snake_case predicate");
  }
  if (compoundComponent(value.subject) || compoundComponent(value.object)) {
    throw new TypeError("identity assertion.claimPredicate subject/object must each identify one thing");
  }
  const normalized = { subject: value.subject, predicate: value.predicate, object: value.object };
  if (Buffer.byteLength(canonicalJson(normalized), "utf8") > MAX_CLAIM_PREDICATE_BYTES) {
    throw new TypeError(`identity assertion.claimPredicate exceeds ${MAX_CLAIM_PREDICATE_BYTES} UTF-8 bytes`);
  }
  return normalized;
}

export function assertCurrentClaimDiscipline(assertion) {
  assertPlainObject("identity assertion", assertion);
  assertPlainObject("identity assertion.admission", assertion.admission);
  const witness = normalizePolicy("identity assertion.admission.claimDiscipline", assertion.admission.claimDiscipline);
  if (policyKey(witness) !== policyKey(IDENTITY_ATOMIC_CLAIM_POLICY)) {
    throw new TypeError(`identity assertions require claim discipline ${policyKey(IDENTITY_ATOMIC_CLAIM_POLICY)}`);
  }
  assertSingleMaterialProposition(assertion.meaning);
  normalizeClaimPredicate(assertion.claimPredicate);
  return assertion;
}

export function assertRecordedClaimDiscipline(assertion) {
  assertPlainObject("identity assertion", assertion);
  assertPlainObject("identity assertion.admission", assertion.admission);
  if (assertion.admission.claimDiscipline === undefined) return preWitnessAtomicAdmission(assertion);
  return assertCurrentClaimDiscipline(assertion);
}
