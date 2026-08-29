import { createHash, randomInt } from "node:crypto";

export const FIBRE_IDENTITY_NUMBER_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const FIBRE_IDENTITY_NUMBER_POLICY = Object.freeze({
  policyRef: "fibre-fin-luhn-mod-n32-v1",
  displayPattern: "XXXX-XX-XXXX",
  payloadLength: 9,
  checksumLength: 1,
  alphabet: FIBRE_IDENTITY_NUMBER_ALPHABET,
});
export const FIBRE_CIVIL_REGISTRATION_VERSION = "fibre-civil-registration-v1";
export const FIBRE_CIVIL_REGISTRY_ISSUER = "fibre_civil_registry";

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;
const FIN_PATTERN = new RegExp(`^[${FIBRE_IDENTITY_NUMBER_ALPHABET}]{4}-[${FIBRE_IDENTITY_NUMBER_ALPHABET}]{2}-[${FIBRE_IDENTITY_NUMBER_ALPHABET}]{4}$`);
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const INDEX = new Map([...FIBRE_IDENTITY_NUMBER_ALPHABET].map((character, index) => [character, index]));

function fail(message) { throw new TypeError(message); }
function plain(name, value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    fail(`${name} must be a plain object`);
  }
  return value;
}
function exact(name, value, allowed) {
  const keys = Object.keys(value).sort();
  const expected = [...allowed].sort();
  if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
    fail(`${name} must contain exactly: ${expected.join(", ")}`);
  }
}
function id(name, value) {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) fail(`${name} is invalid`);
  return value;
}
function timestamp(name, value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) fail(`${name} must be an ISO timestamp`);
  return value;
}
function canonicalize(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}
function canonicalJson(value) { return JSON.stringify(canonicalize(value)); }
function digestHex(value) { return createHash("sha256").update(value, "utf8").digest("hex"); }

export function fibreIdentityNumberCheckCharacter(payload) {
  if (typeof payload !== "string" || payload.length !== FIBRE_IDENTITY_NUMBER_POLICY.payloadLength) {
    fail(`FIN payload must contain exactly ${FIBRE_IDENTITY_NUMBER_POLICY.payloadLength} characters`);
  }
  let factor = 2;
  let sum = 0;
  for (let index = payload.length - 1; index >= 0; index -= 1) {
    const codePoint = INDEX.get(payload[index]);
    if (codePoint === undefined) fail("FIN payload contains a character outside the Fibre alphabet");
    let addend = factor * codePoint;
    factor = factor === 2 ? 1 : 2;
    addend = Math.floor(addend / FIBRE_IDENTITY_NUMBER_ALPHABET.length)
      + (addend % FIBRE_IDENTITY_NUMBER_ALPHABET.length);
    sum += addend;
  }
  const remainder = sum % FIBRE_IDENTITY_NUMBER_ALPHABET.length;
  const checkCodePoint = (FIBRE_IDENTITY_NUMBER_ALPHABET.length - remainder)
    % FIBRE_IDENTITY_NUMBER_ALPHABET.length;
  return FIBRE_IDENTITY_NUMBER_ALPHABET[checkCodePoint];
}

