# Fibre Content Credential Signer — Cloudflare

Fibre hosts its C2PA signer as a Cloudflare Worker backed by one Cloudflare Container. The Container exists because `@contentauth/c2pa-node` uses native Linux binaries; the Worker remains the Cloudflare service boundary.

The signer is an integration service, not an InfraDriver capability. InfraDriver continues to own state, objects, queues, workflows, scheduling, and the other portable infrastructure ports.

Required Worker secrets:

- `C2PA_SIGNER_TOKEN`
- `C2PA_SIGNER_CERT_BASE64`
- `C2PA_SIGNER_KEY_BASE64`

The certificate secret contains the PEM signing certificate followed by its issuing Fibre CA certificate, encoded as one base64 line. The signer uses `fibre_signature_only`: verification succeeds only when the card signature chains to that Fibre CA. Public C2PA Trust List validation is deliberately deferred.

FIA reaches the signer through the `CONTENT_CREDENTIAL_SIGNER` Cloudflare service binding. The `workers.dev` endpoint is retained for deployment health; `/embed` and `/verify` still require the bearer token.

Cloudflare Containers require a Workers Paid plan and a Docker-compatible engine when Wrangler builds the Dockerfile during deployment.
