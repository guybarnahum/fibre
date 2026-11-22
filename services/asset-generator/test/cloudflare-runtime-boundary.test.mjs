import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import {
  parseDeploymentManifest,
  resolveServiceDeployment,
} from "../../../infra/deployments/manifest.mjs";

const REPO_ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const CLOUDFLARE_RUNTIME_PATTERN = /cloudflare:workers|@cloudflare\/|WorkflowEntrypoint|NonRetryableError|\bDurableObject\b|\bwrangler\b/;

async function collectMjsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectMjsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".mjs")) {
      files.push(full);
    }
  }
  return files;
}

test("domain source under core/src and services/*/src stays free of direct Cloudflare runtime dependencies", async () => {
  const roots = [join(REPO_ROOT, "core/src")];
  const serviceEntries = await readdir(join(REPO_ROOT, "services"), { withFileTypes: true });
  for (const entry of serviceEntries) {
    if (!entry.isDirectory()) continue;
    const srcDir = join(REPO_ROOT, "services", entry.name, "src");
    try {
      await readdir(srcDir);
      roots.push(srcDir);
    } catch {
      // Service has no src/ directory.
    }
  }

  const violations = [];
  for (const root of roots) {
    for (const file of await collectMjsFiles(root)) {
      const source = await readFile(file, "utf8");
      if (CLOUDFLARE_RUNTIME_PATTERN.test(source)) {
        violations.push(relative(REPO_ROOT, file));
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    `domain source must remain portable without direct Cloudflare runtime bindings: ${violations.join(", ")}`,
  );
});

test("Asset Generator and Thread Presentation Cloudflare composition share canonical storage and completion queue", async () => {
  const manifest = parseDeploymentManifest(
    await readFile(join(REPO_ROOT, "infra/deployments/environments/cloudflare.yaml"), "utf8"),
  );
  const assetConfig = JSON.parse(
    await readFile(join(REPO_ROOT, "infra/deployments/asset-generator/cloudflare/wrangler.jsonc"), "utf8"),
  );
  const presentationConfig = JSON.parse(
    await readFile(join(REPO_ROOT, "infra/deployments/thread-presentation/cloudflare/wrangler.jsonc"), "utf8"),
  );

  const assetDeployment = resolveServiceDeployment(manifest, "asset-generator");
  const presentationDeployment = resolveServiceDeployment(manifest, "thread-presentation");
  assert.equal(assetDeployment.infra.provider, "cloudflare");
  assert.equal(presentationDeployment.infra.provider, "cloudflare");

  const assetBucket = assetConfig.r2_buckets.find((b) => b.binding === "ASSET_OBJECTS");
  const presentationBucket = presentationConfig.r2_buckets.find((b) => b.binding === "PRESENTATION_OBJECTS");
  assert.equal(assetBucket.bucket_name, presentationBucket.bucket_name, "asset and presentation workers must share one object bucket");

  const producer = assetConfig.queues.producers.find((b) => b.binding === "ASSET_COMPLETIONS");
  const consumer = presentationConfig.queues.consumers.find((b) => b.queue === producer.queue);
  assert.ok(consumer, "thread-presentation must consume the asset completion queue produced by asset-generator");
  assert.equal(presentationConfig.vars?.P3_FIXTURE_MODE, undefined, "production presentation config must never enable fixture mode");
});
