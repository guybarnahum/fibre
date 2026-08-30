import { X509Certificate } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const THIS_FILE = fileURLToPath(import.meta.url);
const DEFAULT_CERT_PATH = fileURLToPath(new URL("../../../.fibre/p3-c2pa/cert.pem", import.meta.url));

function certificateBlocks(input) {
  const text = Buffer.from(input).toString("utf8");
  return text.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) ?? [];
}

export function validateLocalC2paCertificateChain(input) {
  const blocks = certificateBlocks(input);
  if (blocks.length < 2) {
    throw new Error(
      "local C2PA credentials use a legacy/self-signed certificate; regenerate them with integrations/content-credentials/c2pa-node/generate-dev-cert.sh",
    );
  }
  const signing = new X509Certificate(blocks[0]);
  const issuer = new X509Certificate(blocks[1]);
  if (signing.ca) throw new Error("local C2PA signing certificate must be an end-entity certificate");
  if (!issuer.ca) throw new Error("local C2PA issuer certificate must be a CA certificate");
  if (signing.issuer !== issuer.subject || !signing.verify(issuer.publicKey)) {
    throw new Error("local C2PA signing certificate is not validly issued by the supplied local CA");
  }
  const now = Date.now();
  if (Date.parse(signing.validFrom) > now || Date.parse(signing.validTo) < now) {
    throw new Error("local C2PA signing certificate is outside its validity period");
  }
  return Object.freeze({
    signingSubject: signing.subject,
    issuerSubject: issuer.subject,
    certificateCount: blocks.length,
  });
}

async function main() {
  const certPath = process.env.FIBRE_C2PA_CERT ?? DEFAULT_CERT_PATH;
  let certificate;
  try {
    certificate = await readFile(certPath);
  } catch (error) {
    throw new Error(
      `Unable to load local C2PA certificate chain. Run integrations/content-credentials/c2pa-node/generate-dev-cert.sh first. ${error.message}`,
    );
  }
  const result = validateLocalC2paCertificateChain(certificate);
  console.log(`Fibre local C2PA credential preflight passed: ${result.signingSubject} -> ${result.issuerSubject}`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(THIS_FILE)) {
  main().catch((error) => {
    console.error(`Fibre local C2PA credential preflight failed: ${error.message}`);
    process.exitCode = 1;
  });
}
