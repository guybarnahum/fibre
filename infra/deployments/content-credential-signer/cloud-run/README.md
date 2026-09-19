# Fibre C2PA signer on Cloud Run

This deployment hosts Fibre's existing Node C2PA signer for staging. It deliberately uses Fibre-only signature validation; public C2PA Trust List conformance remains a separate production concern.

Required runtime values:

- `FIBRE_C2PA_CERT`: mounted certificate-chain path
- `FIBRE_C2PA_KEY`: mounted private-key path
- `FIBRE_C2PA_SERVICE_TOKEN`: bearer token used by Fibre services
- `C2PA_SIGNER_ID=fibre-c2pa-staging-v1`
- `C2PA_TRUST_POLICY=development_signature_only`

Cloud Run supplies `PORT`; the container binds `0.0.0.0`.

Build from the repository root with `cloudbuild.yaml`, deploy the resulting image to Cloud Run, mount the certificate/key from Secret Manager, and expose the service over HTTPS. The `/healthz` endpoint is public; `/embed` and `/verify` require the bearer token.

The staging Cloudflare operator should then use the Cloud Run URL as `C2PA_SIGNER_URL`, the same bearer token as `C2PA_SIGNER_TOKEN`, signer ID `fibre-c2pa-staging-v1`, and trust policy `development_signature_only`.
