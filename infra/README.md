# Fibre Infra

`infra/` is Fibre's provider-neutral infrastructure and service-hosting boundary.

It does **not** own Fibre semantics. Thread identity, history, memory, birth, civil registration, relationships, obligations, presentation admission, asset-generation behavior and other domain meanings remain in their owning services and stores.

The production persistence rule remains [`../docs/architecture/production-persistence.md`](../docs/architecture/production-persistence.md): every persistent production state or byte object used as durable state by a Fibre service crosses a provider-neutral `InfraDriver` capability.

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

Service-specific behavior stays under `services/<service>/` or deployment composition. The Infra service seam does not own image generation, C2PA semantics, Thread publication, Birth Center behavior, or World Kernel protocol semantics.

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

## Provider identities stay here

Semantic records use Fibre identities such as `threadId`, `eventId`, `registrationId`, `objectRef`, `streamId` and content digests.

Provider-native bucket keys, database IDs, Durable Object IDs, ARNs, region IDs and filesystem paths remain inside provider adapters or explicitly classified operational metadata.

## Current migration debt

World Kernel domain stores still open their shared SQLite database directly, and the durable model-invocation journal still writes a local filesystem journal directly. Those are migration debt, not examples for new services.

Disposable `.fibre/` development state, tests and repository fixtures are outside the production persistence rule.

## Development rule

When adding infrastructure for a service feature:

1. define the semantic/domain contract first;
2. identify the exact infrastructure guarantee it needs;
3. require the smallest `InfraDriver` capability profile that satisfies it;
4. add or extend shared conformance tests;
5. implement provider mapping under `infra/providers/<provider>/`;
6. keep provider-native identifiers out of semantic records.

Do not weaken an atomic Fibre operation merely because a chosen provider mechanism has a smaller transaction scope.
