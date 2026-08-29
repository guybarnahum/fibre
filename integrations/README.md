# Third-party integrations

Concrete adapters for external services live here. They are **not** `InfraDriver` implementations and must not select storage, queues, workflows, cloud infrastructure, or deployment topology.

Current layout:

```text
integrations/
  ai/
    asset-generation-error.mjs
    asset-provenance-domain.mjs
    guardian-model-adapter.mjs
    persistence-common.mjs
    reasoning/
      openai.mjs
      google.mjs
      retry-policy.mjs
      output-recovery.mjs
      prompt-assets.mjs
    image/
      openai.mjs
      bfl.mjs
  content-credentials/
    c2pa-http-signer.mjs
```

These are the canonical integration paths. Fibre is still in development, so callers use them directly; retired integration filenames are not preserved through compatibility re-exports or aliases.

`services/` owns Fibre semantics and the inward-facing contracts these adapters implement. Service-owned prompt text remains under the owning service. `infra/deployments/` owns provider/profile/secret selection and executable composition. `infra/providers/` remains reusable physical infrastructure adapters and must not know service topology.

The small contract bridge modules under `integrations/ai/` intentionally point inward to service-owned contracts so concrete AI adapters can implement those contracts without copying Fibre semantics. Integrations may depend on those narrow contracts; services must not select concrete AI providers, and AI integrations must not know Fibre service topology.

The Content Credentials HTTP client is an integration. The C2PA signing service itself remains a Fibre runtime service and is supplied to Asset Generator through deployment composition.
