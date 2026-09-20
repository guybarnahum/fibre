import assert from "node:assert/strict";
import test from "node:test";

import { proxyFidReissue } from "./admin-worker.mjs";

test("Admin FIN reissue delegates lifecycle intent without caller-authored identity", async () => {
  let forwarded = null;
  const env = {
    FIBRE_PRIVATE_TOKEN:"test-private-token-1234567890",
    THREAD_PRESENTATION:{
      async fetch(request) {
        forwarded = {
          url:request.url,
          body:await request.json(),
        };
        return new Response(JSON.stringify({
          ok:true,
          result:{
            complete:true,
            state:"active",
            credential:{ credentialId:"fidc_new", revision:3, supersedesCredentialId:"fidc_old" },
            presentation:{ changed:true },
          },
        }), { status:200, headers:{ "Content-Type":"application/json" } });
      },
    },
  };
  const response = await proxyFidReissue(new Request("https://admin.test/api/threads/thr_mira/fid/reissue", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ idempotencyKey:"admin_fid_reissue_1" }),
  }), env, "thr_mira");

  assert.equal(response.status, 200, "Admin did not return FID lifecycle result");
  assert.equal(new URL(forwarded.url).pathname, "/internal/fid/reconcile", "Admin bypassed FID lifecycle");
  assert.deepEqual(forwarded.body, {
    threadId:"thr_mira",
    idempotencyKey:"admin_fid_reissue_1",
    mode:"reissue",
  }, "Admin leaked caller-authored identity into FID lifecycle");
  const payload = await response.json();
  assert.equal(payload.credential.revision, 3, "Admin lost lifecycle result");
});
