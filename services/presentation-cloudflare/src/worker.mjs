import { createCloudflareInfraDriver } from "../../../packages/infra/src/cloudflare-v1.mjs";
import { FibrePresentationChannelDurableObject } from "../../../packages/infra/src/cloudflare/presentation-channel-do.mjs";
import { createThreadPresentationServer } from "../../world-kernel/src/thread-presentation-server.mjs";
import { createPresentationReadApi, channelIdForThread } from "./presentation-read-api.mjs";

export { FibrePresentationChannelDurableObject };

const P3_CAN_THO_THREAD_ID = "thr_pr39_g2_04";

function createInfra(env) {
  return createCloudflareInfraDriver({
    objectBucket: env.PRESENTATION_OBJECTS,
    presentationChannels: env.PRESENTATION_CHANNELS,
    catalogDatabase: env.PRESENTATION_CATALOG,
    workflowBindings: env.ASSET_GENERATION
      ? { asset_generation_v1: env.ASSET_GENERATION }
      : {},
  });
}

async function maybeHandleP3Fixture(request, env, presentationServer) {
  if (env.P3_FIXTURE_MODE !== "1") return null;
  const url = new URL(request.url);
  if (url.pathname !== "/__p3/fixtures/can-tho") return null;
  if (request.method !== "POST") return Response.json({ error: "method_not_allowed" }, { status: 405 });

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

export default {
  async fetch(request, env) {
    const infra = createInfra(env);
    const presentationServer = createThreadPresentationServer({ infra });

    const fixtureResponse = await maybeHandleP3Fixture(request, env, presentationServer);
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
