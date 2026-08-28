# Third-party integrations

Concrete adapters for external services live here. They are **not** `InfraDriver` implementations and must not select storage, queues, workflows, cloud infrastructure, or deployment topology.

Current layout:

```text
integrations/
  models/
    openai.mjs
    google.mjs
    retry-policy.mjs
  media/
    openai-image-provider.mjs
    bfl-flux-image-provider.mjs
  content-credentials/
    c2pa-http-signer.mjs
```

`services/` owns Fibre semantics and the inward-facing contracts these adapters implement. `deployments/` owns provider/profile/secret selection and executable composition. `infra/` remains physical infrastructure only.

`services/c2pa-local/` is the local Content Credentials signing service. The HTTP client that talks to it is an integration and lives here; Asset Generator receives that signer through dependency injection.

The small contract bridge modules at this directory root intentionally point inward to service-owned contracts so concrete adapters can implement those contracts without copying domain semantics. Integrations may depend on those narrow contracts; services, integrations and deployments must not make third-party AI/media/content-credential services into `InfraDriver` capabilities.
