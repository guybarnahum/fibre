# Fibre Infra

`infra/` is Fibre's provider-neutral infrastructure and service-hosting boundary.

It does **not** own Fibre semantics. Thread identity, history, memory, birth, civil registration, relationships, obligations, presentation admission, asset-generation behavior and other domain meanings remain in their owning services and stores.

The production persistence rule remains [`../docs/architecture/production-persistence.md`](../docs/architecture/production-persistence.md): every persistent production state or byte object used as durable state by a Fibre service crosses a provider-neutral `InfraDriver` capability.

The live implementation/adoption state is [`../docs/state/infra-pure.md`](../docs/state/infra-pure.md). Durable rules remain in [production persistence](../docs/architecture/production-persistence.md) and [InfraDriver](../docs/architecture/infrastructure-driver.md). Local and cloud runtimes use the same semantic architecture; only provider adapters and deployment wiring may differ.

## Shape

```text
infra/
  infra-driver.mjs
  internal.mjs
  service.mjs

  providers/
    local/
    cloudflare/
    aws/

  test/
```

There is deliberately no package-style `src/` layer and no `packages/infra` package. Provider implementations live only below `infra/providers/`.

## Dependency direction

```text
semantic service/store
        |
        v
#infra / #infra/service
        |
        v
#infra/providers/<provider>
```

Runtime consumers use the stable `#infra...` imports declared in the repository `package.json`. They do not reach into Infra by relative path and do not use provider-native APIs above the provider boundary.

## Service hosting

`infra/service.mjs` owns the small provider-neutral service seam shared by runtime services:

- service identity;
- side-effect-free `GET /healthz`;
- exact HTTP routing;
- Bearer-token authentication;
- JSON request/response handling;
- standard safe HTTP errors.

Provider-specific hosting remains under `infra/providers/`. For example, `infra/providers/local/service.mjs` adapts a Fibre service to Node HTTP. Cloudflare Workers can use the Fetch-native service directly.

Service-specific behavior stays under `services/<service>/` or deployment composition. The Infra service seam does not own image generation, Fibre provenance semantics, Thread publication, Birth Center behavior, or World Kernel protocol semantics.

## Providers

`providers/local/` contains local/in-memory implementations used by development and tests.

`providers/cloudflare/` contains Cloudflare mappings for R2, D1, Durable Objects, Queues and Workflows.

`providers/aws/` is the reserved home for AWS implementations when Fibre has a concrete capability that requires them. Do not add provider abstractions speculatively.

## Capability bundle

The umbrella driver vocabulary currently includes:

```text
state
streams
objects
catalog
realtime
queues
scheduler
workflows
coordination
secrets
cache
telemetry
```

Only capabilities exercised by real vertical slices should acquire frozen executable contracts.

### Local/cloud architectural parity

A capability used by production semantics must have the same provider-neutral contract in local and cloud execution. The local runtime is not allowed to use a separate architectural mechanism merely because Node makes one convenient.

In particular, `InfraDriver.scheduler` must be implemented and consumed locally as well as in cloud deployments. Local timers may be an implementation detail of the local scheduler adapter, but services must schedule through `InfraDriver.scheduler`; Cloudflare may map the same contract to Durable Object alarms or another provider mechanism.

Define the smallest scheduler surface required by actual reconciliation work. Do not build a generic distributed scheduler, lease system or coordination framework before a concrete Fibre operation requires it.

The same parity rule applies to `state`: semantic stores depend on `InfraDriver.state`, while local SQLite and Cloudflare transactional state are provider implementations.

## Provider identities stay here

Semantic records use Fibre identities such as `threadId`, `eventId`, `registrationId`, `objectRef`, `streamId` and content digests.

Provider-native bucket keys, database IDs, Durable Object IDs, ARNs, region IDs and filesystem paths remain inside provider adapters or explicitly classified operational metadata.

## Current infra-pure posture

The representative persistence and scheduling boundary is now proven and adopted across the main World/Birth/Presentation paths. In particular, authoritative World state, World scheduling/retry state, Birth Center durable invocation state and private Journal authority no longer rely on service-level SQLite/filesystem/R2 bypasses.

Remaining portability debt is deliberately trigger-driven rather than a cleanup mandate. Some internal service calls still use fetch-shaped/Worker-binding transport, and Cloudflare queue consumers still use provider-native acknowledgement/retry. The exact current state, triggers and stop conditions live in [Infra-pure state and workstream](../docs/state/infra-pure.md).

Disposable `.fibre/` development state, tests and repository fixtures remain outside the production persistence rule.

## Secrets and deployment configuration

Infrastructure resource bindings, application secrets and deployment credentials are different things.

- Provider resource access should use provider bindings where available rather than embedded credentials.
- Application secrets such as provider API keys and Fibre private/admin tokens must not be committed.
- Deployment-only credentials such as Cloudflare API credentials belong to operator/CI credential storage, not Fibre semantic state.
- Secret-upload tooling must require an explicit caller-supplied input file path. `.env` may be passed explicitly, but it is not read implicitly by default.
- Secret tooling reports missing secret names and status only and must never print secret values.

See [Infra-pure state and workstream](../docs/state/infra-pure.md) for current provider-neutral adoption/debt and [Cloud E2E closure](../docs/architecture/cloud-e2e-closure-plan.md) for retained deployment acceptance evidence.

## Development rule

When adding infrastructure for a service feature:

1. define the semantic/domain contract first;
2. identify the exact infrastructure guarantee it needs;
3. require the smallest `InfraDriver` capability profile that satisfies it;
4. add or extend shared conformance tests;
5. implement provider mapping under `infra/providers/<provider>/`;
6. keep provider-native identifiers out of semantic records.

Do not weaken an atomic Fibre operation merely because a chosen provider mechanism has a smaller transaction scope.

Do not over-generalize prematurely. Add infrastructure surface only when a concrete Fibre capability or invariant requires it.
