import { createHash, createPrivateKey } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Builder, LocalSigner, Reader } from "@contentauth/c2pa-node";

import {
  activeManifestFromStore,
  describeC2paAssertions,
  findC2paAssertion,
} from "./assertion-finder.mjs";

const DEFAULT_ASSERTION_LABEL = "com.insidefibre.asset-generation";
const GENERATED_SOURCE_TYPE = "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia";
const CREDENTIAL_SOURCE_TYPE = "http://cv.iptc.org/newscodes/digitalsourcetype/composite";
const FORMAT = "c2pa";
const SELF_TEST_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlNfWQAAAAASUVORK5CYII=";

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

function assertionLabel(value) {
  return value === null || value === undefined ? DEFAULT_ASSERTION_LABEL : nonEmpty("C2PA assertionLabel", value);
}

function canonicalize(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}
function canonicalJson(value) { return JSON.stringify(canonicalize(value)); }
function sha256(value) {
  const bytes = typeof value === "string" ? Buffer.from(value) : Buffer.from(value);
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}
function now() { return new Date().toISOString(); }
function bytesFromBase64(value) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError("bytesBase64 is required");
  return Buffer.from(value, "base64");
}

function certificateBlocks(input) {
  return Buffer.from(input).toString("utf8").match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/gu) ?? [];
}

function fibreTrustAnchors(certificate) {
  const blocks = certificateBlocks(certificate);
  if (blocks.length < 2) throw new Error("Fibre C2PA signer certificate must include its issuing CA chain");
  return blocks.slice(1).join("\n");
}

async function inspect(
  bytes,
  mediaType,
  label = DEFAULT_ASSERTION_LABEL,
  { trustPolicy = "development_signature_only", trustAnchors = null } = {},
) {
  const fibreTrusted = trustPolicy === "fibre_signature_only";
  const reader = await Reader.fromAsset(
    { buffer: Buffer.from(bytes), mimeType: mediaType },
    {
      verify: {
        verify_after_reading: true,
        verify_trust: fibreTrusted,
        verify_timestamp_trust: false,
        ocsp_fetch: false,
        remote_manifest_fetch: false,
      },
      ...(fibreTrusted ? {
        trust: {
          verify_trust_list: true,
          trust_anchors: nonEmpty("Fibre C2PA trust anchors", trustAnchors),
        },
      } : {}),
    },
  );
  const storeText = reader.json();
  const store = typeof storeText === "string" ? JSON.parse(storeText) : storeText;
  if (fibreTrusted && store?.validation_state !== "Trusted") {
    throw new Error(`C2PA signature is not trusted by Fibre: ${String(store?.validation_state ?? "unknown")}`);
  }
  const readerActive = typeof reader.getActive === "function" ? await reader.getActive() : null;
  const active = readerActive ?? activeManifestFromStore(store);
  const scope = active ?? store;
  const assertion = findC2paAssertion(scope, label);
  if (assertion === null || typeof assertion !== "object" || Array.isArray(assertion)) {
    const observed = describeC2paAssertions(scope);
    const suffix = observed.length === 0
      ? "no assertions were exposed by the active manifest"
      : `observed assertions: ${observed.join(", ")}`;
    throw new Error(`missing or invalid ${label} assertion; ${suffix}`);
  }
  return {
    assertion,
    manifestDigest: sha256(canonicalJson(store)),
    trusted: fibreTrusted ? true : null,
  };
}

