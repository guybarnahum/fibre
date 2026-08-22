import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { Builder, LocalSigner, Reader } from "@contentauth/c2pa-node";

const ASSERTION_LABEL = "com.insidefibre.asset-generation.v1";
const SIGNER_ID = "fibre-c2pa-node-local-v1";
const FORMAT = "c2pa";
const PORT = Number(process.env.FIBRE_C2PA_PORT ?? 8790);
const CERT_PATH = process.env.FIBRE_C2PA_CERT
  ?? fileURLToPath(new URL("../../.fibre/p3-c2pa/cert.pem", import.meta.url));
const KEY_PATH = process.env.FIBRE_C2PA_KEY
  ?? fileURLToPath(new URL("../../.fibre/p3-c2pa/key.pem", import.meta.url));
const MAX_BODY_BYTES = 32 * 1024 * 1024;

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
function json(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}
async function readJson(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) throw new Error("request body too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
function findAssertion(value, seen = new Set()) {
  if (value === null || typeof value !== "object") return null;
  if (seen.has(value)) return null;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findAssertion(item, seen);
      if (found !== null) return found;
    }
    return null;
  }
  if (value.label === ASSERTION_LABEL && value.data !== undefined) return value.data;
  if (Object.hasOwn(value, ASSERTION_LABEL)) {
    const candidate = value[ASSERTION_LABEL];
    if (candidate?.data !== undefined) return candidate.data;
    return candidate;
  }
  for (const item of Object.values(value)) {
    const found = findAssertion(item, seen);
    if (found !== null) return found;
  }
  return null;
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
  const store = reader.json();
  const assertion = findAssertion(store);
  if (assertion === null) throw new Error(`missing ${ASSERTION_LABEL} assertion`);
  return {
    assertion,
    manifestDigest: sha256(canonicalJson(store)),
  };
}

const [certificate, privateKey] = await Promise.all([
  readFile(CERT_PATH),
  readFile(KEY_PATH),
]).catch((error) => {
  throw new Error(
    `Unable to load local C2PA credentials. Run services/c2pa-local/generate-dev-cert.sh first. ${error.message}`,
  );
});
const signer = LocalSigner.newSigner(certificate, privateKey, "es256");

async function embed(body) {
  const bytes = bytesFromBase64(body.bytesBase64);
  if (typeof body.mediaType !== "string" || !body.mediaType.startsWith("image/")) {
    throw new TypeError("P3 C2PA sidecar currently accepts image media types only");
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
  builder.addAssertion(ASSERTION_LABEL, body.assertion, "Json");
  const output = { buffer: null };
  builder.sign(signer, { buffer: bytes, mimeType: body.mediaType }, output);
  if (!Buffer.isBuffer(output.buffer)) throw new Error("C2PA SDK did not produce an output buffer");
  const inspection = await inspect(output.buffer, body.mediaType);
  if (canonicalJson(inspection.assertion) !== canonicalJson(body.assertion)) {
    throw new Error("embedded C2PA assertion does not match requested assertion");
  }
  return {
    bytesBase64: output.buffer.toString("base64"),
    format: FORMAT,
    signerId: SIGNER_ID,
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
      signerId: SIGNER_ID,
      manifestDigest: inspection.manifestDigest,
      assertion: inspection.assertion,
      verifiedAt,
      failureReason: null,
    };
  } catch (error) {
    return {
      valid: false,
      format: FORMAT,
      signerId: SIGNER_ID,
      manifestDigest: null,
      assertion: null,
      verifiedAt,
      failureReason: error instanceof Error ? error.message : String(error),
    };
  }
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/healthz") {
      return json(res, 200, { ok: true, format: FORMAT, signerId: SIGNER_ID });
    }
    if (req.method !== "POST" || !["/embed", "/verify"].includes(req.url)) {
      return json(res, 404, { error: "not_found" });
    }
    const body = await readJson(req);
    const result = req.url === "/embed" ? await embed(body) : await verify(body);
    return json(res, 200, result);
  } catch (error) {
    return json(res, 400, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Fibre local C2PA signer listening on http://127.0.0.1:${PORT}`);
});
