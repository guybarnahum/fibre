import { createHash } from "node:crypto";

import { verifyFidCardProofEnvelope } from "./fid-card-proof.mjs";
import { extractFidCardProofFromPng } from "./fid-card-proof-png.mjs";

export const FID_CARD_PROOF_VERIFICATION_REASONS = Object.freeze([
  "malformed_png",
  "missing_proof",
  "duplicate_proof",
  "invalid_proof_envelope",
  "unknown_issuer_key",
  "invalid_signature",
  "wrong_side",
  "render_digest_mismatch",
  "pair_mismatch",
]);

const SIDE = new Set(["front", "back"]);

function failure(reason) {
  return Object.freeze({ verified:false, reason });
}

function success(assertion) {
  return Object.freeze({ verified:true, assertion });
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function extractionFailure(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (/does not contain a Fibre proof chunk/u.test(message)) return "missing_proof";
  if (/exactly one Fibre proof chunk/u.test(message)) return "duplicate_proof";
  if (/payload|envelope|assertion|signature/u.test(message)) return "invalid_proof_envelope";
  return "malformed_png";
}

function trustedSignerMatches(envelope, issuerSigner) {
  const profile = issuerSigner?.profile;
  return profile?.authorityId === envelope.signature.authorityId
    && profile?.keyId === envelope.signature.keyId
    && profile?.algorithm === envelope.signature.algorithm;
}

function pairFacts(assertion) {
  return JSON.stringify({
    credentialId:assertion.credentialId,
    revision:assertion.revision,
    identity:assertion.identity,
    issuedAt:assertion.issuedAt,
    expiresAt:assertion.expiresAt,
    templateVersion:assertion.templateVersion,
    registrationId:assertion.registrationId,
    civilRegistrationDigest:assertion.civilRegistrationDigest,
    identitySnapshotDigest:assertion.identitySnapshotDigest,
    photoDigest:assertion.photoDigest,
    issuer:assertion.issuer,
  });
}

export async function verifyFidCardProof({
  pngBytes,
  issuerSigner,
  expectedSide = null,
} = {}) {
  if (expectedSide !== null && !SIDE.has(expectedSide)) {
    throw new TypeError("FID card proof expectedSide must be front, back, or null");
  }

  let extracted;
  try {
    extracted = extractFidCardProofFromPng(pngBytes);
  } catch (error) {
    return failure(extractionFailure(error));
  }

  const { envelope, rawPng } = extracted;
  if (!trustedSignerMatches(envelope, issuerSigner)) return failure("unknown_issuer_key");

  if (!(await verifyFidCardProofEnvelope({ envelope, issuerSigner }))) {
    return failure("invalid_signature");
  }

  if (expectedSide !== null && envelope.assertion.side !== expectedSide) {
    return failure("wrong_side");
  }

  if (sha256(rawPng) !== envelope.assertion.rawRenderDigest) {
    return failure("render_digest_mismatch");
  }

  return success(envelope.assertion);
}

export async function verifyFidCardProofPair({
  frontPngBytes,
  backPngBytes,
  issuerSigner,
} = {}) {
  const front = await verifyFidCardProof({
    pngBytes:frontPngBytes,
    issuerSigner,
    expectedSide:"front",
  });
  if (!front.verified) return failure(front.reason);

  const back = await verifyFidCardProof({
    pngBytes:backPngBytes,
    issuerSigner,
    expectedSide:"back",
  });
  if (!back.verified) return failure(back.reason);

  if (pairFacts(front.assertion) !== pairFacts(back.assertion)) {
    return failure("pair_mismatch");
  }

  return Object.freeze({
    verified:true,
    frontAssertion:front.assertion,
    backAssertion:back.assertion,
  });
}
