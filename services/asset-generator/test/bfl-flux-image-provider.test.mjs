import test from "node:test";
import assert from "node:assert/strict";

import { AssetGenerationError } from "../src/asset-generation-error.mjs";
import { createBflFluxImageProvider } from "../src/providers/bfl-flux-image-provider.mjs";

const encoder = new TextEncoder();

function imageRequest(overrides = {}) {
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
    ...overrides,
  };
}

function jsonResponse({ status = 200, payload, headers = {} }) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) { return headers[name.toLowerCase()] ?? null; },
    },
    async json() { return payload; },
  };
}

function binaryResponse({ status = 200, bytes = "flux-image", headers = { "content-type": "image/png" } } = {}) {
  const encoded = typeof bytes === "string" ? encoder.encode(bytes) : bytes;
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) { return headers[name.toLowerCase()] ?? null; },
    },
    async arrayBuffer() {
      return encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength);
    },
  };
}

test("BFL FLUX provider submits, polls and downloads one fixed-model image without persisting the API key", async () => {
  const calls = [];
  const provider = createBflFluxImageProvider({
    apiKey: "bfl-secret-never-persist",
    sleep: async () => {},
    now: () => "2026-08-26T22:00:00Z",
    fetchImpl: async (url, init = {}) => {
      calls.push({ url, init });
      if (url === "https://api.bfl.ai/v1/flux-2-pro") {
        return jsonResponse({
          payload: {
            id: "bfl_task_1",
            polling_url: "https://api.bfl.ai/v1/get_result?id=bfl_task_1",
          },
        });
      }
      if (url.startsWith("https://api.bfl.ai/v1/get_result")) {
        const pollCount = calls.filter((call) => call.url.startsWith("https://api.bfl.ai/v1/get_result")).length;
        return pollCount === 1
          ? jsonResponse({ payload: { id: "bfl_task_1", status: "Pending", result: null } })
          : jsonResponse({
              payload: {
                id: "bfl_task_1",
                status: "Ready",
                result: { sample: "https://delivery.us.bfl.ai/fixture/bfl_task_1.png" },
              },
            });
      }
      if (url === "https://delivery.us.bfl.ai/fixture/bfl_task_1.png") return binaryResponse();
      throw new Error(`unexpected URL ${url}`);
    },
  });

  const generated = await provider.generate(imageRequest());
  assert.equal(calls.filter((call) => call.init.method === "POST").length, 1);
  assert.equal(calls[0].init.headers["x-key"], "bfl-secret-never-persist");
  assert.equal(generated.requestWitness.body.disable_pup, true);
  assert.equal(generated.requestWitness.body.output_format, "png");
  assert.match(generated.requestWitness.body.prompt, /Not documentary evidence/);
  assert.equal(JSON.stringify(generated.requestWitness).includes("bfl-secret-never-persist"), false);
  assert.equal(generated.result.provider, "bfl");
  assert.equal(generated.result.model, "flux-2-pro");
  assert.equal(generated.result.providerRequestId, "bfl_task_1");
  assert.equal(generated.result.configuration.asyncResult, true);
  assert.equal(new TextDecoder().decode(generated.result.bytes), "flux-image");
});

test("BFL FLUX explicit rate limiting is retryable and preserves Retry-After", async () => {
  const provider = createBflFluxImageProvider({
    apiKey: "bfl-fixture",
    sleep: async () => {},
    fetchImpl: async () => jsonResponse({
      status: 429,
      headers: { "retry-after": "4" },
      payload: { detail: "too many active tasks" },
    }),
  });

  await assert.rejects(
    () => provider.generate(imageRequest()),
    (error) => error instanceof AssetGenerationError
      && error.phase === "provider_generation"
      && error.category === "rate_limited"
      && error.retryable === true
      && error.httpStatus === 429
      && error.retryAfterMs === 4000,
  );
});

