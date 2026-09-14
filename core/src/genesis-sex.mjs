import { createHash } from "node:crypto";

export const GENESIS_SEX_RULE = Object.freeze({
  id: "fibre_genesis_sex_v1",
  version: "1",
});

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
  const digest = createHash("sha256").update(`${ownerId}:sex`).digest("hex");
  return GENESIS_SEXES[Number.parseInt(digest.slice(0, 8), 16) % GENESIS_SEXES.length];
}
