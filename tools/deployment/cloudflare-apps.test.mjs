import test from "node:test";
import assert from "node:assert/strict";

import {
  CLOUDFLARE_APP_DEPLOY_ORDER,
  acceptCloudflareAppRevision,
  createWranglerAppDeploymentClient,
  cloudflareAppDomain,
  resolveCloudflareAppConfig,
  selectedCloudflareApps,
  validateResolvedCloudflareAppConfig,
} from "./cloudflare-apps.mjs";

const state = {
  resources: {
    d1: [
      { binding: "PRESENTATION_CATALOG", name: "fibre-presentation-catalog-staging", id: "d1_catalog" },
      { binding: "ACTIVITY_LOG", name: "fibre-activity-log-staging", id: "d1_activity" },
    ],
    r2: [
      { name:"fibre-presentation-assets-staging", status:"existing" },
    ],
  },
};

const access = {
  teamDomain: "https://fibre.cloudflareaccess.com",
  audience: "audience-tag",
};

const operatorConfig = { GEONAMES_USERNAME:"fibre-test" };

function statusBase() {
  return {
    name: "fibre-status-page",
    routes: [{ pattern: "status.insidefibre.com", custom_domain: true }],
    vars: { FIBRE_ENVIRONMENT: "production", VIEWER_ORIGIN: "https://insidefibre.com" },
    services: [
      { binding: "BIRTH_CENTER", service: "fibre-birth-center" },
      { binding: "WORLD_KERNEL", service: "fibre-world-kernel" },
      { binding: "THREAD_PRESENTATION", service: "fibre-thread-presentation" },
      { binding: "ASSET_GENERATOR", service: "fibre-asset-generator" },
      { binding: "ADMIN_DASHBOARD", service: "fibre-admin-dashboard" },
    ],
  };
}

test("app selection keeps full deploys default while allowing one app", () => {
  assert.equal(selectedCloudflareApps(), CLOUDFLARE_APP_DEPLOY_ORDER);
  assert.deepEqual(selectedCloudflareApps("admin-dashboard"), ["admin-dashboard"]);
  assert.throws(() => selectedCloudflareApps("viewer"), /unsupported Cloudflare app viewer/u);
});

test("admin and status domains get isolated staging hostnames", () => {
  assert.equal(cloudflareAppDomain("admin.insidefibre.com", "staging"), "admin.staging.insidefibre.com");
  assert.equal(cloudflareAppDomain("status.insidefibre.com", "staging"), "status.staging.insidefibre.com");
  assert.equal(cloudflareAppDomain("status.insidefibre.com", "production"), "status.insidefibre.com");
});

test("admin config reuses provisioned Activity D1 and injects reconciled Access verification configuration", () => {
  const base = {
    name: "fibre-admin-dashboard",
    routes: [{ pattern: "admin.insidefibre.com", custom_domain: true }],
    vars: { FIBRE_ENVIRONMENT: "production" },
    d1_databases: [
      { binding: "ACTIVITY_LOG", database_name: "fibre-activity-log" },
      { binding: "PRESENTATION_CATALOG", database_name: "fibre-presentation-catalog" },
    ],
    r2_buckets:[{ binding:"PRESENTATION_OBJECTS", bucket_name:"fibre-presentation-assets" }],
    workflows:[{
      name:"fibre-population-lab-experiment",
      binding:"POPULATION_LAB_EXPERIMENT",
      class_name:"PopulationLabExperimentWorkflow",
    }],
    durable_objects:{ bindings:[{
      name:"ADMIN_LIVE",
      class_name:"FibreAdminLiveDurableObject",
      script_name:"fibre-thread-presentation",
    }] },
  };
  const resolved = resolveCloudflareAppConfig("admin-dashboard", base, {
    environment: "staging",
    resourceState: state,
    accessConfig: access,
    operatorConfig,
  });
  assert.equal(resolved.name, "fibre-admin-dashboard-staging");
  assert.equal(resolved.routes[0].pattern, "admin.staging.insidefibre.com");
  assert.equal(resolved.vars.FIBRE_ENVIRONMENT, "staging");
  assert.equal(resolved.vars.FIBRE_ACCESS_TEAM_DOMAIN, "https://fibre.cloudflareaccess.com");
  assert.equal(resolved.vars.FIBRE_ACCESS_AUD, "audience-tag");
  assert.equal(resolved.vars.GEONAMES_USERNAME, "fibre-test");
  assert.equal(resolved.d1_databases[0].database_name, "fibre-activity-log-staging");
  assert.equal(resolved.d1_databases[0].database_id, "d1_activity");
  assert.equal(resolved.d1_databases[1].database_name, "fibre-presentation-catalog-staging");
  assert.equal(resolved.d1_databases[1].database_id, "d1_catalog");
  assert.equal(resolved.r2_buckets[0].bucket_name, "fibre-presentation-assets-staging");
  assert.equal(resolved.workflows[0].name, "fibre-population-lab-experiment-staging");
  assert.equal(
    resolved.durable_objects.bindings.find((binding) => binding.name === "ADMIN_LIVE")?.script_name,
    "fibre-thread-presentation-staging",
  );
  assert.equal(validateResolvedCloudflareAppConfig("admin-dashboard", resolved, { environment: "staging" }), resolved);
});

