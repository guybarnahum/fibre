import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createFidCredentialCrypto } from "../../../integrations/fid-credentials/webcrypto.mjs";
import {
  FID_CARD_PROOF_PNG_CHUNK_TYPE,
  embedFidCardProofInPng,
  extractFidCardProofFromPng,
  normalizeFidCardProofAssertion,
  signFidCardProofAssertion,
} from "../src/index.mjs";
import { decodePngRgba } from "../src/fid-photo-surface.mjs";

const ASSET = new URL("../assets/fid-card/v0.3-ocean/front-base.png", import.meta.url);

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function issuer() {
  const { privateKey } = generateKeyPairSync("ed25519");
  const jwk = privateKey.export({ format:"jwk" });
  return createFidCredentialCrypto({
    FIA_ISSUER_JWK:JSON.stringify(jwk),
    FIA_ISSUER_KEY_ID:"fibre-fia-production-v1",
    FIA_CREDENTIAL_KEY_BASE64:Buffer.alloc(32, 7).toString("base64"),
  }).issuerSigner;
}

async function signedEnvelope(rawPng, side = "front") {
  const issuerSigner = issuer();
  const assertion = normalizeFidCardProofAssertion({
    schema:"fibre.fin-card-proof.v1",
    credentialId:"fidc_png_transport_001",
    revision:1,
    side,
    identity:{
      fin:"8PKH-A4-VH5R",
      displayName:"Sara Mizrahi",
      dateField:{ kind:"birth_date", value:"2004-08-20" },
    },
    issuedAt:"2026-09-20T01:00:00.000Z",
    expiresAt:null,
    templateVersion:"fid-card-template-v0.3-ocean",
    registrationId:"registration_png_transport",
    civilRegistrationDigest:`sha256:${"c".repeat(64)}`,
    identitySnapshotDigest:`sha256:${"d".repeat(64)}`,
    photoDigest:`sha256:${"e".repeat(64)}`,
    rawRenderDigest:sha256(rawPng),
    issuer:{
      authorityId:"fibre_identity_authority",
      keyId:"fibre-fia-production-v1",
    },
  });
  return signFidCardProofAssertion({ assertion, issuerSigner });
}

function proofChunkBounds(png) {
  const typeOffset = png.indexOf(Buffer.from(FID_CARD_PROOF_PNG_CHUNK_TYPE, "ascii"));
  assert.notEqual(typeOffset, -1, "proof chunk type was not embedded");
  const start = typeOffset - 4;
  const length = png.readUInt32BE(start);
  return { start, typeOffset, dataStart:typeOffset + 4, end:start + 12 + length };
}

test("FIN proof embeds as one private ancillary PNG chunk and preserves visible pixels", async () => {
  const rawPng = await readFile(ASSET);
  const envelope = await signedEnvelope(rawPng);
  const protectedPng = embedFidCardProofInPng({ pngBytes:rawPng, envelope });

  assert.equal(FID_CARD_PROOF_PNG_CHUNK_TYPE, "fiDP");
  assert.notDeepEqual(protectedPng, rawPng);
  assert.equal(protectedPng.indexOf(Buffer.from("fiDP", "ascii")) > 0, true);
  assert.equal(
    protectedPng.indexOf(Buffer.from("fiDP", "ascii")) < protectedPng.indexOf(Buffer.from("IEND", "ascii")),
    true,
    "proof chunk was not inserted before IEND",
  );

  const [rawPixels, protectedPixels] = await Promise.all([
    decodePngRgba(rawPng),
    decodePngRgba(protectedPng),
  ]);
  assert.equal(protectedPixels.width, rawPixels.width);
  assert.equal(protectedPixels.height, rawPixels.height);
  assert.deepEqual(protectedPixels.rgba, rawPixels.rgba, "proof embedding changed visible pixels");
});

test("FIN proof extraction returns the normalized envelope and exact original PNG bytes", async () => {
  const rawPng = await readFile(ASSET);
  const envelope = await signedEnvelope(rawPng);
  const protectedPng = embedFidCardProofInPng({ pngBytes:rawPng, envelope });
  const extracted = extractFidCardProofFromPng(protectedPng);

  assert.deepEqual(extracted.envelope, envelope);
  assert.deepEqual(extracted.rawPng, rawPng, "proof removal did not reconstruct the raw PNG byte-for-byte");
  assert.equal(sha256(extracted.rawPng), envelope.assertion.rawRenderDigest);
});

test("FIN proof PNG embedding is deterministic and refuses implicit re-embedding", async () => {
  const rawPng = await readFile(ASSET);
  const envelope = await signedEnvelope(rawPng);
  const reordered = Object.fromEntries(Object.entries(envelope).reverse());

  const first = embedFidCardProofInPng({ pngBytes:rawPng, envelope });
  const second = embedFidCardProofInPng({ pngBytes:rawPng, envelope:reordered });
  assert.deepEqual(second, first, "canonical proof embedding changed with JSON key order");

  assert.throws(
    () => embedFidCardProofInPng({ pngBytes:first, envelope }),
    /already contains a Fibre proof chunk/u,
  );
});

test("FIN proof extraction rejects duplicate or CRC-invalid proof chunks", async () => {
  const rawPng = await readFile(ASSET);
  const envelope = await signedEnvelope(rawPng);
  const protectedPng = embedFidCardProofInPng({ pngBytes:rawPng, envelope });
  const bounds = proofChunkBounds(protectedPng);

  const iendType = protectedPng.indexOf(Buffer.from("IEND", "ascii"), bounds.end);
  assert.notEqual(iendType, -1);
  const iendStart = iendType - 4;
  const duplicated = Buffer.concat([
    protectedPng.subarray(0, iendStart),
    protectedPng.subarray(bounds.start, bounds.end),
    protectedPng.subarray(iendStart),
  ]);
  assert.throws(
    () => extractFidCardProofFromPng(duplicated),
    /exactly one Fibre proof chunk/u,
  );

  const corrupt = Buffer.from(protectedPng);
  corrupt[bounds.dataStart] ^= 1;
  assert.throws(
    () => extractFidCardProofFromPng(corrupt),
    /failed CRC validation/u,
  );
});

test("FIN proof transport rejects malformed PNG structure", async () => {
  const rawPng = await readFile(ASSET);
  const envelope = await signedEnvelope(rawPng);

  assert.throws(
    () => embedFidCardProofInPng({ pngBytes:Buffer.from("not-a-png"), envelope }),
    /must be PNG/u,
  );
  assert.throws(
    () => extractFidCardProofFromPng(rawPng),
    /does not contain a Fibre proof chunk/u,
  );

  const truncated = rawPng.subarray(0, rawPng.length - 4);
  assert.throws(
    () => embedFidCardProofInPng({ pngBytes:truncated, envelope }),
    /truncated|missing IEND/u,
  );
});
