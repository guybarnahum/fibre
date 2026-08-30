import { createHash, createPrivateKey } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Builder, LocalSigner, Reader } from "@contentauth/c2pa-node";

import {
  activeManifestFromStore,
  describeC2paAssertions,
  findC2paAssertion,
} from "./assertion-finder.mjs";

const ASSERTION_LABEL = "com.insidefibre.asset-generation";
const FORMAT = "c2pa";
const SELF_TEST_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlNfWQAAAAASUVORK5CYII=";

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
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

async function inspect(bytes, mediaType) {
  const reader = await Reader.fromAsset(
    { buffer: Buffer.from(bytes), mimeType: mediaType },
    {
      verify: {
        verify_after_reading: true,
        verify_trust: false,
        verify_timestamp_trust: false,
        ocsp_fetch: false,
        remote_manifest_fetch: false,
      },
    },
  );
  const storeText = reader.json();
  const store = typeof storeText === "string" ? JSON.parse(storeText) : storeText;
  const readerActive = typeof reader.getActive === "function" ? await reader.getActive() : null;
  const active = readerActive ?? activeManifestFromStore(store);
  const scope = active ?? store;
  const assertion = findC2paAssertion(scope, ASSERTION_LABEL);
  if (assertion === null || typeof assertion !== "object" || Array.isArray(assertion)) {
    const observed = describeC2paAssertions(scope);
    const suffix = observed.length === 0
      ? "no assertions were exposed by the active manifest"
      : `observed assertions: ${observed.join(", ")}`;
    throw new Error(`missing or invalid ${ASSERTION_LABEL} assertion; ${suffix}`);
  }
  return {
    assertion,
    manifestDigest: sha256(canonicalJson(store)),
  };
}

export async function createC2paNodeSigner({
  certificatePath,
  privateKeyPath,
  signerId = "fibre-c2pa-node-local-v1",
  trustPolicy = "development_signature_only",
} = {}) {
  const checkedCertificatePath = nonEmpty("C2PA certificatePath", certificatePath);
  const checkedPrivateKeyPath = nonEmpty("C2PA privateKeyPath", privateKeyPath);
  const checkedSignerId = nonEmpty("C2PA signerId", signerId);
  const checkedTrustPolicy = nonEmpty("C2PA trustPolicy", trustPolicy);

  const [certificate, privateKeyInput] = await Promise.all([
    readFile(checkedCertificatePath),
    readFile(checkedPrivateKeyPath),
  ]).catch((error) => {
    throw new Error(`Unable to load local C2PA credentials. Generate the local development certificate first. ${error.message}`);
  });

  const privateKeyPem = createPrivateKey(privateKeyInput).export({ format: "pem", type: "pkcs8" });
  const privateKey = Buffer.isBuffer(privateKeyPem) ? privateKeyPem : Buffer.from(privateKeyPem);
  if (!Buffer.isBuffer(certificate) || !Buffer.isBuffer(privateKey)) {
    throw new TypeError("C2PA local signer credentials must be Buffers");
  }
  const localSigner = LocalSigner.newSigner(certificate, privateKey, "es256");

  async function embed(body) {
    const bytes = bytesFromBase64(body.bytesBase64);
    if (typeof body.mediaType !== "string" || !body.mediaType.startsWith("image/")) {
      throw new TypeError("C2PA signer currently accepts image media types only");
    }
    if (!body.assertion || typeof body.assertion !== "object" || Array.isArray(body.assertion)) {
      throw new TypeError("assertion must be an object");
    }
    const builder = Builder.withJson({
      claim_generator_info: [{ name: "Fibre", version: "0.1.0" }],
      title: "Fibre generated reconstruction",
      format: body.mediaType,
    }, {
      verify: { verify_after_sign: true, verify_trust: false },
    });
    builder.setIntent({
      create: "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia",
    });
    builder.addAssertion(ASSERTION_LABEL, JSON.stringify(body.assertion), "Json");
    const output = { buffer: null };
    builder.sign(localSigner, { buffer: bytes, mimeType: body.mediaType }, output);
    if (!Buffer.isBuffer(output.buffer)) throw new Error("C2PA SDK did not produce an output buffer");
    const inspection = await inspect(output.buffer, body.mediaType);
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
      const inspection = await inspect(bytes, body.mediaType);
      return {
        valid: true,
        format: FORMAT,
        signerId: checkedSignerId,
        manifestDigest: inspection.manifestDigest,
        assertion: inspection.assertion,
        verifiedAt,
        failureReason: null,
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
