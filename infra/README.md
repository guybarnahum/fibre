# Fibre Infra

`infra/` is the provider-neutral physical infrastructure boundary for Fibre backend services.

It does **not** own Fibre semantics. Thread identity, history, memory, birth, civil registration, relationships, obligations and other domain meanings remain owned by their semantic stores and services.

The accepted production rule is [`../docs/architecture/production-persistence.md`](../docs/architecture/production-persistence.md):

> Every persistent production state or byte object used as durable state by a Fibre service crosses a provider-neutral `InfraDriver` capability.

## Dependency direction

```text
semantic service/store
        |
        v
public `#infra` capability/runtime seam
        |
        v
provider implementation
```

Runtime consumers use the stable root-package `#infra...` imports declared in the repository `package.json`. They do not import `infra/src/*` or provider files by relative path.

Provider adapters may know about R2, D1, Durable Objects, S3, a local SQLite implementation or another mechanism. Semantic service code should know only the Fibre guarantee it requires.

## Service runtime

`infra/service-runtime/` owns reusable HTTP service plumbing such as `/healthz`, route dispatch, Bearer authentication and standard HTTP errors. `infra/local/` contains the thin Node adapter. Service-specific behavior remains under `services/<service>/`.

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

Currently implemented ports include the Presentation/Asset Generator requirements: ordered streams, immutable objects, catalog, realtime delivery and workflows, with in-memory/local conformance behavior and a Cloudflare implementation.

`state` is named but not yet an executable production contract. The first proof should preserve the atomic Genesis birth consistency boundary, including Civil Registry and initial Thread state. It must permit several semantic stores to share one transaction without merging their responsibilities.

## Provider identities stay here

Semantic records use Fibre identities such as `threadId`, `eventId`, `registrationId`, `objectRef`, `streamId` and content digests.

Provider-native bucket keys, database IDs, Durable Object IDs, ARNs, region IDs and filesystem paths remain inside provider adapters or explicitly classified operational metadata.

## Current migration debt

The accepted architecture predates complete migration:

- World Kernel domain stores still open their shared SQLite database directly;
- the durable model-invocation journal still writes a local filesystem journal directly.

Those exceptions are migration debt, not examples for new services. Repository validation blocks detectable new persistence families outside the named debt boundary.

Disposable `.fibre/` development state, tests and repository fixtures are outside the production persistence rule.

## Development rule

When adding a persistent service feature:

1. define the semantic/domain store contract first;
2. identify the exact infrastructure guarantee it needs;
3. require the smallest `InfraDriver` capability profile that satisfies that guarantee;
4. add/extend the shared conformance suite;
5. implement provider mapping at the infrastructure edge;
6. keep provider-native identifiers out of semantic records.

Do not weaken an atomic Fibre operation merely because a chosen provider mechanism has a smaller transaction scope.
