# C2PA Node integration

Local Content Credentials signing and verification uses the official `@contentauth/c2pa-node` SDK through this isolated integration package. The native dependency stays outside the root install and outside Cloudflare bundles.

From the repository root:

```bash
node --version
sh integrations/content-credentials/c2pa-node/generate-dev-cert.sh
npm install --prefix integrations/content-credentials/c2pa-node --no-package-lock
npm start --prefix integrations/content-credentials/c2pa-node
```

The generated certificate and key live under ignored `.fibre/p3-c2pa/` state and are development-only. The generator refuses to overwrite existing credentials. To replace stale local proof credentials:

```bash
rm -rf .fibre/p3-c2pa
sh integrations/content-credentials/c2pa-node/generate-dev-cert.sh
```

The package preflights the local certificate chain before starting the deployment host. The native adapter implements signing/verification only; HTTP service semantics live in `services/content-credential-signer/`, and local Node hosting/composition lives in `infra/deployments/content-credential-signer/local/`.
