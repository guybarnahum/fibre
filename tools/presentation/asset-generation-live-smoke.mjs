import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  compileOpenAIImagePrompt,
  createOpenAIImageProvider,
} from "../../integrations/ai/image/openai.mjs";
import { createMemoryInfraDriver } from "#infra/providers/local";
import {
  CONTENT_CREDENTIAL_SIGNER_VERSION,
  executeCredentialedAssetGenerationJob,
  normalizeEmbeddedAssetProvenance,
  verifyCredentialedAssetForPublication,
} from "../../services/asset-generator/src/index.mjs";
import { planThreadPresentationAssetGeneration } from "../../services/world-kernel/src/thread-presentation-asset-planner.mjs";
import {
  DEFAULT_LIVE_FIXTURE,
  DEFAULT_LIVE_MEDIA_ID,
  loadThreadPresentationLiveTarget,
  parseLiveTargetArgs,
} from "./thread-presentation-live-target.mjs";

const THIS_FILE = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(THIS_FILE), "../..");
const OUTPUT_ROOT = join(REPO_ROOT, "artifacts/generated/asset-live");
const encoder = new TextEncoder();

function canonicalize(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

async function sha256(value) {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  const normalized = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const digest = await crypto.subtle.digest("SHA-256", normalized);
  return `sha256:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export async function buildLiveAssetSmokeJob({
  requestedAt = "2026-08-26T06:00:00Z",
  fixture = DEFAULT_LIVE_FIXTURE,
  mediaId = DEFAULT_LIVE_MEDIA_ID,
} = {}) {
  const target = await loadThreadPresentationLiveTarget({ fixture, mediaId });
  const snapshotBytes = encoder.encode(canonicalJson(target.bundle));
  const snapshotDigest = await sha256(snapshotBytes);
  const snapshotObjectRef = `asset_live_snapshot_${snapshotDigest.slice("sha256:".length, "sha256:".length + 20)}`;
  const plan = planThreadPresentationAssetGeneration({
    bundle: target.bundle,
    snapshotObjectRef,
    snapshotDigest,
    requestedAt,
  });
  const job = plan.jobs.find((candidate) => candidate.context?.mediaId === target.mediaAsset.mediaId);
  assert.ok(job, `fixture ${target.fixtureName} did not produce generation job for ${target.mediaAsset.mediaId}`);
  assert.equal(job.assetKind, "image", "live asset smoke currently supports image targets only");
  return { ...target, job, snapshotBytes, snapshotDigest, snapshotObjectRef };
}

function createProcessLocalCredentialSigner({ now = () => new Date().toISOString() } = {}) {
  const signerId = "fibre-live-smoke-process-local-signer";
  const format = "fibre-live-smoke-test-witness-v0.1";
  const witnessed = new Map();

  return {
    signerVersion: CONTENT_CREDENTIAL_SIGNER_VERSION,
    signerId,
    format,
    async embed({ bytes, assertion }) {
      const normalizedAssertion = normalizeEmbeddedAssetProvenance(assertion);
      const copiedBytes = bytes instanceof Uint8Array ? bytes.slice() : new Uint8Array(bytes.slice(0));
      const assetDigest = await sha256(copiedBytes);
      const manifestDigest = await sha256(canonicalJson(normalizedAssertion));
      witnessed.set(assetDigest, { assertion: normalizedAssertion, manifestDigest });
      return { bytes: copiedBytes, format, signerId, manifestDigest, embeddedAt: now() };
    },
    async verify({ bytes }) {
      const copiedBytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      const assetDigest = await sha256(copiedBytes);
      const record = witnessed.get(assetDigest);
      if (!record) {
        return {
          valid: false,
          format,
          signerId,
          manifestDigest: null,
          assertion: null,
          verifiedAt: now(),
          failureReason: "process-local live-smoke witness is unavailable",
        };
      }
      return {
        valid: true,
        format,
        signerId,
        manifestDigest: record.manifestDigest,
        assertion: structuredClone(record.assertion),
        verifiedAt: now(),
        failureReason: null,
      };
    },
  };
}

function assertPng(bytes) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  assert.ok(bytes instanceof Uint8Array, "stored asset must be bytes");
  assert.ok(bytes.length > 10_000, `generated image is unexpectedly small (${bytes.length} bytes)`);
  for (let index = 0; index < signature.length; index += 1) {
    assert.equal(bytes[index], signature[index], "generated asset is not a PNG");
  }
}

function providerOptionsFromEnvironment(apiKey) {
  const options = { apiKey };
  if (process.env.OPENAI_IMAGE_MODEL) options.model = process.env.OPENAI_IMAGE_MODEL;
  if (process.env.OPENAI_IMAGE_SIZE) options.size = process.env.OPENAI_IMAGE_SIZE;
  if (process.env.OPENAI_IMAGE_QUALITY) options.quality = process.env.OPENAI_IMAGE_QUALITY;
  if (process.env.OPENAI_IMAGE_ENDPOINT) options.endpoint = process.env.OPENAI_IMAGE_ENDPOINT;
  return options;
}

function runDirectoryName(timestamp) {
  return timestamp.replace(/[:.]/g, "-");
}

function outputStem(mediaId) {
  return mediaId.replace(/[^A-Za-z0-9._-]/g, "_");
}

function elapsedSeconds(startedAtMs) {
  return ((Date.now() - startedAtMs) / 1000).toFixed(1);
}

function createProgressFetch({ fetchImpl = fetch, heartbeatMs = 10_000, output = process.stdout } = {}) {
  return async (...args) => {
    const requestStartedAt = Date.now();
    let heartbeatWidth = 0;
    console.log("      OpenAI request submitted; waiting for generated image...");

    const renderHeartbeat = () => {
      const message = `      still generating... ${Math.round((Date.now() - requestStartedAt) / 1000)}s elapsed`;
      heartbeatWidth = Math.max(heartbeatWidth, message.length);
      output.write(`\r${message.padEnd(heartbeatWidth)}`);
    };
    const clearHeartbeat = () => {
      if (heartbeatWidth === 0) return;
      output.write(`\r${" ".repeat(heartbeatWidth)}\r`);
      heartbeatWidth = 0;
    };

    const heartbeat = setInterval(renderHeartbeat, heartbeatMs);
    heartbeat.unref?.();
    try {
      const response = await fetchImpl(...args);
      clearHeartbeat();
      console.log(`      provider responded HTTP ${response.status} after ${elapsedSeconds(requestStartedAt)}s`);
      return response;
    } finally {
      clearInterval(heartbeat);
      clearHeartbeat();
    }
  };
}

function sourceEvidence(prepared) {
  const base = {
    fixture: `fixtures/thread-presentation/${prepared.fixtureName}`,
    threadId: prepared.threadId,
    presentationId: prepared.presentationId,
    lifecycleStatus: prepared.lifecycleStatus,
    mediaId: prepared.mediaAsset.mediaId,
    mediaRole: prepared.mediaAsset.role,
    label: prepared.label,
  };
  if (prepared.memory) {
    return {
      ...base,
      sourceKind: "memory",
      sourceRef: prepared.memory.memoryRef,
      rememberedContent: prepared.memory.rememberedContent,
      uncertainty: prepared.memory.uncertainty,
      sourceReferences: prepared.memory.sourceReferences,
    };
  }
  if (prepared.place) {
    return {
      ...base,
      sourceKind: "place",
      sourceRef: prepared.place.placeRef,
      summary: prepared.place.summary,
      region: prepared.place.region,
      sourceReferences: prepared.place.sourceReferences,
    };
  }
  return {
    ...base,
    sourceKind: "presentation_media",
    sourceReferences: prepared.mediaAsset.sourceReferences,
  };
}

export async function runLiveAssetSmoke({
  apiKey = process.env.OPENAI_API_KEY,
  fixture = DEFAULT_LIVE_FIXTURE,
  mediaId = DEFAULT_LIVE_MEDIA_ID,
} = {}) {
  if (typeof apiKey !== "string" || apiKey.trim() === "") {
    throw new Error("OPENAI_API_KEY is required for npm run test:asset-live");
  }

  const runStartedMs = Date.now();
  const runStartedAt = new Date(runStartedMs).toISOString();
  console.log("FIBRE LIVE ASSET SMOKE: START");
  console.log("[1/5] Loading Thread Presentation and planning the selected asset...");
  const prepared = await buildLiveAssetSmokeJob({ requestedAt: runStartedAt, fixture, mediaId });
  console.log(`[2/5] Grounded target: \"${prepared.label}\" (${prepared.job.role})`);

  const infra = createMemoryInfraDriver();
  await infra.objects.putImmutable(
    prepared.snapshotObjectRef,
    prepared.snapshotBytes,
    prepared.snapshotDigest,
    {
      kind: "live_asset_smoke_thread_presentation_fixture",
      threadId: prepared.threadId,
      presentationId: prepared.presentationId,
    },
  );

  console.log("[3/5] Generating a real image with OpenAI; this can take a minute or two...");
  const provider = createOpenAIImageProvider({
    ...providerOptionsFromEnvironment(apiKey),
    fetchImpl: createProgressFetch(),
  });
  const credentialSigner = createProcessLocalCredentialSigner();
  const generated = await executeCredentialedAssetGenerationJob({
    infra,
    provider,
    credentialSigner,
    job: prepared.job,
  });

  console.log("[4/5] Image returned. Verifying immutable storage, receipt, digest and provenance...");
  const proof = await verifyCredentialedAssetForPublication({ infra, credentialSigner, receipt: generated.receipt });
  assert.equal(proof.verification.valid, true);
  assert.deepEqual(generated.generationRecord.semanticBrief, prepared.job.brief);
  assert.equal(generated.receipt.mediaType, "image/png");

  const stored = await infra.objects.get(generated.receipt.objectRef);
  assert.ok(stored, "generated asset was not stored");
  assert.equal(stored.digest, generated.receipt.sha256);
  assert.equal(stored.digest, generated.finalAssetDigest);
  assertPng(stored.bytes);

  console.log("[5/5] Verification passed. Writing PNG and evidence files...");
  const outputDirectory = join(OUTPUT_ROOT, runDirectoryName(runStartedAt));
  await mkdir(outputDirectory, { recursive: true });
  const imagePath = join(outputDirectory, `${outputStem(prepared.mediaAsset.mediaId)}.png`);
  const evidencePath = join(outputDirectory, "evidence.json");
  await writeFile(imagePath, stored.bytes);

  const evidence = {
    evidenceVersion: "fibre-live-asset-smoke-v0.2",
    runStartedAt,
    purpose: "Prove that a selected Fibre Thread Presentation media target can generate real image bytes through the provider-neutral Asset Generator path.",
    credentialNote: "The image provider is live OpenAI. Credential embed/verify uses a process-local test signer so this smoke test does not claim production C2PA signing.",
    source: sourceEvidence(prepared),
    job: {
      jobId: prepared.job.jobId,
      role: prepared.job.role,
      assetKind: prepared.job.assetKind,
      semanticBrief: prepared.job.brief,
      inputReferences: prepared.job.inputReferences,
      referenceObjectRefs: prepared.job.referenceObjectRefs,
      snapshotObjectRef: prepared.snapshotObjectRef,
      snapshotDigest: prepared.snapshotDigest,
    },
    generation: {
      provider: generated.generationRecord.generation.provider,
      model: generated.generationRecord.generation.model,
      providerRequestId: generated.generationRecord.generation.providerRequestId,
      providerRequestWitness: generated.generationRecord.providerRequestWitness,
      semanticBriefDigest: generated.generationRecord.semanticBriefDigest,
      providerRequestDigest: generated.generationRecord.providerRequestDigest,
      providerOutputDigest: generated.providerOutputDigest,
      finalAssetDigest: generated.finalAssetDigest,
    },
    receipt: generated.receipt,
    verification: {
      valid: proof.verification.valid,
      format: proof.verification.format,
      signerId: proof.verification.signerId,
      manifestDigest: proof.verification.manifestDigest,
    },
    output: {
      image: imagePath.slice(REPO_ROOT.length + 1),
      bytes: stored.bytes.length,
    },
  };
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

  console.log(`FIBRE LIVE ASSET SMOKE: PASS (${elapsedSeconds(runStartedMs)}s total)`);
  console.log(`Thread: ${evidence.source.threadId}`);
  console.log(`Target: ${evidence.source.label} (${evidence.source.mediaId})`);
  console.log(`Provider: ${evidence.generation.provider}/${evidence.generation.model}`);
  console.log(`Image: ${evidence.output.image}`);
  console.log(`Bytes: ${evidence.output.bytes}`);
  console.log(`Digest: ${evidence.generation.finalAssetDigest}`);
  console.log("Credential: process-local test witness (not production C2PA)");
  return evidence;
}

async function main() {
  const args = parseLiveTargetArgs(process.argv.slice(2));
  if (args.dryRun) {
    const prepared = await buildLiveAssetSmokeJob({ fixture: args.fixture, mediaId: args.mediaId });
    const prompt = compileOpenAIImagePrompt({ brief: prepared.job.brief, role: prepared.job.role });
    console.log("FIBRE LIVE ASSET SMOKE: DRY RUN");
    console.log(`Fixture: ${prepared.fixtureName}`);
    console.log(`Thread: ${prepared.threadId}`);
    console.log(`Target: ${prepared.label} (${prepared.mediaAsset.mediaId})`);
    console.log("");
    console.log(prompt);
    return;
  }
  await runLiveAssetSmoke({ fixture: args.fixture, mediaId: args.mediaId });
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(THIS_FILE)) {
  main().catch((error) => {
    console.error(`FIBRE LIVE ASSET SMOKE: FAIL: ${error.message}`);
    process.exitCode = 1;
  });
}
