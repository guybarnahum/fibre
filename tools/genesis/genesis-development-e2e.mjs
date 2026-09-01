import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  GENESIS_DEVELOPMENT_REQUEST_VERSION,
  buildGenesisDevelopmentPlan,
} from "#services/birth-center/src/genesis-development-plan.mjs";
import { parseDeploymentManifest, resolveServiceDeployment } from "../../infra/deployments/manifest.mjs";

export const GENESIS_STAGING_EVIDENCE_VERSION = "fibre-slice-g-cloud-e2e-evidence-v1";
const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const GIT_SHA_PATTERN = /^[0-9a-f]{40}$/u;
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

function positiveInteger(name, value, fallback) {
  const parsed = Number(value ?? fallback);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new TypeError(`${name} must be a positive integer`);
  return parsed;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function fixtureJson(path) {
  return readJson(new URL(`../../${path}`, import.meta.url));
}

function requestFromFixture({ requestId, requestedAt, slotOrdinal }) {
  const cohort = fixtureJson("fixtures/genesis/pr39/development-cohort-v1.json");
  const slot = cohort.slots[slotOrdinal - 1];
  if (!slot) throw new TypeError(`FIBRE_GENESIS_E2E_SLOT ${slotOrdinal} does not exist in the development cohort fixture`);
  const worldSpec = fixtureJson(slot.worldSpecPath);
  const genome = fixtureJson(slot.genomePath);
  return Object.freeze({
    requestVersion: GENESIS_DEVELOPMENT_REQUEST_VERSION,
    requestId,
    requestedAt,
    worldSpec,
    genomeValues: genome.loci.map((locus) => locus.value),
    participants: slot.participants.filter((participant) => !participant.factualRoles.includes("subject")),
    placeAffordances: slot.placeAffordances,
    bornAt: cohort.entry.bornAt,
    chronologyEndsAt: cohort.entry.chronologyEndsAt,
    timeZone: slot.timeZone,
  });
}

function endpoint(baseUrl, pathname) {
  const url = new URL(nonEmpty("service base URL", baseUrl));
  url.pathname = pathname;
  url.search = "";
  url.hash = "";
  return url;
}

function assertRemoteHttps(name, value) {
  const url = new URL(nonEmpty(name, value));
  if (url.protocol !== "https:") throw new Error(`${name} must use HTTPS for staging evidence`);
  const host = url.hostname.toLowerCase();
  if (LOOPBACK_HOSTS.has(host) || host.endsWith(".local")) throw new Error(`${name} must not resolve to a local Fibre runtime`);
  return url.toString().replace(/\/$/u, "");
}

function gitSource(repoRoot = REPO_ROOT) {
  const gitSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim().toLowerCase();
  if (!GIT_SHA_PATTERN.test(gitSha)) throw new Error("current Git HEAD is not a full commit SHA");
  const status = execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], { cwd: repoRoot, encoding: "utf8" });
  if (status.trim() !== "") throw new Error("staging E2E requires a clean Git working tree");
  return Object.freeze({ gitSha, workingTreeClean: true });
}

function deploymentByService(record, serviceId) {
  const matches = (record.deployments ?? []).filter((item) => item?.serviceId === serviceId);
  if (matches.length !== 1) throw new Error(`deployment evidence must contain exactly one ${serviceId} deployment`);
  return matches[0];
}

export function loadStagingDeploymentEvidence({ repoRoot = REPO_ROOT, path = null } = {}) {
  const evidencePath = path ?? resolve(repoRoot, ".fibre", "cloudflare", "staging", "deployment.json");
  const record = readJson(evidencePath);
  if (record?.environment !== "staging") throw new Error("Cloudflare deployment evidence is not for staging");
  if (record?.sourceTreeClean !== true || !GIT_SHA_PATTERN.test(record?.sourceGitSha ?? "")) {
    throw new Error("Cloudflare deployment evidence lacks an exact clean source SHA");
  }
  return Object.freeze({ path: evidencePath, record });
}

