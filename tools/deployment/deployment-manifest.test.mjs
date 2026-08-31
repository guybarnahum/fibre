import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  FIBRE_DEPLOYMENT_SCHEMA,
  normalizeDeploymentManifest,
  parseDeploymentManifest,
  parseDeploymentYaml,
  resolveServiceDeployment,
} from "./deployment-manifest.mjs";

const localManifestUrl = new URL("../../infra/deployments/environments/local.yaml", import.meta.url);

async function localManifestText() {
  return readFile(localManifestUrl, "utf8");
}

test("local deployment YAML selects runtime, InfraDriver and integrations outside Fibre services", async () => {
  const manifest = parseDeploymentManifest(await localManifestText());
  assert.equal(manifest.schema, FIBRE_DEPLOYMENT_SCHEMA);

  const assetGenerator = resolveServiceDeployment(manifest, "asset-generator");
  assert.equal(assetGenerator.runtime.provider, "cloudflare");
  assert.equal(assetGenerator.infra.driver, "cloudflare-v1");
  assert.equal(assetGenerator.integrations["openai-gpt-image-2-medium-v1"].provider, "openai");
  assert.equal(assetGenerator.integrations["openai-gpt-image-2-medium-v1"].config.model, "gpt-image-2-2026-04-21");
  assert.equal(assetGenerator.integrations.contentCredentials.provider, "c2pa-http");

  const worldKernel = resolveServiceDeployment(manifest, "world-kernel");
  assert.equal(worldKernel.runtime.provider, "local-node");
  assert.equal(worldKernel.infra.driver, "local-v1");
  assert.deepEqual(worldKernel.infra.capabilities, ["state", "scheduler"]);
  assert.equal(worldKernel.integrations.dignityGuardian.kind, "ai.reasoning");
  assert.equal(worldKernel.integrations.dignityGuardian.provider, "openai");
});

test("service deployment fails closed on an unknown integration selection", async () => {
  const value = parseDeploymentYaml(await localManifestText());
  value.services["world-kernel"].integrations.dignityGuardian = "missing-integration";
  assert.throws(() => normalizeDeploymentManifest(value), /unknown integration/);
});

test("runtime and InfraDriver selection may diverge without changing the service contract", async () => {
  const value = parseDeploymentYaml(await localManifestText());
  value.infra["future-aws"] = {
    provider: "aws",
    driver: "aws-v1",
    capabilities: ["objects", "queues", "workflows"],
  };
  value.services["asset-generator"].infra = "future-aws";

  const deployment = resolveServiceDeployment(value, "asset-generator");
  assert.equal(deployment.runtime.provider, "cloudflare");
  assert.equal(deployment.infra.provider, "aws");
  assert.equal(deployment.infra.driver, "aws-v1");
});

test("deployment YAML parser rejects indentation and duplicate keys", () => {
  assert.throws(() => parseDeploymentYaml("schema: fibre-deployment\n environment: local\n"), /two-space indentation/);
  assert.throws(() => parseDeploymentYaml("schema: fibre-deployment\nschema: fibre-deployment\n"), /duplicates key schema/);
});
