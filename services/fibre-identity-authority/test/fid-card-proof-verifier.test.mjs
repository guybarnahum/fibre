import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createFidCredentialCrypto } from "../../../integrations/fid-credentials/webcrypto.mjs";
import {
  embedFidCardProofInPng,
  normalizeFidCardProofAssertion,
  signFidCardProofAssertion,
  verifyFidCardProof,
  verifyFidCardProofPair,
} from "../src/index.mjs";

const FRONT = new URL("../assets/fid-card/v0.3-ocean/front-base.png", import.meta.url);
const BACK = new URL("../assets/fid-card/v0.3-ocean/back-base.png", import.meta.url);

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function issuer({ keyId = "fibre-fia-production-v1" } = {}) {
  const { privateKey } = generateKeyPairSync("ed25519");
  const jwk = privateKey.export({ format:"jwk" });
  return createFidCredentialCrypto({
    FIA_ISSUER_JWK:JSON.stringify(jwk),
    FIA_ISSUER_KEY_ID:keyId,
    FIA_CREDENTIAL_KEY_BASE64:Buffer.alloc(32, 3).toString("base64"),
  }).issuerSigner;
}

function assertion({ rawPng, side, credentialId = "fidc_verify_001", revision = 1 } = {}) {
  return normalizeFidCardProofAssertion({
    schema:"fibre.fin-card-proof.v1",
    credentialId,
    revision,
    side,
    identity:{
      fin:"8PKH-A4-VH5R",
      displayName:"Sara Mizrahi",
      dateField:{ kind:"birth_date", value:"2004-08-20" },
    },
    issuedAt:"2026-09-20T01:20:00.000Z",
    expiresAt:null,
    templateVersion:"fid-card-template-v0.3-ocean",
    registrationId:"registration_verify_001",
    civilRegistrationDigest:`sha256:${"c".repeat(64)}`,
    identitySnapshotDigest:`sha256:${"d".repeat(64)}`,
    photoDigest:`sha256:${"e".repeat(64)}`,
    rawRenderDigest:sha256(rawPng),
    issuer:{
      authorityId:"fibre_identity_authority",
      keyId:"fibre-fia-production-v1",
    },
  });
}

async function protect(rawPng, issuerSigner, options) {
  const proof = assertion({ rawPng, ...options });
  const envelope = await signFidCardProofAssertion({ assertion:proof, issuerSigner });
  return {
    assertion:proof,
    envelope,
    png:embedFidCardProofInPng({ pngBytes:rawPng, envelope }),
  };
}

function proofChunkBounds(png) {
  const typeOffset = png.indexOf(Buffer.from("fiDP", "ascii"));
  assert.notEqual(typeOffset, -1);
  const start = typeOffset - 4;
  const length = png.readUInt32BE(start);
  return { start, end:start + 12 + length };
}

test("strict FIN proof verification returns the assertion only after signature and render binding pass", async () => {
  const rawFront = await readFile(FRONT);
  const issuerSigner = issuer();
  const protectedFront = await protect(rawFront, issuerSigner, { side:"front" });

  const verified = await verifyFidCardProof({
    pngBytes:protectedFront.png,
    issuerSigner,
    expectedSide:"front",
  });

  assert.deepEqual(verified, {
    verified:true,
    assertion:protectedFront.assertion,
  });
});

test("strict FIN proof verification never returns an assertion on trust failure", async () => {
  const [rawFront, rawBack] = await Promise.all([readFile(FRONT), readFile(BACK)]);
  const issuerSigner = issuer();
  const protectedFront = await protect(rawFront, issuerSigner, { side:"front" });

  const wrongKey = await verifyFidCardProof({
    pngBytes:protectedFront.png,
    issuerSigner:issuer(),
    expectedSide:"front",
  });
  assert.deepEqual(wrongKey, { verified:false, reason:"invalid_signature" });
  assert.equal("assertion" in wrongKey, false);

  const wrongKeyId = await verifyFidCardProof({
    pngBytes:protectedFront.png,
    issuerSigner:issuer({ keyId:"fibre-fia-other-key" }),
    expectedSide:"front",
  });
  assert.deepEqual(wrongKeyId, { verified:false, reason:"unknown_issuer_key" });
  assert.equal("assertion" in wrongKeyId, false);

  const wrongSide = await verifyFidCardProof({
    pngBytes:protectedFront.png,
    issuerSigner,
    expectedSide:"back",
  });
  assert.deepEqual(wrongSide, { verified:false, reason:"wrong_side" });
  assert.equal("assertion" in wrongSide, false);

  const mismatchedBytes = embedFidCardProofInPng({
    pngBytes:rawBack,
    envelope:protectedFront.envelope,
  });
  const wrongRender = await verifyFidCardProof({
    pngBytes:mismatchedBytes,
    issuerSigner,
    expectedSide:"front",
  });
  assert.deepEqual(wrongRender, { verified:false, reason:"render_digest_mismatch" });
  assert.equal("assertion" in wrongRender, false);
});

