import assert from "node:assert/strict";
import test from "node:test";

import { verifyFibreFinCardAssets } from "./fibre-fin-card-verification.js";

function assertion(side, rawRenderDigest) {
  return {
    schema:"fibre.fin-card-proof.v1",
    credentialId:"fidc_admin_1",
    revision:2,
    side,
    identity:{ fin:"8PKH-A4-VH5R", displayName:"Sara Mizrahi", dateField:null },
    issuedAt:"2026-09-20T02:00:00.000Z",
    expiresAt:null,
    templateVersion:"fid-card-template-v0.3-ocean",
    registrationId:"registration_admin_1",
    civilRegistrationDigest:`sha256:${"a".repeat(64)}`,
    identitySnapshotDigest:`sha256:${"b".repeat(64)}`,
    photoDigest:`sha256:${"c".repeat(64)}`,
    rawRenderDigest,
    issuer:{ authorityId:"fibre_identity_authority", keyId:"fia-key-1" },
  };
}

function responseJson(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers:{ "Content-Type":"application/json" } });
}

test("Admin FIN verification trusts only a coherent verified front/back pair", async () => {
  const calls = [];
  const frontAssertion = assertion("front", `sha256:${"d".repeat(64)}`);
  const backAssertion = assertion("back", `sha256:${"e".repeat(64)}`);
  const fetchImpl = async (input, init = {}) => {
    calls.push({ input:String(input), method:init.method ?? "GET" });
    if (String(input) === "/front.png") return new Response(new Uint8Array([1,2,3]));
    if (String(input) === "/back.png") return new Response(new Uint8Array([4,5,6]));
    if (String(input).endsWith("side=front")) return responseJson({ verified:true, assertion:frontAssertion });
    if (String(input).endsWith("side=back")) return responseJson({ verified:true, assertion:backAssertion });
    throw new Error("unexpected request");
  };

  const result = await verifyFibreFinCardAssets({
    front:{ url:"/front.png" },
    back:{ url:"/back.png" },
    fetchImpl,
  });

  assert.equal(result.verified, true, "verified card pair was rejected");
  assert.equal(result.assertion.credentialId, "fidc_admin_1");
  assert.equal(calls.filter((call) => call.method === "GET").length, 2, "both displayed card sides must be read");
  assert.equal(calls.filter((call) => call.method === "POST").length, 2, "both displayed card sides must be verified");
});

test("Admin FIN verification never exposes assertion data from a failed side", async () => {
  const frontAssertion = assertion("front", `sha256:${"d".repeat(64)}`);
  const fetchImpl = async (input) => {
    if (String(input) === "/front.png" || String(input) === "/back.png") return new Response(new Uint8Array([1]));
    if (String(input).endsWith("side=front")) return responseJson({ verified:true, assertion:frontAssertion });
    return responseJson({ verified:false, reason:"invalid_signature" });
  };

  const result = await verifyFibreFinCardAssets({
    front:{ url:"/front.png" },
    back:{ url:"/back.png" },
    fetchImpl,
  });

  assert.deepEqual(result, { verified:false, reason:"invalid_signature" });
  assert.equal("assertion" in result, false, "failed card leaked untrusted assertion");
});

test("Admin FIN verification rejects two authentic sides from different credentials", async () => {
  const frontAssertion = assertion("front", `sha256:${"d".repeat(64)}`);
  const backAssertion = { ...assertion("back", `sha256:${"e".repeat(64)}`), credentialId:"fidc_other" };
  const fetchImpl = async (input) => {
    if (String(input) === "/front.png" || String(input) === "/back.png") return new Response(new Uint8Array([1]));
    if (String(input).endsWith("side=front")) return responseJson({ verified:true, assertion:frontAssertion });
    return responseJson({ verified:true, assertion:backAssertion });
  };

  const result = await verifyFibreFinCardAssets({
    front:{ url:"/front.png" },
    back:{ url:"/back.png" },
    fetchImpl,
  });

  assert.deepEqual(result, { verified:false, reason:"pair_mismatch" });
});
