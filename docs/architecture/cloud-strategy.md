---
id: architecture-cloud-strategy
status: proposed
last-reviewed: 2026-08-21
canonical: true
---

# Cloud strategy

The first Fibre implementation is well suited to event-driven serverless infrastructure because cognition is externally hosted and Threads are frozen most of the time.

Cloudflare is attractive for Workers, Durable Objects, Queues, Workflows, D1, and R2. AWS remains attractive for enterprise IAM, VPC deployment, mature workflow services, and custom containers.

The Fibre domain must remain portable behind interfaces for state, events, queues, artifacts, ledger, model gateway, scheduler, and secrets. Provider-specific infrastructure must not become domain authority.

## Thread presentation delivery plane

The first Thread presentation server is explicitly **Cloudflare-first**.

Use:

```text
Workers                 public API/auth/projection gateway
Durable Objects         per-Thread real-time coordination and ordered stream
SQLite-backed DO state  durable per-Thread presentation cursor/event replay state
D1                      global/queryable presentation catalog and indexes
R2                      immutable presentation snapshots and media artifacts
Worker Static Assets    insidefibre.com React/Vite application
Queues/Workflows        optional asynchronous projection/media/archive work
```

The Cloudflare choice is scoped to presentation delivery. `ThreadPresentationPacket`, presentation event semantics, provenance, and Fibre authorities remain provider-neutral contracts.

See [`thread-presentation-cloudflare-stream-v0.1.md`](thread-presentation-cloudflare-stream-v0.1.md).
