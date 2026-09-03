import assert from "node:assert/strict";
import test from "node:test";

import {
  deployCloudflareService,
  normalizeService,
  prepareResolvedServiceConfig,
} from "./deploy-cloudflare-service.mjs";

const SHA = "a".repeat(40);

function resolvedConfig(name = "fibre-world-kernel-staging") {
  return {
    name,
    main: "../../../../infra/deployments/world-kernel/cloudflare/worker.mjs",
    vars: {
      FIBRE_DEPLOYMENT_ENV: "cloudflare",
      FIBRE_DEPLOYMENT_GIT_SHA: "b".repeat(40),
    },
    d1_databases: [{ binding: "ACTIVITY_LOG", database_name: "fibre-activity-log-staging", database_id: "db-1" }],
  };
}

test("Cloudflare service deploy accepts only managed Fibre services", () => {
  assert.equal(normalizeService("world-kernel"), "world-kernel");
  assert.throws(() => normalizeService("admin-dashboard"), /unsupported Cloudflare service/);
});

test("service deploy preserves resolved bindings and stamps the exact source SHA", () => {
  const original = resolvedConfig();
  const prepared = prepareResolvedServiceConfig(original, {
    environment: "staging",
    service: "world-kernel",
    gitSha: SHA,
  });
  assert.equal(prepared.workerName, "fibre-world-kernel-staging");
  assert.equal(prepared.config.vars.FIBRE_DEPLOYMENT_GIT_SHA, SHA);
  assert.equal(prepared.config.d1_databases[0].database_name, "fibre-activity-log-staging");
  assert.equal(original.vars.FIBRE_DEPLOYMENT_GIT_SHA, "b".repeat(40));
  assert.throws(() => prepareResolvedServiceConfig(resolvedConfig("fibre-world-kernel"), {
    environment: "staging",
    service: "world-kernel",
    gitSha: SHA,
  }), /does not target staging/);
});

test("service deploy uses the resolved environment config without provisioning", async () => {
  const calls = [];
  const writes = [];
  const result = await deployCloudflareService({
    repoRoot: "/repo",
    environment: "staging",
    service: "world-kernel",
    async resolveSource() { return SHA; },
    async readFileImpl(path) {
      calls.push(["read", path]);
      return JSON.stringify(resolvedConfig());
    },
    async writeFileImpl(path, content) {
      writes.push([path, JSON.parse(content)]);
    },
    async runner(args, options) {
      calls.push(["wrangler", args, options]);
      return { stdout: "deployed", stderr: "" };
    },
  });

  assert.equal(result.sourceGitSha, SHA);
  assert.equal(result.workerName, "fibre-world-kernel-staging");
  assert.match(calls[0][1], /\.fibre\/cloudflare\/staging\/wrangler\/world-kernel\.jsonc$/);
  assert.equal(writes.length, 1);
  assert.equal(writes[0][1].vars.FIBRE_DEPLOYMENT_GIT_SHA, SHA);
  const wrangler = calls.find((entry) => entry[0] === "wrangler");
  assert.deepEqual(wrangler[1].slice(0, 1), ["deploy"]);
  assert.ok(wrangler[1].includes("--experimental-provision=false"));
  assert.ok(wrangler[1].includes("--experimental-auto-create=false"));
});