test("strict FIN proof verification rejects a mutated signature", async () => {
  const rawFront = await readFile(FRONT);
  const issuerSigner = issuer();
  const protectedFront = await protect(rawFront, issuerSigner, { side:"front" });
  const mutated = structuredClone(protectedFront.envelope);
  const signature = Buffer.from(mutated.signature.bytesBase64, "base64");
  signature[0] ^= 1;
  mutated.signature.bytesBase64 = signature.toString("base64");
  const png = embedFidCardProofInPng({ pngBytes:rawFront, envelope:mutated });

  assert.deepEqual(
    await verifyFidCardProof({ pngBytes:png, issuerSigner, expectedSide:"front" }),
    { verified:false, reason:"invalid_signature" },
  );
});

test("strict FIN proof verification classifies missing, malformed and duplicate proof transport", async () => {
  const rawFront = await readFile(FRONT);
  const issuerSigner = issuer();
  const protectedFront = await protect(rawFront, issuerSigner, { side:"front" });

  assert.deepEqual(
    await verifyFidCardProof({ pngBytes:rawFront, issuerSigner }),
    { verified:false, reason:"missing_proof" },
  );
  assert.deepEqual(
    await verifyFidCardProof({ pngBytes:Buffer.from("not-png"), issuerSigner }),
    { verified:false, reason:"malformed_png" },
  );

  const bounds = proofChunkBounds(protectedFront.png);
  const iendType = protectedFront.png.indexOf(Buffer.from("IEND", "ascii"), bounds.end);
  const iendStart = iendType - 4;
  const duplicated = Buffer.concat([
    protectedFront.png.subarray(0, iendStart),
    protectedFront.png.subarray(bounds.start, bounds.end),
    protectedFront.png.subarray(iendStart),
  ]);
  assert.deepEqual(
    await verifyFidCardProof({ pngBytes:duplicated, issuerSigner }),
    { verified:false, reason:"duplicate_proof" },
  );
});

test("FIN proof pair verification returns assertions only for one coherent credential pair", async () => {
  const [rawFront, rawBack] = await Promise.all([readFile(FRONT), readFile(BACK)]);
  const issuerSigner = issuer();
  const front = await protect(rawFront, issuerSigner, { side:"front" });
  const back = await protect(rawBack, issuerSigner, { side:"back" });

  const verified = await verifyFidCardProofPair({
    frontPngBytes:front.png,
    backPngBytes:back.png,
    issuerSigner,
  });
  assert.deepEqual(verified, {
    verified:true,
    frontAssertion:front.assertion,
    backAssertion:back.assertion,
  });

  const otherBack = await protect(rawBack, issuerSigner, {
    side:"back",
    credentialId:"fidc_verify_002",
    revision:2,
  });
  const mismatched = await verifyFidCardProofPair({
    frontPngBytes:front.png,
    backPngBytes:otherBack.png,
    issuerSigner,
  });
  assert.deepEqual(mismatched, { verified:false, reason:"pair_mismatch" });
  assert.equal("frontAssertion" in mismatched, false);
  assert.equal("backAssertion" in mismatched, false);
});

test("FIN proof pair verification fails closed when either side is not authentic", async () => {
  const [rawFront, rawBack] = await Promise.all([readFile(FRONT), readFile(BACK)]);
  const issuerSigner = issuer();
  const front = await protect(rawFront, issuerSigner, { side:"front" });
  const back = await protect(rawBack, issuerSigner, { side:"back" });

  const result = await verifyFidCardProofPair({
    frontPngBytes:front.png,
    backPngBytes:back.png,
    issuerSigner:issuer(),
  });
  assert.deepEqual(result, { verified:false, reason:"invalid_signature" });
  assert.equal("frontAssertion" in result, false);
  assert.equal("backAssertion" in result, false);
});
