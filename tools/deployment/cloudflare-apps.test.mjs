import test from "node:test";
import assert from "node:assert/strict";

import {
  cloudflareAppDomain,
  resolveCloudflareAppConfig,
  validateResolvedCloudflareAppConfig,
} from "./cloudflare-apps.mjs";

const state = {
  resources: {
    d1: [
      { binding: "PRESENTATION_CATALOG", name: "fibre-presentation-catalog-staging", id: "d1_catalog" },
      { binding: "ACTIVITY_LOG", name: "fibre-activity-log-staging", id: "d1_activity" },
    ],
  },
};

const access = {
  teamDomain: "https://fibre.cloudflareaccess.com",
  audience: "audience-tag",
};

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
    ],
  };
}

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
    d1_databases: [{ binding: "ACTIVITY_LOG", database_name: "fibre-activity-log" }],
  };
  const resolved = resolveCloudflareAppConfig("admin-dashboard", base, {
    environment: "staging",
    resourceState: state,
    accessConfig: access,
  });
  assert.equal(resolved.name, "fibre-admin-dashboard-staging");
  assert.equal(resolved.routes[0].pattern, "admin.staging.insidefibre.com");
  assert.equal(resolved.vars.FIBRE_ENVIRONMENT, "staging");
  assert.equal(resolved.vars.FIBRE_ACCESS_TEAM_DOMAIN, "https://fibre.cloudflareaccess.com");
  assert.equal(resolved.vars.FIBRE_ACCESS_AUD, "audience-tag");
  assert.equal(resolved.d1_databases[0].database_name, "fibre-activity-log-staging");
  assert.equal(resolved.d1_databases[0].database_id, "d1_activity");
  assert.equal(validateResolvedCloudflareAppConfig("admin-dashboard", resolved, { environment: "staging" }), resolved);
});

test("status config targets the staging runtime Workers through exactly four service bindings", () => {
  const resolved = resolveCloudflareAppConfig("status-page", statusBase(), {
    environment: "staging",
    resourceState: state,
    accessConfig: access,
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
    ],
  );
  assert.equal(validateResolvedCloudflareAppConfig("status-page", resolved, { environment: "staging" }), resolved);
});

test("admin deployment resolution fails closed when reconciled Access configuration is absent", () => {
  const base = {
    name: "fibre-admin-dashboard",
    routes: [{ pattern: "admin.insidefibre.com", custom_domain: true }],
    vars: {},
    d1_databases: [{ binding: "ACTIVITY_LOG", database_name: "fibre-activity-log" }],
  };
  assert.throws(
    () => resolveCloudflareAppConfig("admin-dashboard", base, { environment: "staging", resourceState: state }),
    /Cloudflare Access team domain/u,
  );
});

test("resolved Admin config rejects unresolved Access or D1 placeholders before Wrangler", () => {
  const base = {
    name: "fibre-admin-dashboard",
    routes: [{ pattern: "admin.insidefibre.com", custom_domain: true }],
    vars: {},
    d1_databases: [{ binding: "ACTIVITY_LOG", database_name: "fibre-activity-log" }],
  };
  const resolved = resolveCloudflareAppConfig("admin-dashboard", base, {
    environment: "staging",
    resourceState: state,
    accessConfig: access,
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

test("resolved Status config rejects missing or misdirected runtime bindings", () => {
  const resolved = resolveCloudflareAppConfig("status-page", statusBase(), {
    environment: "staging",
    resourceState: state,
    accessConfig: access,
  });
  const missing = structuredClone(resolved);
  missing.services = missing.services.filter((service) => service.binding !== "ASSET_GENERATOR");
  assert.throws(
    () => validateResolvedCloudflareAppConfig("status-page", missing, { environment: "staging" }),
    /exactly the four Fibre runtime service bindings/u,
  );
  const misdirected = structuredClone(resolved);
  misdirected.services.find((service) => service.binding === "WORLD_KERNEL").service = "fibre-world-kernel";
  assert.throws(
    () => validateResolvedCloudflareAppConfig("status-page", misdirected, { environment: "staging" }),
    /WORLD_KERNEL must target fibre-world-kernel-staging/u,
  );
});
