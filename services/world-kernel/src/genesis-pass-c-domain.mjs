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

export const GENESIS_PASS_C_INPUT_VERSION = "genesis-pass-c-input-v1";
export const GENESIS_PASS_C_POLICY = Object.freeze({
  version: "genesis-pass-c-policy-v1",
  maxMeaningSummaryBytes: 2048,
  maxMeaningParts: 6,
  maxMeaningPartBytes: 1024,
  reinterpretationMinimumYears: 5,
  reinterpretationRunCapPerThread: 3,
});

export const PASS_C_REINTERPRETATION_RELATIONS = Object.freeze([
  "same_structure_family",
  "same_person_or_relationship",
  "same_intellectual_source",
]);

const UNIVERSAL_FUTURE_POLICY_PATTERNS = Object.freeze([
  /\bI will always\b/i,
  /\bI must always\b/i,
  /\bI will never again\b/i,
  /\bfrom now on I will\b/i,
  /\bnever again will I\b/i,
]);

function digest(value) {
  return `sha256:${sha256(canonicalJson(value))}`;
}

function utf8Bytes(value) {
  return Buffer.byteLength(value, "utf8");
}

function normalizeUncertainty(candidate, path) {
  if (!Array.isArray(candidate)) throw new TypeError(`${path} must be an array`);
  return candidate.map((item, index) => {
    assertNonEmpty(`${path}[${index}]`, item);
    if (utf8Bytes(item) > 512) throw new TypeError(`${path}[${index}] exceeds 512 UTF-8 bytes`);
    return item;
  });
}

function assertNoUniversalFuturePolicy(value, path) {
  const pattern = UNIVERSAL_FUTURE_POLICY_PATTERNS.find((item) => item.test(value));
  if (pattern !== undefined) {
    throw new TypeError(`${path} contains forbidden universal future-policy form ${pattern}`);
  }
}

function normalizeMeaningText(value, path, maxBytes) {
  assertNonEmpty(path, value);
  if (utf8Bytes(value) < 12) throw new TypeError(`${path} is too trivial`);
  if (utf8Bytes(value) > maxBytes) throw new TypeError(`${path} exceeds ${maxBytes} UTF-8 bytes`);
  assertNoUniversalFuturePolicy(value, path);
  return value;
}

export function genesisMeaningPartId({ memoryRef, ordinal }) {
  assertId("memoryRef", memoryRef);
  assertFiniteNumber("ordinal", ordinal, { integer: true, minimum: 1 });
  return `mpart_${sha256(canonicalJson({ memoryRef, ordinal })).slice(0, 40)}`;
}

function normalizeTargetMemory(candidate) {
  assertPlainObject("passC.targetMemory", candidate);
  assertExactKeys("passC.targetMemory", candidate, [
    "memoryRef",
    "episodeRefs",
    "rememberedContent",
    "uncertainty",
  ]);
  assertId("passC.targetMemory.memoryRef", candidate.memoryRef);
  assertStringArray("passC.targetMemory.episodeRefs", candidate.episodeRefs);
  if (candidate.episodeRefs.length === 0) throw new TypeError("passC.targetMemory.episodeRefs must not be empty");
  assertNonEmpty("passC.targetMemory.rememberedContent", candidate.rememberedContent);
  if (utf8Bytes(candidate.rememberedContent) > 2048) {
    throw new TypeError("passC.targetMemory.rememberedContent exceeds 2048 UTF-8 bytes");
  }
  return structuredClone({
    ...candidate,
    episodeRefs: [...candidate.episodeRefs],
    uncertainty: normalizeUncertainty(candidate.uncertainty, "passC.targetMemory.uncertainty"),
  });
}

function normalizeFormation(candidate) {
  assertPlainObject("passC.formation", candidate);
  assertExactKeys("passC.formation", candidate, ["asOf", "ageAtFormation", "chronologyIndex"]);
  assertIsoTimestamp("passC.formation.asOf", candidate.asOf);
  assertFiniteNumber("passC.formation.ageAtFormation", candidate.ageAtFormation, { minimum: 0 });
  assertFiniteNumber("passC.formation.chronologyIndex", candidate.chronologyIndex, { integer: true, minimum: 0 });
  return structuredClone(candidate);
}