test("status config targets staging runtime and cached Admin health through service bindings", () => {
  const resolved = resolveCloudflareAppConfig("status-page", statusBase(), {
    environment: "staging",
    resourceState: state,
    accessConfig: access,
    operatorConfig,
  });
  assert.equal(resolved.name, "fibre-status-page-staging");
  assert.equal(resolved.routes[0].pattern, "status.staging.insidefibre.com");
  assert.equal(resolved.vars.VIEWER_ORIGIN, "https://staging.insidefibre.com");
  assert.deepEqual(
    resolved.services.map(({ binding, service }) => [binding, service]),
    [
      ["BIRTH_CENTER", "fibre-birth-center-staging"],
      ["WORLD_KERNEL", "fibre-world-kernel-staging"],
      ["THREAD_PRESENTATION", "fibre-thread-presentation-staging"],
      ["ASSET_GENERATOR", "fibre-asset-generator-staging"],
      ["ADMIN_DASHBOARD", "fibre-admin-dashboard-staging"],
    ],
  );
  assert.equal(validateResolvedCloudflareAppConfig("status-page", resolved, { environment: "staging" }), resolved);
});

test("admin deployment resolution fails closed when reconciled Access configuration is absent", () => {
  const base = {
    name: "fibre-admin-dashboard",
    routes: [{ pattern: "admin.insidefibre.com", custom_domain: true }],
    vars: {},
    d1_databases: [
      { binding: "ACTIVITY_LOG", database_name: "fibre-activity-log" },
      { binding: "PRESENTATION_CATALOG", database_name: "fibre-presentation-catalog" },
    ],
    r2_buckets:[{ binding:"PRESENTATION_OBJECTS", bucket_name:"fibre-presentation-assets" }],
    workflows:[{
      name:"fibre-population-lab-experiment",
      binding:"POPULATION_LAB_EXPERIMENT",
      class_name:"PopulationLabExperimentWorkflow",
    }],
    durable_objects:{ bindings:[{
      name:"ADMIN_LIVE",
      class_name:"FibreAdminLiveDurableObject",
      script_name:"fibre-thread-presentation",
    }] },
  };
  assert.throws(
    () => resolveCloudflareAppConfig("admin-dashboard", base, { environment: "staging", resourceState: state, operatorConfig }),
    /Cloudflare Access team domain/u,
  );
});

test("resolved Admin config rejects unresolved Access or D1 placeholders before Wrangler", () => {
  const base = {
    name: "fibre-admin-dashboard",
    routes: [{ pattern: "admin.insidefibre.com", custom_domain: true }],
    vars: {},
    d1_databases: [
      { binding: "ACTIVITY_LOG", database_name: "fibre-activity-log" },
      { binding: "PRESENTATION_CATALOG", database_name: "fibre-presentation-catalog" },
    ],
    r2_buckets:[{ binding:"PRESENTATION_OBJECTS", bucket_name:"fibre-presentation-assets" }],
    workflows:[{
      name:"fibre-population-lab-experiment",
      binding:"POPULATION_LAB_EXPERIMENT",
      class_name:"PopulationLabExperimentWorkflow",
    }],
    durable_objects:{ bindings:[{
      name:"ADMIN_LIVE",
      class_name:"FibreAdminLiveDurableObject",
      script_name:"fibre-thread-presentation",
    }] },
  };
  const resolved = resolveCloudflareAppConfig("admin-dashboard", base, {
    environment: "staging",
    resourceState: state,
    accessConfig: access,
    operatorConfig,
  });
  const badAudience = structuredClone(resolved);
  badAudience.vars.FIBRE_ACCESS_AUD = "replace-with-access-audience";
  assert.throws(
    () => validateResolvedCloudflareAppConfig("admin-dashboard", badAudience, { environment: "staging" }),
    /unresolved placeholder/u,
  );
  const badDatabase = structuredClone(resolved);
  badDatabase.d1_databases[0].database_id = "placeholder-d1-id";
  assert.throws(
    () => validateResolvedCloudflareAppConfig("admin-dashboard", badDatabase, { environment: "staging" }),
    /unresolved placeholder/u,
  );
});

