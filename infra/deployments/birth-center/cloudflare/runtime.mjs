import { createCloudflareInfraDriver } from "#infra/providers/cloudflare";
import { createBirthCenterWriteApi } from "#services/birth-center/src/birth-write-api.mjs";
import { createGenesisDevelopmentApi } from "#services/birth-center/src/genesis-development-api.mjs";
import { createGenesisDevelopmentInspectionService } from "#services/birth-center/src/genesis-development-inspection.mjs";
import { createGenesisDevelopmentService } from "#services/birth-center/src/genesis-development-service.mjs";
import { createModernBirthInitiationService } from "#services/birth-center/src/modern-birth-initiation.mjs";
import { createModernBirthInitiationApi } from "#services/birth-center/src/modern-birth-api.mjs";
import { MODERN_BIRTHPLACES } from "#services/birth-center/src/modern-birthplace-sampler.mjs";
import { createBirthCenterRuntime } from "#services/birth-center/src/runtime.mjs";
import { createCloudflareActivityRecorder } from "../../cloudflare-activity.mjs";
import { createWorldKernelBirthPublisher } from "../world-kernel-boundary.mjs";

const BIRTH_SCOPE_ID = "birth";
const DEFAULT_RETRY_MS = 5_000;
const STALE_ACTIVE_BIRTH_MS = 5 * 60 * 1_000;

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value;
}

function serviceBinding(env, name) {
  const binding = env?.[name];
  if (!binding || typeof binding.fetch !== "function") {
    throw new TypeError(`birth-center Cloudflare binding ${name} must provide fetch()`);
  }
  return binding;
}

function bindingFetch(binding) {
  return (input, init) => binding.fetch(input instanceof Request ? input : new Request(input, init));
}

function reconciliationRetryMs(env) {
  const value = Number(env?.FIBRE_BIRTH_RECONCILIATION_MS ?? DEFAULT_RETRY_MS);
  if (!Number.isSafeInteger(value) || value < 100 || value > 3_600_000) {
    throw new TypeError("FIBRE_BIRTH_RECONCILIATION_MS must be an integer from 100 through 3600000");
  }
  return value;
}

function operatorBirthStage(status) {
  return ({
    queued:"genesis",
    authoring:"genesis",
    reserved:"developing",
    ready:"developing",
    developing:"developing",
    submitted:"emerging",
    publishing:"emerging",
    published:"in-world",
  })[status] ?? status;
}

function birthTiming(request, nowMs) {
  const current = nowMs();
  const created = Date.parse(request?.createdAt ?? "");
  const updated = Date.parse(request?.updatedAt ?? request?.createdAt ?? "");
  const ageMs = Number.isFinite(created) ? Math.max(0, current - created) : null;
  const idleMs = Number.isFinite(updated) ? Math.max(0, current - updated) : null;
  return Object.freeze({
    ageMs,
    idleMs,
    stale:idleMs !== null && idleMs >= STALE_ACTIVE_BIRTH_MS,
  });
}

export function nextBirthStatusCheckAt(runtime, nowMs, { reconcileStaleNow = false } = {}) {
  const now = nowMs();
  let next = null;
  const consider = (request) => {
    const timing = birthTiming(request, nowMs);
    const candidate = timing.stale
      ? now + (reconcileStaleNow ? 0 : STALE_ACTIVE_BIRTH_MS)
      : now + Math.max(100, STALE_ACTIVE_BIRTH_MS - (timing.idleMs ?? 0));
    if (next === null || candidate < next) next = candidate;
  };

  const modern = runtime.modernBirthRequestStore.recent({ limit:64 });
  const modernByRequest = new Map(modern.map((request) => [request.requestId, request]));
  for (const request of modern) {
    if (request.status === "published") continue;
    if (request.status === "failed" && !request.genesisId && !request.threadId) continue;
    if (runtime.modernBirthRequestStore.isActive(request.status) || request.status === "failed") {
      consider(request);
    }
  }
  for (const request of runtime.developmentRequestStore.recent({ limit:32 })) {
    const disposition = runtime.developmentRequestStore.getDisposition(request.requestId);
    if (disposition?.outcome === "born" || disposition?.outcome === "stillborn") continue;
    const modernRequest = modernByRequest.get(request.requestId);
    if (modernRequest?.status === "published" || runtime.modernBirthRequestStore.isActive(modernRequest?.status)) continue;
    consider(request);
  }
  return next;
}

