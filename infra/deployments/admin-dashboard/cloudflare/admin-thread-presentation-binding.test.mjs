import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { parseJsonc } from "../../../../tools/deployment/cloudflare-operator.mjs";
import { resolveCloudflareAppConfig } from "../../../../tools/deployment/cloudflare-apps.mjs";

const resourceState = {
  resources: {
    d1: [{ binding: "ACTIVITY_LOG", name: "fibre-activity-log-staging", id: "d1_activity" }],
  },
};

const accessConfig = {
  teamDomain: "https://fibre.cloudflareaccess.com",
  audience: "admin-audience",
};

test("Admin reaches staging Thread Presentation through a service binding", async () => {
  const source = await readFile(new URL("./wrangler.jsonc", import.meta.url), "utf8");
  const base = parseJsonc(source, "wrangler.jsonc");
  const resolved = resolveCloudflareAppConfig("admin-dashboard", base, {
    environment: "staging",
    resourceState,
    accessConfig,
  });
  const binding = resolved.services.find((candidate) => candidate.binding === "THREAD_PRESENTATION");
  assert.equal(binding?.service, "fibre-thread-presentation-staging");
  assert.equal(resolved.main, "./admin-worker.mjs");
});
