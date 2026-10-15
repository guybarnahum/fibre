import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  acceptWorldSchemaDeployment,
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
  assert.equal(normalizeService("fibre-identity-authority"), "fibre-identity-authority");
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
  assert.equal(prepared.config.vars.FIBRE_ACTIVITY_ENV, "staging");
  assert.equal(prepared.config.vars.FIBRE_DEPLOYMENT_GIT_SHA, SHA);
  assert.equal(prepared.config.d1_databases[0].database_name, "fibre-activity-log-staging");
  assert.equal(original.vars.FIBRE_DEPLOYMENT_GIT_SHA, "b".repeat(40));
  assert.throws(() => prepareResolvedServiceConfig(resolvedConfig("fibre-world-kernel"), {
    environment: "staging",
    service: "world-kernel",
    gitSha: SHA,
  }), /does not target staging/);
});

test("service deploy re-resolves current source config without provisioning", async () => {
  const repoRoot = mkdtempSync(join(tmpdir(), "fibre-service-deploy-"));
  const calls = [];
  const writes = [];

  try {
    const result = await deployCloudflareService({
      repoRoot,
      environment: "staging",
      service: "world-kernel",
      async resolveSource() { return SHA; },
      async resolveConfig() {
        calls.push(["resolve-current"]);
        const config = resolvedConfig();
        config.migrations = [{ tag:"new-do", new_sqlite_classes:["NewDurableObject"] }];
        return {
          sourceConfigPath:"infra/deployments/world-kernel/cloudflare/wrangler.jsonc",
          config,
        };
      },
      async writeFileImpl(path, content) {
        writes.push([path, JSON.parse(content)]);
      },
      async ensureD1MigrationsImpl({ databases }) {
        calls.push(["migrate", databases]);
      },
      async acceptWorldSchemaImpl(){
        calls.push(["world-schema"]);
        return {ok:true};
      },
      print() {},
      async runner(args, options) {
        calls.push(["wrangler", args, options]);
        return { stdout: "deployed", stderr: "" };
      },
    });

    assert.equal(result.sourceGitSha, SHA);
    assert.equal(result.workerName, "fibre-world-kernel-staging");
    assert.deepEqual(calls[0], ["resolve-current"]);
    assert.equal(writes.length, 1);
    assert.deepEqual(writes[0][1].migrations, [{ tag:"new-do", new_sqlite_classes:["NewDurableObject"] }]);
    assert.equal(writes[0][1].vars.FIBRE_ACTIVITY_ENV, "staging");
    assert.equal(writes[0][1].vars.FIBRE_DEPLOYMENT_GIT_SHA, SHA);
    const migrateIndex = calls.findIndex((entry) => entry[0] === "migrate");
    const wranglerIndex = calls.findIndex((entry) => entry[0] === "wrangler");
    const worldIndex=calls.findIndex(entry=>entry[0]==="world-schema");
    assert.ok(worldIndex>wranglerIndex,"World schema installation must follow deployment");
    assert.ok(migrateIndex >= 0 && migrateIndex < wranglerIndex, "D1 migrations must complete before Worker deploy");
    assert.deepEqual(calls[migrateIndex][1], [{ binding:"ACTIVITY_LOG", name:"fibre-activity-log-staging" }]);
    const wrangler = calls[wranglerIndex];
    assert.deepEqual(wrangler[1].slice(0, 1), ["deploy"]);
    assert.ok(wrangler[1].includes("--experimental-provision=false"));
    assert.ok(wrangler[1].includes("--experimental-auto-create=false"));
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});


test("targeted Birth Center deploy runs state migration and runtime acceptance after Worker deploy", async () => {
  const repoRoot = mkdtempSync(join(tmpdir(), "fibre-birth-service-deploy-"));
  const calls = [];

  try {
    const birthConfig = resolvedConfig("fibre-birth-center-staging");
    birthConfig.main = "../../../../infra/deployments/birth-center/cloudflare/worker.mjs";
    birthConfig.d1_databases = [];

    const result = await deployCloudflareService({
      repoRoot,
      environment:"staging",
      service:"birth-center",
      async resolveSource() { return SHA; },
      async resolveConfig() {
        return {
          sourceConfigPath:"infra/deployments/birth-center/cloudflare/wrangler.jsonc",
          config:birthConfig,
        };
      },
      async writeFileImpl() {},
      async ensureD1MigrationsImpl() { calls.push("d1"); },
      async runner(args) {
        calls.push(`wrangler:${args[0]}`);
        return { stdout:"Published https://fibre-birth-center-staging.account.workers.dev", stderr:"" };
      },
      async acceptBirthCenterImpl({ deploymentOutput }) {
        calls.push("birth-migrate-and-accept");
        assert.match(deploymentOutput, /fibre-birth-center-staging/u);
        return {
          baseUrl:"https://fibre-birth-center-staging.account.workers.dev",
          migration:{ fromVersion:0, toVersion:2, applied:[1,2] },
          stateHealth:{ ok:true, service:"birth-center", stateChecked:true },
          runtimeAcceptance:{ ok:true, status:404 },
        };
      },
      print() {},
    });

    assert.deepEqual(calls, ["d1","wrangler:deploy","birth-migrate-and-accept"]);
    assert.equal(result.birthCenterAcceptance.migration.toVersion, 2);
    assert.equal(result.birthCenterAcceptance.runtimeAcceptance.status, 404);
  } finally {
    rmSync(repoRoot, { recursive:true, force:true });
  }
});

test("World schema deployment waits for the installed route, not just the Worker upload", async()=>{
  let requests=0;
  const result=await acceptWorldSchemaDeployment({
    prepared:{config:resolvedConfig()},
    deploymentOutput:"Published https://fibre-world-kernel-staging.example.workers.dev",
    privateToken:"test-token",
    fetchImpl:async(url,init)=>{
      assert.equal(url.pathname,"/internal/world-schema/migrate");
      assert.equal(init.method,"POST");
      assert.equal(init.headers["x-fibre-private-token"],"test-token");
      requests++;
      return requests===1
        ?Response.json({error:"not_found"},{status:404})
        :Response.json({ok:true,contract:"fibre-world-schema-installed-v1",deploymentGitSha:"b".repeat(40)});
    },
    wait:async()=>{},
  });
  assert.equal(requests,2);
  assert.equal(result.ok,true);
});

test("World schema installation cannot be acknowledged by an older Worker revision",async()=>{
  let attempts=0;
  const result=await acceptWorldSchemaDeployment({
    prepared:{config:resolvedConfig()},
    deploymentOutput:"Published https://fibre-world-kernel-staging.example.workers.dev",
    privateToken:"test-token",
    fetchImpl:async()=>{
      attempts++;
      return Response.json({
        ok:true,contract:"fibre-world-schema-installed-v1",
        deploymentGitSha:attempts===1?"a".repeat(40):"b".repeat(40),
      });
    },
    wait:async()=>{},
  });
  assert.equal(attempts,2,"stale World revision acknowledged new schema");
  assert.equal(result.deploymentGitSha,"b".repeat(40));
});

test("World schema deployment rejects a route that never becomes available",async()=>{
  await assert.rejects(
    acceptWorldSchemaDeployment({
      prepared:{config:resolvedConfig()},
      deploymentOutput:"Published https://fibre-world-kernel-staging.example.workers.dev",
      privateToken:"test-token",
      fetchImpl:async()=>Response.json({error:"not_found"},{status:404}),
      wait:async()=>{},
    }),
    /World schema installation at .* HTTP 404:.*not_found/u,
  );
});
