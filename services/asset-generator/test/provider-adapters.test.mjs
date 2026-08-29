import test from "node:test";
import assert from "node:assert/strict";

import { createHttpContentCredentialSigner } from "../../../integrations/content-credentials/c2pa-http-signer.mjs";
import { createOpenAIImageProvider } from "../../../integrations/ai/image/openai.mjs";
import { AssetGenerationError } from "../src/asset-generation-error.mjs";

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

test("OpenAI image provider refuses reference objects as unsupported capability before any provider call", async () => {
  const provider = createOpenAIImageProvider({
    apiKey: "sk-fixture",
    fetchImpl: async () => { throw new Error("must not call provider"); },
  });
  await assert.rejects(
    () => provider.generate(imageRequest({ referenceObjects: [{ objectRef: "reference_1" }] })),
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

test("HTTP content credential signer maps portable embed and verify responses", async () => {
  const calls = [];
  const assertion = {
    schemaVersion: "fibre-embedded-asset-provenance-v0.1",
    provenanceClass: "generated_reconstruction",
    assetKind: "image",
    role: "place",
    variant: "default",
    generationRecordDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    semanticBriefDigest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    providerRequestDigest: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    providerOutputDigest: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    provider: "openai",
    model: "gpt-image-2-2026-04-21",
    generatedAt: "2026-08-22T01:00:00Z",
    promptDisclosure: {
      mode: "digest_only",
      authorizationRef: null,
      semanticBrief: null,
      providerRequest: null,
    },
  };
  const signer = createHttpContentCredentialSigner({
    baseUrl: "http://127.0.0.1:8790/",
    fetchImpl: async (url, init) => {
      const body = JSON.parse(init.body);
      calls.push({ url, body });
      if (url.endsWith("/embed")) {
        return response({
          status: 200,
          payload: {
            bytesBase64: btoa("signed-bytes"),
            format: "c2pa",
            signerId: "fibre-c2pa-node-local-v1",
            manifestDigest: "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
            embeddedAt: "2026-08-22T01:00:01Z",
          },
        });
      }
      return response({
        status: 200,
        payload: {
          valid: true,
          format: "c2pa",
          signerId: "fibre-c2pa-node-local-v1",
          manifestDigest: "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
          assertion,
          verifiedAt: "2026-08-22T01:00:02Z",
          failureReason: null,
        },
      });
    },
  });
  const embedded = await signer.embed({ bytes: encoder.encode("raw"), mediaType: "image/png", assertion });
  assert.equal(new TextDecoder().decode(embedded.bytes), "signed-bytes");
  const verification = await signer.verify({ bytes: embedded.bytes, mediaType: "image/png" });
  assert.equal(verification.valid, true);
  assert.deepEqual(verification.assertion, assertion);
  assert.equal(calls[0].url, "http://127.0.0.1:8790/embed");
  assert.equal(calls[1].url, "http://127.0.0.1:8790/verify");
});

test("HTTP content credential signer preserves phase and transient service status", async () => {
  const signer = createHttpContentCredentialSigner({
    baseUrl: "http://127.0.0.1:8790/",
    fetchImpl: async () => response({
      status: 503,
      headers: { "retry-after": "2" },
      payload: { error: "signer unavailable" },
    }),
  });
  await assert.rejects(
    () => signer.embed({
      bytes: encoder.encode("raw"),
      mediaType: "image/png",
      assertion: {
        schemaVersion: "fibre-embedded-asset-provenance-v0.1",
        provenanceClass: "generated_reconstruction",
        assetKind: "image",
        role: "place",
        variant: "default",
        generationRecordDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        semanticBriefDigest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        providerRequestDigest: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        providerOutputDigest: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        provider: "openai",
        model: "fixture",
        generatedAt: "2026-08-22T01:00:00Z",
        promptDisclosure: { mode: "digest_only", authorizationRef: null, semanticBrief: null, providerRequest: null },
      },
    }),
    (error) => error instanceof AssetGenerationError
      && error.phase === "credential_signing"
      && error.category === "provider_unavailable"
      && error.retryable === true
      && error.httpStatus === 503
      && error.retryAfterMs === 2000,
  );
});
