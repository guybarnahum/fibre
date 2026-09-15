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

export function composeModernSubjectIdentity({ requestId, material }) {
  if (!material || typeof material !== "object") throw new TypeError("modern birth material is required");
  const ordinal = positiveOrdinal(requestId);
  const family = valueAt(material.familyNames, Math.floor((ordinal - 1) / 6) + 1);
  const femaleGiven = valueAt(material.femaleGivenNames, ordinal);
  const maleGiven = valueAt(material.maleGivenNames, ordinal, 2);
  return Object.freeze({
    femaleName: fullName(femaleGiven, family, material.nameOrder),
    maleName: fullName(maleGiven, family, material.nameOrder),
    birthCity: material.birthCity,
  });
}
