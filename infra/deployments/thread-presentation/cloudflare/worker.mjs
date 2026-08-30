import { createCloudflareInfraDriver } from "#infra/providers/cloudflare";
import { FibrePresentationChannelDurableObject } from "#infra/providers/cloudflare/presentation-channel-do";
import { createService } from "#infra/service";
import { createAssetGenerationService } from "#services/asset-generator/src/index.mjs";
import {
  normalizeThreadPresentationBundle,
  presentationProvenanceDigest,
  threadMediaPacketDigest,
  threadPresentationPacketDigest,
} from "#services/thread-presentation/src/index.mjs";
import { createGenesisPresentationWriteApi } from "#services/thread-presentation/src/http/genesis-write-api.mjs";
import { createPresentationReadApi, channelIdForThread } from "#services/thread-presentation/src/http/read-api.mjs";
import { createPresentationAssetCompletionService } from "#services/world-kernel/src/presentation-asset-completion-service.mjs";
import { createPresentationAssetDemandService } from "#services/world-kernel/src/presentation-asset-demand-service.mjs";
import { planThreadPresentationAssetSlots } from "#services/world-kernel/src/thread-presentation-asset-planner.mjs";
import { createThreadPresentationAssetPublisher } from "#services/world-kernel/src/thread-presentation-asset-publisher.mjs";
import { createThreadPresentationServer } from "#services/world-kernel/src/thread-presentation-server.mjs";
import cloudflareDeploymentYaml from "../../environments/cloudflare.yaml";
import localDeploymentYaml from "../../environments/local.yaml";
import {
  selectContentCredentialIntegration,
  selectImageProviderProfile,
} from "../../integration-selection.mjs";
import { parseDeploymentManifest, resolveServiceDeployment } from "../../manifest.mjs";

export { FibrePresentationChannelDurableObject };

const HTTP_SERVICE = createService({
  serviceName: "thread-presentation",
  health: { role: "presentation-api" },
});
const P3_CAN_THO_THREAD_ID = "thr_pr39_g2_04";
const P3_MARKET_MEDIA_ID = "media_place_market";
const DEPLOYMENTS = Object.freeze({
  local: parseDeploymentManifest(localDeploymentYaml),
  cloudflare: parseDeploymentManifest(cloudflareDeploymentYaml),
});

function deploymentManifest(env) {
  const environment = env?.FIBRE_DEPLOYMENT_ENV;
  const manifest = DEPLOYMENTS[environment];
  if (!manifest) throw new TypeError(`unsupported thread-presentation deployment environment ${String(environment)}`);
  return manifest;
}

function serviceDeployment(env) {
  return resolveServiceDeployment(deploymentManifest(env), "thread-presentation");
}

function assetGeneratorDeployment(env) {
  return resolveServiceDeployment(deploymentManifest(env), "asset-generator");
}

function createInfra(env, { includeWorkflows = true } = {}) {
  return createCloudflareInfraDriver({
    objectBucket: env.PRESENTATION_OBJECTS,
    presentationChannels: env.PRESENTATION_CHANNELS,
    catalogDatabase: env.PRESENTATION_CATALOG,
    workflowBindings: includeWorkflows && env.ASSET_GENERATION
      ? { asset_generation_v1: env.ASSET_GENERATION }
      : {},
  });
}

function createCredentialSigner(env) {
  return selectContentCredentialIntegration(serviceDeployment(env).integrations.contentCredentials, {
    environment: env,
  });
}

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value;
}

async function requestJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function fixtureBundleDigests(bundle) {
  const normalized = normalizeThreadPresentationBundle(bundle);
  return {
    presentation: threadPresentationPacketDigest(normalized.presentation),
    media: threadMediaPacketDigest(normalized.media),
    provenance: presentationProvenanceDigest(normalized.provenance),
  };
}

function sameFixtureBundle(snapshot, bundle) {
  const existing = {
    presentation: threadPresentationPacketDigest(snapshot.presentation),
    media: threadMediaPacketDigest(snapshot.media),
    provenance: presentationProvenanceDigest(snapshot.provenance),
  };
  const incoming = fixtureBundleDigests(bundle);
  return existing.presentation === incoming.presentation
    && existing.media === incoming.media
    && existing.provenance === incoming.provenance;
}

