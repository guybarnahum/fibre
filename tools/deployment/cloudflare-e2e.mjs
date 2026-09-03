import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { runStagingGenesisDevelopmentE2EWithActivity } from "../genesis/genesis-development-e2e-staging.mjs";
import { verifySliceGPublicClosure } from "./cloudflare-e2e-slice-g.mjs";

const SUPPORTED_ENVIRONMENTS = Object.freeze(new Set(["staging"]));
const DEFAULT_REPLAY_REQUEST_TIMEOUT_MS = 30_000;

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

export function cloudE2EProgress(event) {
  switch (event?.event) {
    case "genesis-development-staging-activity-writer-ready":
      return "preflighting staging and Activity evidence";
    case "genesis-development-e2e-start":
      return "running Genesis development";
    case "genesis-development-e2e-submitted":
      return event.status === "published"
        ? "Genesis published; verifying idempotent replay"
        : "Genesis generated; waiting for authoritative birth publication";
    case "genesis-development-staging-activity-inspected":
      return "collecting Activity evidence";
    case "genesis-development-staging-e2e-complete":
      return "verifying Identity Card and official photo";
    default:
      return null;
  }
}

export function createCloudE2EFetch({
  fetchImpl = globalThis.fetch,
  replayRequestTimeoutMs = DEFAULT_REPLAY_REQUEST_TIMEOUT_MS,
} = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl must be a function");
  if (!Number.isSafeInteger(replayRequestTimeoutMs) || replayRequestTimeoutMs < 1) {
    throw new TypeError("replayRequestTimeoutMs must be a positive integer");
  }
  let birthDevelopmentPosts = 0;
  return async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    const isBirthDevelopmentPost = String(init.method ?? "GET").toUpperCase() === "POST"
      && url.pathname === "/internal/births/develop";
    if (!isBirthDevelopmentPost) return fetchImpl(input, init);
    birthDevelopmentPosts += 1;
    if (birthDevelopmentPosts === 1) return fetchImpl(input, init);
    const boundedSignal = AbortSignal.timeout(replayRequestTimeoutMs);
    const signal = init.signal ? AbortSignal.any([init.signal, boundedSignal]) : boundedSignal;
    return fetchImpl(input, { ...init, signal });
  };
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
  fetchImpl = globalThis.fetch,
  emit = (event) => process.stdout.write(`${JSON.stringify(event)}\n`),
} = {}) {
  const env = normalizeCloudE2EEnvironment(environment);
  if (typeof runStaging !== "function") throw new TypeError("runStaging must be a function");
  if (typeof verifySliceG !== "function") throw new TypeError("verifySliceG must be a function");
  if (typeof emit !== "function") throw new TypeError("emit must be a function");
  const emitWithProgress = (event) => {
    const progress = cloudE2EProgress(event);
    emit(progress === null ? event : { ...event, progress });
  };
  emitWithProgress({ event: "cloudflare-e2e-preflight", progress: "preflighting deployed staging services" });
  const result = await runStaging({
    fetchImpl: createCloudE2EFetch({ fetchImpl }),
    emit: emitWithProgress,
  });
  emitWithProgress({ event: "cloudflare-e2e-slice-g-verification", progress: "verifying Identity Card and official photo" });
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
