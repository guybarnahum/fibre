import test from "node:test";
import assert from "node:assert/strict";

import { ADMIN_DASHBOARD_VERSION, createAdminDashboardWorker } from "./worker.mjs";

test("Admin health reports the running Cloudflare Worker build", async () => {
  const worker = createAdminDashboardWorker({ authenticate: async () => null });
  const response = await worker.fetch(new Request("https://admin.staging.insidefibre.com/healthz"), {
    CF_VERSION_METADATA: {
      id: "01234567-89ab-cdef-0123-456789abcdef",
      tag: "staging-test",
      timestamp: "2026-09-13T03:10:00.000Z",
    },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    service: "admin-dashboard",
    version: ADMIN_DASHBOARD_VERSION,
    buildId: "01234567-89ab-cdef-0123-456789abcdef",
    buildTag: "staging-test",
    builtAt: "2026-09-13T03:10:00.000Z",
  });
});


test("Admin control-plane assets are never served stale", async () => {
  const worker=createAdminDashboardWorker({
    authenticate:async()=>({email:"operator@example.com"}),
    authorize:async()=>true,
  });
  const response=await worker.fetch(
    new Request("https://admin.staging.insidefibre.com/appearance-coverage-ui.js"),
    {
      ASSETS:{
        fetch:async()=>new Response("export const current=true;",{
          headers:{"Content-Type":"text/javascript","Cache-Control":"public, max-age=31536000"},
        }),
      },
    },
  );
  assert.equal(response.status,200);
  assert.equal(response.headers.get("cache-control"),"no-store",
    "Admin asset caching can leave operator UI stale after deploy");
});
