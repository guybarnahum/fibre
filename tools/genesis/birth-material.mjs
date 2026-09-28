import { createHash } from "node:crypto";
import { resolveHumanPhysicalInheritance } from "../../core/src/human-appearance/index.mjs";

function positiveOrdinal(requestId) {
  const suffix = /(\d+)$/u.exec(requestId)?.[1];
  if (suffix) {
    const value = Number.parseInt(suffix, 10);
    if (Number.isSafeInteger(value) && value > 0) return value;
  }
  const digest = createHash("sha256").update(requestId).digest("hex").slice(0, 12);
  return Number.parseInt(digest, 16) + 1;
}

export function selectBirthSlot({ requestId, slotCount, explicitSlot = null }) {
  if (explicitSlot !== null) {
    if (!Number.isSafeInteger(explicitSlot) || explicitSlot < 1 || explicitSlot > slotCount) throw new TypeError(`Genesis slot must be between 1 and ${slotCount}`);
    return explicitSlot;
  }
  return ((positiveOrdinal(requestId) - 1) % slotCount) + 1;
}

function valueAt(values, requestId, label) {
  if (!Array.isArray(values) || values.length === 0) throw new TypeError("birth naming material must be non-empty");
  const digest = createHash("sha256").update(`${requestId}\0${label}`).digest("hex").slice(0, 12);
  return values[Number.parseInt(digest, 16) % values.length];
}

function fullName(given, family, order) {
  if (order === "family_given") return `${family} ${given}`;
  if (order === "given_family") return `${given} ${family}`;
  throw new TypeError(`unsupported birth name order ${String(order)}`);
}

export function selectBirthNameParts({ requestId, material }) {
  if (!material || typeof material !== "object") throw new TypeError("birth material is required");
  return Object.freeze({
    femaleGivenName:valueAt(material.femaleGivenNames, requestId, "female-given-name"),
    maleGivenName:valueAt(material.maleGivenNames, requestId, "male-given-name"),
    familyName:valueAt(material.familyNames, requestId, "family-name"),
  });
}

export function composeBirthSubjectIdentity({ requestId, material }) {
  if (!material || typeof material !== "object") throw new TypeError("birth material is required");
  if (!Array.isArray(material.languages) || material.languages.length === 0) throw new TypeError("birth requires eventual spoken languages");
  if (!Array.isArray(material.raisedLanguages) || material.raisedLanguages.length === 0) throw new TypeError("birth requires raised languages");
  if (!material.physicalAncestry?.maternal || !material.physicalAncestry?.paternal) throw new TypeError("birth requires parental physical ancestry");
  const { femaleGivenName:femaleGiven, maleGivenName:maleGiven, familyName:family } = selectBirthNameParts({ requestId, material });
  const physicalInheritance = resolveHumanPhysicalInheritance({
    maternal:{physicalLineage:material.physicalAncestry.maternal},
    paternal:{physicalLineage:material.physicalAncestry.paternal},
    // Historical deterministic namespace: keep stable unless birth material is intentionally reseeded.
    conceptionSeed:`modern-birth:${requestId}`,
  });
  return Object.freeze({
    femaleName: fullName(femaleGiven, family, material.nameOrder),
    maleName: fullName(maleGiven, family, material.nameOrder),
    birthCity: material.birthCity,
    languages: Object.freeze([...material.languages]),
    raisedLanguages: Object.freeze([...material.raisedLanguages]),
    physicalGenome:physicalInheritance.physicalGenome,
  });
}

export function freshBirthParticipants({ requestId, participants }) {
  if (!Array.isArray(participants)) throw new TypeError("birth participants must be an array");
  return Object.freeze(participants.map((participant, index) => {
    const seed = `${requestId}:${participant.participantId ?? index}:participant`;
    const participantId = `person_modern_${createHash("sha256").update(seed).digest("hex").slice(0, 24)}`;
    return Object.freeze({participantId,factualRoles:Object.freeze([...(participant.factualRoles ?? [])]),relationshipFacts:Object.freeze([...(participant.relationshipFacts ?? [])])});
  }));
}