function normalizePriorMeaningPart(candidate, index, memoryRef) {
  const path = `passC.priorMeaning.parts[${index}]`;
  assertPlainObject(path, candidate);
  assertExactKeys(path, candidate, ["meaningPartId", "meaning"]);
  assertId(`${path}.meaningPartId`, candidate.meaningPartId);
  const expected = genesisMeaningPartId({ memoryRef, ordinal: index + 1 });
  if (candidate.meaningPartId !== expected) {
    throw new TypeError(`${path}.meaningPartId is not stable for memory+ordinal`);
  }
  normalizeMeaningText(candidate.meaning, `${path}.meaning`, GENESIS_PASS_C_POLICY.maxMeaningPartBytes);
  return structuredClone(candidate);
}

function normalizePriorMeaning(candidate, memoryRef) {
  if (candidate === null) return null;
  assertPlainObject("passC.priorMeaning", candidate);
  assertExactKeys("passC.priorMeaning", candidate, ["summary", "parts"]);
  normalizeMeaningText(candidate.summary, "passC.priorMeaning.summary", GENESIS_PASS_C_POLICY.maxMeaningSummaryBytes);
  if (!Array.isArray(candidate.parts) || candidate.parts.length === 0) {
    throw new TypeError("passC.priorMeaning.parts must be a non-empty array");
  }
  if (candidate.parts.length > GENESIS_PASS_C_POLICY.maxMeaningParts) {
    throw new TypeError(`passC.priorMeaning.parts exceeds ${GENESIS_PASS_C_POLICY.maxMeaningParts} parts`);
  }
  return structuredClone({
    summary: candidate.summary,
    parts: candidate.parts.map((part, index) => normalizePriorMeaningPart(part, index, memoryRef)),
  });
}

function normalizeTrigger(candidate) {
  if (candidate === null) return null;
  assertPlainObject("passC.trigger", candidate);
  assertExactKeys("passC.trigger", candidate, ["episodeRef", "occurredAt", "observableAction", "relation"]);
  assertId("passC.trigger.episodeRef", candidate.episodeRef);
  assertIsoTimestamp("passC.trigger.occurredAt", candidate.occurredAt);
  assertNonEmpty("passC.trigger.observableAction", candidate.observableAction);
  if (!PASS_C_REINTERPRETATION_RELATIONS.includes(candidate.relation)) {
    throw new TypeError("passC.trigger.relation is invalid");
  }
  return structuredClone(candidate);
}

function normalizePolicyWitness(candidate) {
  assertPlainObject("passC.policyWitness", candidate);
  assertExactKeys("passC.policyWitness", candidate, ["policyVersion"]);
  if (candidate.policyVersion !== GENESIS_PASS_C_POLICY.version) {
    throw new TypeError("passC.policyWitness.policyVersion is not supported");
  }
  return structuredClone(candidate);
}

export function normalizePassCInput(candidate) {
  assertPlainObject("passC.input", candidate);
  assertExactKeys("passC.input", candidate, [
    "inputVersion",
    "mode",
    "targetMemory",
    "formation",
    "priorMeaning",
    "trigger",
    "policyWitness",
  ]);
  if (candidate.inputVersion !== GENESIS_PASS_C_INPUT_VERSION) {
    throw new TypeError("passC.inputVersion is not supported");
  }
  if (!["initial", "reinterpretation"].includes(candidate.mode)) {
    throw new TypeError("passC.mode is invalid");
  }
  const targetMemory = normalizeTargetMemory(candidate.targetMemory);
  const formation = normalizeFormation(candidate.formation);
  const priorMeaning = normalizePriorMeaning(candidate.priorMeaning, targetMemory.memoryRef);
  const trigger = normalizeTrigger(candidate.trigger);
  const policyWitness = normalizePolicyWitness(candidate.policyWitness);
  if (candidate.mode === "initial") {
    if (priorMeaning !== null || trigger !== null) {
      throw new TypeError("initial Pass-C formation cannot see prior meaning or a later trigger episode");
    }
  } else {
    if (priorMeaning === null || trigger === null) {
      throw new TypeError("Pass-C reinterpretation requires exactly one prior meaning and one trigger episode");
    }
    if (Date.parse(trigger.occurredAt) > Date.parse(formation.asOf)) {
      throw new TypeError("Pass-C reinterpretation trigger occurs after its asOf boundary");
    }
  }
  return Object.freeze({
    inputVersion: candidate.inputVersion,
    mode: candidate.mode,
    targetMemory,
    formation,
    priorMeaning,
    trigger,
    policyWitness,
  });
}

