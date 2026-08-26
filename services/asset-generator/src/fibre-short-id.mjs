export const FIBRE_SHORT_ID_HEX_LENGTH = 12;

const SHA256_DIGEST = /^sha256:([0-9a-f]{64})$/;
const SHORT_SUFFIX = /^[0-9a-f]{12}$/;
const CANDIDATE_OFFSETS = Object.freeze([0, 12, 24, 36, 48]);

export function assertFibreSha256Digest(name, value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  const match = SHA256_DIGEST.exec(value);
  if (!match) throw new TypeError(`${name} must be sha256:<64 lowercase hex>`);
  return value;
}

export function assertFibreShortIdSuffix(name, value) {
  if (typeof value !== "string" || !SHORT_SUFFIX.test(value)) {
    throw new TypeError(`${name} must be 12 lowercase hex characters`);
  }
  return value;
}

export function fibreShortIdCandidates(digest) {
  const checked = assertFibreSha256Digest("digest", digest);
  const hex = checked.slice("sha256:".length);
  return Object.freeze(CANDIDATE_OFFSETS.map((offset) => hex.slice(offset, offset + FIBRE_SHORT_ID_HEX_LENGTH)));
}

export function fibreShortIdSuffix(digest) {
  return fibreShortIdCandidates(digest)[0];
}

export function fibreShortRef(prefix, suffix) {
  if (typeof prefix !== "string" || prefix.length === 0) throw new TypeError("prefix must be non-empty");
  return `${prefix}${assertFibreShortIdSuffix("suffix", suffix)}`;
}

export function fibreShortRefSuffix(name, value, prefix) {
  if (typeof value !== "string" || !value.startsWith(prefix)) {
    throw new TypeError(`${name} must start with ${prefix}`);
  }
  const suffix = value.slice(prefix.length);
  return assertFibreShortIdSuffix(`${name} suffix`, suffix);
}
