# Content Credential Signer

Provider-neutral HTTP service semantics for embedding and verifying Content Credentials.

The service receives a signer adapter with `embed()` and `verify()` methods. It does not import the C2PA SDK, load certificates, choose a runtime provider, or choose a signing implementation.

Concrete signing implementations live under `integrations/content-credentials/`. Executable composition and hosting live under `infra/deployments/content-credential-signer/`.
