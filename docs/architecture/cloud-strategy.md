---
id: architecture-cloud-strategy
status: proposed
last-reviewed: 2026-08-21
canonical: true
---

# Cloud strategy

The first Fibre implementation is well suited to event-driven serverless infrastructure because cognition is externally hosted and Threads are frozen most of the time.

Cloudflare is attractive for Workers, Durable Objects, Queues, Workflows, D1, and R2. AWS, Google Cloud and Azure remain viable future deployment targets where their infrastructure capabilities satisfy the same Fibre contracts.

The Fibre domain must remain portable behind interfaces for state, events, queues, artifacts, ledger, model gateway, scheduler, secrets and presentation delivery. Provider-specific infrastructure must not become domain authority.

## Infrastructure-driver rule

Fibre application/domain code should depend on provider-neutral capability interfaces and conformance semantics rather than provider products.

The first provider implementation may be Cloudflare, but the dependency direction is:

```text
Fibre domain/application
        |
        v
provider-neutral infrastructure ports
        |
        +--> Cloudflare driver
        +--> AWS driver       # future
        +--> GCP driver       # future
        `--> Azure driver     # future
```

Do not model portability by renaming one provider's products into generic nouns. Abstract the required guarantees—ordering, replay, idempotency, immutable objects, queryable catalog, realtime delivery, asynchronous dispatch—and allow each provider driver to realize those guarantees differently.

Provider-native identifiers, URLs, partition keys, deployment IDs and connection IDs remain driver-private unless explicitly retained as operational metadata. Stable Fibre IDs and semantic records remain provider-neutral.

## Thread presentation delivery plane

The first Thread presentation server is explicitly **Cloudflare-first, driver-based**.

The Cloudflare v1 driver maps presentation capabilities to:

```text
Workers                 public API/auth/projection gateway
Durable Objects         per-Thread real-time coordination and ordered stream
SQLite-backed DO state  durable per-Thread presentation cursor/event replay state
D1                      global/queryable presentation catalog and indexes
R2                      immutable presentation snapshots and media artifacts
Worker Static Assets    insidefibre.com React/Vite application
Queues/Workflows        optional asynchronous projection/media/archive work
```

The presentation application itself should depend on logical ports for channel/replay state, realtime delivery, immutable objects, catalog access and optional async work. `insidefibre.com` React components consume the presentation HTTP/realtime protocol and should not know which provider driver serves it.

The Cloudflare choice is scoped to the first presentation deployment. `ThreadPresentationPacket`, presentation event semantics, provenance, Fibre authorities, logical cursors/object refs and viewer behavior remain provider-neutral contracts.

See:

- [`thread-presentation-cloudflare-stream-v0.1.md`](thread-presentation-cloudflare-stream-v0.1.md) for the first Cloudflare topology;
- [`thread-presentation-infrastructure-driver-v0.1.md`](thread-presentation-infrastructure-driver-v0.1.md) for the provider-neutral driver boundary and conformance requirements.
