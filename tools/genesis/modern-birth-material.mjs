import { createHash } from "node:crypto";

function positiveOrdinal(requestId) {
  const suffix = /(\d+)$/u.exec(requestId)?.[1];
  if (suffix) {
    const value = Number.parseInt(suffix, 10);
    if (Number.isSafeInteger(value) && value > 0) return value;
  }
  const digest = createHash("sha256").update(requestId).digest("hex").slice(0, 12);
  return Number.parseInt(digest, 16) + 1;
}

export function selectModernBirthSlot({ requestId, slotCount, explicitSlot = null }) {
  if (explicitSlot !== null) {
    if (!Number.isSafeInteger(explicitSlot) || explicitSlot < 1 || explicitSlot > slotCount) {
      throw new TypeError(`modern Genesis slot must be between 1 and ${slotCount}`);
    }
    return explicitSlot;
  }
  return ((positiveOrdinal(requestId) - 1) % slotCount) + 1;
}

function valueAt(values, ordinal, offset = 0) {
  if (!Array.isArray(values) || values.length === 0) throw new TypeError("modern birth naming material must be non-empty");
  return values[(ordinal - 1 + offset) % values.length];
}

function fullName(given, family, order) {
  if (order === "family_given") return `${family} ${given}`;
  if (order === "given_family") return `${given} ${family}`;
  throw new TypeError(`unsupported modern birth name order ${String(order)}`);
}

const APPEARANCE_DOMAINS = Object.freeze(["skin", "hair", "eyes", "face", "brows", "nose", "mouth", "jaw", "build"]);

function appearanceValue(requestId, domain, values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new TypeError(`modern birth appearance material ${domain} must be non-empty`);
  }
  const digest = createHash("sha256").update(`${requestId}:appearance:${domain}`).digest("hex").slice(0, 12);
  return values[Number.parseInt(digest, 16) % values.length];
}

function composeAppearanceContext(requestId, material) {
  if (!material.appearanceLoci) {
    throw new TypeError("modern birth requires authored family-compatible appearance loci");
  }
  const concrete = APPEARANCE_DOMAINS.map((domain) => appearanceValue(
    requestId,
    domain,
    material.appearanceLoci[domain],
  ));
  return `Concrete inherited phenotype selected for this individual: ${concrete.join("; ")}.`;
}

export function composeModernSubjectIdentity({ requestId, material }) {
  if (!material || typeof material !== "object") throw new TypeError("modern birth material is required");
  const ordinal = positiveOrdinal(requestId);
  const family = valueAt(material.familyNames, Math.floor((ordinal - 1) / 6) + 1);
  const femaleGiven = valueAt(material.femaleGivenNames, ordinal);
  const maleGiven = valueAt(material.maleGivenNames, ordinal, 2);
  const appearanceContext = composeAppearanceContext(requestId, material);
  return Object.freeze({
    femaleName: fullName(femaleGiven, family, material.nameOrder),
    maleName: fullName(maleGiven, family, material.nameOrder),
    birthCity: material.birthCity,
    ...(appearanceContext === null ? {} : { appearanceContext }),
  });
}

export function freshModernParticipants({ requestId, participants }) {
  if (!Array.isArray(participants)) throw new TypeError("modern birth participants must be an array");
  return Object.freeze(participants.map((participant, index) => {
    const seed = `${requestId}:${participant.participantId ?? index}:participant`;
    const participantId = `person_modern_${createHash("sha256").update(seed).digest("hex").slice(0, 24)}`;
    return Object.freeze({
      participantId,
      factualRoles: Object.freeze([...(participant.factualRoles ?? [])]),
      relationshipFacts: Object.freeze([...(participant.relationshipFacts ?? [])]),
    });
  }));
}
