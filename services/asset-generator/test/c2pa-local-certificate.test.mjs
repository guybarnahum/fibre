import test from "node:test";
import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import {
  X509Certificate,
  createPrivateKey,
  createPublicKey,
} from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { validateLocalC2paCertificateChain } from "../../c2pa-local/preflight-cert.mjs";

const execFile = promisify(execFileCallback);
const generator = fileURLToPath(new URL("../../c2pa-local/generate-dev-cert.sh", import.meta.url));

function certificateBlocks(input) {
  return Buffer.from(input).toString("utf8")
    .match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) ?? [];
}

test("local C2PA helper creates a CA-issued end-entity ES256 signing chain", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "fibre-c2pa-cert-"));
  t.after(() => rm(directory, { recursive: true, force: true }));

  await execFile("sh", [generator], {
    env: { ...process.env, FIBRE_C2PA_DEV_DIR: directory },
  });

  const [chainBytes, keyBytes] = await Promise.all([
    readFile(join(directory, "cert.pem")),
    readFile(join(directory, "key.pem")),
  ]);
  const validation = validateLocalC2paCertificateChain(chainBytes);
  assert.equal(validation.certificateCount, 2);

  const blocks = certificateBlocks(chainBytes);
  const signing = new X509Certificate(blocks[0]);
  const issuer = new X509Certificate(blocks[1]);
  assert.equal(signing.ca, false);
  assert.equal(issuer.ca, true);
  assert.equal(signing.issuer, issuer.subject);
  assert.equal(signing.verify(issuer.publicKey), true);

  const privatePublic = createPublicKey(createPrivateKey(keyBytes)).export({
    format: "der",
    type: "spki",
  });
  const certificatePublic = signing.publicKey.export({ format: "der", type: "spki" });
  assert.deepEqual(Buffer.from(privatePublic), Buffer.from(certificatePublic));
});

test("local C2PA preflight rejects the legacy one-certificate credential before startup", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "fibre-c2pa-legacy-"));
  t.after(() => rm(directory, { recursive: true, force: true }));

  await execFile("sh", [generator], {
    env: { ...process.env, FIBRE_C2PA_DEV_DIR: directory },
  });
  const chainBytes = await readFile(join(directory, "cert.pem"));
  const [signingOnly] = certificateBlocks(chainBytes);

  assert.throws(
    () => validateLocalC2paCertificateChain(signingOnly),
    /legacy\/self-signed certificate/,
  );
});
