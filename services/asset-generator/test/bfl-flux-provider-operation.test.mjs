import test from "node:test";
import assert from "node:assert/strict";

import { AssetGenerationError } from "../src/asset-generation-error.mjs";
import { createBflFluxImageProvider } from "../src/providers/bfl-flux-image-provider.mjs";

function imageRequest() {
  return {
    assetKind: "image",
    role: "place",
    variant: "default",
    brief: {
      description: "Generated reconstruction of a market.",
      constraints: ["Not documentary evidence."],
    },
    inputReferences: ["presentation_1"],
    referenceObjects: [],
    providerProfile: "bfl-flux-2-pro-v1",
    context: {},
  };
}

function jsonResponse({ status = 200, payload }) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get() { return null; } },
    async json() { return payload; },
  };
}

test("BFL FLUX startOperation returns a secret-stripped accepted task before any polling", async () => {
  const calls = [];
  const provider = createBflFluxImageProvider({
    apiKey: "bfl-secret-never-persist",
    sleep: async () => {},
    fetchImpl: async (url, init = {}) => {
      calls.push({ url, init });
      return jsonResponse({
        payload: {
          id: "bfl_task_checkpoint",
          polling_url: "https://api.bfl.ai/v1/get_result?id=bfl_task_checkpoint",
        },
      });
    },
  });

  const started = await provider.startOperation(imageRequest());
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.method, "POST");
  assert.equal(started.operation.providerRequestId, "bfl_task_checkpoint");
  assert.equal(started.operation.continuation.pollingUrl, "https://api.bfl.ai/v1/get_result?id=bfl_task_checkpoint");
  assert.equal(started.operation.secretsRemoved, true);
  assert.equal(JSON.stringify(started).includes("bfl-secret-never-persist"), false);
});

test("BFL FLUX resumeOperation makes polling exhaustion retryable for the same accepted task", async () => {
  let submissions = 0;
  let polls = 0;
  const provider = createBflFluxImageProvider({
    apiKey: "bfl-fixture",
    sleep: async () => {},
    maxPollAttempts: 1,
    fetchImpl: async (url, init = {}) => {
      if (init.method === "POST") {
        submissions += 1;
        return jsonResponse({
          payload: {
            id: "bfl_task_resume",
            polling_url: "https://api.bfl.ai/v1/get_result?id=bfl_task_resume",
          },
        });
      }
      polls += 1;
      throw new Error(`poll reset ${url}`);
    },
  });

  const started = await provider.startOperation(imageRequest());
  await assert.rejects(
    () => provider.resumeOperation(started.operation),
    (error) => error instanceof AssetGenerationError
      && error.phase === "provider_generation"
      && error.category === "provider_timeout"
      && error.retryable === true
      && error.providerRequestId === "bfl_task_resume",
  );
  assert.equal(submissions, 1);
  assert.equal(polls, 1);
});

test("BFL FLUX direct generate remains terminal after accepted-task polling exhaustion when no Fibre checkpoint owns the task", async () => {
  let submissions = 0;
  const provider = createBflFluxImageProvider({
    apiKey: "bfl-fixture",
    sleep: async () => {},
    maxPollAttempts: 1,
    fetchImpl: async (_url, init = {}) => {
      if (init.method === "POST") {
        submissions += 1;
        return jsonResponse({
          payload: {
            id: "bfl_task_direct",
            polling_url: "https://api.bfl.ai/v1/get_result?id=bfl_task_direct",
          },
        });
      }
      throw new Error("poll reset");
    },
  });

  await assert.rejects(
    () => provider.generate(imageRequest()),
    (error) => error instanceof AssetGenerationError
      && error.category === "provider_timeout"
      && error.retryable === false
      && error.providerRequestId === "bfl_task_direct",
  );
  assert.equal(submissions, 1);
});