async function p3Slot(presentationServer, { threadId, mediaId }) {
  const channelId = channelIdForThread(threadId);
  const current = await presentationServer.getSnapshot(channelId);
  if (current === null) throw new Error(`seed fixture Thread ${threadId} before generating media`);
  const plan = planThreadPresentationAssetSlots({
    bundle: {
      presentation: current.snapshot.presentation,
      media: current.snapshot.media,
      provenance: current.snapshot.provenance,
    },
    snapshotObjectRef: current.pointer.objectRef,
    snapshotDigest: current.pointer.snapshotDigest,
  });
  const slot = plan.slots.find((candidate) => candidate.mediaId === mediaId);
  if (!slot || slot.status !== "missing") throw new Error(`fixture media slot ${mediaId} is not eligible for generation`);
  return slot;
}

async function publishP3Fixture({
  bundle,
  presentationServer,
  objectRef = null,
  snapshotVersion = "p3-fixture-v1",
}) {
  const presentation = bundle?.presentation;
  const threadId = nonEmpty("fixture threadId", presentation?.manifest?.threadId);
  if (presentation?.manifest?.fixture !== true) throw new TypeError("P3 seed accepts fixture presentations only");

  const channelId = channelIdForThread(threadId);
  const current = await presentationServer.getSnapshot(channelId);
  if (current !== null) {
    if (current.pointer.threadId !== threadId || !sameFixtureBundle(current.snapshot, bundle)) {
      throw new TypeError(`fixture Thread ${threadId} is already seeded with different content`);
    }
    return {
      ok: true,
      fixture: true,
      reused: true,
      threadId,
      channelId,
      lifecycleStatus: presentation.manifest.lifecycleStatus,
      snapshotVersion: current.pointer.snapshotVersion,
      snapshotDigest: current.pointer.snapshotDigest,
      cursor: current.pointer.sequence,
    };
  }

  const result = await presentationServer.publishSnapshot({
    channelId,
    objectRef: objectRef ?? `p3_fixture_snapshot_${threadId}_v1`,
    snapshotVersion,
    bundle,
    catalog: { publiclyVisible: true, p3Fixture: true },
  });
  return {
    ok: true,
    fixture: true,
    reused: false,
    threadId,
    channelId,
    lifecycleStatus: presentation.manifest.lifecycleStatus,
    snapshotVersion: result.pointer.snapshotVersion,
    snapshotDigest: result.pointer.snapshotDigest,
    cursor: result.pointer.sequence,
  };
}

async function scheduleP3Media({ env, infra, presentationServer, threadId, mediaId }) {
  const slot = await p3Slot(presentationServer, { threadId, mediaId });
  const requestedAt = new Date().toISOString();
  const providerProfile = selectImageProviderProfile(assetGeneratorDeployment(env), {
    requiresReferenceObjects: slot.referenceObjectRefs.length > 0,
  });
  const demandService = createPresentationAssetDemandService({ infra });
  const reconciled = await demandService.reconcile({
    scope: { entityKind: "thread", entityRef: threadId },
    slots: [slot],
    requestedAt,
    providerProfile,
  });
  const current = reconciled.projection.demands.find((entry) => (
    entry.demand.current
    && entry.demand.job.context?.kind === "thread_presentation_media"
    && entry.demand.job.context.mediaId === mediaId
  ));
  if (!current) throw new Error(`fixture media demand ${mediaId} did not persist as current`);
  const service = createAssetGenerationService({ infra });
  const workflow = await service.status(current.demand.job.jobId);
  return {
    ok: true,
    fixture: true,
    threadId,
    mediaId,
    providerProfile,
    demandId: current.demand.demandId,
    jobId: current.demand.job.jobId,
    objectRef: current.demand.job.outputObjectRef,
    workflow: workflow ?? current.dispatch,
  };
}

