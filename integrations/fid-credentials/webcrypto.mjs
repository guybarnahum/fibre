const ISSUER_KEY_ID = "fibre-fia-production-v1";
const ISSUER_TRUST_POLICY = "fibre_fid_issuer_v1";
const CREDENTIAL_KEY_ID = "fibre-fid-private-v1";
const CREDENTIAL_POLICY_ID = "fid_private_v1";

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

function parseIssuerJwk(env) {
  let value;
  try { value = JSON.parse(nonEmpty("FIA_ISSUER_JWK", env?.FIA_ISSUER_JWK)); }
  catch (error) { throw new TypeError(`FIA_ISSUER_JWK is invalid JSON: ${error.message}`); }
  if (value?.kty !== "OKP" || value?.crv !== "Ed25519" || typeof value.x !== "string" || typeof value.d !== "string") {
    throw new TypeError("FIA_ISSUER_JWK must be an Ed25519 private JWK");
  }
  return value;
}

function base64Bytes(name, value) {
  const encoded = nonEmpty(name, value);
  let binary;
  try { binary = atob(encoded); }
  catch { throw new TypeError(`${name} must be base64`); }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function bytesBase64(bytes) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

export function createFidCredentialCrypto(env) {
  const jwk = parseIssuerJwk(env);
  const privateKey = crypto.subtle.importKey(
    "jwk",
    { kty:"OKP", crv:"Ed25519", x:jwk.x, d:jwk.d },
    { name:"Ed25519" },
    false,
    ["sign"],
  );
  const publicKey = crypto.subtle.importKey(
    "jwk",
    { kty:"OKP", crv:"Ed25519", x:jwk.x },
    { name:"Ed25519" },
    false,
    ["verify"],
  );
  const credentialBytes = base64Bytes("FIA_CREDENTIAL_KEY_BASE64", env?.FIA_CREDENTIAL_KEY_BASE64);
  if (credentialBytes.length !== 32) throw new TypeError("FIA_CREDENTIAL_KEY_BASE64 must decode to 32 bytes");
  const credentialKey = crypto.subtle.importKey("raw", credentialBytes, { name:"AES-GCM" }, false, ["encrypt", "decrypt"]);

  const issuerSigner = Object.freeze({
    profile:Object.freeze({
      authorityId:"fibre_identity_authority",
      keyId:env?.FIA_ISSUER_KEY_ID?.trim() || ISSUER_KEY_ID,
      algorithm:"Ed25519",
      publicKeyRef:env?.FIA_ISSUER_PUBLIC_KEY_REF?.trim() || `urn:fibre:fid-key:${env?.FIA_ISSUER_KEY_ID?.trim() || ISSUER_KEY_ID}`,
      trustPolicy:env?.FIA_ISSUER_TRUST_POLICY?.trim() || ISSUER_TRUST_POLICY,
    }),
    async sign(bytes) {
      return new Uint8Array(await crypto.subtle.sign("Ed25519", await privateKey, bytes));
    },
    async verify(bytes, signature) {
      return crypto.subtle.verify("Ed25519", await publicKey, signature, bytes);
    },
  });

  async function ivFor(aad, plaintext) {
    const material = new Uint8Array(aad.length + 1 + plaintext.length);
    material.set(aad, 0);
    material[aad.length] = 0;
    material.set(plaintext, aad.length + 1);
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", material));
    return digest.slice(0, 12);
  }

  const credentialProtector = Object.freeze({
    profile:Object.freeze({
      policyId:env?.FIA_CREDENTIAL_POLICY_ID?.trim() || CREDENTIAL_POLICY_ID,
      keyId:env?.FIA_CREDENTIAL_KEY_ID?.trim() || CREDENTIAL_KEY_ID,
    }),
    async seal({ plaintext, aad }) {
      const iv = await ivFor(aad, plaintext);
      const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
        { name:"AES-GCM", iv, additionalData:aad, tagLength:128 },
        await credentialKey,
        plaintext,
      ));
      return { ciphertext, parameters:{ algorithm:"AES-GCM", ivBase64:bytesBase64(iv) } };
    },
    async open({ ciphertext, parameters, aad }) {
      if (parameters?.algorithm !== "AES-GCM" || typeof parameters?.ivBase64 !== "string") {
        throw new TypeError("FID credential protection parameters are invalid");
      }
      const iv = base64Bytes("FID credential IV", parameters.ivBase64);
      if (iv.length !== 12) throw new TypeError("FID credential IV must be 12 bytes");
      return new Uint8Array(await crypto.subtle.decrypt(
        { name:"AES-GCM", iv, additionalData:aad, tagLength:128 },
        await credentialKey,
        ciphertext,
      ));
    },
  });

  return Object.freeze({ issuerSigner, credentialProtector });
}
