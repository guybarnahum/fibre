import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_LIVE_FIXTURE,
  DEFAULT_LIVE_MEDIA_ID,
  loadThreadPresentationLiveTarget,
  normalizeLiveFixtureName,
  normalizeLiveMediaId,
} from "./thread-presentation-live-target.mjs";

const THIS_FILE = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(THIS_FILE), "../..");
const OUTPUT_ROOT = join(REPO_ROOT, "artifacts/generated/asset-live-cloudflare");

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} must be a non-empty string`);
  return value;
}

function parseArgs(argv) {
  const parsed = {
    fixture: DEFAULT_LIVE_FIXTURE,
    mediaId: DEFAULT_LIVE_MEDIA_ID,
    baseUrl: process.env.FIBRE_PRESENTATION_URL ?? "http://127.0.0.1:8787",
    signerUrl: process.env.FIBRE_C2PA_SIGNER_URL ?? "http://127.0.0.1:8790",
    dryRun: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--dry-run") { parsed.dryRun = true; continue; }
    if (value === "--fixture") {
      if (index + 1 >= argv.length) throw new TypeError("--fixture requires a value");
      parsed.fixture = normalizeLiveFixtureName(argv[++index]);
      continue;
    }
    if (value === "--media-id") {
      if (index + 1 >= argv.length) throw new TypeError("--media-id requires a value");
      parsed.mediaId = normalizeLiveMediaId(argv[++index]);
      continue;
    }
    if (value === "--base-url") {
      if (index + 1 >= argv.length) throw new TypeError("--base-url requires a value");
      parsed.baseUrl = nonEmpty("base-url", argv[++index]).replace(/\/$/, "");
      continue;
    }
    if (value === "--signer-url") {
      if (index + 1 >= argv.length) throw new TypeError("--signer-url requires a value");
      parsed.signerUrl = nonEmpty("signer-url", argv[++index]).replace(/\/$/, "");
      continue;
    }
    throw new TypeError(`unknown Cloudflare live asset argument: ${value}`);
  }
  return parsed;
}

async function jsonFetch(url, init) {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${init?.method ?? "GET"} ${url} failed ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function outputStem(mediaId) {
  return mediaId.replace(/[^A-Za-z0-9._-]/g, "_");
}

function runDirectoryName(timestamp) {
  return timestamp.replace(/[:.]/g, "-");
}

function renderWaiting({ startedAt, workflowStatus, head, width }) {
  const elapsed = Math.round((Date.now() - startedAt) / 1000);
  const message = `      still generating... ${elapsed}s elapsed | workflow=${workflowStatus} | stream=${head}`;
  const nextWidth = Math.max(width, message.length);
  process.stdout.write(`\r${message.padEnd(nextWidth)}`);
  return nextWidth;
}

function clearWaiting(width) {
  if (width > 0) process.stdout.write(`\r${" ".repeat(width)}\r`);
}

export async function runCloudflareLiveAssetSmoke({
  fixture = DEFAULT_LIVE_FIXTURE,
  mediaId = DEFAULT_LIVE_MEDIA_ID,
  baseUrl = process.env.FIBRE_PRESENTATION_URL ?? "http://127.0.0.1:8787",
  signerUrl = process.env.FIBRE_C2PA_SIGNER_URL ?? "http://127.0.0.1:8790",
  timeoutMs = Number(process.env.ASSET_LIVE_CLOUDFLARE_TIMEOUT_MS ?? 10 * 60 * 1000),
  pollMs = Number(process.env.ASSET_LIVE_CLOUDFLARE_POLL_MS ?? 2000),
} = {}) {
  const target = await loadThreadPresentationLiveTarget({ fixture, mediaId });
  const base = nonEmpty("baseUrl", baseUrl).replace(/\/$/, "");
  const signerBase = nonEmpty("signerUrl", signerUrl).replace(/\/$/, "");
  const startedAt = Date.now();
  const runStartedAt = new Date(startedAt).toISOString();

  console.log("FIBRE CLOUDFLARE LIVE ASSET SMOKE: START");
  console.log(`[1/6] Target: ${target.label} (${target.mediaAsset.mediaId}) on Thread ${target.threadId}`);
  console.log("[2/6] Checking local C2PA signer and Cloudflare Presentation runtime...");
  const health = await jsonFetch(`${signerBase}/healthz`);
  if (health.format !== "c2pa") throw new Error("configured signer is not reporting C2PA format");
  await jsonFetch(`${base}/healthz`);

  console.log("[3/6] Seeding the selected fixture through the Cloudflare dev-only fixture seam...");
  await jsonFetch(`${base}/__p3/fixtures/thread`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bundle: target.bundle }),
  });

  console.log("[4/6] Scheduling the selected media through Presentation → Workflow → Asset Generator...");
  const scheduled = await jsonFetch(`${base}/__p3/fixtures/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ threadId: target.threadId, mediaId: target.mediaAsset.mediaId }),
  });

  let readyEvent = null;
  let workflow = scheduled.workflow;
  let heartbeatWidth = 0;
  while (Date.now() - startedAt < timeoutMs) {
    const status = await jsonFetch(`${base}/__p3/workflows/${encodeURIComponent(scheduled.jobId)}`);
    workflow = status.workflow;
    if (["errored", "terminated"].includes(workflow.status)) {
      clearWaiting(heartbeatWidth);
      throw new Error(`asset workflow ended as ${workflow.status}`);
    }

    const events = await jsonFetch(`${base}/api/threads/${encodeURIComponent(target.threadId)}/events?after=0`);
    readyEvent = events.events.find((event) => (
      event.kind === "media.ready" && event.payload?.mediaId === target.mediaAsset.mediaId
    )) ?? null;
    if (readyEvent) {
      clearWaiting(heartbeatWidth);
      break;
    }
    heartbeatWidth = renderWaiting({
      startedAt,
      workflowStatus: workflow.status,
      head: events.head,
      width: heartbeatWidth,
    });
    await sleep(pollMs);
  }
  clearWaiting(heartbeatWidth);
  if (!readyEvent) throw new Error(`timed out waiting for ${target.mediaAsset.mediaId} media.ready`);
  if (readyEvent.payload.objectRef !== scheduled.objectRef) {
    throw new Error("media.ready objectRef does not match scheduled job");
  }

  console.log("[5/6] Fetching the published asset through the provider-neutral public route...");
  const mediaResponse = await fetch(`${base}/api/assets/${encodeURIComponent(readyEvent.payload.objectRef)}`);
  if (!mediaResponse.ok) throw new Error(`generated asset fetch failed ${mediaResponse.status}`);
  if (mediaResponse.headers.get("x-fibre-provenance") !== "generated_reconstruction") {
    throw new Error("generated media is missing generated_reconstruction serving classification");
  }
  const mediaType = mediaResponse.headers.get("content-type");
  const bytes = new Uint8Array(await mediaResponse.arrayBuffer());
  if (bytes.length === 0) throw new Error("generated media is empty");

  console.log("[6/6] Verifying embedded Content Credentials and writing evidence...");
  const verification = await jsonFetch(`${signerBase}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bytesBase64: Buffer.from(bytes).toString("base64"), mediaType }),
  });
  if (verification.valid !== true) throw new Error(`C2PA verification failed: ${verification.failureReason}`);
  if (verification.assertion?.provenanceClass !== "generated_reconstruction") {
    throw new Error("embedded C2PA assertion does not classify asset as generated_reconstruction");
  }
  if (verification.assertion?.promptDisclosure?.mode !== "digest_only") {
    throw new Error("Cloudflare live proof must not publish exact prompt text in C2PA");
  }

  const outputDirectory = join(OUTPUT_ROOT, runDirectoryName(runStartedAt));
  await mkdir(outputDirectory, { recursive: true });
  const extension = mediaType === "image/png" ? "png" : mediaType === "image/jpeg" ? "jpg" : "bin";
  const imagePath = join(outputDirectory, `${outputStem(target.mediaAsset.mediaId)}.${extension}`);
  const evidencePath = join(outputDirectory, "evidence.json");
  await writeFile(imagePath, bytes);

  const evidence = {
    evidenceVersion: "fibre-cloudflare-live-asset-smoke-v0.1",
    runStartedAt,
    fixture: target.fixtureName,
    threadId: target.threadId,
    lifecycleStatus: target.lifecycleStatus,
    mediaId: target.mediaAsset.mediaId,
    label: target.label,
    demandId: scheduled.demandId,
    jobId: scheduled.jobId,
    workflowStatus: workflow.status,
    eventSequence: readyEvent.sequence,
    eventId: readyEvent.eventId,
    objectRef: readyEvent.payload.objectRef,
    finalAssetDigest: readyEvent.payload.digest,
    mediaType,
    byteLength: bytes.length,
    c2pa: {
      valid: true,
      signerId: verification.signerId,
      manifestDigest: verification.manifestDigest,
      provenanceClass: verification.assertion.provenanceClass,
      provider: verification.assertion.provider,
      model: verification.assertion.model,
      promptDisclosure: verification.assertion.promptDisclosure.mode,
    },
    path: {
      scheduling: "thread-presentation -> InfraDriver.workflows -> Cloudflare Workflow -> asset-generator",
      completion: "InfraDriver.queues -> Cloudflare Queue -> thread-presentation -> media.ready",
      serving: "GET /api/assets/:objectRef -> provider-neutral resolver -> InfraDriver.objects",
    },
    output: imagePath.slice(REPO_ROOT.length + 1),
  };
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

  console.log(`FIBRE CLOUDFLARE LIVE ASSET SMOKE: PASS (${((Date.now() - startedAt) / 1000).toFixed(1)}s total)`);
  console.log(`Image: ${evidence.output}`);
  console.log(`Digest: ${evidence.finalAssetDigest}`);
  return evidence;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const target = await loadThreadPresentationLiveTarget({ fixture: args.fixture, mediaId: args.mediaId });
  if (args.dryRun) {
    console.log("FIBRE CLOUDFLARE LIVE ASSET SMOKE: DRY RUN");
    console.log(`Fixture: ${target.fixtureName}`);
    console.log(`Thread: ${target.threadId}`);
    console.log(`Target: ${target.label} (${target.mediaAsset.mediaId})`);
    console.log(`Presentation: ${args.baseUrl}`);
    console.log(`Signer: ${args.signerUrl}`);
    return;
  }
  await runCloudflareLiveAssetSmoke(args);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(THIS_FILE)) {
  main().catch((error) => {
    process.stdout.write("\n");
    console.error(`FIBRE CLOUDFLARE LIVE ASSET SMOKE: FAIL: ${error.message}`);
    process.exitCode = 1;
  });
}
