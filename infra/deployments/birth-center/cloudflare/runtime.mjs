import { createCloudflareInfraDriver } from "#infra/providers/cloudflare";
import { createBirthCenterWriteApi } from "#services/birth-center/src/birth-write-api.mjs";
import { createGenesisDevelopmentApi } from "#services/birth-center/src/genesis-development-api.mjs";
import { createGenesisDevelopmentInspectionService } from "#services/birth-center/src/genesis-development-inspection.mjs";
import { createGenesisDevelopmentService } from "#services/birth-center/src/genesis-development-service.mjs";
import { createBirthCatalogApi } from "#services/birth-center/src/birth-catalog-api.mjs";
import { createBirthLifecycleStore } from "#services/birth-center/src/birth-lifecycle-store.mjs";
import { createBirthLifecycle } from "#services/birth-center/src/birth-lifecycle.mjs";
import { createBirthLifecycleApi } from "#services/birth-center/src/birth-lifecycle-api.mjs";
import {compactBirthActivity} from "#services/birth-center/src/birth-activity.mjs";
import { BIRTHPLACES } from "#services/birth-center/src/birthplace-sampler.mjs";
import { createBirthCenterRuntime } from "#services/birth-center/src/runtime.mjs";
import { createCloudflareActivityRecorder } from "../../cloudflare-activity.mjs";
import { createWorldKernelBirthPublisher } from "../world-kernel-boundary.mjs";

const BIRTH_SCOPE_ID = "birth";
const DEFAULT_RETRY_MS = 5_000;

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

export function stillbornBirths(runtime) {
  return runtime.developmentRequestStore.recent({ limit:256 })
    .flatMap((request) => {
      const disposition = runtime.developmentRequestStore.getDisposition(request.requestId);
      if (disposition?.outcome !== "stillborn") return [];
      return [Object.freeze({
        requestId:request.requestId,
        genesisId:request.genesisId,
        threadId:request.threadId,
        failureCode:disposition.failureCode ?? null,
        failureMessage:disposition.failureMessage ?? null,
        settledAt:disposition.settledAt ?? null,
        createdAt:request.createdAt,
        updatedAt:disposition.updatedAt ?? request.updatedAt,
      })];
    })
    .sort((left, right) => Date.parse(right.settledAt ?? right.updatedAt) - Date.parse(left.settledAt ?? left.updatedAt));
}

function lifecycleOperatorBirth(birth,nowMs){
  const stage=["complete","unlocated"].includes(birth.stage)?"in-world"
    :birth.stage==="stillborn"?"stillborn"
    :birth.stage==="cancelled"||birth.status==="failed"?"failed"
    :["admitted","presented","located","publishing"].includes(birth.stage)?"emerging"
    :["genome_selected","developing"].includes(birth.stage)?"developing":"genesis";
  const terminal=["in-world","stillborn","failed"].includes(stage);
  const timing=birthTiming(birth,nowMs);
  return Object.freeze({
    source:"lifecycle",requestId:birth.requestId,requestedAt:birth.requestedAt,
    genesisId:birth.genesisId,threadId:birth.threadId,
    location:birth.location,locationSource:"birth-center",sex:birth.sex,
    name:birth.name,status:birth.status,stage,error:birth.error,
    createdAt:birth.createdAt,updatedAt:birth.updatedAt,
    ageMs:timing.ageMs,idleMs:timing.idleMs,stale:!terminal&&timing.stale,
    classification:null,
    staleReason:!terminal&&timing.stale?"No recorded birth progress for five minutes.":null,
  });
}

export async function publishQueuedBirths(cloud){
  return cloud.runtime.handleWake();
}

function createDevelopmentComponents({ runtime, privateToken, reasoningAdapters, activityRecorder, now, nowMs, randomIntFn, lifecycleStore }) {
  if (reasoningAdapters === null || reasoningAdapters === undefined) {
    return Object.freeze({
      creativeAdapter: null,
      repairAdapter: null,
      developmentService: null,
      developmentInspectionService: null,
      developmentApi: null,
      birthService: null,
      birthApi: null,
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
  const birthApi=createBirthCatalogApi({
    stillbornBirths:()=>stillbornBirths(runtime),
    birthplaces:BIRTHPLACES,privateToken,
  });
  return Object.freeze({
    creativeAdapter,
    repairAdapter,
    developmentService,
    developmentInspectionService,
    developmentApi,
    birthService:null,
    birthApi,
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
  const activityRecorder = compactBirthActivity(createCloudflareActivityRecorder({ env, service: "birth-center" }));
  const infraDriver = createCloudflareInfraDriver({
    stateScopes: { [BIRTH_SCOPE_ID]: storage },
    schedulerScopes: { [BIRTH_SCOPE_ID]: storage },
  });
  const birthStorage = Object.freeze({ infraDriver, stateScopeId: BIRTH_SCOPE_ID, schemaReady:true });
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
  const lifecycleStore = createBirthLifecycleStore(birthStorage,{now,nowMs});
  const development = createDevelopmentComponents({
    runtime,
    privateToken,
    reasoningAdapters,
    activityRecorder,
    now,
    nowMs,
    randomIntFn,
    lifecycleStore,
  });
  const publicationApi = createBirthCenterWriteApi({ runtime, privateToken });
  const presentationFetch = env?.THREAD_PRESENTATION?.fetch
    ? bindingFetch(env.THREAD_PRESENTATION)
    : async()=>Response.json({error:"presentation_binding_missing"},{status:503});
  const lifecycle = reasoningAdapters === null ? null : createBirthLifecycle({
    store:lifecycleStore,runtime,
    developmentService:development.developmentService,
    authorAdapter:reasoningAdapters.worldAuthoringAdapter??development.creativeAdapter,
    populationAdapter:reasoningAdapters.populationAuthoringAdapter??reasoningAdapters.worldAuthoringAdapter??development.creativeAdapter,
    worldFetch:bindingFetch(worldBinding),
    presentationFetch,privateToken,
    geoNamesUsername:env?.GEONAMES_USERNAME??null,
    viewerOrigin:env?.FIBRE_BIRTH_VIEWER_ORIGIN??"https://insidefibre.com",
    nowMs,
    onWake:event=>console.log(JSON.stringify(event)),
  });
  const lifecycleApi = lifecycle===null?null:createBirthLifecycleApi({lifecycle,privateToken});

  return Object.freeze({
    infraDriver,
    birthStorage,
    lifecycleStore,
    activityRecorder,
    runtime,
    creativeAdapter: development.creativeAdapter,
    repairAdapter: development.repairAdapter,
    developmentService: development.developmentService,
    developmentInspectionService: development.developmentInspectionService,
    developmentApi: development.developmentApi,
    birthService: development.birthService,
    birthApi: development.birthApi,
    publicationApi,
    lifecycle,
    lifecycleApi,
    close() { lifecycleStore.close(); runtime.close(); },
  });
}
