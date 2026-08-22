# Local C2PA proof sidecar

This service exists only for the P3 local end-to-end proof.

It runs the official `@contentauth/c2pa-node` SDK in Node because the upstream browser/WASM package does not yet expose a byte-oriented verification entry point compatible with Cloudflare Workers. The Fibre backend talks to it only through the `ContentCredentialSigner` adapter contract.

It is **not** a production trust service and must not become a Thread or presentation authority.

## Setup

The current `@contentauth/c2pa-node` package requires Node.js 22.22 or later. From the repository root:

```bash
node --version
sh services/c2pa-local/generate-dev-cert.sh
npm install --prefix services/c2pa-local --no-package-lock
npm start --prefix services/c2pa-local
```

The certificate helper is intentionally one-shot and refuses to overwrite an existing development key. If `.fibre/p3-c2pa/` already contains the local proof credentials, skip the helper command.

The helper creates a short-lived self-signed ES256 development certificate under ignored `.fibre/p3-c2pa/` with the document-signing/C2PA EKU. Verification for this local proof checks the embedded C2PA structure/signature but deliberately does not treat the development certificate as a production trust credential.

The service listens only on `127.0.0.1:8790` by default and exposes:

```text
GET  /healthz
POST /embed
POST /verify
```

Production should replace this sidecar with a signer/verifier backed by an accepted trust credential and KMS/HSM or another approved signing service. Cloudflare-native C2PA verification can replace the sidecar when the upstream SDK provides a supported Worker byte API; the Fibre contracts do not change.