export async function createC2paNodeSigner({
  certificatePath = null,
  privateKeyPath = null,
  certificateBytes = null,
  privateKeyBytes = null,
  signerId = "fibre-c2pa-node-local-v1",
  trustPolicy = "development_signature_only",
} = {}) {
  const checkedSignerId = nonEmpty("C2PA signerId", signerId);
  const checkedTrustPolicy = nonEmpty("C2PA trustPolicy", trustPolicy);
  let certificate;
  let privateKeyInput;
  try {
    [certificate, privateKeyInput] = await Promise.all([
      certificateBytes === null ? readFile(nonEmpty("C2PA certificatePath", certificatePath)) : Promise.resolve(Buffer.from(certificateBytes)),
      privateKeyBytes === null ? readFile(nonEmpty("C2PA privateKeyPath", privateKeyPath)) : Promise.resolve(Buffer.from(privateKeyBytes)),
    ]);
  } catch (error) {
    throw new Error(`Unable to load C2PA credentials. ${error.message}`);
  }
  const trustAnchors = checkedTrustPolicy === "fibre_signature_only"
    ? fibreTrustAnchors(certificate)
    : null;

  const privateKeyPem = createPrivateKey(privateKeyInput).export({ format: "pem", type: "pkcs8" });
  const privateKey = Buffer.isBuffer(privateKeyPem) ? privateKeyPem : Buffer.from(privateKeyPem);
  if (!Buffer.isBuffer(certificate) || !Buffer.isBuffer(privateKey)) {
    throw new TypeError("C2PA local signer credentials must be Buffers");
  }
  const localSigner = LocalSigner.newSigner(certificate, privateKey, "es256");

  async function embed(body) {
    const bytes = bytesFromBase64(body.bytesBase64);
    const label = assertionLabel(body.assertionLabel);
    if (typeof body.mediaType !== "string" || !body.mediaType.startsWith("image/")) {
      throw new TypeError("C2PA signer currently accepts image media types only");
    }
    if (!body.assertion || typeof body.assertion !== "object" || Array.isArray(body.assertion)) {
      throw new TypeError("assertion must be an object");
    }
    const generatedMedia = label === DEFAULT_ASSERTION_LABEL;
    const builder = Builder.withJson({
      claim_generator_info: [{ name: "Fibre", version: "0.1.0" }],
      title: generatedMedia ? "Fibre generated reconstruction" : "Fibre credentialed asset",
      format: body.mediaType,
    }, {
      verify: { verify_after_sign: true, verify_trust: false },
    });
    builder.setIntent({
      create: generatedMedia ? GENERATED_SOURCE_TYPE : CREDENTIAL_SOURCE_TYPE,
    });
    builder.addAssertion(label, JSON.stringify(body.assertion), "Json");
    const output = { buffer: null };
    builder.sign(localSigner, { buffer: bytes, mimeType: body.mediaType }, output);
    if (!Buffer.isBuffer(output.buffer)) throw new Error("C2PA SDK did not produce an output buffer");
    const inspection = await inspect(output.buffer, body.mediaType, label, { trustPolicy: checkedTrustPolicy, trustAnchors });
    if (canonicalJson(inspection.assertion) !== canonicalJson(body.assertion)) {
      throw new Error("embedded C2PA assertion does not match requested assertion");
    }
    return {
      bytesBase64: output.buffer.toString("base64"),
      format: FORMAT,
      signerId: checkedSignerId,
      manifestDigest: inspection.manifestDigest,
      embeddedAt: now(),
    };
  }

  async function verify(body) {
    const verifiedAt = now();
    try {
      const bytes = bytesFromBase64(body.bytesBase64);
      const inspection = await inspect(bytes, body.mediaType, assertionLabel(body.assertionLabel), { trustPolicy: checkedTrustPolicy, trustAnchors });
      return {
        valid: true,
        format: FORMAT,
        signerId: checkedSignerId,
        manifestDigest: inspection.manifestDigest,
        assertion: inspection.assertion,
        verifiedAt,
        failureReason: null,
        ...(checkedTrustPolicy === "fibre_signature_only"
          ? { trust: { policy: checkedTrustPolicy, trusted: inspection.trusted === true } }
          : {}),
      };
    } catch (error) {
      return {
        valid: false,
        format: FORMAT,
        signerId: checkedSignerId,
        manifestDigest: null,
        assertion: null,
        verifiedAt,
        failureReason: error instanceof Error ? error.message : String(error),
        ...(checkedTrustPolicy === "fibre_signature_only"
          ? { trust: { policy: checkedTrustPolicy, trusted: false } }
          : {}),
      };
    }
  }

  async function selfTest() {
    const assertion = {
      selfTestVersion: "fibre-c2pa-local-self-test-v1",
      purpose: "sign-read-assertion-round-trip",
    };
    const embedded = await embed({
      bytesBase64: SELF_TEST_PNG_BASE64,
      mediaType: "image/png",
      assertion,
    });
    const verification = await verify({
      bytesBase64: embedded.bytesBase64,
      mediaType: "image/png",
    });
    if (!verification.valid || canonicalJson(verification.assertion) !== canonicalJson(assertion)) {
      throw new Error(`Fibre local C2PA sign/read self-test failed: ${verification.failureReason ?? "assertion mismatch"}`);
    }

    const credentialLabel = "com.insidefibre.credential-self-test.v1";
    const credentialAssertion = {
      selfTestVersion: "fibre-c2pa-local-credential-self-test-v1",
      purpose: "credentialed-asset-sign-read-round-trip",
    };
    const credentialed = await embed({
      bytesBase64: SELF_TEST_PNG_BASE64,
      mediaType: "image/png",
      assertionLabel: credentialLabel,
      assertion: credentialAssertion,
    });
    const credentialVerification = await verify({
      bytesBase64: credentialed.bytesBase64,
      mediaType: "image/png",
      assertionLabel: credentialLabel,
    });
    if (!credentialVerification.valid
      || canonicalJson(credentialVerification.assertion) !== canonicalJson(credentialAssertion)) {
      throw new Error(`Fibre local credentialed-asset C2PA self-test failed: ${credentialVerification.failureReason ?? "assertion mismatch"}`);
    }
  }

  const adapter = Object.freeze({
    format: FORMAT,
    signerId: checkedSignerId,
    trustPolicy: checkedTrustPolicy,
    embed,
    verify,
    selfTest,
  });
  await selfTest();
  return adapter;
}
