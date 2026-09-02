import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import test from "node:test";

import {
  CLOUDFLARE_SERVICE_CONFIGS,
  loadCloudflareWranglerConfigs,
  parseJsonc,
  writeResolvedWranglerConfigs,
} from "./cloudflare-operator.mjs";
import {
  CLOUDFLARE_APP_CONFIGS,
  loadCloudflareAppConfigs,
  writeResolvedCloudflareAppConfigs,
} from "./cloudflare-apps.mjs";

const sourceRoot = resolve(new URL("../..", import.meta.url).pathname);
const resourceState = Object.freeze({
  resources: Object.freeze({
    d1: Object.freeze([
      Object.freeze({
        binding: "PRESENTATION_CATALOG",
        name: "fibre-presentation-catalog-staging",
        id: "d1-catalog",
      }),
      Object.freeze({
        binding: "ACTIVITY_LOG",
        name: "fibre-activity-log-staging",
        id: "d1-activity",
      }),
    ]),
  }),
});

function resolvedMain(repoRoot, generatedConfigPath, config) {
  return resolve(dirname(resolve(repoRoot, generatedConfigPath)), config.main);
}

test("generated runtime Wrangler configs retain source Worker entry points", async () => {
  const repoRoot = await mkdtemp(resolve(tmpdir(), "fibre-wrangler-main-runtime-"));
  try {
    const configs = await loadCloudflareWranglerConfigs(sourceRoot);
    const written = await writeResolvedWranglerConfigs({
      repoRoot,
      environment: "staging",
      configs,
      resourceState,
    });

    for (const [serviceId, generatedConfigPath] of Object.entries(written)) {
      const generated = parseJsonc(
        await readFile(resolve(repoRoot, generatedConfigPath), "utf8"),
        generatedConfigPath,
      );
      const expected = resolve(
        repoRoot,
        dirname(CLOUDFLARE_SERVICE_CONFIGS[serviceId]),
        configs[serviceId].main,
      );
      assert.equal(resolvedMain(repoRoot, generatedConfigPath, generated), expected);
      assert.notEqual(generated.main, "./worker.mjs");
    }
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("generated Admin and Status Wrangler configs retain source Worker entry points", async () => {
  const repoRoot = await mkdtemp(resolve(tmpdir(), "fibre-wrangler-main-apps-"));
  try {
    const configs = await loadCloudflareAppConfigs(sourceRoot);
    const written = await writeResolvedCloudflareAppConfigs({
      repoRoot,
      environment: "staging",
      configs,
      resourceState,
      accessConfig: {
        teamDomain: "https://fibre.cloudflareaccess.com",
        audience: "audience-tag",
      },
    });

    for (const [appId, generatedConfigPath] of Object.entries(written)) {
      const generated = parseJsonc(
        await readFile(resolve(repoRoot, generatedConfigPath), "utf8"),
        generatedConfigPath,
      );
      const expected = resolve(
        repoRoot,
        dirname(CLOUDFLARE_APP_CONFIGS[appId]),
        configs[appId].main,
      );
      assert.equal(resolvedMain(repoRoot, generatedConfigPath, generated), expected);
      assert.notEqual(generated.main, "./worker.mjs");
    }
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});
