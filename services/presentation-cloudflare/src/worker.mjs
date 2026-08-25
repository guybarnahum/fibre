import { createCloudflareInfraDriver } from "../../../packages/infra/src/cloudflare-v1.mjs";
import { FibrePresentationChannelDurableObject } from "../../../packages/infra/src/cloudflare/presentation-channel-do.mjs";
import {
  createAssetGenerationService,
  normalizeStoredAssetReceipt,
} from "../../asset-generator/src/index.mjs";
import { createHttpContentCredentialSigner } from "../../asset-generator/src/http-content-credential-signer.mjs";
import { planThreadPresentationAssetGeneration } from "../../world-kernel/src/thread-presentation-asset-planner.mjs";
import { createThreadPresentationAssetPublisher } from "../../world-kernel/src/thread-presentation-asset-publisher.mjs";
import { createThreadPresentationServer } from "../../world-kernel/src/thread-presentation-server.mjs";
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

async function p3MarketJob(presentationServer) {
  const channelId = channelIdForThread(P3_CAN_THO_THREAD_ID);
  const current = await presentationServer.getSnapshot(channelId);
  if (current === null) throw new Error("seed the P3 Cần Thơ fixture before generating media");
  const plan = planThreadPresentationAssetGeneration({
    bundle: {
      presentation: current.snapshot.presentation,
      media: current.snapshot.media,
      provenance: current.snapshot.provenance,
    },
    snapshotObjectRef: current.pointer.objectRef,
    snapshotDigest: current.pointer.snapshotDigest,
    requestedAt: new Date().toISOString(),
    providerProfile: P3_PROVIDER_PROFILE,
  });
  const job = plan.jobs.find((candidate) => candidate.context.mediaId === P3_MARKET_MEDIA_ID);
  if (!job) throw new Error("P3 market media slot is not eligible for generation");
  return job;
}

async function loadP3Receipt(infra, job) {
  const stored = await infra.objects.get(job.receiptObjectRef);
  if (stored === null) return null;
  let parsed;
  try { parsed = JSON.parse(new TextDecoder().decode(stored.bytes)); }
  catch { throw new Error("P3 stored asset receipt is invalid JSON"); }
  const receipt = normalizeStoredAssetReceipt(parsed);
  if (receipt.jobId !== job.jobId || receipt.objectRef !== job.outputObjectRef) {
    throw new Error("P3 stored asset receipt does not match the planned job");
  }
  return receipt;
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
    const job = await p3MarketJob(presentationServer);
    const service = createAssetGenerationService({ infra });
    const scheduled = await service.request(job);
    return Response.json({
      ok: true,
      fixture: true,
      threadId: P3_CAN_THO_THREAD_ID,
      mediaId: P3_MARKET_MEDIA_ID,
      jobId: job.jobId,
      objectRef: job.outputObjectRef,
      workflow: scheduled.instance,
    });
  }

  if (url.pathname === "/__p3/fixtures/can-tho/publish-market" && request.method === "POST") {
    const job = await p3MarketJob(presentationServer);
    const receipt = await loadP3Receipt(infra, job);
    if (receipt === null) return Response.json({ error: "asset_receipt_not_ready" }, { status: 409 });

    const publisher = createThreadPresentationAssetPublisher({
      infra,
      credentialSigner: createCredentialSigner(env),
      presentationServer,
    });
    const channelId = channelIdForThread(P3_CAN_THO_THREAD_ID);
    const accepted = await publisher.publishReady({ receipt, channelId });
    return Response.json({
      ok: true,
      fixture: true,
      threadId: P3_CAN_THO_THREAD_ID,
      mediaId: P3_MARKET_MEDIA_ID,
      jobId: receipt.jobId,
      objectRef: receipt.objectRef,
      finalAssetDigest: receipt.sha256,
      generationRecordDigest: receipt.generationRecordDigest,
      eventId: accepted.event.eventId,
      eventSequence: accepted.event.sequence,
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
};
