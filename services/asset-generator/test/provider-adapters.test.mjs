import test from "node:test";
import assert from "node:assert/strict";

import { createOpenAIImageProvider } from "../../../integrations/ai/image/openai.mjs";
import { AssetGenerationError } from "../src/asset-generation-error.mjs";

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
    providerProfile: "openai-gpt-image-2-medium-v1",
    context: {},
    ...overrides,
  };
}

function response({ status, payload, headers = {} }) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) { return headers[name.toLowerCase()] ?? null; },
    },
    async json() { return payload; },
  };
}

test("OpenAI image provider preserves exact request witness without API secret", async () => {
  const seen = [];
  const provider = createOpenAIImageProvider({
    apiKey: "sk-secret-never-persist",
    fetchImpl: async (url, init) => {
      seen.push({ url, init });
      return response({
        status: 200,
        headers: { "x-request-id": "req_openai_fixture" },
        payload: {
          created: 1787364000,
          data: [{ b64_json: btoa("png-fixture") }],
        },
      });
    },
  });
  const generated = await provider.generate(imageRequest());
  assert.equal(generated.requestWitness.body.model, "gpt-image-2-2026-04-21");
  assert.equal(generated.requestWitness.body.output_format, "png");
  assert.match(generated.requestWitness.body.prompt, /Not documentary evidence/);
  assert.equal(JSON.stringify(generated.requestWitness).includes("sk-secret-never-persist"), false);
  assert.equal(seen[0].init.headers.Authorization, "Bearer sk-secret-never-persist");
  assert.equal(generated.result.providerRequestId, "req_openai_fixture");
  assert.equal(new TextDecoder().decode(generated.result.bytes), "png-fixture");
});

test("OpenAI image provider uses image edits for canonical reference inputs and preserves provenance", async () => {
  const seen = [];
  const first = new TextEncoder().encode("reference-one");
  const second = new TextEncoder().encode("reference-two");
  const provider = createOpenAIImageProvider({
    apiKey: "sk-secret-never-persist",
    fetchImpl: async (url, init) => {
      seen.push({ url, init });
      return response({
        status: 200,
        headers: { "x-request-id": "req_openai_edit_fixture" },
        payload: {
          created: 1787364000,
          data: [{ b64_json: btoa("edited-png-fixture") }],
        },
      });
    },
  });

  const generated = await provider.generate(imageRequest({
    role:"official_id_photo",
    referenceObjects:[
      {
        objectRef:"visual_identity_reference_1",
        digest:"sha256:reference-one",
        bytes:first,
        metadata:{ kind:"provenanced_generated_media", mediaType:"image/png" },
      },
      {
        objectRef:"visual_identity_reference_2",
        digest:"sha256:reference-two",
        bytes:second,
        metadata:{ kind:"provenanced_generated_media", mediaType:"image/jpeg" },
      },
    ],
  }));

  assert.equal(seen.length, 1);
  assert.equal(seen[0].url, "https://api.openai.com/v1/images/edits");
  assert.equal(seen[0].init.headers.Authorization, "Bearer sk-secret-never-persist");
  assert.equal(seen[0].init.headers["Content-Type"], undefined);
  assert.ok(seen[0].init.body instanceof FormData);
  assert.equal(seen[0].init.body.get("model"), "gpt-image-2-2026-04-21");
  assert.equal(seen[0].init.body.get("quality"), "medium");
  assert.equal(seen[0].init.body.get("size"), "1024x1024");
  assert.equal(seen[0].init.body.getAll("image[]").length, 2);
  assert.deepEqual(
    seen[0].init.body.getAll("image[]").map((image) => image.type),
    ["image/png", "image/jpeg"],
  );

  assert.equal(generated.requestWitness.mediaType, "multipart/form-data");
  assert.deepEqual(generated.requestWitness.body.referenceInputs, [
    {
      objectRef:"visual_identity_reference_1",
      digest:"sha256:reference-one",
      mediaType:"image/png",
      kind:"provenanced_generated_media",
    },
    {
      objectRef:"visual_identity_reference_2",
      digest:"sha256:reference-two",
      mediaType:"image/jpeg",
      kind:"provenanced_generated_media",
    },
  ]);
  assert.equal("bytes" in generated.requestWitness.body.referenceInputs[0], false);
  assert.equal("bytes" in generated.requestWitness.body.referenceInputs[1], false);
  assert.equal(JSON.stringify(generated.requestWitness).includes("sk-secret-never-persist"), false);
  assert.equal(generated.result.configuration.endpoint, "/v1/images/edits");
  assert.equal(generated.result.providerRequestId, "req_openai_edit_fixture");
  assert.equal(new TextDecoder().decode(generated.result.bytes), "edited-png-fixture");
});