async function maybeHandleP3Fixture(request, env, infra, presentationServer) {
  if (env.P3_FIXTURE_MODE !== "1") return null;
  const url = new URL(request.url);

  if (url.pathname === "/__p3/fixtures/thread" && request.method === "POST") {
    const body = await requestJson(request);
    if (body === null) return Response.json({ error: "invalid_json" }, { status: 400 });
    try {
      return Response.json(await publishP3Fixture({ bundle: body.bundle, presentationServer }));
    } catch (error) {
      return Response.json({ error: "invalid_p3_fixture", detail: error.message }, { status: 400 });
    }
  }

  if (url.pathname === "/__p3/fixtures/generate" && request.method === "POST") {
    if (!env.ASSET_GENERATION) return Response.json({ error: "asset_workflow_not_configured" }, { status: 503 });
    const body = await requestJson(request);
    if (body === null) return Response.json({ error: "invalid_json" }, { status: 400 });
    try {
      const threadId = nonEmpty("threadId", body.threadId);
      const mediaId = nonEmpty("mediaId", body.mediaId);
      return Response.json(await scheduleP3Media({ env, infra, presentationServer, threadId, mediaId }));
    } catch (error) {
      return Response.json({ error: "invalid_p3_generation_request", detail: error.message }, { status: 400 });
    }
  }

  if (url.pathname === "/__p3/fixtures/can-tho" && request.method === "POST") {
    const body = await requestJson(request);
    if (body === null) return Response.json({ error: "invalid_json" }, { status: 400 });
    const presentation = body?.bundle?.presentation;
    if (presentation?.manifest?.threadId !== P3_CAN_THO_THREAD_ID
      || presentation?.manifest?.lifecycleStatus !== "genesis_candidate"
      || presentation?.manifest?.fixture !== true) {
      return Response.json({ error: "invalid_p3_fixture" }, { status: 400 });
    }
    return Response.json(await publishP3Fixture({
      bundle: body.bundle,
      presentationServer,
      objectRef: "p3_fixture_snapshot_thr_pr39_g2_04_v1",
      snapshotVersion: "p3-can-tho-v1",
    }));
  }

  if (url.pathname === "/__p3/fixtures/can-tho/generate-market" && request.method === "POST") {
    if (!env.ASSET_GENERATION) return Response.json({ error: "asset_workflow_not_configured" }, { status: 503 });
    return Response.json(await scheduleP3Media({
      env,
      infra,
      presentationServer,
      threadId: P3_CAN_THO_THREAD_ID,
      mediaId: P3_MARKET_MEDIA_ID,
    }));
  }

  const statusMatch = /^\/__p3\/workflows\/([A-Za-z0-9._:-]+)$/.exec(url.pathname);
  if (statusMatch && request.method === "GET") {
    const service = createAssetGenerationService({ infra });
    const status = await service.status(statusMatch[1]);
    return status === null
      ? Response.json({ error: "workflow_not_found" }, { status: 404 })
      : Response.json({ ok: true, workflow: status });
  }

  if (url.pathname.startsWith("/__p3/") && request.method !== "GET" && request.method !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  }
  return null;
}

function createCompletionConsumer(env, infra, presentationServer) {
  const publisher = createThreadPresentationAssetPublisher({
    infra,
    credentialSigner: createCredentialSigner(env),
    presentationServer,
  });
  return createPresentationAssetCompletionService({
    infra,
    credentialSigner: createCredentialSigner(env),
    async publishReady({ scope, receipt }) {
      if (scope.entityKind !== "thread") return null;
      return publisher.publishReady({ receipt, channelId: channelIdForThread(scope.entityRef) });
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/healthz") return HTTP_SERVICE.fetch(request);

    const infra = createInfra(env);
    const presentationServer = createThreadPresentationServer({ infra });
    const genesisWriteApi = createGenesisPresentationWriteApi({
      presentationServer,
      privateToken: env.FIBRE_PRIVATE_TOKEN ?? null,
    });
    const genesisWriteResponse = await genesisWriteApi.fetch(request);
    if (genesisWriteResponse !== null) return genesisWriteResponse;

    const fixtureResponse = await maybeHandleP3Fixture(request, env, infra, presentationServer);
    if (fixtureResponse !== null) return fixtureResponse;

    const api = createPresentationReadApi({
      infra,
      presentationServer,
      viewerOrigin: env.VIEWER_ORIGIN ?? null,
      openStream({ channelId, request: streamRequest }) {
        return env.PRESENTATION_CHANNELS.getByName(channelId).fetch(streamRequest);
      },
    });
    return api.fetch(request);
  },

  async queue(batch, env) {
    const infra = createInfra(env);
    const presentationServer = createThreadPresentationServer({ infra });
    const completions = createCompletionConsumer(env, infra, presentationServer);

    for (const message of batch.messages) {
      try {
        await completions.consume(message.body);
        message.ack();
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        console.error(JSON.stringify({
          event: "presentation_asset_completion_retry",
          queue: batch.queue,
          messageId: message.id,
          attempts: message.attempts,
          error: detail,
        }));
        const exponent = Math.min(Math.max(message.attempts - 1, 0), 6);
        message.retry({ delaySeconds: Math.min(300, 5 * (2 ** exponent)) });
      }
    }
  },
};
