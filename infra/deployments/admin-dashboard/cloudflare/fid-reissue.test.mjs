import assert from "node:assert/strict";
import test from "node:test";

import { proxyFidReissue } from "./admin-worker.mjs";

test("Admin FIN reissue delegates only Thread identity and operation identity to FIA", async () => {
  let forwarded = null;
  const env = {
    FIBRE_PRIVATE_TOKEN:"test-private-token-1234567890",
    FIBRE_IDENTITY_AUTHORITY:{
      async fetch(request) {
        forwarded = {
          url:request.url,
          body:await request.json(),
        };
        return new Response(JSON.stringify({
          state:"active",
          credential:{ credentialId:"fidc_new", revision:3 },
        }), { status:200, headers:{ "Content-Type":"application/json" } });
      },
    },
  };
  const response = await proxyFidReissue(new Request("https://admin.test/api/threads/thr_mira/fid/reissue", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ idempotencyKey:"admin_fid_reissue_1" }),
  }), env, "thr_mira");

  assert.equal(response.status, 200, "Admin did not return FIA reissue result");
  assert.deepEqual(forwarded.body, {
    threadId:"thr_mira",
    idempotencyKey:"admin_fid_reissue_1",
  }, "Admin leaked caller-authored identity into FID issuance");
});