export function fibreIdentityNumberFromPayload(payload) {
  const check = fibreIdentityNumberCheckCharacter(payload);
  const compact = `${payload}${check}`;
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6)}`;
}

export function normalizeFibreIdentityNumber(value) {
  if (typeof value !== "string" || !FIN_PATTERN.test(value)) {
    fail("Fibre Identity Number must match XXXX-XX-XXXX using the canonical unambiguous alphabet");
  }
  const compact = value.replaceAll("-", "");
  const payload = compact.slice(0, FIBRE_IDENTITY_NUMBER_POLICY.payloadLength);
  const expected = fibreIdentityNumberCheckCharacter(payload);
  if (compact.at(-1) !== expected) fail("Fibre Identity Number check character is invalid");
  return value;
}

export function mintFibreIdentityNumber({ randomIntFn = randomInt } = {}) {
  if (typeof randomIntFn !== "function") fail("FIN randomIntFn must be a function");
  let payload = "";
  for (let index = 0; index < FIBRE_IDENTITY_NUMBER_POLICY.payloadLength; index += 1) {
    const selected = randomIntFn(FIBRE_IDENTITY_NUMBER_ALPHABET.length);
    if (!Number.isSafeInteger(selected) || selected < 0 || selected >= FIBRE_IDENTITY_NUMBER_ALPHABET.length) {
      fail("FIN randomIntFn returned an out-of-range value");
    }
    payload += FIBRE_IDENTITY_NUMBER_ALPHABET[selected];
  }
  return fibreIdentityNumberFromPayload(payload);
}

export function fibreCivilRegistrationId({ threadId, fibreIdentityNumber }) {
  id("civil registration threadId", threadId);
  normalizeFibreIdentityNumber(fibreIdentityNumber);
  const material = `${FIBRE_CIVIL_REGISTRATION_VERSION}\u0000${threadId}\u0000${fibreIdentityNumber}`;
  return `civreg_${digestHex(material)}`;
}

function registrationCore({
  registrationVersion,
  registrationId,
  threadId,
  fibreIdentityNumber,
  registeredAt,
  birthEventRef,
  worldRef,
  issuer,
  finPolicyRef,
}) {
  return {
    registrationVersion,
    registrationId,
    threadId,
    fibreIdentityNumber,
    registeredAt,
    birthEventRef,
    worldRef,
    issuer,
    finPolicyRef,
  };
}

export function fibreCivilRegistrationDigest(candidate) {
  const core = registrationCore(candidate);
  return `sha256:${digestHex(canonicalJson({ kind: "fibre_civil_registration", record: core }))}`;
}

export function normalizeFibreCivilRegistration(value) {
  const name = "Fibre civil registration";
  plain(name, value);
  exact(name, value, [
    "registrationVersion",
    "registrationId",
    "threadId",
    "fibreIdentityNumber",
    "registeredAt",
    "birthEventRef",
    "worldRef",
    "issuer",
    "finPolicyRef",
    "registrationDigest",
  ]);
  if (value.registrationVersion !== FIBRE_CIVIL_REGISTRATION_VERSION) fail(`${name}.registrationVersion is unsupported`);
  id(`${name}.registrationId`, value.registrationId);
  id(`${name}.threadId`, value.threadId);
  normalizeFibreIdentityNumber(value.fibreIdentityNumber);
  timestamp(`${name}.registeredAt`, value.registeredAt);
  id(`${name}.birthEventRef`, value.birthEventRef);
  id(`${name}.worldRef`, value.worldRef);
  if (value.issuer !== FIBRE_CIVIL_REGISTRY_ISSUER) fail(`${name}.issuer is invalid`);
  if (value.finPolicyRef !== FIBRE_IDENTITY_NUMBER_POLICY.policyRef) fail(`${name}.finPolicyRef is unsupported`);
  const expectedId = fibreCivilRegistrationId({
    threadId: value.threadId,
    fibreIdentityNumber: value.fibreIdentityNumber,
  });
  if (value.registrationId !== expectedId) fail(`${name}.registrationId does not match Thread/FIN identity`);
  if (typeof value.registrationDigest !== "string" || !DIGEST_PATTERN.test(value.registrationDigest)) {
    fail(`${name}.registrationDigest is invalid`);
  }
  const expectedDigest = fibreCivilRegistrationDigest(value);
  if (value.registrationDigest !== expectedDigest) fail(`${name}.registrationDigest does not match registration content`);
  return Object.freeze(structuredClone(value));
}

export function buildFibreCivilRegistration({
  threadId,
  fibreIdentityNumber,
  registeredAt,
  birthEventRef,
  worldRef,
}) {
  const normalizedFin = normalizeFibreIdentityNumber(fibreIdentityNumber);
  const core = {
    registrationVersion: FIBRE_CIVIL_REGISTRATION_VERSION,
    registrationId: fibreCivilRegistrationId({ threadId, fibreIdentityNumber: normalizedFin }),
    threadId,
    fibreIdentityNumber: normalizedFin,
    registeredAt,
    birthEventRef,
    worldRef,
    issuer: FIBRE_CIVIL_REGISTRY_ISSUER,
    finPolicyRef: FIBRE_IDENTITY_NUMBER_POLICY.policyRef,
  };
  return normalizeFibreCivilRegistration({
    ...core,
    registrationDigest: fibreCivilRegistrationDigest(core),
  });
}
