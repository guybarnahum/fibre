import { createCloudflareInfraDriver } from "../../../packages/infra/src/cloudflare-v1.mjs";
import { FibrePresentationChannelDurableObject } from "../../../packages/infra/src/cloudflare/presentation-channel-do.mjs";
import { createThreadPresentationServer } from "../../world-kernel/src/thread-presentation-server.mjs";
import { createPresentationReadApi } from "./presentation-read-api.mjs";

export { FibrePresentationChannelDurableObject };

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

export default {
  async fetch(request, env) {
    const infra = createInfra(env);
    const presentationServer = createThreadPresentationServer({ infra });
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
