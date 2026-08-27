import { createCloudflareInfraDriver } from "@fibre/infra/cloudflare-v1";
import { FibrePresentationChannelDurableObject } from "@fibre/infra/cloudflare-v1/presentation-channel-do";
import { createAssetGenerationService } from "#services/asset-generator/src/index.mjs";
import { createHttpContentCredentialSigner } from "#services/asset-generator/src/http-content-credential-signer.mjs";
import { createPresentationAssetCompletionService } from "#services/world-kernel/src/presentation-asset-completion-service.mjs";
import { createPresentationAssetDemandService } from "#services/world-kernel/src/presentation-asset-demand-service.mjs";
import { planThreadPresentationAssetSlots } from "#services/world-kernel/src/thread-presentation-asset-planner.mjs";
import { createThreadPresentationAssetPublisher } from "#services/world-kernel/src/thread-presentation-asset-publisher.mjs";
import { createThreadPresentationServer } from "#services/world-kernel/src/thread-presentation-server.mjs";
import { createPresentationReadApi, channelIdForThread } from "./presentation-read-api.mjs";

export { FibrePresentationChannelDurableObject };

const P3_CAN_THO_THREAD_ID = "thr_pr39_g2_04";
const P3_MARKET_MEDIA_ID = "media_place_market";
const P3_PROVIDER_PROFILE = "openai-gpt-image-2-medium-v1";

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
  return createHttpContentCredentialSigner({
    baseUrl: env.C2PA_SIGNER_URL,
    signerId: "fibre-c2pa-node-local-v1",
  });
}

async function p3MarketSlot(presentationServer) {
  const channelId = channelIdForThread(P3_CAN_THO_THREAD_ID);
  const current = await presentationServer.getSnapshot(channelId);
  if (current === null) throw new Error("seed the P3 Cần Thơ fixture before generating media");
  const plan = planThreadPresentationAssetSlots({
    bundle: {
      presentation: current.snapshot.presentation,
      media: current.snapshot.media,
      provenance: current.snapshot.provenance,
    },
    snapshotObjectRef: current.pointer.objectRef,
    snapshotDigest: current.pointer.snapshotDigest,
  });
  const slot = plan.slots.find((candidate) => candidate.mediaId === P3_MARKET_MEDIA_ID);
  if (!slot || slot.status !== "missing") {
    throw new Error("P3 market media slot is not eligible for generation");
  }
  return slot;
}

async function maybeHandleP3Fixture(request, env, infra, presentationServer) {
  if (env.P3_FIXTURE_MODE !== "1") return null;
  const url = new URL(request.url);

  if (url.pathname === "/__p3/fixtures/can-tho" && request.method === "POST") {
    let body;
    try { body = await request.json(); }
    catch { return Response.json({ error: "invalid_json" }, { status: 400 }); }
    const presentation = body?.bundle?.presentation;
    if (presentation?.manifest?.threadId !== P3_CAN_THO_THREAD_ID
      || presentation?.manifest?.lifecycleStatus !== "genesis_candidate"
      || presentation?.manifest?.fixture !== true) {
      return Response.json({ error: "invalid_p3_fixture" }, { status: 400 });
    }

    const channelId = channelIdForThread(P3_CAN_THO_THREAD_ID);
    const result = await presentationServer.publishSnapshot({
      channelId,
      objectRef: "p3_fixture_snapshot_thr_pr39_g2_04_v1",
      snapshotVersion: "p3-can-tho-v1",
      bundle: body.bundle,
      catalog: {
        publiclyVisible: true,
        p3Fixture: true,
      },
    });
    return Response.json({
      ok: true,
      fixture: true,
      threadId: P3_CAN_THO_THREAD_ID,
      channelId,
      snapshotVersion: result.pointer.snapshotVersion,
      snapshotDigest: result.pointer.snapshotDigest,
      cursor: result.pointer.sequence,
    });
  }

  if (url.pathname === "/__p3/fixtures/can-tho/generate-market" && request.method === "POST") {
    if (!env.ASSET_GENERATION) return Response.json({ error: "asset_workflow_not_configured" }, { status: 503 });
    const slot = await p3MarketSlot(presentationServer);
    const requestedAt = new Date().toISOString();
    const demandService = createPresentationAssetDemandService({ infra });
    const reconciled = await demandService.reconcile({
      scope: { entityKind: "thread", entityRef: P3_CAN_THO_THREAD_ID },
      slots: [slot],
      requestedAt,
      providerProfile: P3_PROVIDER_PROFILE,
    });
    const current = reconciled.projection.demands.find((entry) => (
      entry.demand.current
      && entry.demand.job.context?.kind === "thread_presentation_media"
      && entry.demand.job.context.mediaId === P3_MARKET_MEDIA_ID
    ));
    if (!current) throw new Error("P3 market demand did not persist as current");
    const service = createAssetGenerationService({ infra });
    const workflow = await service.status(current.demand.job.jobId);
    return Response.json({
      ok: true,
      fixture: true,
      threadId: P3_CAN_THO_THREAD_ID,
      mediaId: P3_MARKET_MEDIA_ID,
      demandId: current.demand.demandId,
      jobId: current.demand.job.jobId,
      objectRef: current.demand.job.outputObjectRef,
      workflow: workflow ?? current.dispatch,
    });
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
      return publisher.publishReady({
        receipt,
        channelId: channelIdForThread(scope.entityRef),
      });
    },
  });
}

export default {
  async fetch(request, env) {
    const infra = createInfra(env);
    const presentationServer = createThreadPresentationServer({ infra });

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
