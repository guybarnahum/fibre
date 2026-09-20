import { createHash } from "node:crypto";

import { normalizeFibreIdentityNumber } from "#core/src/fibre-civil-identity.mjs";
import {
  FIBRE_IDENTITY_AUTHORITY_ID,
  FID_MACHINE_CREDENTIAL_SCHEMA,
} from "./fid-machine-credential.mjs";

export const FID_CARD_PROOF_SCHEMA = "fibre.fin-card-proof.v1";
export const FID_CARD_PROOF_ENVELOPE_VERSION = "fibre.fin-card-proof-envelope.v1";
export const FID_CARD_PROOF_SIGNATURE_ALGORITHM = "Ed25519";
export const FID_CARD_PROOF_SIDES = Object.freeze(["front", "back"]);

const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;

function canonical(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonical);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
}

function exactKeys(name, value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new TypeError(`${name} must contain exactly: ${expected.join(", ")}`);
  }
  return value;
}

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value;
}

function id(name, value) {
  if (typeof value !== "string" || !ID.test(value)) throw new TypeError(`${name} is invalid`);
  return value;
}

function digest(name, value) {
  if (typeof value !== "string" || !DIGEST.test(value)) throw new TypeError(`${name} is invalid`);
  return value;
}

function signer(value) {
  if (!value || typeof value.sign !== "function" || typeof value.verify !== "function") {
    throw new TypeError("FID card proof issuer signer must expose sign() and verify()");
  }
  const profile = value.profile;
  if (!profile || typeof profile !== "object" || Array.isArray(profile)
    || profile.authorityId !== FIBRE_IDENTITY_AUTHORITY_ID
    || profile.algorithm !== FID_CARD_PROOF_SIGNATURE_ALGORITHM) {
    throw new TypeError("FID card proof issuer signer profile must be Fibre Identity Authority Ed25519");
  }
  return Object.freeze({
    sign:value.sign.bind(value),
    verify:value.verify.bind(value),
    profile:Object.freeze({
      authorityId:profile.authorityId,
      keyId:id("FID card proof signer keyId", profile.keyId),
      algorithm:FID_CARD_PROOF_SIGNATURE_ALGORITHM,
    }),
  });
}

function base64Signature(name, value) {
  const encoded = nonEmpty(name, value);
  if (!/^[A-Za-z0-9+/]+={0,2}$/u.test(encoded) || encoded.length % 4 !== 0) {
    throw new TypeError(`${name} is invalid base64`);
  }
  const bytes = Buffer.from(encoded, "base64");
  if (bytes.length === 0 || bytes.toString("base64") !== encoded) throw new TypeError(`${name} is invalid base64`);
  return encoded;
}

function proofBytes(value) {
  return Buffer.from(fidCardProofAssertionJson(value), "utf8");
}

