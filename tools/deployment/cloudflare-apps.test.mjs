import test from "node:test";
import assert from "node:assert/strict";

import {
  cloudflareAppDomain,
  resolveCloudflareAppConfig,
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
});

test("status config targets the staging runtime Workers through service bindings", () => {
  const base = {
    name: "fibre-status-page",
    routes: [{ pattern: "status.insidefibre.com", custom_domain: true }],
    vars: { FIBRE_ENVIRONMENT: "production", VIEWER_ORIGIN: "https://insidefibre.com" },
    services: [
      { binding: "BIRTH_CENTER", service: "fibre-birth-center" },
      { binding: "WORLD_KERNEL", service: "fibre-world-kernel" },
    ],
  };
  const resolved = resolveCloudflareAppConfig("status-page", base, {
    environment: "staging",
    resourceState: state,
    accessConfig: access,
  });
  assert.equal(resolved.name, "fibre-status-page-staging");
  assert.equal(resolved.routes[0].pattern, "status.staging.insidefibre.com");
  assert.equal(resolved.vars.VIEWER_ORIGIN, "https://staging.insidefibre.com");
  assert.equal(resolved.services[0].service, "fibre-birth-center-staging");
  assert.equal(resolved.services[1].service, "fibre-world-kernel-staging");
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