test("OpenAI image provider rejects a non-image reference before the provider call", async () => {
  const provider = createOpenAIImageProvider({
    apiKey: "sk-fixture",
    fetchImpl: async () => { throw new Error("must not call provider"); },
  });
  await assert.rejects(
    () => provider.generate(imageRequest({
      referenceObjects:[{
        objectRef:"reference_1",
        digest:"sha256:reference",
        bytes:new TextEncoder().encode("not-an-image"),
        metadata:{ mediaType:"application/json" },
      }],
    })),
    (error) => error instanceof AssetGenerationError
      && error.phase === "validation"
      && error.category === "unsupported_capability"
      && error.retryable === false,
  );
});

test("OpenAI image provider preserves rate-limit status, request ID and retry-after", async () => {
  const provider = createOpenAIImageProvider({
    apiKey: "sk-fixture",
    fetchImpl: async () => response({
      status: 429,
      headers: {
        "x-request-id": "req_rate_limit_fixture",
        "retry-after": "3",
      },
      payload: { error: { type: "rate_limit_error", code: "rate_limit_exceeded", message: "Too many requests" } },
    }),
  });
  await assert.rejects(
    () => provider.generate(imageRequest()),
    (error) => error instanceof AssetGenerationError
      && error.phase === "provider_generation"
      && error.category === "rate_limited"
      && error.retryable === true
      && error.httpStatus === 429
      && error.providerRequestId === "req_rate_limit_fixture"
      && error.retryAfterMs === 3000,
  );
});

test("OpenAI image provider distinguishes quota exhaustion from ordinary rate limiting", async () => {
  const provider = createOpenAIImageProvider({
    apiKey: "sk-fixture",
    fetchImpl: async () => response({
      status: 429,
      payload: { error: { type: "insufficient_quota", code: "insufficient_quota", message: "Quota exhausted" } },
    }),
  });
  await assert.rejects(
    () => provider.generate(imageRequest()),
    (error) => error instanceof AssetGenerationError
      && error.category === "quota_exhausted"
      && error.retryable === false,
  );
});

test("OpenAI image provider classifies authentication, moderation and provider availability failures", async () => {
  const cases = [
    [401, { error: { message: "bad key" } }, "authentication", false],
    [400, { error: { code: "content_policy_violation", message: "safety policy" } }, "moderation_rejected", false],
    [503, { error: { message: "temporarily unavailable" } }, "provider_unavailable", true],
  ];
  for (const [status, payload, category, retryable] of cases) {
    const provider = createOpenAIImageProvider({
      apiKey: "sk-fixture",
      fetchImpl: async () => response({ status, payload }),
    });
    await assert.rejects(
      () => provider.generate(imageRequest()),
      (error) => error instanceof AssetGenerationError
        && error.category === category
        && error.retryable === retryable
        && error.httpStatus === status,
    );
  }
});

test("OpenAI image provider classifies transport failures without exposing the API secret", async () => {
  const provider = createOpenAIImageProvider({
    apiKey: "sk-secret-never-report",
    fetchImpl: async () => { throw new Error("socket reset"); },
  });
  await assert.rejects(
    () => provider.generate(imageRequest()),
    (error) => error instanceof AssetGenerationError
      && error.category === "network"
      && error.retryable === true
      && error.safeDetail.includes("socket reset")
      && !error.safeDetail.includes("sk-secret-never-report"),
  );
});