function positiveInteger(name, value) {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${name} must be a positive integer`);
  return value;
}

function iso(name, value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new TypeError(`${name} must be an ISO timestamp`);
  return new Date(value).toISOString();
}

function optionalIdentityText(name, value) {
  if (value === null || value === undefined) return null;
  return nonEmpty(name, value).trim();
}

function dateField(value) {
  if (value === null || value === undefined) return null;
  exactKeys("FID card proof identity.dateField", value, ["kind", "value"]);
  if (value.kind !== "birth_date" && value.kind !== "entry_date") {
    throw new TypeError("FID card proof identity.dateField.kind is invalid");
  }
  const date = nonEmpty("FID card proof identity.dateField.value", value.value);
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) throw new TypeError("FID card proof identity.dateField.value must be YYYY-MM-DD");
  return Object.freeze({ kind:value.kind, value:date });
}

function identity(value) {
  exactKeys("FID card proof identity", value, ["fin", "displayName", "dateField"]);
  return Object.freeze({
    fin:normalizeFibreIdentityNumber(value.fin),
    displayName:optionalIdentityText("FID card proof identity.displayName", value.displayName),
    dateField:dateField(value.dateField),
  });
}

function issuer(value) {
  exactKeys("FID card proof issuer", value, ["authorityId", "keyId"]);
  if (value.authorityId !== FIBRE_IDENTITY_AUTHORITY_ID) {
    throw new TypeError("FID card proof issuer must be Fibre Identity Authority");
  }
  return Object.freeze({
    authorityId:value.authorityId,
    keyId:id("FID card proof issuer.keyId", value.keyId),
  });
}

function side(value) {
  if (!FID_CARD_PROOF_SIDES.includes(value)) throw new TypeError("FID card proof side must be front or back");
  return value;
}

export function normalizeFidCardProofAssertion(value) {
  exactKeys("FID card proof assertion", value, [
    "schema",
    "credentialId",
    "revision",
    "side",
    "identity",
    "issuedAt",
    "expiresAt",
    "templateVersion",
    "registrationId",
    "civilRegistrationDigest",
    "identitySnapshotDigest",
    "photoDigest",
    "rawRenderDigest",
    "issuer",
  ]);
  if (value.schema !== FID_CARD_PROOF_SCHEMA) throw new TypeError("FID card proof schema is unsupported");
  return Object.freeze({
    schema:FID_CARD_PROOF_SCHEMA,
    credentialId:id("FID card proof credentialId", value.credentialId),
    revision:positiveInteger("FID card proof revision", value.revision),
    side:side(value.side),
    identity:identity(value.identity),
    issuedAt:iso("FID card proof issuedAt", value.issuedAt),
    expiresAt:value.expiresAt == null ? null : iso("FID card proof expiresAt", value.expiresAt),
    templateVersion:nonEmpty("FID card proof templateVersion", value.templateVersion),
    registrationId:id("FID card proof registrationId", value.registrationId),
    civilRegistrationDigest:digest("FID card proof civilRegistrationDigest", value.civilRegistrationDigest),
    identitySnapshotDigest:digest("FID card proof identitySnapshotDigest", value.identitySnapshotDigest),
    photoDigest:digest("FID card proof photoDigest", value.photoDigest),
    rawRenderDigest:digest("FID card proof rawRenderDigest", value.rawRenderDigest),
    issuer:issuer(value.issuer),
  });
}

export function fidCardProofAssertionJson(value) {
  return JSON.stringify(canonical(normalizeFidCardProofAssertion(value)));
}

export function fidCardProofAssertionDigest(value) {
  return `sha256:${createHash("sha256").update(fidCardProofAssertionJson(value)).digest("hex")}`;
}

export function normalizeFidCardProofEnvelope(value) {
  exactKeys("FID card proof envelope", value, [
    "envelopeVersion",
    "assertion",
    "assertionDigest",
    "signature",
  ]);
  if (value.envelopeVersion !== FID_CARD_PROOF_ENVELOPE_VERSION) {
    throw new TypeError("FID card proof envelope version is unsupported");
  }
  const assertion = normalizeFidCardProofAssertion(value.assertion);
  exactKeys("FID card proof signature", value.signature, [
    "algorithm",
    "authorityId",
    "keyId",
    "bytesBase64",
  ]);
  if (value.signature.algorithm !== FID_CARD_PROOF_SIGNATURE_ALGORITHM) {
    throw new TypeError("FID card proof signature algorithm is unsupported");
  }
  if (value.signature.authorityId !== FIBRE_IDENTITY_AUTHORITY_ID) {
    throw new TypeError("FID card proof signature authority is invalid");
  }
  const signature = Object.freeze({
    algorithm:FID_CARD_PROOF_SIGNATURE_ALGORITHM,
    authorityId:value.signature.authorityId,
    keyId:id("FID card proof signature keyId", value.signature.keyId),
    bytesBase64:base64Signature("FID card proof signature bytes", value.signature.bytesBase64),
  });
  if (assertion.issuer.authorityId !== signature.authorityId || assertion.issuer.keyId !== signature.keyId) {
    throw new TypeError("FID card proof assertion issuer does not match signature identity");
  }
  const assertionDigest = digest("FID card proof assertionDigest", value.assertionDigest);
  if (assertionDigest !== fidCardProofAssertionDigest(assertion)) {
    throw new TypeError("FID card proof assertion digest mismatch");
  }
  return Object.freeze({
    envelopeVersion:FID_CARD_PROOF_ENVELOPE_VERSION,
    assertion,
    assertionDigest,
    signature,
  });
}

export async function signFidCardProofAssertion({ assertion: rawAssertion, issuerSigner } = {}) {
  const assertion = normalizeFidCardProofAssertion(rawAssertion);
  const checkedSigner = signer(issuerSigner);
  if (assertion.issuer.authorityId !== checkedSigner.profile.authorityId
    || assertion.issuer.keyId !== checkedSigner.profile.keyId) {
    throw new TypeError("FID card proof assertion issuer does not match signer profile");
  }
  const signatureBytes = await checkedSigner.sign(proofBytes(assertion));
  if (!(signatureBytes instanceof Uint8Array) || signatureBytes.length === 0) {
    throw new TypeError("FID card proof issuer sign() must return non-empty Uint8Array");
  }
  return normalizeFidCardProofEnvelope({
    envelopeVersion:FID_CARD_PROOF_ENVELOPE_VERSION,
    assertion,
    assertionDigest:fidCardProofAssertionDigest(assertion),
    signature:{
      algorithm:FID_CARD_PROOF_SIGNATURE_ALGORITHM,
      authorityId:checkedSigner.profile.authorityId,
      keyId:checkedSigner.profile.keyId,
      bytesBase64:Buffer.from(signatureBytes).toString("base64"),
    },
  });
}

export async function verifyFidCardProofEnvelope({ envelope: rawEnvelope, issuerSigner } = {}) {
  let envelope;
  let checkedSigner;
  try {
    envelope = normalizeFidCardProofEnvelope(rawEnvelope);
    checkedSigner = signer(issuerSigner);
  } catch {
    return false;
  }
  if (envelope.signature.authorityId !== checkedSigner.profile.authorityId
    || envelope.signature.keyId !== checkedSigner.profile.keyId) return false;
  try {
    return await checkedSigner.verify(
      proofBytes(envelope.assertion),
      Buffer.from(envelope.signature.bytesBase64, "base64"),
    ) === true;
  } catch {
    return false;
  }
}

function machinePayload(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.schema !== FID_MACHINE_CREDENTIAL_SCHEMA) {
    throw new TypeError("FID card proof requires a Fibre machine credential payload");
  }
  const snapshot = value.identitySnapshot;
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)
    || snapshot.credentialId !== value.credentialId
    || snapshot.revision !== value.revision
    || snapshot.threadId !== value.threadId
    || snapshot.fibreIdentityNumber !== value.fin
    || snapshot.registrationId !== value.registrationId
    || snapshot.civilRegistrationDigest !== value.civilRegistrationDigest) {
    throw new TypeError("FID card proof identity snapshot does not match the machine credential");
  }
  if (value.issuer?.authorityId !== FIBRE_IDENTITY_AUTHORITY_ID) {
    throw new TypeError("FID card proof machine credential issuer is not Fibre Identity Authority");
  }
  return value;
}

export function buildFidCardProofAssertion({ payload: rawPayload, side: rawSide } = {}) {
  const payload = machinePayload(rawPayload);
  const cardSide = side(rawSide);
  const snapshot = payload.identitySnapshot;
  const assertion = {
    schema:FID_CARD_PROOF_SCHEMA,
    credentialId:payload.credentialId,
    revision:payload.revision,
    side:cardSide,
    identity:{
      fin:payload.fin,
      displayName:snapshot.displayName ?? null,
      dateField:snapshot.dateField ?? null,
    },
    issuedAt:payload.issuedAt,
    expiresAt:payload.expiresAt ?? null,
    templateVersion:payload.templateVersion,
    registrationId:payload.registrationId,
    civilRegistrationDigest:payload.civilRegistrationDigest,
    identitySnapshotDigest:`sha256:${createHash("sha256").update(JSON.stringify(canonical(snapshot))).digest("hex")}`,
    photoDigest:payload.photo?.digest,
    rawRenderDigest:payload[`${cardSide}RenderDigest`],
    issuer:{
      authorityId:payload.issuer.authorityId,
      keyId:payload.issuer.keyId,
    },
  };
  return normalizeFidCardProofAssertion(assertion);
}
