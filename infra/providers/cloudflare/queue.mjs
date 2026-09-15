import { assertInfraDriver } from "../../infra-driver.mjs";
import {
  assertInfraId,
  assertInfraJsonValue,
  assertInfraPlainObject,
} from "../../internal.mjs";
import {
  extendCloudflareHealth,
  normalCloudflareCheck,
  probeCloudflareHealth,
} from "./health.mjs";

function assertQueueBinding(binding, queueName) {
  if (!binding || typeof binding.send !== "function") {
    throw new TypeError(`Cloudflare Queue binding for ${queueName} must provide send`);
  }
  return binding;
}

export function createCloudflareQueuePort(queueBindings) {
  assertInfraPlainObject("queueBindings", queueBindings);

  function bindingFor(queueName) {
    assertInfraId("queueName", queueName);
    const binding = queueBindings[queueName];
    if (!binding) throw new TypeError(`no Cloudflare Queue binding configured for ${queueName}`);
    return assertQueueBinding(binding, queueName);
  }

  return Object.freeze({
    async send(queueName, message) {
      assertInfraId("queueName", queueName);
      assertInfraJsonValue("queue message", message);
      await bindingFor(queueName).send(structuredClone(message));
      return Object.freeze({ queueName });
    },
  });
}

async function queueHealth(queueName, binding) {
  if (typeof binding.metrics !== "function") {
    return normalCloudflareCheck("queues", queueName, { mode:"configured" });
  }
  return probeCloudflareHealth("queues", queueName, async () => {
    const metrics = await binding.metrics();
    return {
      backlogCount:Number(metrics?.backlogCount ?? 0),
      backlogBytes:Number(metrics?.backlogBytes ?? 0),
      oldestMessageTimestamp:metrics?.oldestMessageTimestamp ?? null,
    };
  }, "QUEUE_UNAVAILABLE");
}

export function withCloudflareQueueBindings(infra, queueBindings) {
  const base = assertInfraDriver(infra);
  if (base.capabilities.includes("queues")) throw new TypeError("infra driver already declares queues capability");
  const entries = Object.entries(queueBindings);
  return assertInfraDriver({
    ...base,
    capabilities: [...base.capabilities, "queues"],
    queues: createCloudflareQueuePort(queueBindings),
    ...(base.health ? {
      health:extendCloudflareHealth(base.health, async () => Promise.all(
        entries.map(([queueName, binding]) => queueHealth(queueName, assertQueueBinding(binding, queueName))),
      )),
    } : {}),
  });
}
