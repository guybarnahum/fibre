import { requireInfraCapabilities } from "#infra";
import { normalizeAssetGenerationJob } from "./asset-generation-domain.mjs";
import { ASSET_GENERATION_COMPLETION_QUEUE } from "./asset-generation-completion.mjs";

export const ASSET_GENERATION_FAILURE_VERSION = "asset-generation-failure-v0.1";
export const ASSET_GENERATION_SETTLEMENT_VERSION = "asset-generation-settlement-v0.1";

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

function plain(name, value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError(`${name} must be a plain object`);
  }
  return value;
}

function exact(name, value, allowed) {
  const keys = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!keys.has(key)) throw new TypeError(`${name}.${key} is not allowed`);
  }
}

function canonical(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonical);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
}

async function sha256Text(value) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return `sha256:${[...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function boundedDetail(error) {
  const text = error instanceof Error ? error.message : String(error);
  return text.length <= 2000 ? text : `${text.slice(0, 1999)}…`;
}

export async function assetGenerationFailureObjectRef(jobId) {
  const digest = await sha256Text(nonEmpty("jobId", jobId));
  return `asset_failure_${digest.slice("sha256:".length)}`;
}

export function normalizeAssetGenerationFailure(value) {
  const name = "asset generation failure";
  plain(name, value);
  exact(name, value, ["failureVersion", "jobId", "status", "code", "detail"]);
  if (value.failureVersion !== ASSET_GENERATION_FAILURE_VERSION) throw new TypeError(`${name}.failureVersion is unsupported`);
  if (value.status !== "failed") throw new TypeError(`${name}.status must be failed`);
  return Object.freeze({
    failureVersion:ASSET_GENERATION_FAILURE_VERSION,
    jobId:nonEmpty(`${name}.jobId`, value.jobId),
    status:"failed",
    code:nonEmpty(`${name}.code`, value.code),
    detail:nonEmpty(`${name}.detail`, value.detail),
  });
}

export function normalizeAssetGenerationSettlement(value) {
  const name = "asset generation settlement";
  plain(name, value);
  exact(name, value, [
    "settlementVersion", "jobId", "state", "failureObjectRef", "failureDigest", "context",
  ]);
  if (value.settlementVersion !== ASSET_GENERATION_SETTLEMENT_VERSION) {
    throw new TypeError(`${name}.settlementVersion is unsupported`);
  }
  if (value.state !== "failed") throw new TypeError(`${name}.state must be failed`);
  plain(`${name}.context`, value.context);
  return Object.freeze({
    settlementVersion:ASSET_GENERATION_SETTLEMENT_VERSION,
    jobId:nonEmpty(`${name}.jobId`, value.jobId),
    state:"failed",
    failureObjectRef:nonEmpty(`${name}.failureObjectRef`, value.failureObjectRef),
    failureDigest:nonEmpty(`${name}.failureDigest`, value.failureDigest),
    context:structuredClone(value.context),
  });
}

export async function persistAssetGenerationFailure({ infra, job:rawJob, error } = {}) {
  const checked = requireInfraCapabilities(infra, "objects");
  const job = normalizeAssetGenerationJob(rawJob);
  const failure = normalizeAssetGenerationFailure({
    failureVersion:ASSET_GENERATION_FAILURE_VERSION,
    jobId:job.jobId,
    status:"failed",
    code:"ASSET_GENERATION_TERMINAL",
    detail:boundedDetail(error),
  });
  const serialized = JSON.stringify(canonical(failure));
  const digest = await sha256Text(serialized);
  const objectRef = await assetGenerationFailureObjectRef(job.jobId);
  await checked.objects.putImmutable(objectRef, serialized, digest, {
    kind:"asset_generation_failure",
    jobId:job.jobId,
  });
  return Object.freeze({ failure, objectRef, digest });
}

export async function readAssetGenerationFailure({ infra, jobId } = {}) {
  const checked = requireInfraCapabilities(infra, "objects");
  const objectRef = await assetGenerationFailureObjectRef(jobId);
  const stored = await checked.objects.get(objectRef);
  if (stored === null) return null;
  let parsed;
  try { parsed = JSON.parse(new TextDecoder().decode(stored.bytes)); }
  catch { throw new Error(`asset generation failure ${objectRef} is not valid JSON`); }
  const failure = normalizeAssetGenerationFailure(parsed);
  if (failure.jobId !== jobId) throw new Error(`asset generation failure ${objectRef} belongs to a different job`);
  return Object.freeze({ failure, objectRef, digest:stored.digest });
}

export async function settleAssetGenerationFailure({
  infra,
  job:rawJob,
  error,
  queueName = ASSET_GENERATION_COMPLETION_QUEUE,
} = {}) {
  const checked = requireInfraCapabilities(infra, "objects", "queues");
  const job = normalizeAssetGenerationJob(rawJob);
  const persisted = await persistAssetGenerationFailure({ infra:checked, job, error });
  const settlement = normalizeAssetGenerationSettlement({
    settlementVersion:ASSET_GENERATION_SETTLEMENT_VERSION,
    jobId:job.jobId,
    state:"failed",
    failureObjectRef:persisted.objectRef,
    failureDigest:persisted.digest,
    context:job.context,
  });
  await checked.queues.send(queueName, settlement);
  return settlement;
}
