import test from "node:test";
import assert from "node:assert/strict";

import { createMemoryInfraDriver } from "../src/memory-driver.mjs";
import {
  createCloudflareQueuePort,
  withCloudflareQueueBindings,
} from "../src/cloudflare-queue-port.mjs";

function fakeQueueBinding() {
  const messages = [];
  return {
    messages,
    async send(message) {
      messages.push(structuredClone(message));
    },
  };
}

test("Cloudflare queue port maps logical Fibre queue names to bindings", async () => {
  const completions = fakeQueueBinding();
  const queues = createCloudflareQueuePort({
    asset_generation_completions: completions,
  });
  const message = { jobId: "assetjob_1", receiptObjectRef: "assetreceipt_1" };
  const accepted = await queues.send("asset_generation_completions", message);
  assert.deepEqual(accepted, { queueName: "asset_generation_completions" });
  assert.deepEqual(completions.messages, [message]);

  await assert.rejects(
    () => queues.send("missing_queue", message),
    /no Cloudflare Queue binding configured/,
  );
});

test("Cloudflare queue adapter composes into InfraDriver without changing application contract", async () => {
  const completions = fakeQueueBinding();
  const base = createMemoryInfraDriver();
  const infra = withCloudflareQueueBindings(base, {
    asset_generation_completions: completions,
  });
  assert.equal(infra.capabilities.includes("queues"), true);
  await infra.queues.send("asset_generation_completions", { completionVersion: "fixture" });
  assert.deepEqual(completions.messages, [{ completionVersion: "fixture" }]);
});