function approvedReasoningProfiles(repoRoot = REPO_ROOT) {
  const manifest = parseDeploymentManifest(readFileSync(resolve(repoRoot, "infra/deployments/environments/cloudflare.yaml"), "utf8"));
  const deployment = resolveServiceDeployment(manifest, "birth-center");
  const profiles = [deployment.integrations?.creative, deployment.integrations?.repair];
  if (profiles.some((profile) => !profile || profile.kind !== "ai.reasoning")) {
    throw new Error("staging Birth Center deployment does not declare creative and repair reasoning integrations");
  }
  return Object.freeze(new Set(profiles.map((profile) => `${profile.provider}:${profile.config?.model}`)));
}

async function responseJson(response, label) {
  const payload = await response.json().catch(() => null);
  if (payload === null) throw new Error(`${label} returned non-JSON HTTP ${response.status}`);
  return payload;
}

async function submit({ fetchImpl, url, privateToken, body, requestTimeoutMs }) {
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-fibre-private-token": privateToken,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
  const payload = await responseJson(response, "Genesis development request");
  if (!response.ok || payload?.ok !== true || !payload.development) {
    throw new Error(`Genesis development request failed: ${JSON.stringify(payload)}`);
  }
  return payload.development;
}

async function birthInspection({ fetchImpl, baseUrl, privateToken, requestId, requestTimeoutMs, allowMissing = false }) {
  const url = endpoint(baseUrl, `/internal/births/develop/${encodeURIComponent(requestId)}/inspection`);
  const response = await fetchImpl(url, {
    headers: { "x-fibre-private-token": privateToken },
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
  if (response.status === 404 && allowMissing) return null;
  const payload = await responseJson(response, "Birth Center inspection");
  if (!response.ok || payload?.ok !== true || !payload.inspection) {
    throw new Error(`Birth Center inspection failed: HTTP ${response.status} ${JSON.stringify(payload)}`);
  }
  return payload.inspection;
}

async function worldInspection({ fetchImpl, baseUrl, privateToken, genesisId, threadId, requestTimeoutMs }) {
  const url = endpoint(baseUrl, `/internal/genesis/${encodeURIComponent(genesisId)}/threads/${encodeURIComponent(threadId)}/inspection`);
  const response = await fetchImpl(url, {
    headers: { "x-fibre-private-token": privateToken },
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
  const payload = await responseJson(response, "World Genesis inspection");
  if (!response.ok || payload?.ok !== true || !payload.inspection) {
    throw new Error(`World Genesis inspection failed: HTTP ${response.status} ${JSON.stringify(payload)}`);
  }
  return payload.inspection;
}

async function presentationSnapshot({ fetchImpl, baseUrl, viewerOrigin, threadId, requestTimeoutMs, allowMissing = false }) {
  const url = endpoint(baseUrl, `/api/threads/${encodeURIComponent(threadId)}/snapshot`);
  const response = await fetchImpl(url, {
    headers: { Origin: viewerOrigin, Accept: "application/json" },
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
  if (response.status === 404 && allowMissing) return null;
  const payload = await responseJson(response, "Thread Presentation snapshot");
  if (!response.ok || payload?.pointer?.threadId !== threadId) {
    throw new Error(`Thread Presentation snapshot failed: HTTP ${response.status} ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function discoverThread({ fetchImpl, baseUrl, viewerOrigin, threadId, requestTimeoutMs }) {
  let cursor = null;
  for (let page = 0; page < 100; page += 1) {
    const url = endpoint(baseUrl, "/api/threads");
    url.searchParams.set("limit", "200");
    if (cursor !== null) url.searchParams.set("cursor", cursor);
    const response = await fetchImpl(url, {
      headers: { Origin: viewerOrigin, Accept: "application/json" },
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
    const payload = await responseJson(response, "Thread Presentation discovery");
    if (!response.ok || !Array.isArray(payload?.threads)) {
      throw new Error(`Thread Presentation discovery failed: HTTP ${response.status} ${JSON.stringify(payload)}`);
    }
    const found = payload.threads.find((entry) => entry?.threadId === threadId);
    if (found) return found;
    cursor = payload.nextCursor ?? null;
    if (cursor === null) return null;
  }
  throw new Error("Thread Presentation discovery exceeded 100 pages");
}

async function publicAssetWitness({ fetchImpl, baseUrl, viewerOrigin, objectRef, requestTimeoutMs }) {
  const url = endpoint(baseUrl, `/api/assets/${encodeURIComponent(objectRef)}`);
  const response = await fetchImpl(url, {
    headers: { Origin: viewerOrigin },
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
  if (!response.ok) throw new Error(`canonical public asset failed with HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength === 0) throw new Error("canonical public asset is empty");
  return Object.freeze({
    objectRef,
    status: response.status,
    byteLength: bytes.byteLength,
    mediaType: response.headers.get("content-type"),
    etag: response.headers.get("etag"),
    provenanceClass: response.headers.get("x-fibre-provenance"),
  });
}

async function viewerWitness({ fetchImpl, origin, requestTimeoutMs }) {
  const response = await fetchImpl(origin, {
    redirect: "follow",
    signal: AbortSignal.timeout(requestTimeoutMs),
  });
  if (!response.ok) throw new Error(`staging Viewer failed with HTTP ${response.status}`);
  return Object.freeze({ origin, status: response.status, reachable: true });
}

function assertSameIdentity(first, replay) {
  for (const key of ["requestId", "genesisId", "threadId", "fibreIdentityNumber", "developmentPlanDigest"]) {
    if (first[key] !== replay[key]) throw new Error(`Genesis development replay changed ${key}`);
  }
}

function providerWitnesses(inspection, { plan, approvedProfiles }) {
  if (!Number.isSafeInteger(inspection?.invocationCount) || inspection.invocationCount < 20) {
    throw new Error("Birth Center inspection does not contain the minimum twenty durable Genesis model invocations");
  }
  if (!Array.isArray(inspection.invocations) || inspection.invocations.length !== inspection.invocationCount) {
    throw new Error("Birth Center invocation count disagrees with durable invocation witnesses");
  }
  const seen = new Set();
  return inspection.invocations.map((entry) => {
    if (typeof entry.clientRequestId !== "string" || !entry.clientRequestId.startsWith(plan.freshModelRequestDomain)) {
      throw new Error("durable provider witness is outside the canonical Genesis model-request domain");
    }
    if (seen.has(entry.clientRequestId)) throw new Error(`duplicate durable model witness ${entry.clientRequestId}`);
    seen.add(entry.clientRequestId);
    const profile = `${entry.provider}:${entry.modelId}`;
    if (!approvedProfiles.has(profile)) throw new Error(`provider witness ${profile} is not an approved staging Birth Center integration`);
    if (typeof entry.providerRequestId !== "string" || entry.providerRequestId.trim() === "") {
      throw new Error(`provider witness ${entry.clientRequestId} lacks a real provider request ID`);
    }
    return Object.freeze({
      clientRequestId: entry.clientRequestId,
      provider: entry.provider,
      modelId: entry.modelId,
      providerRequestId: entry.providerRequestId,
      requestDigest: entry.requestDigest,
      resultDigest: entry.resultDigest,
      recordedAt: entry.recordedAt,
    });
  });
}

function worldConverged(inspection, { plan, fibreIdentityNumber }) {
  const current = inspection?.embodiment?.current ?? [];
  return inspection?.authoritativeThread?.exists === true
    && inspection?.genesis?.threadPublished === true
    && inspection?.genesis?.worldSpecId === plan.worldSpec.worldSpecId
    && typeof inspection?.genesis?.worldSpecDigest === "string"
    && typeof inspection?.genesis?.historicalEnvelopePlanDigest === "string"
    && inspection?.symbolicGenomes?.count === 1
    && inspection.symbolicGenomes.genomes?.[0]?.genomeId === plan.genome.header.genomeId
    && inspection.symbolicGenomes.genomes?.[0]?.genomeDigest === plan.genomeDigest
    && inspection?.civilRegistration?.fibreIdentityNumber === fibreIdentityNumber
    && current.length >= 1
    && current.some((record) => typeof record.referenceObjectRef === "string" && record.referenceObjectRef !== "");
}

function presentationConverged(snapshot, world, threadId) {
  const manifest = snapshot?.snapshot?.presentation?.manifest;
  const visualIdentity = snapshot?.snapshot?.presentation?.visualIdentity;
  const embodiments = world?.embodiment?.current ?? [];
  if (snapshot?.pointer?.threadId !== threadId || manifest?.threadId !== threadId) return false;
  if (manifest.fixture === true || manifest.lifecycleStatus === "genesis_candidate") return false;
  if (!visualIdentity || typeof visualIdentity.embodimentId !== "string") return false;
  const authoritative = embodiments.find((record) => record.embodimentId === visualIdentity.embodimentId);
  if (!authoritative) return false;
  const refs = visualIdentity.referenceObjectRefs ?? [];
  return typeof authoritative.referenceObjectRef === "string" && refs.includes(authoritative.referenceObjectRef);
}

async function pollConvergence({
  fetchImpl,
  worldBaseUrl,
  presentationBaseUrl,
  viewerOrigin,
  privateToken,
  plan,
  fibreIdentityNumber,
  requestTimeoutMs,
  convergenceWaitMs,
  pollMs,
  sleep,
}) {
  const deadline = Date.now() + convergenceWaitMs;
  let world = null;
  let presentation = null;
  while (Date.now() < deadline) {
    world = await worldInspection({
      fetchImpl,
      baseUrl: worldBaseUrl,
      privateToken,
      genesisId: plan.genesisId,
      threadId: plan.threadId,
      requestTimeoutMs,
    });
    presentation = await presentationSnapshot({
      fetchImpl,
      baseUrl: presentationBaseUrl,
      viewerOrigin,
      threadId: plan.threadId,
      requestTimeoutMs,
      allowMissing: true,
    });
    if (worldConverged(world, { plan, fibreIdentityNumber }) && presentation !== null && presentationConverged(presentation, world, plan.threadId)) {
      return Object.freeze({ world, presentation });
    }
    await sleep(pollMs);
  }
  throw new Error(`World/Presentation visual convergence did not complete within ${convergenceWaitMs}ms`);
}

function beforeIsEmpty({ birth, world, presentation }) {
  return birth === null
    && world.authoritativeThread.exists === false
    && world.genesis.manifestExists === false
    && world.genesis.threadPublished === false
    && world.symbolicGenomes.count === 0
    && world.civilRegistration === null
    && world.embodiment.currentCount === 0
    && presentation === null;
}

function closureAssertions({
  before,
  first,
  replay,
  birth,
  world,
  presentation,
  discovery,
  viewer,
  asset,
  deployment,
  currentSource,
  endpoints,
  providerCalls,
}) {
  const visual = presentation.snapshot.presentation.visualIdentity;
  const authoritativeVisual = world.embodiment.current.find((record) => record.embodimentId === visual.embodimentId);
  return Object.freeze([
    { id: 1, criterion: "Thread absent before E2E", passed: beforeIsEmpty(before) },
    { id: 2, criterion: "request hit deployed cloud Birth Center", passed: endpoints.birthCenter.startsWith("https://") && first.requestId === birth.requestId },
    { id: 3, criterion: "Birth Center ran genuine Genesis development", passed: first.generated === true && providerCalls.length >= 20 },
    { id: 4, criterion: "real provider/model calls through approved integration adapter", passed: providerCalls.length >= 20 && providerCalls.every((call) => call.providerRequestId) },
    { id: 5, criterion: "Birth Center durable recovery/reconciliation", passed: birth.requestStatus === "submitted" && birth.provisionalStatus === "published" && replay.idempotent === true && replay.generated === false },
    { id: 6, criterion: "WorldSpec/genome authority admitted", passed: world.genesis.worldSpecId !== null && world.symbolicGenomes.count === 1 },
    { id: 7, criterion: "exactly one authoritative Thread", passed: world.authoritativeThread.exists === true && world.authoritativeThread.eventCount >= 15 && world.civilRegistration?.fibreIdentityNumber === replay.fibreIdentityNumber },
    { id: 8, criterion: "World downstream reconciliation ran", passed: presentation.pointer.threadId === world.threadId && discovery?.threadId === world.threadId },
    { id: 9, criterion: "canonical visual/Embodiment publication converged", passed: authoritativeVisual?.referenceObjectRef === asset.objectRef && visual.referenceObjectRefs.includes(asset.objectRef) && asset.byteLength > 0 },
    { id: 10, criterion: "Thread Presentation exposes same Thread", passed: presentation.pointer.threadId === world.threadId && presentation.snapshot.presentation.manifest.threadId === world.threadId },
    { id: 11, criterion: "staging Viewer resolves same Thread", passed: viewer.reachable === true && discovery?.threadId === world.threadId },
    { id: 12, criterion: "no local Fibre service participated", passed: Object.values(endpoints).every((value) => value.startsWith("https://") && !/localhost|127\.0\.0\.1|\[::1\]|\.local(?::|\/|$)/iu.test(value)) },
    { id: 13, criterion: "machine-readable evidence tied to exact Git SHA", passed: deployment.sourceTreeClean === true && deployment.sourceGitSha === currentSource.gitSha },
  ]);
}

function compactWorld(inspection) {
  return Object.freeze({
    genesisId: inspection.genesisId,
    threadId: inspection.threadId,
    authoritativeThread: structuredClone(inspection.authoritativeThread),
    genesis: structuredClone(inspection.genesis),
    symbolicGenomes: structuredClone(inspection.symbolicGenomes),
    civilRegistration: structuredClone(inspection.civilRegistration),
    embodiment: structuredClone(inspection.embodiment),
  });
}

function writeEvidence({ root, requestId, evidence }) {
  const directory = resolve(root, requestId);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const path = resolve(directory, "evidence.json");
  writeFileSync(path, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  return path;
}

async function runDevelopmentLifecycle({
  fetchImpl,
  baseUrl,
  privateToken,
  body,
  requestTimeoutMs,
  publishWaitMs,
  pollMs,
  sleep,
  emit,
}) {
  const url = endpoint(baseUrl, "/internal/births/develop");
  emit({ event: "genesis-development-e2e-start", endpoint: url.toString(), requestId: body.requestId });
  const first = await submit({ fetchImpl, url, privateToken, body, requestTimeoutMs });
  emit({
    event: "genesis-development-e2e-submitted",
    requestId: body.requestId,
    genesisId: first.genesisId,
    threadId: first.threadId,
    fibreIdentityNumber: first.fibreIdentityNumber,
    status: first.status,
    generated: first.generated,
    idempotent: first.idempotent,
  });

  let current = first;
  const deadline = Date.now() + publishWaitMs;
  while (current.status !== "published" && Date.now() < deadline) {
    await sleep(pollMs);
    const next = await submit({ fetchImpl, url, privateToken, body, requestTimeoutMs });
    assertSameIdentity(first, next);
    current = next;
  }
  if (current.status !== "published") {
    throw new Error(`Genesis development ${first.genesisId} remained ${current.status} after ${publishWaitMs}ms`);
  }

  const replay = await submit({ fetchImpl, url, privateToken, body, requestTimeoutMs });
  assertSameIdentity(first, replay);
  if (replay.status !== "published" || replay.idempotent !== true || replay.generated !== false) {
    throw new Error("published Genesis development did not replay idempotently without regeneration");
  }
  return Object.freeze({ first, replay });
}

async function runLocal({ environment, fetchImpl, sleep, emit }) {
  const privateToken = nonEmpty("FIBRE_PRIVATE_TOKEN", environment.FIBRE_PRIVATE_TOKEN);
  const slotOrdinal = positiveInteger("FIBRE_GENESIS_E2E_SLOT", environment.FIBRE_GENESIS_E2E_SLOT, 1);
  const requestTimeoutMs = positiveInteger("FIBRE_GENESIS_E2E_REQUEST_TIMEOUT_MS", environment.FIBRE_GENESIS_E2E_REQUEST_TIMEOUT_MS, 900_000);
  const publishWaitMs = positiveInteger("FIBRE_GENESIS_E2E_PUBLISH_WAIT_MS", environment.FIBRE_GENESIS_E2E_PUBLISH_WAIT_MS, 30_000);
  const pollMs = positiveInteger("FIBRE_GENESIS_E2E_POLL_MS", environment.FIBRE_GENESIS_E2E_POLL_MS, 250);
  const requestId = environment.FIBRE_GENESIS_REQUEST_ID?.trim() || `genesis-e2e-${Date.now().toString(36)}`;
  const requestedAt = environment.FIBRE_GENESIS_REQUESTED_AT?.trim() || new Date().toISOString();
  const body = requestFromFixture({ requestId, requestedAt, slotOrdinal });
  const lifecycle = await runDevelopmentLifecycle({
    fetchImpl,
    baseUrl: environment.FIBRE_BIRTH_CENTER_URL ?? "http://127.0.0.1:8790",
    privateToken,
    body,
    requestTimeoutMs,
    publishWaitMs,
    pollMs,
    sleep,
    emit,
  });
  emit({
    event: "genesis-development-e2e-complete",
    requestId,
    genesisId: lifecycle.replay.genesisId,
    threadId: lifecycle.replay.threadId,
    fibreIdentityNumber: lifecycle.replay.fibreIdentityNumber,
    status: lifecycle.replay.status,
    idempotentReplay: true,
  });
  return lifecycle;
}

async function runStaging({ environment, fetchImpl, sleep, emit, sourceResolver, repoRoot }) {
  const privateToken = nonEmpty("FIBRE_PRIVATE_TOKEN", environment.FIBRE_PRIVATE_TOKEN);
  const slotOrdinal = positiveInteger("FIBRE_GENESIS_E2E_SLOT", environment.FIBRE_GENESIS_E2E_SLOT, 1);
  const requestTimeoutMs = positiveInteger("FIBRE_GENESIS_E2E_REQUEST_TIMEOUT_MS", environment.FIBRE_GENESIS_E2E_REQUEST_TIMEOUT_MS, 900_000);
  const publishWaitMs = positiveInteger("FIBRE_GENESIS_E2E_PUBLISH_WAIT_MS", environment.FIBRE_GENESIS_E2E_PUBLISH_WAIT_MS, 30_000);
  const convergenceWaitMs = positiveInteger("FIBRE_GENESIS_E2E_CONVERGENCE_WAIT_MS", environment.FIBRE_GENESIS_E2E_CONVERGENCE_WAIT_MS, 900_000);
  const pollMs = positiveInteger("FIBRE_GENESIS_E2E_POLL_MS", environment.FIBRE_GENESIS_E2E_POLL_MS, 2_000);
  const requestId = environment.FIBRE_GENESIS_REQUEST_ID?.trim() || `genesis-staging-${Date.now().toString(36)}`;
  const requestedAt = environment.FIBRE_GENESIS_REQUESTED_AT?.trim() || new Date().toISOString();
  const body = requestFromFixture({ requestId, requestedAt, slotOrdinal });
  const plan = buildGenesisDevelopmentPlan(body);
  const deploymentEvidence = loadStagingDeploymentEvidence({
    repoRoot,
    path: environment.FIBRE_CLOUDFLARE_DEPLOYMENT_RECORD?.trim() || null,
  });
  const deployment = deploymentEvidence.record;
  const currentSource = sourceResolver(repoRoot);
  if (deployment.sourceGitSha !== currentSource.gitSha) {
    throw new Error(`staging deployment SHA ${deployment.sourceGitSha} does not match current checkout ${currentSource.gitSha}`);
  }

  const endpoints = Object.freeze({
    birthCenter: assertRemoteHttps("staging Birth Center URL", deploymentByService(deployment, "birth-center").baseUrl),
    worldKernel: assertRemoteHttps("staging World URL", deploymentByService(deployment, "world-kernel").baseUrl),
    threadPresentation: assertRemoteHttps("staging Thread Presentation URL", deploymentByService(deployment, "thread-presentation").baseUrl),
    viewer: assertRemoteHttps("staging Viewer origin", deployment.externalViewerOrigin),
  });
  const approvedProfiles = approvedReasoningProfiles(repoRoot);

  const beforeBirth = await birthInspection({
    fetchImpl,
    baseUrl: endpoints.birthCenter,
    privateToken,
    requestId,
    requestTimeoutMs,
    allowMissing: true,
  });
  const beforeWorld = await worldInspection({
    fetchImpl,
    baseUrl: endpoints.worldKernel,
    privateToken,
    genesisId: plan.genesisId,
    threadId: plan.threadId,
    requestTimeoutMs,
  });
  const beforePresentation = await presentationSnapshot({
    fetchImpl,
    baseUrl: endpoints.threadPresentation,
    viewerOrigin: endpoints.viewer,
    threadId: plan.threadId,
    requestTimeoutMs,
    allowMissing: true,
  });
  const before = Object.freeze({ birth: beforeBirth, world: beforeWorld, presentation: beforePresentation });
  if (!beforeIsEmpty(before)) throw new Error("staging E2E request identity is not absent before birth; choose a fresh request ID");

  const lifecycle = await runDevelopmentLifecycle({
    fetchImpl,
    baseUrl: endpoints.birthCenter,
    privateToken,
    body,
    requestTimeoutMs,
    publishWaitMs,
    pollMs,
    sleep,
    emit,
  });
  if (lifecycle.first.genesisId !== plan.genesisId || lifecycle.first.threadId !== plan.threadId) {
    throw new Error("deployed Birth Center derived different provisional identity than the canonical request plan");
  }

  const birth = await birthInspection({
    fetchImpl,
    baseUrl: endpoints.birthCenter,
    privateToken,
    requestId,
    requestTimeoutMs,
  });
  if (birth.genesisId !== plan.genesisId || birth.threadId !== plan.threadId) {
    throw new Error("Birth Center durable inspection identity disagrees with canonical request plan");
  }
  const providerCalls = providerWitnesses(birth, { plan, approvedProfiles });
  const converged = await pollConvergence({
    fetchImpl,
    worldBaseUrl: endpoints.worldKernel,
    presentationBaseUrl: endpoints.threadPresentation,
    viewerOrigin: endpoints.viewer,
    privateToken,
    plan,
    fibreIdentityNumber: lifecycle.replay.fibreIdentityNumber,
    requestTimeoutMs,
    convergenceWaitMs,
    pollMs,
    sleep,
  });
  const world = converged.world;
  const presentation = converged.presentation;
  const discovery = await discoverThread({
    fetchImpl,
    baseUrl: endpoints.threadPresentation,
    viewerOrigin: endpoints.viewer,
    threadId: plan.threadId,
    requestTimeoutMs,
  });
  if (discovery === null) throw new Error("staging Viewer-facing discovery does not expose the born Thread");
  const viewer = await viewerWitness({ fetchImpl, origin: endpoints.viewer, requestTimeoutMs });
  const visual = presentation.snapshot.presentation.visualIdentity;
  const authoritativeVisual = world.embodiment.current.find((record) => record.embodimentId === visual.embodimentId);
  if (!authoritativeVisual?.referenceObjectRef) throw new Error("converged authoritative Embodiment has no canonical public asset reference");
  const asset = await publicAssetWitness({
    fetchImpl,
    baseUrl: endpoints.threadPresentation,
    viewerOrigin: endpoints.viewer,
    objectRef: authoritativeVisual.referenceObjectRef,
    requestTimeoutMs,
  });

  const assertions = closureAssertions({
    before,
    first: lifecycle.first,
    replay: lifecycle.replay,
    birth,
    world,
    presentation,
    discovery,
    viewer,
    asset,
    deployment,
    currentSource,
    endpoints,
    providerCalls,
  });
  const failed = assertions.filter((assertion) => assertion.passed !== true);
  if (failed.length > 0) throw new Error(`Slice G staging evidence failed criteria: ${failed.map((item) => item.id).join(", ")}`);

  const completedAt = new Date().toISOString();
  const evidence = Object.freeze({
    contract: GENESIS_STAGING_EVIDENCE_VERSION,
    environment: "staging",
    runId: requestId,
    sourceGitSha: currentSource.gitSha,
    deploymentEvidence: {
      path: deploymentEvidence.path,
      contract: deployment.contract,
      sourceGitSha: deployment.sourceGitSha,
      sourceTreeClean: deployment.sourceTreeClean,
      recordedAt: deployment.recordedAt,
    },
    startedAt: requestedAt,
    completedAt,
    request: {
      requestId,
      requestDigest: plan.requestDigest,
      developmentPlanThreadId: plan.threadId,
      developmentPlanGenesisId: plan.genesisId,
      worldSpecId: plan.worldSpec.worldSpecId,
      worldSpecDigest: plan.worldSpecDigest,
      genomeId: plan.genome.header.genomeId,
      genomeDigest: plan.genomeDigest,
      slotOrdinal,
    },
    endpoints,
    before: {
      birthDevelopmentAbsent: before.birth === null,
      authoritativeWorld: compactWorld(before.world),
      publicPresentationAbsent: before.presentation === null,
    },
    birthCenter: {
      firstSubmission: structuredClone(lifecycle.first),
      finalReplay: structuredClone(lifecycle.replay),
      durableInspection: {
        requestId: birth.requestId,
        requestDigest: birth.requestDigest,
        planDigest: birth.planDigest,
        admissionDigest: birth.admissionDigest,
        genesisId: birth.genesisId,
        threadId: birth.threadId,
        requestStatus: birth.requestStatus,
        provisionalStatus: birth.provisionalStatus,
        invocationCount: birth.invocationCount,
      },
      providerCalls,
    },
    world: compactWorld(world),
    presentation: {
      pointer: structuredClone(presentation.pointer),
      manifest: structuredClone(presentation.snapshot.presentation.manifest),
      visualIdentity: structuredClone(presentation.snapshot.presentation.visualIdentity),
      discovery: structuredClone(discovery),
      canonicalPublicAsset: asset,
    },
    viewer,
    runtimeParticipation: {
      localFibreRuntimeParticipated: false,
      operatorKind: "node-cli",
      deployedServiceEndpointsOnly: true,
    },
    closureAssertions: assertions,
  });
  const evidenceRoot = environment.FIBRE_GENESIS_E2E_EVIDENCE_ROOT?.trim()
    || resolve(repoRoot, ".fibre", "e2e", "staging");
  const evidencePath = writeEvidence({ root: evidenceRoot, requestId, evidence });
  emit({
    event: "genesis-development-staging-e2e-complete",
    requestId,
    genesisId: plan.genesisId,
    threadId: plan.threadId,
    fibreIdentityNumber: lifecycle.replay.fibreIdentityNumber,
    sourceGitSha: currentSource.gitSha,
    evidencePath,
  });
  return Object.freeze({ evidence, evidencePath });
}

export async function runGenesisDevelopmentE2E({
  mode = "local",
  environment = process.env,
  fetchImpl = globalThis.fetch,
  sleep = delay,
  emit = (event) => process.stdout.write(`${JSON.stringify(event)}\n`),
  sourceResolver = gitSource,
  repoRoot = REPO_ROOT,
} = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("Genesis E2E fetchImpl must be a function");
  if (typeof sleep !== "function") throw new TypeError("Genesis E2E sleep must be a function");
  if (typeof emit !== "function") throw new TypeError("Genesis E2E emit must be a function");
  if (mode === "local") return runLocal({ environment, fetchImpl, sleep, emit });
  if (mode === "staging") return runStaging({ environment, fetchImpl, sleep, emit, sourceResolver, repoRoot });
  throw new TypeError(`unsupported Genesis E2E mode ${String(mode)}`);
}

function parseArgs(argv, environment) {
  let mode = environment.FIBRE_GENESIS_E2E_MODE?.trim() || "local";
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--mode") mode = argv[++index] ?? "";
    else throw new TypeError(`unsupported argument ${argv[index]}`);
  }
  return { mode };
}

async function main() {
  const { mode } = parseArgs(process.argv.slice(2), process.env);
  await runGenesisDevelopmentE2E({ mode });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`${JSON.stringify({
      event: "genesis-development-e2e-failed",
      errorName: error?.constructor?.name ?? "Error",
      message: error?.message ?? String(error),
    })}\n`);
    process.exitCode = 1;
  });
}