test("BFL FLUX submission transport ambiguity is terminal to prevent a second billable task", async () => {
  const provider = createBflFluxImageProvider({
    apiKey: "bfl-secret-never-report",
    sleep: async () => {},
    fetchImpl: async () => { throw new Error("socket reset after request write"); },
  });

  await assert.rejects(
    () => provider.generate(imageRequest()),
    (error) => error instanceof AssetGenerationError
      && error.phase === "provider_generation"
      && error.category === "network"
      && error.retryable === false
      && error.safeDetail.includes("ambiguous acceptance")
      && !error.safeDetail.includes("bfl-secret-never-report"),
  );
});

test("BFL FLUX retries transient polling inside one submitted task rather than resubmitting", async () => {
  let submissions = 0;
  let polls = 0;
  const provider = createBflFluxImageProvider({
    apiKey: "bfl-fixture",
    sleep: async () => {},
    fetchImpl: async (url, init = {}) => {
      if (init.method === "POST") {
        submissions += 1;
        return jsonResponse({
          payload: {
            id: "bfl_task_poll_retry",
            polling_url: "https://api.bfl.ai/v1/get_result?id=bfl_task_poll_retry",
          },
        });
      }
      if (url.startsWith("https://api.bfl.ai/v1/get_result")) {
        polls += 1;
        if (polls === 1) throw new Error("poll transport reset");
        if (polls === 2) return jsonResponse({ status: 503, payload: { detail: "temporary" } });
        return jsonResponse({
          payload: {
            id: "bfl_task_poll_retry",
            status: "Ready",
            result: { sample: "https://delivery.eu.bfl.ai/fixture/retry.png" },
          },
        });
      }
      return binaryResponse({ bytes: "recovered" });
    },
  });

  const generated = await provider.generate(imageRequest());
  assert.equal(submissions, 1);
  assert.equal(polls, 3);
  assert.equal(generated.result.providerRequestId, "bfl_task_poll_retry");
});

test("BFL FLUX moderation is terminal and keeps the accepted task identity", async () => {
  const provider = createBflFluxImageProvider({
    apiKey: "bfl-fixture",
    sleep: async () => {},
    fetchImpl: async (url, init = {}) => {
      if (init.method === "POST") {
        return jsonResponse({
          payload: {
            id: "bfl_task_moderated",
            polling_url: "https://api.bfl.ai/v1/get_result?id=bfl_task_moderated",
          },
        });
      }
      return jsonResponse({ payload: { id: "bfl_task_moderated", status: "Content Moderated", result: null } });
    },
  });

  await assert.rejects(
    () => provider.generate(imageRequest()),
    (error) => error instanceof AssetGenerationError
      && error.category === "moderation_rejected"
      && error.retryable === false
      && error.providerRequestId === "bfl_task_moderated",
  );
});

test("BFL FLUX rejects malformed reference objects before submission", async () => {
  let called = false;
  const provider = createBflFluxImageProvider({
    apiKey: "bfl-fixture",
    fetchImpl: async () => { called = true; throw new Error("must not call BFL"); },
  });

  await assert.rejects(
    () => provider.generate(imageRequest({ referenceObjects: [{ objectRef: "reference_1" }] })),
    (error) => error instanceof AssetGenerationError
      && error.phase === "validation"
      && error.category === "invalid_request"
      && error.retryable === false,
  );
  assert.equal(called, false);
});

test("BFL FLUX rejects provider-returned delivery URLs outside BFL before fetching bytes", async () => {
  let deliveryFetched = false;
  const provider = createBflFluxImageProvider({
    apiKey: "bfl-fixture",
    sleep: async () => {},
    fetchImpl: async (url, init = {}) => {
      if (init.method === "POST") {
        return jsonResponse({
          payload: {
            id: "bfl_task_bad_delivery",
            polling_url: "https://api.bfl.ai/v1/get_result?id=bfl_task_bad_delivery",
          },
        });
      }
      if (url.startsWith("https://api.bfl.ai/v1/get_result")) {
        return jsonResponse({
          payload: {
            id: "bfl_task_bad_delivery",
            status: "Ready",
            result: { sample: "https://attacker.example/image.png" },
          },
        });
      }
      deliveryFetched = true;
      return binaryResponse();
    },
  });

  await assert.rejects(
    () => provider.generate(imageRequest()),
    (error) => error instanceof AssetGenerationError
      && error.category === "unknown"
      && error.retryable === false,
  );
  assert.equal(deliveryFetched, false);
});
