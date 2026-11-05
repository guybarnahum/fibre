import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  parseDeploymentManifest,
  resolveServiceDeployment,
} from "../manifest.mjs";
import {
  selectImageIntegration,
  selectImageProviderProfile,
  selectImageProviderRoute,
  lazyReasoningIntegration,
  meteredReasoningIntegration,
  selectReasoningIntegration,
} from "../integration-selection.mjs";
import { assertExpressionModelAdapter } from "../../../services/world-kernel/src/guardian-model-adapter.mjs";

const local = parseDeploymentManifest(
  readFileSync(new URL("../environments/local.yaml", import.meta.url), "utf8"),
);
const cloudflare = parseDeploymentManifest(
  readFileSync(new URL("../environments/cloudflare.yaml", import.meta.url), "utf8"),
);

test("deployment composition constructs selected reasoning integration", () => {
  const worldKernel = resolveServiceDeployment(local, "world-kernel");
  const adapter = selectReasoningIntegration(worldKernel.integrations.dignityGuardian, {
    environment: { OPENAI_API_KEY: "test-openai-key" },
    fetchImpl: async () => { throw new Error("not called"); },
  });
  assert.equal(adapter.provider, "openai");
  assert.equal(adapter.modelId, "gpt-5.1-2025-11-13");
});

test("deployed social meeting adapter can stream live speech before secrets are read", () => {
  const worldKernel = resolveServiceDeployment(cloudflare, "world-kernel");
  let constructed = false;
  const adapter = lazyReasoningIntegration(worldKernel.integrations.encounter, {
    environment: new Proxy({}, { get: () => { constructed = true; return undefined; } }),
  });
  assert.doesNotThrow(() => assertExpressionModelAdapter(adapter),
    "live conversation cannot speak with the deployed meeting adapter");
  assert.equal(constructed, false, "meeting adapter read secrets before first cognition");
});

test("deployment composition constructs selected image integrations", () => {
  const assetGenerator = resolveServiceDeployment(local, "asset-generator");
  const openai = selectImageIntegration(assetGenerator.integrations["openai-gpt-image-2-medium-v1"], {
    environment: { OPENAI_API_KEY: "test-openai-key" },
    fetchImpl: async () => { throw new Error("not called"); },
  });
  assert.equal(openai.providerId, "openai-image-v1");
});

test("presentation image profile selection is deployment-owned and reference-aware", () => {
  for (const manifest of [local, cloudflare]) {
    const assetGenerator = resolveServiceDeployment(manifest, "asset-generator");
    assert.equal(
      selectImageProviderProfile(assetGenerator, { requiresReferenceObjects: false }),
      "openai-gpt-image-2-medium-v1",
    );
    assert.equal(
      selectImageProviderProfile(assetGenerator, { requiresReferenceObjects: true }),
      "openai-gpt-image-2-medium-v1",
    );
    assert.equal(assetGenerator.integrations["openai-gpt-image-2-medium-v1"].config.acceptsReferenceObjects, true);
    assert.deepEqual(Object.keys(assetGenerator.integrations), ["openai-gpt-image-2-medium-v1"],
      "BFL is still selectable in Fibre image generation");
    assert.equal(assetGenerator.integrations["openai-gpt-image-2-medium-v1"].config.presentationReferenceDefault, true);
  }
});

test("Fibre image generation uses OpenAI alone, without a BFL fallback", () => {
  for (const manifest of [local, cloudflare]) {
    const assetGenerator = resolveServiceDeployment(manifest, "asset-generator");

    for (const requiresReferenceObjects of [false,true]) {
      const route = selectImageProviderRoute(assetGenerator, {
        primaryProfile:"openai-gpt-image-2-medium-v1",
        requiresReferenceObjects,
      });
      assert.equal(route.selectedProfile, "openai-gpt-image-2-medium-v1");
      assert.equal(route.secondaryProfile, null, "BFL fallback is still enabled");
    }
    assert.throws(
      () => selectImageProviderRoute(assetGenerator, {
        primaryProfile:"openai-gpt-image-2-medium-v1",
        requiresReferenceObjects:true,
        mode:"secondary",
      }),
      /has no secondary provider profile/,
      "a secondary image provider was unexpectedly available",
    );
    assert.throws(
      () => selectImageProviderRoute(assetGenerator, {
        primaryProfile:"bfl-flux-2-pro-v1",
        requiresReferenceObjects:true,
      }),
      /has no ai.image provider profile/,
      "BFL must not be available to new image jobs",
    );
  }
});

test("reference-aware profile selection fails closed when deployment has no capable image profile", () => {
  const assetGenerator = resolveServiceDeployment(local, "asset-generator");
  const openai = assetGenerator.integrations["openai-gpt-image-2-medium-v1"];
  const incapable = {
    ...assetGenerator,
    integrations:Object.freeze({
      "text-only-image-v1":Object.freeze({
        ...openai,
        config:Object.freeze({
          ...openai.config,
          acceptsReferenceObjects:false,
          presentationReferenceDefault:false,
        }),
      }),
    }),
  };
  assert.throws(
    () => selectImageProviderProfile(incapable, { requiresReferenceObjects: true }),
    /no image profile capable of reference objects/,
  );
});


test("each World model call reports its cognitive job and prompt-cache reuse without changing cognition", async () => {
  const lines = [];
  const provenance = { modelId:"gpt-test", usage:{ inputTokens:5000, cachedInputTokens:4096, outputTokens:40 } };
  const adapter = meteredReasoningIntegration({
    provider:"openai", modelId:"gpt-test", configuration:{},
    invoke:async () => ({ output:{ decision:"silent" }, provenance }),
    async *streamExpression() {
      yield { type:"expression_delta", text:"Hello." };
      yield { type:"expression_complete", provenance };
    },
  }, { port:"encounter", log:(line) => lines.push(JSON.parse(line)) });
  assertExpressionModelAdapter(adapter);

  const hash = "a".repeat(64);
  assert.deepEqual((await adapter.invoke({ clientRequestId:`interior_social-initiation_${hash.slice(0, 24)}` })).output,
    { decision:"silent" }, "metering changed what the Thread decided");
  const spoken = [];
  for await (const event of adapter.streamExpression({ clientRequestId:`social-live-turn_${hash}` })) spoken.push(event.type);
  assert.deepEqual(spoken, ["expression_delta", "expression_complete"], "metering changed what the Thread said");

  assert.deepEqual(lines.map(({ kind, port, cachedInputTokens }) => ({ kind, port, cachedInputTokens })), [
    { kind:"interior_social-initiation", port:"encounter", cachedInputTokens:4096 },
    { kind:"social-live-turn", port:"encounter", cachedInputTokens:4096 },
  ], "model cost was not attributable to its cognitive job");
});
