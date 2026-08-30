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
const LOCAL_MANIFEST = parseDeploymentManifest(
  readFileSync(new URL("../../environments/local.yaml", import.meta.url), "utf8"),
);
const DEPLOYMENT = resolveServiceDeployment(LOCAL_MANIFEST, "content-credential-signer");
if (DEPLOYMENT.runtime.provider !== "local-node") {
  throw new TypeError(`content-credential-signer local host requires local-node runtime, got ${DEPLOYMENT.runtime.provider}`);
}

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
  const selected = DEPLOYMENT.integrations.signer;
  if (!selected || selected.kind !== "content-credentials.signer" || selected.provider !== "c2pa-node") {
    throw new TypeError("content-credential-signer local deployment requires c2pa-node signer integration");
  }

  const certificatePath = resolve(
    REPO_ROOT,
    environment.FIBRE_C2PA_CERT ?? selected.config.certificatePath,
  );
  const privateKeyPath = resolve(
    REPO_ROOT,
    environment.FIBRE_C2PA_KEY ?? selected.config.privateKeyPath,
  );
  const signer = await createC2paNodeSigner({
    certificatePath,
    privateKeyPath,
    signerId: selected.config.signerId,
    trustPolicy: selected.config.trustPolicy,
  });
  const serviceToken = optionalEnvironmentValue(selected.environment, "serviceToken", environment);
  const service = createContentCredentialSignerService({ signer, serviceToken });
  const server = createServer(createNodeServiceHandler({ service, maxBodyBytes: MAX_BODY_BYTES }));
  const port = parsePort(environment.FIBRE_C2PA_PORT ?? "8790");

  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(port, "127.0.0.1", () => {
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
  console.log(`Fibre local C2PA sign/read self-test passed: com.insidefibre.asset-generation`);
  console.log(`Fibre content credential signer listening on http://127.0.0.1:${runtime.address.port}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`Fibre content credential signer failed: ${error.message}`);
    process.exitCode = 1;
  });
}