test("resolved Status config rejects missing or misdirected internal bindings", () => {
  const resolved = resolveCloudflareAppConfig("status-page", statusBase(), {
    environment: "staging",
    resourceState: state,
    accessConfig: access,
    operatorConfig,
  });
  const missing = structuredClone(resolved);
  missing.services = missing.services.filter((service) => service.binding !== "ADMIN_DASHBOARD");
  assert.throws(
    () => validateResolvedCloudflareAppConfig("status-page", missing, { environment: "staging" }),
    /declared internal service bindings/u,
  );
  const misdirected = structuredClone(resolved);
  misdirected.services.find((service) => service.binding === "ADMIN_DASHBOARD").service = "fibre-admin-dashboard";
  assert.throws(
    () => validateResolvedCloudflareAppConfig("status-page", misdirected, { environment: "staging" }),
    /ADMIN_DASHBOARD must target fibre-admin-dashboard-staging/u,
  );
});

test("Admin deployment updates its Durable Object code without deferred rollout",async()=>{
  let deployArgs=null;
  const client=createWranglerAppDeploymentClient({
    runner:async(args)=>{deployArgs=args;return {stdout:"deployed",stderr:""};},
  });
  await client.deploy({
    configPath:"/repo/admin.jsonc",
    resolvedConfig:{
      name:"fibre-admin-dashboard-staging",
      durable_objects:{bindings:[{name:"INFRA_MONITOR",class_name:"FibreAdminInfraMonitor"}]},
    },
  });
  assert.equal(deployArgs[deployArgs.indexOf("--durable-objects-code-update-mode")+1],
    "immediate","Admin deployment left stale Durable Object code active");
});

test("app deployment waits for eventual revision visibility without repeating deployment",async()=>{
  const expectedSha="a".repeat(40),staleSha="b".repeat(40);
  const pauses=[],messages=[],calls=[];
  const client={
    async checkRevision({url,expectedSha:expected}){
      calls.push({url,expected});
      if(calls.length<6){
        throw new Error("App revision not ready: received "+staleSha);
      }
      return {deploymentGitSha:expectedSha};
    },
  };
  const accepted=await acceptCloudflareAppRevision({
    client,appId:"admin-dashboard",
    url:"https://status.staging.insidefibre.com/healthz?service=admin-dashboard",
    expectedSha,wait:async ms=>{pauses.push(ms);},
    log:value=>messages.push(value),
  });
  assert.equal(accepted.deploymentGitSha,expectedSha);
  assert.equal(calls.length,6,"deployer stopped during ordinary revision propagation");
  assert.deepEqual(pauses,[1500,3000,6000,12000,15000],
    "Admin acceptance does not back off like stateful service revision checks");
  assert.ok(calls.every(({expected})=>expected===expectedSha),
    "app acceptance permitted a stale source revision");
  assert.ok(messages.some(line=>line.includes("APP REVISION PENDING admin-dashboard")),
    "app revision wait was invisible to the operator");
});

test("app deployment rejects stale revisions after a bounded wait",async()=>{
  let checked=0;const pauses=[];
  await assert.rejects(
    ()=>acceptCloudflareAppRevision({
      client:{async checkRevision(){
        checked++;
        throw new Error("received old revision");
      }},
      appId:"admin-dashboard",url:"https://status.example/healthz",
      expectedSha:"a".repeat(40),attempts:3,
      wait:async ms=>{pauses.push(ms);},
      log:()=>{},
    }),
    /admin-dashboard revision was not accepted: received old revision/,
    "app revision polling silently accepted stale Cloudflare code",
  );
  assert.equal(checked,3);
  assert.deepEqual(pauses,[1500,3000],
    "revision acceptance waited after the final failed check");
});
