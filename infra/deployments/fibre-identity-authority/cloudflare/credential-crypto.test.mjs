import assert from "node:assert/strict";
import test from "node:test";

import { createFidCredentialCrypto } from "#integrations/fid-credentials/webcrypto.mjs";

function base64(bytes) {
  return Buffer.from(bytes).toString("base64");
}

test("FIA credential crypto is verifiable and deterministic for one credential identity", async () => {
  const pair = await crypto.subtle.generateKey({ name:"Ed25519" }, true, ["sign", "verify"]);
  const issuerJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const credentialKey = new Uint8Array(32);
  crypto.getRandomValues(credentialKey);
  const { issuerSigner, credentialProtector } = createFidCredentialCrypto({
    FIA_ISSUER_JWK:JSON.stringify(issuerJwk),
    FIA_CREDENTIAL_KEY_BASE64:base64(credentialKey),
  });

  const payload = new TextEncoder().encode("one persistent Fibre identity");
  const signature = await issuerSigner.sign(payload);
  assert.equal(await issuerSigner.verify(payload, signature), true, "FIA signature did not verify");

  const aad = new TextEncoder().encode("fidc_one:revision:1");
  const first = await credentialProtector.seal({ plaintext:payload, aad });
  const second = await credentialProtector.seal({ plaintext:payload, aad });
  assert.deepEqual(first, second, "same FID credential did not seal deterministically");
  assert.deepEqual(
    await credentialProtector.open({ ciphertext:first.ciphertext, parameters:first.parameters, aad }),
    payload,
    "FID credential did not round-trip",
  );
});
