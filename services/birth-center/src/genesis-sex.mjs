import { sha256 } from "./genesis-development-contracts.mjs";

export const GENESIS_SEXES = Object.freeze(["female", "male"]);

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

export function normalizeGenesisSex(value) {
  if (!GENESIS_SEXES.includes(value)) throw new TypeError("sex must be female or male");
  return value;
}

export function genesisSexForThread({ threadId } = {}) {
  const ownerId = nonEmpty("threadId", threadId);
  const digest = sha256(`${ownerId}:sex`);
  return GENESIS_SEXES[Number.parseInt(digest.slice(0, 8), 16) % GENESIS_SEXES.length];
}
