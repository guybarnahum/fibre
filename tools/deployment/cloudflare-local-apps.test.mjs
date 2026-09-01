import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { parseJsonc, repoRootFrom } from "./cloudflare-operator.mjs";

const repoRoot = repoRootFrom(import.meta.url);
const CONFIG_PATHS = Object.freeze({
  admin: "infra/deployments/admin-dashboard/cloudflare/wrangler.local.jsonc",
  status: "infra/deployments/status-page/cloudflare/wrangler.local.jsonc",
  birth: "infra/deployments/birth-center/cloudflare/wrangler.local.jsonc",
  world: "infra/deployments/world-kernel/cloudflare/wrangler.local.jsonc",
  presentation: "infra/deployments/thread-presentation/cloudflare/wrangler.local.jsonc",
  asset: "infra/deployments/asset-generator/cloudflare/wrangler.local.jsonc",
});

async function loadLocalConfigs() {
  const configs = {};
  for (const [id, path] of Object.entries(CONFIG_PATHS)) {
    configs[id] = parseJsonc(await readFile(resolve(repoRoot, path), "utf8"), path);
  }
  return configs;
}

function activityBinding(config) {
  return (config.d1_databases ?? []).find((database) => database.binding === "ACTIVITY_LOG");
}

test("local Cloudflare runtime and Admin configs share one derived Activity Log D1", async () => {
  const configs = await loadLocalConfigs();
  const participants = [configs.birth, configs.world, configs.presentation, configs.asset, configs.admin];
  const bindings = participants.map(activityBinding);
  assert.ok(bindings.every(Boolean));
  assert.equal(new Set(bindings.map((binding) => binding.database_name)).size, 1);
  assert.equal(new Set(bindings.map((binding) => binding.database_id)).size, 1);
  assert.equal(bindings[0].database_name, "fibre-activity-log-local");
  assert.equal(configs.status.d1_databases, undefined);
  assert.equal(activityBinding(configs.presentation).binding, "ACTIVITY_LOG");
  assert.equal((configs.presentation.d1_databases ?? []).find((database) => database.binding === "PRESENTATION_CATALOG").database_name, "fibre-presentation-local");
});

test("local Status bindings target the exact local runtime Worker names", async () => {
  const configs = await loadLocalConfigs();
  const targets = Object.fromEntries(configs.status.services.map((service) => [service.binding, service.service]));
  assert.deepEqual(targets, {
    BIRTH_CENTER: configs.birth.name,
    WORLD_KERNEL: configs.world.name,
    THREAD_PRESENTATION: configs.presentation.name,
    ASSET_GENERATOR: configs.asset.name,
  });
  assert.equal(configs.status.vars.FIBRE_ENVIRONMENT, "local");
  assert.equal(configs.status.vars.VIEWER_ORIGIN, "http://127.0.0.1:5173");
});

test("local Admin keeps the production authentication boundary instead of defining a bypass", async () => {
  const { admin } = await loadLocalConfigs();
  assert.equal(admin.vars.FIBRE_ENVIRONMENT, "local");
  assert.equal(Object.hasOwn(admin.vars, "FIBRE_ACCESS_BYPASS"), false);
  assert.equal(Object.hasOwn(admin.vars, "ADMIN_AUTH_DISABLED"), false);
  assert.equal(admin.routes, undefined);
  assert.equal(activityBinding(admin).binding, "ACTIVITY_LOG");
});
