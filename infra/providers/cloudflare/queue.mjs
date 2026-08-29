import { assertInfraDriver } from "../../infra-driver.mjs";
import {
  assertInfraId,
  assertInfraJsonValue,
  assertInfraPlainObject,
} from "../../internal.mjs";

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

export function withCloudflareQueueBindings(infra, queueBindings) {
  const base = assertInfraDriver(infra);
  if (base.capabilities.includes("queues")) throw new TypeError("infra driver already declares queues capability");
  return assertInfraDriver({
    ...base,
    capabilities: [...base.capabilities, "queues"],
    queues: createCloudflareQueuePort(queueBindings),
  });
}
