import { createHash } from "node:crypto";

import { requireInfraCapabilities } from "#infra";
import { assertContentCredentialSigner } from "fibre/asset-generator/content-credential-signer";
import {
  FID_MACHINE_CREDENTIAL_SCHEMA,
  FID_MACHINE_ENVELOPE_VERSION,
} from "./fid-machine-credential.mjs";

export const FID_C2PA_ASSERTION_LABEL = "com.insidefibre.fid-card.v1";

const DIGEST = /^sha256:[0-9a-f]{64}$/;
const SIDES = Object.freeze(["front", "back"]);

function canonical(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonical);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
}

function same(left, right) { return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right)); }
function sha256(value) { return `sha256:${createHash("sha256").update(value).digest("hex")}`; }
function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value;
}
function digest(name, value) {
  if (typeof value !== "string" || !DIGEST.test(value)) throw new TypeError(`${name} is invalid`);
  return value;
}
function side(value) {
  if (!SIDES.includes(value)) throw new TypeError("FID card side must be front or back");
  return value;
}
function asBytes(name, value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  throw new TypeError(`${name} must be bytes`);
}

function machineEnvelope(value) {
  if (!value || value.envelopeVersion !== FID_MACHINE_ENVELOPE_VERSION || !value.routing || !value.protection) {
    throw new TypeError("FID credentialing requires a D1 machine credential envelope");
  }
  if (value.routing.schema !== FID_MACHINE_CREDENTIAL_SCHEMA) throw new TypeError("FID machine credential schema is unsupported");
  nonEmpty("FID credentialId", value.routing.credentialId);
  if (!Number.isSafeInteger(value.routing.revision) || value.routing.revision < 1) throw new TypeError("FID credential revision is invalid");
  digest("FID front render digest", value.routing.frontRenderDigest);
  digest("FID back render digest", value.routing.backRenderDigest);
  const encryptedDigest = digest("FID encrypted credential digest", value.encryptedCredentialDigest);
  const encryptedBytes = Buffer.from(nonEmpty("FID encrypted credential", value.encryptedCredentialBase64), "base64");
  if (sha256(encryptedBytes) !== encryptedDigest) throw new TypeError("FID encrypted credential digest mismatch");
  return value;
}

function assertRender(render, envelope) {
  if (!render || render.credentialId !== envelope.routing.credentialId || render.revision !== envelope.routing.revision
    || render.frontRenderDigest !== envelope.routing.frontRenderDigest
    || render.backRenderDigest !== envelope.routing.backRenderDigest) {
    throw new TypeError("FID render and machine credential identify different issuances");
  }
  const front = asBytes("FID front.png", render.files?.["front.png"]);
  const back = asBytes("FID back.png", render.files?.["back.png"]);
  if (sha256(front) !== render.frontRenderDigest || sha256(back) !== render.backRenderDigest) {
    throw new TypeError("FID raw render digest does not match render bytes");
  }
  return { front, back };
}

export function buildFidC2paAssertion({ machineCredential: rawEnvelope, side: rawSide }) {
  const envelope = machineEnvelope(rawEnvelope);
  return Object.freeze({
    schema: FID_C2PA_ASSERTION_LABEL,
    side: side(rawSide),
    machineCredential: structuredClone(envelope),
  });
}

function assertEmbedResult(value, expectedSigner) {
  const embeddedBytes = asBytes("FID credentialed PNG", value?.bytes);
  if (value.signerId !== expectedSigner.signerId || value.format !== expectedSigner.format) {
    throw new Error("FID C2PA embed result does not match configured signer");
  }
  digest("FID C2PA manifest digest", value.manifestDigest);
  nonEmpty("FID C2PA embeddedAt", value.embeddedAt);
  return { ...value, bytes: embeddedBytes };
}

export async function verifyFidC2paSide({ contentCredentialSigner, bytes, side: rawSide, machineCredential }) {
  const checkedSigner = assertContentCredentialSigner(contentCredentialSigner);
  const expected = buildFidC2paAssertion({ machineCredential, side: rawSide });
  const verification = await checkedSigner.verify({
    bytes: asBytes("FID credentialed PNG", bytes),
    mediaType: "image/png",
    assertionLabel: FID_C2PA_ASSERTION_LABEL,
  });
  if (!verification?.valid) throw new Error(`FID C2PA verification failed: ${verification?.failureReason ?? "invalid credential"}`);
  if (verification.signerId !== checkedSigner.signerId || verification.format !== checkedSigner.format) {
    throw new Error("FID C2PA verification does not match configured signer");
  }
  digest("FID C2PA manifest digest", verification.manifestDigest);
  if (!same(verification.assertion, expected)) throw new Error("FID C2PA assertion does not match issuance");
  return verification;
}

export async function credentialAndStoreFidCard({ infra, contentCredentialSigner, render, machineCredential: rawEnvelope }) {
  requireInfraCapabilities(infra, "objects");
  const objects = infra.objects;
  const checkedSigner = assertContentCredentialSigner(contentCredentialSigner);
  const envelope = machineEnvelope(rawEnvelope);
  const raw = assertRender(render, envelope);

  const prepared = {};
  for (const cardSide of SIDES) {
    const assertion = buildFidC2paAssertion({ machineCredential: envelope, side: cardSide });
    const embedded = assertEmbedResult(await checkedSigner.embed({
      bytes: raw[cardSide],
      mediaType: "image/png",
      assertionLabel: FID_C2PA_ASSERTION_LABEL,
      assertion,
    }), checkedSigner);
    const verification = await verifyFidC2paSide({
      contentCredentialSigner: checkedSigner,
      bytes: embedded.bytes,
      side: cardSide,
      machineCredential: envelope,
    });
    if (verification.manifestDigest !== embedded.manifestDigest) {
      throw new Error("FID C2PA manifest digest changed after embedding");
    }
    prepared[cardSide] = { embedded, verification, finalDigest: sha256(embedded.bytes) };
  }

  const machineCredentialDigest = sha256(Buffer.from(JSON.stringify(canonical(envelope))));
  const result = {};
  for (const cardSide of SIDES) {
    const current = prepared[cardSide];
    const objectRef = `fidcard_${envelope.routing.credentialId}_${cardSide}`;
    const stored = await objects.putImmutable(objectRef, current.embedded.bytes, current.finalDigest, {
      kind: "fid_card",
      credentialId: envelope.routing.credentialId,
      revision: envelope.routing.revision,
      side: cardSide,
      mediaType: "image/png",
      rawRenderDigest: envelope.routing[`${cardSide}RenderDigest`],
      machineCredentialDigest,
      encryptedCredentialDigest: envelope.encryptedCredentialDigest,
      credentialFormat: current.embedded.format,
      credentialSignerId: current.embedded.signerId,
      credentialManifestDigest: current.embedded.manifestDigest,
      credentialEmbeddedAt: current.embedded.embeddedAt,
      credentialVerifiedAt: current.verification.verifiedAt,
    });
    result[cardSide] = Object.freeze({
      objectRef,
      finalDigest: current.finalDigest,
      manifestDigest: current.embedded.manifestDigest,
      stored: true,
      duplicate: stored.duplicate === true,
    });
  }

  return Object.freeze({
    credentialId: envelope.routing.credentialId,
    revision: envelope.routing.revision,
    machineCredentialDigest,
    front: result.front,
    back: result.back,
  });
}
