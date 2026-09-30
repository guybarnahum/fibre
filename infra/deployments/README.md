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
  fibre-identity-authority/
    cloudflare/
  thread-presentation/
    cloudflare/
  world-kernel/
    cloudflare/
  birth-center/
    cloudflare/
```

Do not add empty provider directories or a generic deployment framework. Add only composition required by a real Fibre service or environment.

## Cloudflare operator preparation

Cloud resource names come from the checked Wrangler topology. The operator layer does not create a second semantic or deployment authority.

```bash
npm run cloud:provision -- --env staging
npm run cloud:configure-secrets -- --file <operator-selected-file> --env staging
```

`cloud:provision` is idempotent for independently managed resources. It verifies or creates the Presentation D1 catalog, the shared R2 bucket, the completion Queue and DLQ, reapplies the idempotent D1 catalog schema, then writes resolved Wrangler configs and provider identifiers under ignored `.fibre/cloudflare/<environment>/`.

Durable Object namespaces are reconciled by each Worker's `exports` declaration on deploy. Workflows, service bindings, Workers and custom domains are likewise deploy-managed and recorded in operator state rather than separately invented by Fibre tooling.

Staging resource names are isolated with a `-staging` suffix and use `api.staging.insidefibre.com`. The Viewer's `staging.insidefibre.com` / `insidefibre.com` deployment remains owned by the separate Viewer repository and is recorded as an external required domain rather than mutated here.

`cloud:configure-secrets` requires an explicit input file and never reads `.env` implicitly. It validates all mandatory values before upload, sends only each Worker's required secret subset to Wrangler through stdin, and writes only non-secret runtime configuration into ignored resolved Wrangler configs.

FIA uses its native issuer/protection secrets for FIN issuance and native FIN proof. Asset Generator uses Fibre's immutable generation provenance and has no separate media-signing service.

## Cloudflare deployment acceptance

After resources and service configuration are prepared:

```bash
npm run cloud:deploy -- --env staging
```

The command runs repository/deployment validation, verifies Wrangler authentication, re-runs idempotent resource provisioning, verifies every required remote secret name, then deploys services in dependency order:

```text
Asset Generator
Thread Presentation
World Kernel
Fibre Identity Authority
Birth Center
```

Wrangler automatic resource provisioning is disabled during these deploys so Fibre's operator state remains the resource authority. Each deployed service must answer `/healthz` with the expected service identity before the next acceptance phase.

Targeted service deploys re-resolve the current checked-in Wrangler configuration against the existing provisioned resource state before deployment. They must not reuse an older generated Wrangler file as source authority, because new provider declarations such as Durable Object migrations, bindings, exports, queues, or workflows must be carried by the targeted deploy. Cross-script Durable Object consumers can only deploy after the owning Worker has successfully applied the class migration.

Birth Center Durable Object schema evolution is deployment-owned rather than request-owned. After the Birth Center Worker is deployed, the deployment command runs its authenticated state migration, verifies current state health, and probes a non-mutating Genesis inspection route before accepting the deployment. Birth Center runtime/store construction only accepts the current schema; it never creates or migrates schema while serving an ordinary request. The targeted `cloud:deploy:service -- --service birth-center` path follows the same migration + acceptance sequence.

The final non-mutating acceptance checks the Thread Presentation discovery API and verifies that the configured Viewer origin is reachable.

The Viewer repository remains independently deployed. `cloud:deploy` verifies its required endpoint but does not mutate the separate Viewer repository. A genuine new cloud birth and full birth-to-Viewer proof belongs to the subsequent in-vivo E2E slice.
