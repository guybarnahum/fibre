import assert from "node:assert/strict";
import test from "node:test";

import { proxyFinCardVerify } from "./admin-worker.mjs";

test("Admin FIN verification forwards the displayed PNG to FIA and returns only FIA trust output", async () => {
  const image = new Uint8Array([137,80,78,71,1,2,3]);
  let forwarded = null;
  const env = {
    FIBRE_PRIVATE_TOKEN:"test-private-token-1234567890",
    FIBRE_IDENTITY_AUTHORITY:{
      async fetch(request) {
        forwarded = {
          path:new URL(request.url).pathname,
          side:new URL(request.url).searchParams.get("side"),
          token:request.headers.get("x-fibre-private-token"),
          body:new Uint8Array(await request.arrayBuffer()),
        };
        return Response.json({
          verified:true,
          assertion:{ credentialId:"fidc_admin_verify", revision:2, side:"front" },
        });
      },
    },
  };

  const response = await proxyFinCardVerify(new Request("https://admin.test/api/fid/verify?side=front", {
    method:"POST",
    headers:{ "Content-Type":"image/png" },
    body:image,
  }), env);

  assert.equal(response.status, 200);
  assert.equal(forwarded.path, "/internal/fid/cards/verify");
  assert.equal(forwarded.side, "front");
  assert.equal(forwarded.token, env.FIBRE_PRIVATE_TOKEN);
  assert.deepEqual(forwarded.body, image);
  assert.deepEqual(await response.json(), {
    verified:true,
    assertion:{ credentialId:"fidc_admin_verify", revision:2, side:"front" },
  });
});

test("Admin FIN verification preserves FIA failure without adding assertion data", async () => {
  const env = {
    FIBRE_PRIVATE_TOKEN:"test-private-token-1234567890",
    FIBRE_IDENTITY_AUTHORITY:{
      fetch:async () => Response.json({ verified:false, reason:"invalid_signature" }),
    },
  };
  const response = await proxyFinCardVerify(new Request("https://admin.test/api/fid/verify?side=back", {
    method:"POST",
    body:new Uint8Array([1]),
  }), env);
  assert.deepEqual(await response.json(), { verified:false, reason:"invalid_signature" });
});
