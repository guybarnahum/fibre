import { createHash } from "node:crypto";

import { requireInfraCapabilities } from "#infra";

import {
  FID_CARD_PROOF_ENVELOPE_VERSION,
  FID_CARD_PROOF_SCHEMA,
  buildFidCardProofAssertion,
  fidCardProofAssertionDigest,
  fidCardProofAssertionJson,
  signFidCardProofAssertion,
} from "./fid-card-proof.mjs";
import { embedFidCardProofInPng } from "./fid-card-proof-png.mjs";
import { verifyFidCardProof } from "./fid-card-proof-verifier.mjs";
import {
  FID_MACHINE_CREDENTIAL_SCHEMA,
  FID_MACHINE_ENVELOPE_VERSION,
} from "./fid-machine-credential.mjs";

const SIDES = Object.freeze(["front", "back"]);

function canonical(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonical);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function asBytes(name, value) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  if (ArrayBuffer.isView(value)) return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  throw new TypeError(`${name} must be bytes`);
}

function machineCredential(value) {
  if (!value || value.envelopeVersion !== FID_MACHINE_ENVELOPE_VERSION || !value.routing) {
    throw new TypeError("native FIN proof issuance requires a machine credential envelope");
  }
  if (value.routing.schema !== FID_MACHINE_CREDENTIAL_SCHEMA) {
    throw new TypeError("native FIN proof issuance machine credential schema is unsupported");
  }
  return value;
}

function assertMaterials(render, payload, envelope) {
  if (!payload || payload.schema !== FID_MACHINE_CREDENTIAL_SCHEMA) {
    throw new TypeError("native FIN proof issuance requires the authorized machine credential payload");
  }
  if (payload.credentialId !== envelope.routing.credentialId
    || payload.revision !== envelope.routing.revision
    || payload.issuer?.authorityId !== envelope.routing.issuerAuthorityId
    || payload.issuer?.keyId !== envelope.routing.issuerKeyId
    || payload.frontRenderDigest !== envelope.routing.frontRenderDigest
    || payload.backRenderDigest !== envelope.routing.backRenderDigest) {
    throw new TypeError("native FIN proof payload does not match the sealed machine credential");
  }
  if (!render || render.credentialId !== payload.credentialId
    || render.revision !== payload.revision
    || render.frontRenderDigest !== payload.frontRenderDigest
    || render.backRenderDigest !== payload.backRenderDigest) {
    throw new TypeError("native FIN proof render does not match the machine credential payload");
  }

  const raw = {
    front:asBytes("FID front.png", render.files?.["front.png"]),
    back:asBytes("FID back.png", render.files?.["back.png"]),
  };
  for (const side of SIDES) {
    if (sha256(raw[side]) !== payload[`${side}RenderDigest`]) {
      throw new TypeError(`native FIN proof ${side} render digest does not match render bytes`);
    }
  }
  return raw;
}

function sameAssertion(left, right) {
  return fidCardProofAssertionJson(left) === fidCardProofAssertionJson(right);
}

export async function protectAndStoreFidCard({
  infra,
  render,
  machineCredential: rawMachineCredential,
  machineCredentialPayload,
  issuerSigner,
} = {}) {
  requireInfraCapabilities(infra, "objects");
  const envelope = machineCredential(rawMachineCredential);
  const raw = assertMaterials(render, machineCredentialPayload, envelope);
  const prepared = {};

  for (const side of SIDES) {
    const expectedAssertion = buildFidCardProofAssertion({
      payload:machineCredentialPayload,
      side,
    });
    const proofEnvelope = await signFidCardProofAssertion({
      assertion:expectedAssertion,
      issuerSigner,
    });
    const protectedBytes = embedFidCardProofInPng({
      pngBytes:raw[side],
      envelope:proofEnvelope,
    });
    const verification = await verifyFidCardProof({
      pngBytes:protectedBytes,
      issuerSigner,
      expectedSide:side,
    });
    if (!verification.verified) {
      throw new Error(`native FIN proof ${side} verification failed: ${verification.reason}`);
    }
    if (!sameAssertion(verification.assertion, expectedAssertion)) {
      throw new Error(`native FIN proof ${side} trusted assertion does not match FIA issuance`);
    }

    prepared[side] = Object.freeze({
      bytes:protectedBytes,
      finalDigest:sha256(protectedBytes),
      assertionDigest:fidCardProofAssertionDigest(expectedAssertion),
    });
  }

  const machineCredentialDigest = sha256(Buffer.from(JSON.stringify(canonical(envelope))));
  const storedResult = {};

  for (const side of SIDES) {
    const current = prepared[side];
    const objectRef = `fidcard_${envelope.routing.credentialId}_${side}`;
    const stored = await infra.objects.putImmutable(
      objectRef,
      current.bytes,
      current.finalDigest,
      {
        kind:"fid_card",
        credentialId:envelope.routing.credentialId,
        revision:envelope.routing.revision,
        side,
        mediaType:"image/png",
        rawRenderDigest:envelope.routing[`${side}RenderDigest`],
        machineCredentialDigest,
        encryptedCredentialDigest:envelope.encryptedCredentialDigest,
        proofFormat:"fibre-fin-proof",
        proofSchema:FID_CARD_PROOF_SCHEMA,
        proofEnvelopeVersion:FID_CARD_PROOF_ENVELOPE_VERSION,
        proofAssertionDigest:current.assertionDigest,
        proofStatus:"verified",
      },
    );
    storedResult[side] = Object.freeze({
      objectRef,
      rawRenderDigest:envelope.routing[`${side}RenderDigest`],
      finalDigest:current.finalDigest,
      proofAssertionDigest:current.assertionDigest,
      stored:true,
      duplicate:stored.duplicate === true,
    });
  }

  return Object.freeze({
    credentialId:envelope.routing.credentialId,
    revision:envelope.routing.revision,
    machineCredentialDigest,
    proofFormat:"fibre-fin-proof",
    proofSchema:FID_CARD_PROOF_SCHEMA,
    proofEnvelopeVersion:FID_CARD_PROOF_ENVELOPE_VERSION,
    front:storedResult.front,
    back:storedResult.back,
  });
}