function normalizeModelMeaningPart(candidate, index) {
  const path = `Pass-C model output.parts[${index}]`;
  assertPlainObject(path, candidate);
  assertExactKeys(path, candidate, ["meaning"]);
  return {
    meaning: normalizeMeaningText(candidate.meaning, `${path}.meaning`, GENESIS_PASS_C_POLICY.maxMeaningPartBytes),
  };
}

function normalizeMeaningPayload(candidate, memoryRef) {
  const summary = normalizeMeaningText(
    candidate.summary,
    "Pass-C model output.summary",
    GENESIS_PASS_C_POLICY.maxMeaningSummaryBytes,
  );
  if (!Array.isArray(candidate.parts) || candidate.parts.length === 0) {
    throw new TypeError("durable Pass-C meaning requires at least one meaning part");
  }
  if (candidate.parts.length > GENESIS_PASS_C_POLICY.maxMeaningParts) {
    throw new TypeError(`Pass-C model output.parts exceeds ${GENESIS_PASS_C_POLICY.maxMeaningParts} parts`);
  }
  const parts = candidate.parts.map(normalizeModelMeaningPart).map((part, index) => ({
    meaningPartId: genesisMeaningPartId({ memoryRef, ordinal: index + 1 }),
    meaning: part.meaning,
  }));
  return { summary, parts };
}

export function normalizeInitialPassCModelOutput(candidate, inputCandidate) {
  const input = normalizePassCInput(inputCandidate);
  if (input.mode !== "initial") throw new TypeError("initial Pass-C output requires an initial input");
  assertPlainObject("Pass-C model output", candidate);
  assertExactKeys("Pass-C model output", candidate, ["outcome", "summary", "parts"]);
  if (!["durable_meaning", "no_durable_meaning"].includes(candidate.outcome)) {
    throw new TypeError("initial Pass-C outcome is invalid");
  }
  if (candidate.outcome === "no_durable_meaning") {
    if (candidate.summary !== null) throw new TypeError("no_durable_meaning must use summary=null");
    if (!Array.isArray(candidate.parts) || candidate.parts.length !== 0) {
      throw new TypeError("no_durable_meaning must use parts=[]");
    }
    return Object.freeze({ outcome: candidate.outcome, summary: null, parts: [] });
  }
  const meaning = normalizeMeaningPayload(candidate, input.targetMemory.memoryRef);
  return Object.freeze({ outcome: candidate.outcome, ...meaning });
}

export function normalizeReinterpretationPassCModelOutput(candidate, inputCandidate) {
  const input = normalizePassCInput(inputCandidate);
  if (input.mode !== "reinterpretation") throw new TypeError("reinterpretation output requires a reinterpretation input");
  assertPlainObject("Pass-C model output", candidate);
  assertExactKeys("Pass-C model output", candidate, ["outcome", "summary", "parts"]);
  if (!["revised", "unchanged", "none"].includes(candidate.outcome)) {
    throw new TypeError("Pass-C reinterpretation outcome is invalid");
  }
  if (candidate.outcome !== "revised") {
    if (candidate.summary !== null) throw new TypeError(`${candidate.outcome} reinterpretation must use summary=null`);
    if (!Array.isArray(candidate.parts) || candidate.parts.length !== 0) {
      throw new TypeError(`${candidate.outcome} reinterpretation must use parts=[]`);
    }
    return Object.freeze({ outcome: candidate.outcome, summary: null, parts: [] });
  }
  const meaning = normalizeMeaningPayload(candidate, input.targetMemory.memoryRef);
  return Object.freeze({ outcome: candidate.outcome, ...meaning });
}

export function passCInputDigest(candidate) {
  return digest(normalizePassCInput(candidate));
}

export function passCMeaningFormationDigest(candidate) {
  return digest(candidate);
}
