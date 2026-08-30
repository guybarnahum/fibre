import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  parseDeploymentManifest,
  resolveServiceDeployment,
} from "../manifest.mjs";
import {
  selectContentCredentialIntegration,
  selectImageIntegration,
  selectReasoningIntegration,
} from "../integration-selection.mjs";

const local = parseDeploymentManifest(
  readFileSync(new URL("../environments/local.yaml", import.meta.url), "utf8"),
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

test("deployment composition constructs selected image integrations", () => {
  const assetGenerator = resolveServiceDeployment(local, "asset-generator");
  const openai = selectImageIntegration(assetGenerator.integrations["openai-gpt-image-2-medium-v1"], {
    environment: { OPENAI_API_KEY: "test-openai-key" },
    fetchImpl: async () => { throw new Error("not called"); },
  });
  const bfl = selectImageIntegration(assetGenerator.integrations["bfl-flux-2-pro-v1"], {
    environment: { BFL_API_KEY: "test-bfl-key" },
    fetchImpl: async () => { throw new Error("not called"); },
  });
  assert.equal(openai.providerId, "openai-image-v1");
  assert.equal(bfl.providerId, "bfl-flux-image-v1");
});

test("deployment composition constructs selected content credential client", () => {
  const assetGenerator = resolveServiceDeployment(local, "asset-generator");
  const signer = selectContentCredentialIntegration(assetGenerator.integrations.contentCredentials, {
    environment: {
      C2PA_SIGNER_URL: "http://127.0.0.1:8790",
      C2PA_SIGNER_ID: "fibre-c2pa-node-local-v1",
      C2PA_TRUST_POLICY: "development_signature_only",
    },
    fetchImpl: async () => { throw new Error("not called"); },
  });
  assert.equal(signer.signerId, "fibre-c2pa-node-local-v1");
  assert.equal(signer.trustPolicy, "development_signature_only");
});
