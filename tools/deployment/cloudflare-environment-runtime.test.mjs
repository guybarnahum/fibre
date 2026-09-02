import assert from "node:assert/strict";
import test from "node:test";

import { resolveWranglerConfig } from "./cloudflare-operator.mjs";

const RESOURCE_STATE = Object.freeze({ resources: Object.freeze({ d1: Object.freeze([]) }) });

test("staging Viewer origin cannot be overwritten by persisted production runtime config", () => {
  const resolved = resolveWranglerConfig({
    name: "fibre-thread-presentation",
    vars: { VIEWER_ORIGIN: "https://insidefibre.com" },
  }, {
    environment: "staging",
    resourceState: RESOURCE_STATE,
    runtimeConfig: { VIEWER_ORIGIN: "https://insidefibre.com" },
  });

  assert.equal(resolved.vars.VIEWER_ORIGIN, "https://staging.insidefibre.com");
});

test("production Viewer origin remains production when runtime config matches production", () => {
  const resolved = resolveWranglerConfig({
    name: "fibre-thread-presentation",
    vars: { VIEWER_ORIGIN: "https://insidefibre.com" },
  }, {
    environment: "production",
    resourceState: RESOURCE_STATE,
    runtimeConfig: { VIEWER_ORIGIN: "https://insidefibre.com" },
  });

  assert.equal(resolved.vars.VIEWER_ORIGIN, "https://insidefibre.com");
});
