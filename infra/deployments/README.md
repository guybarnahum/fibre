# Fibre deployments

`infra/deployments/` is the repository composition layer. It binds provider-neutral Fibre services and integrations to concrete infrastructure/runtime providers.

The dependency direction is intentional:

- `services/` owns Fibre capability and application behavior and does not choose a cloud.
- `infra/providers/` owns reusable provider adapters and must not know service topology.
- `infra/deployments/` may compose services, `infra/providers/`, and `integrations/` for an executable environment.
- media/model vendors remain integrations, not InfraDriver providers.

Executable service deployments are organized service-first, then provider:

```text
infra/deployments/
  environments/
  asset-generator/
    cloudflare/
  thread-presentation/
    cloudflare/
```

Do not add empty provider directories or a generic deployment framework. Add only composition required by a real Fibre service or environment.

## Cloudflare operator preparation

Cloud resource names come from the checked Wrangler topology. The operator layer does not create a second semantic or deployment authority.

```bash
npm run cloud:provision -- --env staging
npm run cloud:configure-secrets -- --file <operator-selected-file> --env staging
```

`cloud:provision` is idempotent for independently managed resources. It verifies/creates the Presentation D1 catalog, the shared R2 bucket, the completion Queue and its DLQ, reapplies the idempotent D1 catalog schema, then writes resolved Wrangler configs and provider identifiers under ignored `.fibre/cloudflare/<environment>/`. Durable Object namespaces are reconciled by each Worker's `exports` declaration on deploy; Workflows, service bindings, Workers and custom domains are likewise deploy-managed and are recorded in the operator state rather than separately invented by Fibre tooling.

Staging resource names are isolated with a `-staging` suffix and use `api.staging.insidefibre.com`. The Viewer's `staging.insidefibre.com` / `insidefibre.com` deployment remains owned by the separate Viewer repository and is recorded as an external required domain rather than mutated here.

`cloud:configure-secrets` requires an explicit input file and never reads `.env` implicitly. It validates all mandatory values before any upload, sends only each Worker's required secret subset to Wrangler through stdin, and writes only non-secret runtime configuration into the ignored resolved Wrangler configs. `C2PA_SIGNER_URL`, signer ID/trust policy and Viewer origin are configuration; authentication/provider tokens remain secrets. Cloudflare operator credentials remain process/CI credentials and are not copied into Worker configuration.

## Cloudflare deployment acceptance

After resources and service configuration are prepared, deploy the Fibre cloud stack with:

```bash
npm run cloud:deploy -- --env staging
```

The command runs repository/deployment validation, verifies Wrangler authentication, re-runs idempotent resource provisioning, verifies every required remote secret name, verifies the configured production C2PA signer `/healthz` identity and `c2pa_trust_list` policy, then deploys in service-binding dependency order:

```text
Asset Generator
Thread Presentation
World Kernel
Birth Center
```

Wrangler automatic resource provisioning is disabled during these deploys so the Slice E operator state remains the resource authority. Each deployed Fibre service must answer `/healthz` with the expected service identity before the next acceptance phase. The final non-mutating acceptance checks the Thread Presentation discovery API and verifies that the configured Viewer origin is reachable.

The Viewer repository remains independently deployed. `cloud:deploy` verifies its required endpoint but does not mutate the separate Viewer repository. A genuine new cloud birth and full birth-to-Viewer proof belongs to the subsequent in-vivo E2E slice.
