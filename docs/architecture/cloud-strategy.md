---
id: architecture-cloud-strategy
status: proposed
last-reviewed: 2026-08-21
canonical: true
---

# Cloud strategy

The first Fibre implementation is well suited to event-driven serverless infrastructure because cognition is externally hosted and Threads are frozen most of the time.

Cloudflare is the first deployment target for the current backend/presentation work. AWS, Google Cloud and Azure remain viable future targets where their infrastructure capabilities satisfy the same Fibre contracts.

The Fibre domain must remain portable behind provider-neutral infrastructure capability interfaces. Provider-specific infrastructure must not become domain authority.

## One Fibre `InfraDriver`

Fibre uses one umbrella provider-neutral backend abstraction:

```text
InfraDriver
```

It is composed of narrow capability ports rather than one cloud-shaped god interface.

Conceptually the capability family may include:

```text
transactional state
ordered streams / replay
immutable objects
catalog/query indexes
realtime delivery
queues
scheduling
workflows
coordination / leases
secrets
cache
telemetry
```

Application services declare the subset and guarantees they require. Presentation, World Kernel, Genesis, economy/social services and future backend logic should reuse this same infrastructure boundary as concrete needs arise rather than inventing separate provider abstractions.

The dependency direction is:

```text
Fibre domain/application services
        |
        v
InfraDriver capability ports
        |
        +--> cloudflare-v1      # first implementation
        +--> aws-*              # future
        +--> gcp-*              # future
        `--> azure-*            # future
```

Do not model portability by renaming one provider's products into generic nouns. Abstract required guarantees—transactionality, ordering, replay, idempotency, immutable objects, realtime delivery, asynchronous dispatch, coordination—and allow each provider driver to realize those guarantees differently.

Provider-native identifiers, URLs, partition keys, resource IDs, deployment IDs and connection IDs remain driver-private operational metadata. Stable Fibre IDs and semantic records remain provider-neutral.

See [`infrastructure-driver-v0.1.md`](infrastructure-driver-v0.1.md).

## Domain stores remain semantic authorities

`InfraDriver` does not replace Fibre domain stores such as WorldStore, GenesisStore, autobiographical-memory authority, situated-life authority or Structured Obligation authority.

The layering remains:

```text
Fibre semantic contract
        |
        v
domain store / application adapter
        |
        v
InfraDriver capability
        |
        v
provider mechanism
```

This preserves the storage-model rule that authority is defined by Fibre records, provenance, versions, hashes, transaction/replay contracts and authorization—not by a cloud/database product.

A provider capability that cannot satisfy a required Fibre invariant must fail deployment/conformance rather than silently weaken the invariant.

## Cloudflare v1

The first production driver is `cloudflare-v1`.

Approximate capability mapping:

```text
Workers                   runtime / HTTP gateway
Durable Objects           ordered per-entity coordination, realtime, leases where appropriate
SQLite-backed DO storage  durable per-entity stream/coordination state
D1                        relational/queryable state and indexes where its guarantees fit
R2                        immutable objects, snapshots and media
Queues                    asynchronous work
Cron / DO alarms          scheduling where appropriate
Workflows                 multi-step durable workflows
Worker secrets /          secrets
Secrets Store
Cache API / KV            caching only where weaker semantics are acceptable
Worker observability      logs / operational telemetry
Worker Static Assets      insidefibre.com React/Vite application
```

This is an implementation mapping, not Fibre ontology. A domain authority should not automatically move to D1 or Durable Objects merely because those services exist; the corresponding adapter must first declare and verify the consistency/transaction guarantees it needs.

## Thread presentation as first vertical slice

`PresentationServer` is the first service to exercise `InfraDriver` end to end.

Its application shape is:

```text
PresentationServer
        |
        v
InfraDriver
        |
        v
cloudflare-v1
```

The presentation capability profile requires ordered replayable streams, immutable objects, a queryable catalog and resumable realtime delivery, with optional queues/workflows.

Cloudflare v1 maps those requirements to:

```text
Workers
Durable Objects + DO SQLite
R2
D1
WebSockets
Worker Static Assets
Queues / Workflows when needed
```

`insidefibre.com` React components consume only the presentation HTTP/realtime protocol and must not know which provider driver serves it.

See:

- [`thread-presentation-cloudflare-stream-v0.1.md`](thread-presentation-cloudflare-stream-v0.1.md) for the first Cloudflare topology;
- [`thread-presentation-infrastructure-driver-v0.1.md`](thread-presentation-infrastructure-driver-v0.1.md) for the presentation capability profile over `InfraDriver`.

## Adoption strategy

Do not perform a broad rewrite of existing local SQLite persistence merely to make every backend service use `InfraDriver` immediately.

Use an incremental proof path:

```text
1. define the general InfraDriver guarantees/capability discipline
2. prove it with PresentationServer
3. run shared conformance tests against local/in-memory and cloudflare-v1 drivers
4. reuse/extend the same ports when later Fibre backend slices need cloud infrastructure
5. add AWS/GCP/Azure drivers only when there is an actual deployment need
```

The abstraction earns generality through repeated vertical slices and conformance, not by predicting every future provider product in advance.
