import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createNodeServiceHandler } from "#infra/providers/local/service";
import { createC2paNodeSigner } from "#integrations/content-credentials/c2pa-node/signer.mjs";
import { createContentCredentialSignerService } from "#services/content-credential-signer/src/index.mjs";
import { parseDeploymentManifest, resolveServiceDeployment } from "../../manifest.mjs";

const MAX_BODY_BYTES = 32 * 1024 * 1024;
const REPO_ROOT = fileURLToPath(new URL("../../../..", import.meta.url));
const DEPLOYMENTS = Object.freeze({
  local: parseDeploymentManifest(readFileSync(new URL("../../environments/local.yaml", import.meta.url), "utf8")),
  cloudflare: parseDeploymentManifest(readFileSync(new URL("../../environments/cloudflare.yaml", import.meta.url), "utf8")),
});

function optionalEnvironmentValue(mapping, key, environment) {
  const variable = mapping?.[key];
  if (typeof variable !== "string" || variable.trim() === "") return null;
  const value = environment?.[variable];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function parsePort(value) {
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port < 0 || port > 65535) {
    throw new TypeError("FIBRE_C2PA_PORT must be an integer from 0 through 65535");
  }
  return port;
}

export async function startContentCredentialSignerFromEnvironment(environment = process.env) {
  const deploymentEnvironment = environment.FIBRE_DEPLOYMENT_ENV ?? "local";
  const manifest = DEPLOYMENTS[deploymentEnvironment];
  if (!manifest) throw new TypeError(`unsupported content-credential-signer deployment environment ${String(deploymentEnvironment)}`);
  const deployment = resolveServiceDeployment(manifest, "content-credential-signer");
  const selected = deployment.integrations.signer;
  if (!selected || selected.kind !== "content-credentials.signer" || selected.provider !== "c2pa-node") {
    throw new TypeError("content-credential-signer requires c2pa-node signer integration");
  }

  const certificateBase64 = typeof environment.C2PA_SIGNER_CERT_BASE64 === "string" && environment.C2PA_SIGNER_CERT_BASE64.trim() !== ""
    ? environment.C2PA_SIGNER_CERT_BASE64.trim() : null;
  const privateKeyBase64 = typeof environment.C2PA_SIGNER_KEY_BASE64 === "string" && environment.C2PA_SIGNER_KEY_BASE64.trim() !== ""
    ? environment.C2PA_SIGNER_KEY_BASE64.trim() : null;
  const signer = await createC2paNodeSigner({
    certificatePath: certificateBase64 === null ? resolve(REPO_ROOT, environment.FIBRE_C2PA_CERT ?? selected.config.certificatePath) : null,
    privateKeyPath: privateKeyBase64 === null ? resolve(REPO_ROOT, environment.FIBRE_C2PA_KEY ?? selected.config.privateKeyPath) : null,
    certificateBytes: certificateBase64 === null ? null : Buffer.from(certificateBase64, "base64"),
    privateKeyBytes: privateKeyBase64 === null ? null : Buffer.from(privateKeyBase64, "base64"),
    signerId: environment.C2PA_SIGNER_ID ?? selected.config.signerId,
    trustPolicy: environment.C2PA_TRUST_POLICY ?? selected.config.trustPolicy,
  });
  const serviceToken = environment.C2PA_SIGNER_TOKEN
    ?? optionalEnvironmentValue(selected.environment, "serviceToken", environment);
  const service = createContentCredentialSignerService({ signer, serviceToken });
  const server = createServer(createNodeServiceHandler({ service, maxBodyBytes: MAX_BODY_BYTES }));
  const port = parsePort(environment.PORT ?? environment.FIBRE_C2PA_PORT ?? "8791");
  const host = environment.FIBRE_C2PA_HOST ?? "127.0.0.1";

  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(port, host, () => {
      server.off("error", rejectListen);
      resolveListen();
    });
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    server.close();
    throw new Error("content-credential-signer did not bind a TCP address");
  }
  return Object.freeze({
    service,
    signer,
    server,
    address: Object.freeze({ host: address.address, port: address.port }),
    close() {
      return new Promise((resolveClose, rejectClose) => {
        server.close((error) => error ? rejectClose(error) : resolveClose());
      });
    },
  });
}

async function main() {
  const runtime = await startContentCredentialSignerFromEnvironment();
  process.stdout.write(`${JSON.stringify({
    event: "content-credential-signer-listening",
    host: runtime.address.host,
    port: runtime.address.port,
    signerId: runtime.signer.signerId,
    trustPolicy: runtime.signer.trustPolicy,
  })}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify({
      event: "content-credential-signer-start-failed",
      errorName: error?.constructor?.name ?? "Error",
      message: error?.message ?? String(error),
    })}\n`);
    process.exitCode = 1;
  });
}
