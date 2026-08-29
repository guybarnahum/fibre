import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  FIBRE_DEPLOYMENT_VERSION,
  normalizeDeploymentManifest,
  resolveServiceDeployment,
} from "./deployment-manifest.mjs";

const localManifestUrl = new URL("../../infra/deployments/environments/local.json", import.meta.url);

async function localManifest() {
  return JSON.parse(await readFile(localManifestUrl, "utf8"));
}

test("local deployment selects Cloudflare without putting provider choice inside Fibre services", async () => {
  const manifest = normalizeDeploymentManifest(await localManifest());
  assert.equal(manifest.deploymentVersion, FIBRE_DEPLOYMENT_VERSION);

  const assetGenerator = resolveServiceDeployment(manifest, "asset-generator");
  assert.equal(assetGenerator.runtime.platform, "cloudflare");
  assert.equal(assetGenerator.infra.infraDriver, "cloudflare-v1");
  assert.deepEqual(assetGenerator.requires, ["objects", "queues", "workflows"]);

  const presentation = resolveServiceDeployment(manifest, "thread-presentation");
  assert.equal(presentation.infra.providerId, "cloudflare-local");
  assert.equal(presentation.requires.includes("streams"), true);
  assert.equal(presentation.requires.includes("realtime"), true);
});

test("service deployment fails closed when the selected InfraDriver lacks a required capability", async () => {
  const value = await localManifest();
  value.providers["cloudflare-local"].capabilities = value.providers["cloudflare-local"].capabilities
    .filter((capability) => capability !== "queues");
  assert.throws(() => normalizeDeploymentManifest(value), /requires queues/);
});

test("runtime and InfraDriver provider selection may diverge without changing the service contract", async () => {
  const value = await localManifest();
  value.providers["future-aws"] = {
    platform: "aws",
    infraDriver: "aws-v1",
    capabilities: ["objects", "queues", "workflows"],
  };
  value.services["asset-generator"].infra = "future-aws";

  const deployment = resolveServiceDeployment(value, "asset-generator");
  assert.equal(deployment.runtime.platform, "cloudflare");
  assert.equal(deployment.infra.platform, "aws");
  assert.equal(deployment.infra.infraDriver, "aws-v1");
});
