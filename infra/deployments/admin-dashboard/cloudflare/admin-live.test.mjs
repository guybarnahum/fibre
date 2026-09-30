import assert from "node:assert/strict";
import test from "node:test";

import { proxyAdminLive } from "./admin-worker.mjs";

test("Admin live connects directly to the one environment Durable Object", async () => {
  let name = null;
  let forwarded = null;
  const expected = new Response("live", { status:200 });
  const env = {
    ADMIN_LIVE:{
      getByName(candidate) {
        name = candidate;
        return {
          fetch(request) {
            forwarded = request;
            return expected;
          },
        };
      },
    },
  };
  const request = new Request("https://admin.test/api/live", {
    headers:{ Upgrade:"websocket" },
  });

  const response = await proxyAdminLive(request, env);

  assert.equal(name, "admin", "Admin live created more than one environment channel");
  assert.equal(forwarded, request, "Admin live stopped forwarding the browser upgrade directly");
  assert.equal(response, expected, "Admin live wrapped the Durable Object response");
});
