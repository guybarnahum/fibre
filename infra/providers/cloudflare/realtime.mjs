import {
  assertInfraId,
  assertInfraJsonValue,
  infraCanonicalJson,
} from "../../internal.mjs";

function realtimeStub(namespace, channelId) {
  if (!namespace || typeof namespace.getByName !== "function") {
    throw new TypeError("Cloudflare realtime namespace must provide getByName");
  }
  assertInfraId("channelId", channelId);
  return namespace.getByName(channelId);
}

export function createCloudflareRealtimePort(namespace) {
  return Object.freeze({
    async publish(channelId, value) {
      assertInfraJsonValue("realtime value", value);
      const result = await realtimeStub(namespace, channelId).publish({
        valueJson:infraCanonicalJson(value),
      });
      return {
        delivered:Number.isSafeInteger(result?.delivered) ? result.delivered : null,
      };
    },
  });
}