async function worldThreadPresenceSet({ worldBinding, privateToken, threadIds }) {
  if (threadIds.length === 0) return new Set();
  try {
    const response = await worldBinding.fetch(new Request(
      "https://world-kernel.internal/internal/thread-directory/presence",
      {
        method:"POST",
        headers:{
          Accept:"application/json",
          "Content-Type":"application/json",
          "x-fibre-private-token":privateToken,
        },
        body:JSON.stringify({ threadIds }),
      },
    ));
    if (!response.ok) {
      console.error(JSON.stringify({
        event:"birth-center-world-presence-unavailable",
        status:response.status,
      }));
      return null;
    }
    const payload = await response.json();
    return Array.isArray(payload?.presentThreadIds)
      ? new Set(payload.presentThreadIds)
      : null;
  } catch (error) {
    console.error(JSON.stringify({
      event:"birth-center-world-presence-unavailable",
      message:error instanceof Error ? error.message : String(error),
    }));
    return null;
  }
}

function birthOperationalState(request, timing, { terminalFailure = false } = {}) {
  if (terminalFailure) {
    return Object.freeze({
      stale:true,
      classification:"failed_waiting_reconciliation",
      staleReason:"Birth failed before admission and is waiting for World reconciliation.",
    });
  }
  if (!timing.stale) {
    return Object.freeze({ stale:false, classification:"active", staleReason:null });
  }
  if (!request?.threadId) {
    return Object.freeze({
      stale:true,
      classification:"stale_before_identity",
      staleReason:"No Thread identity has been reserved after five minutes without progress.",
    });
  }
  return Object.freeze({
    stale:true,
    classification:"stale_unresolved",
    staleReason:"Birth has stopped progressing and is waiting for World reconciliation.",
  });
}

function pendingProjection(request, {
  source,
  status,
  stage,
  location,
  locationSource,
  sex,
  timing,
  terminalFailure = false,
}) {
  const operational = birthOperationalState(request, timing, { terminalFailure });
  return Object.freeze({
    source,
    requestId:request.requestId,
    requestedAt:request.requestedAt ?? request.plan?.genome?.header?.createdAt ?? null,
    requestedLocation:request.requestedLocation ?? null,
    requestedSex:request.requestedSex ?? null,
    genesisId:request.genesisId,
    threadId:request.threadId,
    location,
    locationSource,
    sex,
    status,
    error:request.error ?? null,
    stage,
    createdAt:request.createdAt,
    updatedAt:request.updatedAt,
    ageMs:timing.ageMs,
    idleMs:timing.idleMs,
    stale:operational.stale,
    classification:operational.classification,
    staleReason:operational.staleReason,
  });
}

