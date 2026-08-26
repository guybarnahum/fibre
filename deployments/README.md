# Fibre deployments

`deployments/` is the provider-specific composition layer between portable Fibre services and concrete runtime/infrastructure providers.

The dependency rule is:

```text
deployments -> services
deployments -> packages/infra
services    -> InfraDriver contracts
packages/infra -X-> Fibre service topology
```

A deployment adapter is allowed to know both the service it boots and the provider it runs on. Neither the service nor the InfraDriver provider implementation should know that composition in reverse.

## Environment manifests

`environments/*.json` selects, per deployed Fibre service:

- a runtime provider alias;
- an InfraDriver provider alias;
- the InfraDriver capabilities the service requires.

Runtime and InfraDriver aliases are separate intentionally. They can be the same today and diverge later for hybrid deployments.

The manifest contains logical deployment selection only. Do not put access keys, model/provider secrets, signing keys, Thread/World semantics, or provider-native resource IDs into it.

The current validator lives in `tools/deployment/deployment-manifest.mjs`. The first manifest is `environments/local.json`.

## Provider adapters

Provider-specific executable entrypoints/configuration live under:

```text
deployments/<platform>/<service>/
```

Current Cloudflare adapters are:

```text
deployments/cloudflare/asset-generator/
deployments/cloudflare/thread-presentation/
```

They compose the provider runtime, `cloudflare-v1` infrastructure capabilities, and the corresponding provider-neutral Fibre service. They may translate provider-neutral operational outcomes into provider APIs, but they may not move Fibre semantic authority into the deployment layer.

## Generated provider configuration

Wrangler JSONC is hand-authored provider output today. A general manifest-to-provider deployment compiler is deferred. When added, provider-specific files may become generated/validated outputs, while the Fibre deployment manifest remains the provider-selection source of truth.

Do not create empty AWS/GCP/Azure directories in anticipation. Add a provider adapter only when it has executable implementation and conformance coverage.

See:

- `docs/decisions/ADR-0018-deployment-provider-selection.md`
- `docs/decisions/ADR-0017-provider-neutral-production-persistence.md`
- `docs/architecture/deployment-provider-selection.md`
- `docs/architecture/infrastructure-driver.md`
