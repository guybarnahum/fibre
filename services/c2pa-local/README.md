# Local C2PA proof sidecar

This service exists only for the P3 local end-to-end proof.

It runs the official `@contentauth/c2pa-node` SDK in Node because the upstream browser/WASM package does not yet expose a byte-oriented verification entry point compatible with Cloudflare Workers. The Fibre backend talks to it only through the `ContentCredentialSigner` adapter contract.

It is **not** a production trust service and must not become a Thread or presentation authority.

## Setup

The published `@contentauth/c2pa-node` package requires Node.js 22 or later. From the repository root:

```bash
node --version
sh services/c2pa-local/generate-dev-cert.sh
npm install --prefix services/c2pa-local --no-package-lock
npm start --prefix services/c2pa-local
```

The certificate helper is intentionally one-shot and refuses to overwrite an existing development key. If `.fibre/p3-c2pa/` already contains credentials created by the older self-signed helper, remove that ignored local directory and regenerate it before starting the signer:

```bash
rm -rf .fibre/p3-c2pa
sh services/c2pa-local/generate-dev-cert.sh
```

`npm start` runs a certificate-chain preflight before loading the C2PA SDK. This deliberately fails fast on the legacy one-certificate/self-signed setup so an invalid local credential cannot be discovered only after an expensive image generation call.

The helper generates an unencrypted PKCS#8 P-256 signing key plus a short-lived local development CA and a CA-issued end-entity signing certificate. `cert.pem` contains the C2PA signing chain in end-entity-first order and uses the document-signing EKU. The local CA private key is deleted after issuance; its public certificate remains in `.fibre/p3-c2pa/ca-cert.pem` for inspection.

These credentials are local proof material only. Verification for this local proof checks the embedded C2PA structure/signature but deliberately does not claim that the development CA is a production trust credential.

The HTTP surface uses the shared `infra/service-runtime` plumbing. It listens only on `127.0.0.1:8790` by default and exposes:

```text
GET  /healthz
POST /embed
POST /verify
```

`GET /healthz` is always public and side-effect free. Local development leaves `/embed` and `/verify` unauthenticated by default to preserve the existing proof flow. Set `FIBRE_C2PA_SERVICE_TOKEN` to require `Authorization: Bearer <token>` on both protected routes when exercising service authentication locally.

Production should replace this sidecar with a signer/verifier backed by an accepted trust credential and KMS/HSM or another approved signing service. The production service should require authenticated `/embed` and `/verify` calls and return the C2PA Trust List evidence required by Fibre's production HTTP signer adapter. Cloudflare-native C2PA verification can replace the sidecar when the upstream SDK provides a supported Worker byte API; the Fibre contracts do not change.