export function pendingBirths(runtime, { nowMs = Date.now } = {}) {
  const queued = [];
  const known = new Set();
  const development = runtime.developmentRequestStore.recent({ limit:32 });
  const developmentByRequest = new Map(development.map((request) => [request.requestId, request]));

  for (const request of runtime.modernBirthRequestStore.recent({ limit:64 })) {
    known.add(request.requestId);
    if (request.status === "published") continue;

    const active = runtime.modernBirthRequestStore.isActive(request.status);
    if (!active && request.status !== "failed") continue;
    const developmentRequest = developmentByRequest.get(request.requestId) ?? null;
    if (request.status === "failed" && developmentRequest === null && !request.genesisId && !request.threadId) continue;
    const disposition = developmentRequest === null
      ? null
      : runtime.developmentRequestStore.getDisposition(request.requestId);
    if (disposition?.outcome === "born" || disposition?.outcome === "stillborn") continue;

    queued.push(pendingProjection(request, {
      source:"modern",
      status:request.status,
      stage:request.status === "failed" ? "failed" : operatorBirthStage(request.status),
      location:request.location ?? request.requestedLocation,
      locationSource:request.locationSource,
      sex:request.sex ?? request.requestedSex,
      timing:birthTiming(request, nowMs),
      terminalFailure:request.status === "failed",
    }));
  }

  for (const request of development) {
    if (known.has(request.requestId)) continue;
    const disposition = runtime.developmentRequestStore.getDisposition(request.requestId);
    if (disposition?.outcome === "born" || disposition?.outcome === "stillborn") continue;

    const identity = request.plan?.subjectIdentity ?? null;
    const place = identity?.place ?? null;
    const status = request.status === "reserved" || request.status === "ready" ? "developing" : "publishing";
    queued.push(pendingProjection(request, {
      source:"development",
      status,
      stage:operatorBirthStage(status),
      location:place?.country && place?.city ? `${place.country}/${place.city}` : identity?.birthCity ?? null,
      locationSource:null,
      sex:identity?.sex ?? null,
      timing:birthTiming(request, nowMs),
      terminalFailure:disposition?.failureRetryable === false,
    }));
  }

  return queued.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

export async function reconcileStaleBirths(runtime, {
  worldBinding,
  privateToken,
  nowMs = Date.now,
} = {}) {
  const bornRequests = new Set();
  const stillbornRequests = new Set();
  const publishedModern = new Set();
  const modern = runtime.modernBirthRequestStore.recent({ limit:64 });
  const modernByRequest = new Map(modern.map((request) => [request.requestId, request]));
  const modernCandidates = [];
  const developmentCandidates = [];
  const threadIds = new Set();

  for (const request of modern) {
    if (request.status === "published") continue;
    if (
      request.genesisId !== null
      && runtime.provisionalBirthStore.get(request.genesisId)?.status === "published"
    ) {
      runtime.modernBirthRequestStore.progress(request.requestId, { status:"published" });
      publishedModern.add(request.requestId);
      bornRequests.add(request.requestId);
      continue;
    }
    const timing = birthTiming(request, nowMs);
    if ((!timing.stale && request.status !== "failed") || !request.threadId) continue;
    modernCandidates.push(request);
    threadIds.add(request.threadId);
  }

  for (const request of runtime.developmentRequestStore.recent({ limit:32 })) {
    const disposition = runtime.developmentRequestStore.getDisposition(request.requestId);
    if (disposition?.outcome === "born" || disposition?.outcome === "stillborn") continue;

    const modernRequest = modernByRequest.get(request.requestId) ?? null;
    if (
      request.status === "submitted"
      && runtime.provisionalBirthStore.get(request.genesisId)?.status === "published"
    ) {
      runtime.developmentRequestStore.settleBorn(request.requestId);
      if (
        modernRequest !== null
        && modernRequest.status !== "published"
        && !publishedModern.has(request.requestId)
      ) {
        runtime.modernBirthRequestStore.progress(request.requestId, { status:"published" });
        publishedModern.add(request.requestId);
      }
      bornRequests.add(request.requestId);
      continue;
    }

    const timing = birthTiming(request, nowMs);
    const terminalFailure = disposition?.failureRetryable === false;
    if ((!timing.stale && !terminalFailure) || !request.threadId) continue;
    developmentCandidates.push(Object.freeze({ request, disposition, modernRequest }));
    threadIds.add(request.threadId);
  }

  const candidates = [...threadIds];
  const present = await worldThreadPresenceSet({
    worldBinding,
    privateToken,
    threadIds:candidates,
  });
  if (present === null) {
    return Object.freeze({
      checked:0,
      born:bornRequests.size,
      stillborn:stillbornRequests.size,
      unavailable:candidates.length,
    });
  }

  for (const request of modernCandidates) {
    if (!present.has(request.threadId)) continue;
    runtime.modernBirthRequestStore.progress(request.requestId, { status:"published" });
    publishedModern.add(request.requestId);
    bornRequests.add(request.requestId);
  }

  for (const { request, disposition, modernRequest } of developmentCandidates) {
    if (present.has(request.threadId)) {
      runtime.developmentRequestStore.settleBorn(request.requestId);
      if (
        modernRequest !== null
        && modernRequest.status !== "published"
        && !publishedModern.has(request.requestId)
      ) {
        runtime.modernBirthRequestStore.progress(request.requestId, { status:"published" });
        publishedModern.add(request.requestId);
      }
      bornRequests.add(request.requestId);
      continue;
    }
    if (disposition?.failureRetryable === false) {
      runtime.developmentRequestStore.settleStillborn(request.requestId);
      stillbornRequests.add(request.requestId);
    }
  }

  return Object.freeze({
    checked:candidates.length,
    born:bornRequests.size,
    stillborn:stillbornRequests.size,
    unavailable:0,
  });
}

async function ensureBirthStatusScheduled(runtime, {
  nowMs,
  reconcileStaleNow = false,
} = {}) {
  const next = nextBirthStatusCheckAt(runtime, nowMs, { reconcileStaleNow });
  if (next === null) return Object.freeze({ scheduledAt:null });
  const current = await runtime.infraDriver.scheduler.get(BIRTH_SCOPE_ID);
  if (current === null || next < current) {
    await runtime.infraDriver.scheduler.schedule(BIRTH_SCOPE_ID, next);
  }
  return Object.freeze({ scheduledAt:next });
}

function createDevelopmentComponents({ runtime, privateToken, reasoningAdapters, activityRecorder, now, nowMs, randomIntFn }) {
  if (reasoningAdapters === null || reasoningAdapters === undefined) {
    return Object.freeze({
      creativeAdapter: null,
      repairAdapter: null,
      developmentService: null,
      developmentInspectionService: null,
      developmentApi: null,
      modernBirthService: null,
      modernBirthApi: null,
    });
  }
  const creativeAdapter = reasoningAdapters.creativeAdapter;
  const repairAdapter = reasoningAdapters.repairAdapter ?? creativeAdapter;
  const developmentService = createGenesisDevelopmentService({
    runtime,
    creativeAdapter,
    repairAdapter,
    activityRecorder,
    now,
    randomIntFn,
  });
  const developmentInspectionService = createGenesisDevelopmentInspectionService({ runtime });
  const developmentApi = createGenesisDevelopmentApi({
    developmentService,
    inspectionService: developmentInspectionService,
    privateToken,
    onError(error) {
      console.error(JSON.stringify({
        event: "birth-center-development-failed",
        message: error instanceof Error ? error.message : String(error),
      }));
    },
  });
  const modernBirthService = createModernBirthInitiationService({
    developmentService,
    creativeAdapter,
    birthRuntime:runtime,
    activityRecorder,
    onProgress:(progress) => runtime.modernBirthRequestStore.progress(progress.requestId, progress),
  });
  const modernBirthApi = createModernBirthInitiationApi({
    service:modernBirthService,
    pendingBirths:() => pendingBirths(runtime, { nowMs }),
    birthplaces:MODERN_BIRTHPLACES,
    requestStore:runtime.modernBirthRequestStore,
    privateToken,
  });
  return Object.freeze({
    creativeAdapter,
    repairAdapter,
    developmentService,
    developmentInspectionService,
    developmentApi,
    modernBirthService,
    modernBirthApi,
  });
}

export function createBirthCenterCloudflareRuntime({
  storage,
  env,
  now = () => new Date().toISOString(),
  nowMs = Date.now,
  randomIntFn,
  reasoningAdapters = null,
} = {}) {
  if (!storage || typeof storage !== "object") {
    throw new TypeError("Cloudflare Birth Center runtime requires Durable Object storage");
  }
  const privateToken = nonEmpty("FIBRE_PRIVATE_TOKEN", env?.FIBRE_PRIVATE_TOKEN);
  const worldBinding = serviceBinding(env, "WORLD_KERNEL");
  const activityRecorder = createCloudflareActivityRecorder({ env, service: "birth-center" });
  const infraDriver = createCloudflareInfraDriver({
    stateScopes: { [BIRTH_SCOPE_ID]: storage },
    schedulerScopes: { [BIRTH_SCOPE_ID]: storage },
  });
  const birthStorage = Object.freeze({ infraDriver, stateScopeId: BIRTH_SCOPE_ID });
  const worldPublisher = createWorldKernelBirthPublisher({
    baseUrl: "https://world-kernel.internal",
    privateToken,
    fetchImpl: bindingFetch(worldBinding),
  });
  const runtime = createBirthCenterRuntime({
    storage: birthStorage,
    worldPublisher,
    activityRecorder,
    retryMs: reconciliationRetryMs(env),
    now,
    nowMs,
    onError(error, birth) {
      console.error(JSON.stringify({
        event: "birth-center-reconciliation-failed",
        genesisId: birth?.genesisId ?? null,
        threadId: birth?.threadId ?? null,
        message: error instanceof Error ? error.message : String(error),
      }));
    },
  });
  const development = createDevelopmentComponents({
    runtime,
    privateToken,
    reasoningAdapters,
    activityRecorder,
    now,
    nowMs,
    randomIntFn,
  });
  const birthApi = createBirthCenterWriteApi({ runtime, privateToken });

  return Object.freeze({
    infraDriver,
    birthStorage,
    activityRecorder,
    runtime,
    creativeAdapter: development.creativeAdapter,
    repairAdapter: development.repairAdapter,
    developmentService: development.developmentService,
    developmentInspectionService: development.developmentInspectionService,
    developmentApi: development.developmentApi,
    modernBirthService: development.modernBirthService,
    modernBirthApi: development.modernBirthApi,
    birthApi,
    reconcileStaleBirths:() => reconcileStaleBirths(runtime, {
      worldBinding,
      privateToken,
      nowMs,
    }),
    ensureBirthStatusScheduled:({ reconcileStaleNow = false } = {}) =>
      ensureBirthStatusScheduled(runtime, { nowMs, reconcileStaleNow }),
    close() { runtime.close(); },
  });
}
