import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { runStagingGenesisDevelopmentE2EWithActivity } from "../genesis/genesis-development-e2e-staging.mjs";
import { verifySliceGPublicClosure } from "./cloudflare-e2e-slice-g.mjs";

const SUPPORTED_ENVIRONMENTS = Object.freeze(new Set(["staging"]));

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}

export function normalizeCloudE2EEnvironment(value) {
  const environment = nonEmpty("environment", value);
  if (!SUPPORTED_ENVIRONMENTS.has(environment)) {
    throw new TypeError(`unsupported Cloudflare E2E environment ${environment}; expected staging`);
  }
  return environment;
}

export function parseCloudE2EArgs(argv) {
  let environment = null;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--env") environment = argv[++index] ?? null;
    else throw new TypeError(`unsupported argument ${argv[index]}`);
  }
  if (!environment) throw new TypeError("--env staging is required");
  return Object.freeze({ environment: normalizeCloudE2EEnvironment(environment) });
}

function retainSliceGClosure(result, verified) {
  if (!result?.evidencePath) throw new Error("Cloudflare E2E staging harness did not produce an evidence path");
  const retained = JSON.parse(readFileSync(result.evidencePath, "utf8"));
  retained.sliceGClosure = {
    contract: "fibre-cloudflare-slice-g-public-closure-v0.1",
    identityCard: {
      credentialId: verified.closure.credentialId,
      cardSerial: verified.closure.cardSerial,
      registrationId: verified.closure.registrationId,
      officialPhotoMediaRef: verified.closure.mediaId,
    },
    canonicalRootObjectRef: verified.closure.canonicalRootObjectRef,
    officialPhoto: {
      objectRef: verified.closure.objectRef,
      generation: verified.closure.generation,
      publicAsset: verified.officialPhotoAsset,
    },
  };
  writeFileSync(result.evidencePath, `${JSON.stringify(retained, null, 2)}\n`, { mode: 0o600 });
  return Object.freeze(retained.sliceGClosure);
}

export async function runCloudflareE2E({
  environment,
  runStaging = runStagingGenesisDevelopmentE2EWithActivity,
  verifySliceG = verifySliceGPublicClosure,
} = {}) {
  const env = normalizeCloudE2EEnvironment(environment);
  if (typeof runStaging !== "function") throw new TypeError("runStaging must be a function");
  if (typeof verifySliceG !== "function") throw new TypeError("verifySliceG must be a function");
  const result = await runStaging();
  const verified = await verifySliceG({ evidence: result.evidence });
  const sliceGClosure = result.evidencePath ? retainSliceGClosure(result, verified) : Object.freeze({
    contract: "fibre-cloudflare-slice-g-public-closure-v0.1",
    identityCard: {
      credentialId: verified.closure.credentialId,
      cardSerial: verified.closure.cardSerial,
      registrationId: verified.closure.registrationId,
      officialPhotoMediaRef: verified.closure.mediaId,
    },
    canonicalRootObjectRef: verified.closure.canonicalRootObjectRef,
    officialPhoto: {
      objectRef: verified.closure.objectRef,
      generation: verified.closure.generation,
      publicAsset: verified.officialPhotoAsset,
    },
  });
  return Object.freeze({ environment: env, ...result, sliceGClosure });
}

async function main(argv) {
  const { environment } = parseCloudE2EArgs(argv);
  const result = await runCloudflareE2E({ environment });
  console.log(`Cloudflare E2E accepted: ${result.environment}`);
  console.log(`THREAD   ${result.sliceGClosure?.identityCard?.officialPhotoMediaRef ? result.evidence?.request?.developmentPlanThreadId : "unknown"}`);
  console.log(`ROOT     ${result.sliceGClosure.canonicalRootObjectRef}`);
  console.log(`OFFICIAL ${result.sliceGClosure.officialPhoto.objectRef}`);
  if (result.evidencePath) console.log(`EVIDENCE ${result.evidencePath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
