import {
  assertExactKeys,
  assertId,
  assertNonEmpty,
  assertPlainObject,
  canonicalJson,
  sha256,
} from "./persistence-common.mjs";

export const GENESIS_INTELLECTUAL_ENCOUNTER_KINDS = Object.freeze([
  "book",
  "teacher_or_mentor",
  "argument",
  "conversation",
  "overheard_discussion",
  "art",
  "scientific_idea",
  "religious_or_philosophical_text",
  "other_intellectual_source",
]);

export const GENESIS_INTELLECTUAL_SUBJECT_KINDS = Object.freeze([
  "person",
  "work",
  "idea",
  "conversation",
  "artwork",
  "text",
  "other",
]);

export const GENESIS_INTELLECTUAL_ACCESS_MODES = Object.freeze([
  "caregiver_mediated",
  "institution_mediated",
  "peer_mediated",
  "self_directed",
  "incidental",
]);

const RAW_KEYS = Object.freeze([
  "kind",
  "subjectKind",
  "subjectLabel",
  "participantRef",
  "accessMode",
]);
const NORMALIZED_KEYS = Object.freeze([...RAW_KEYS, "subjectRef"]);
const MAX_SUBJECT_LABEL_BYTES = 320;

function assertEnum(name, value, allowed) {
  if (!allowed.includes(value)) throw new TypeError(`${name} is invalid`);
}

function assertEitherExactKeySet(name, candidate, sets) {
  const actual = Object.keys(candidate).sort();
  const matches = sets.some((keys) => {
    const expected = [...keys].sort();
    return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
  });
  if (!matches) {
    // Preserve the repository's normal exact-key error style where possible.
    assertExactKeys(name, candidate, sets[0]);
    throw new TypeError(`${name} has an unsupported field set`);
  }
}

export function genesisIntellectualSubjectRef({ subjectKind, subjectLabel, participantRef = null }) {
  assertEnum("intellectualEncounter.subjectKind", subjectKind, GENESIS_INTELLECTUAL_SUBJECT_KINDS);
  assertNonEmpty("intellectualEncounter.subjectLabel", subjectLabel);
  if (subjectKind === "person") {
    assertId("intellectualEncounter.participantRef", participantRef);
    return participantRef;
  }
  if (participantRef !== null) throw new TypeError("non-person intellectual encounter must use participantRef=null");
  return `isrc_${sha256(canonicalJson({ subjectKind, subjectLabel }))}`;
}

export function normalizeGenesisIntellectualEncounter(candidate, {
  participantRefs = [],
} = {}) {
  assertPlainObject("intellectualEncounter", candidate);
  assertEitherExactKeySet("intellectualEncounter", candidate, [RAW_KEYS, NORMALIZED_KEYS]);
  assertEnum("intellectualEncounter.kind", candidate.kind, GENESIS_INTELLECTUAL_ENCOUNTER_KINDS);
  assertEnum("intellectualEncounter.subjectKind", candidate.subjectKind, GENESIS_INTELLECTUAL_SUBJECT_KINDS);
  assertNonEmpty("intellectualEncounter.subjectLabel", candidate.subjectLabel);
  if (Buffer.byteLength(candidate.subjectLabel, "utf8") > MAX_SUBJECT_LABEL_BYTES) {
    throw new TypeError(`intellectualEncounter.subjectLabel exceeds ${MAX_SUBJECT_LABEL_BYTES} UTF-8 bytes`);
  }
  if (/\r|\n/.test(candidate.subjectLabel)) throw new TypeError("intellectualEncounter.subjectLabel must be one factual line");
  if (candidate.participantRef !== null) assertId("intellectualEncounter.participantRef", candidate.participantRef);
  assertEnum("intellectualEncounter.accessMode", candidate.accessMode, GENESIS_INTELLECTUAL_ACCESS_MODES);

  if (candidate.subjectKind === "person") {
    if (candidate.participantRef === null) throw new TypeError("person intellectual encounter requires participantRef");
    if (!participantRefs.includes(candidate.participantRef)) {
      throw new TypeError("person intellectual encounter participantRef must be a participant in the episode");
    }
  } else if (candidate.participantRef !== null) {
    throw new TypeError("non-person intellectual encounter must use participantRef=null");
  }

  const subjectRef = genesisIntellectualSubjectRef(candidate);
  if (Object.hasOwn(candidate, "subjectRef") && candidate.subjectRef !== subjectRef) {
    throw new TypeError("intellectualEncounter.subjectRef is Fibre-derived and does not match its subject");
  }
  return Object.freeze({
    kind: candidate.kind,
    subjectKind: candidate.subjectKind,
    subjectLabel: candidate.subjectLabel,
    participantRef: candidate.participantRef,
    accessMode: candidate.accessMode,
    subjectRef,
  });
}

export function sharedIntellectualSourceRefs(leftCandidate, rightCandidate) {
  const left = leftCandidate?.intellectualEncounter ?? null;
  const right = rightCandidate?.intellectualEncounter ?? null;
  if (left === null || right === null) return Object.freeze([]);
  const leftNormalized = normalizeGenesisIntellectualEncounter(left, {
    participantRefs: leftCandidate.participantRefs ?? [],
  });
  const rightNormalized = normalizeGenesisIntellectualEncounter(right, {
    participantRefs: rightCandidate.participantRefs ?? [],
  });
  return Object.freeze(leftNormalized.subjectRef === rightNormalized.subjectRef
    ? [leftNormalized.subjectRef]
    : []);
}

export const GENESIS_INTELLECTUAL_ENCOUNTER_RESPONSE_SCHEMA = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["kind", "subjectKind", "subjectLabel", "participantRef", "accessMode"],
  properties: {
    kind: { type: "string", enum: [...GENESIS_INTELLECTUAL_ENCOUNTER_KINDS] },
    subjectKind: { type: "string", enum: [...GENESIS_INTELLECTUAL_SUBJECT_KINDS] },
    subjectLabel: { type: "string" },
    participantRef: { type: ["string", "null"] },
    accessMode: { type: "string", enum: [...GENESIS_INTELLECTUAL_ACCESS_MODES] },
  },
});
