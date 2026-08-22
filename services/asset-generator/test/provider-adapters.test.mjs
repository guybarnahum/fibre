import test from "node:test";
import assert from "node:assert/strict";

import { createHttpContentCredentialSigner } from "../src/http-content-credential-signer.mjs";
import { createOpenAIImageProvider } from "../src/providers/openai-image-provider.mjs";

const encoder = new TextEncoder();

test("OpenAI image provider preserves exact request witness without API secret", async () => {
  const seen = [];
  const provider = createOpenAIImageProvider({
    apiKey: "sk-secret-never-persist",
    fetchImpl: async (url, init) => {
      seen.push({ url, init });
      return {
        ok: true,
        status: 200,
        headers: { get(name) { return name.toLowerCase() === "x-request-id" ? "req_openai_fixture" : null; } },
        async json() {
          return {
            created: 1787364000,
            data: [{ b64_json: btoa("png-fixture") }],
          };
        },
      };
    },
  });
  const generated = await provider.generate({
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
  });
  assert.equal(generated.requestWitness.body.model, "gpt-image-2-2026-04-21");
  assert.equal(generated.requestWitness.body.output_format, "png");
  assert.match(generated.requestWitness.body.prompt, /Not documentary evidence/);
  assert.equal(JSON.stringify(generated.requestWitness).includes("sk-secret-never-persist"), false);
  assert.equal(seen[0].init.headers.Authorization, "Bearer sk-secret-never-persist");
  assert.equal(generated.result.providerRequestId, "req_openai_fixture");
  assert.equal(new TextDecoder().decode(generated.result.bytes), "png-fixture");
});

test("OpenAI image provider refuses reference objects until an edit-capable profile exists", async () => {
  const provider = createOpenAIImageProvider({
    apiKey: "sk-fixture",
    fetchImpl: async () => { throw new Error("must not call provider"); },
  });
  await assert.rejects(
    () => provider.generate({
      assetKind: "image",
      role: "place",
      variant: "default",
      brief: { description: "A place.", constraints: [] },
      inputReferences: ["presentation_1"],
      referenceObjects: [{ objectRef: "reference_1" }],
      providerProfile: "fixture",
      context: {},
    }),
    /does not yet accept reference objects/,
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
        return {
          ok: true,
          status: 200,
          async json() {
            return {
              bytesBase64: btoa("signed-bytes"),
              format: "c2pa",
              signerId: "fibre-c2pa-node-local-v1",
              manifestDigest: "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
              embeddedAt: "2026-08-22T01:00:01Z",
            };
          },
        };
      }
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            valid: true,
            format: "c2pa",
            signerId: "fibre-c2pa-node-local-v1",
            manifestDigest: "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
            assertion,
            verifiedAt: "2026-08-22T01:00:02Z",
            failureReason: null,
          };
        },
      };
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
