---
id: architecture-cloud-strategy
status: proposed
last-reviewed: 2026-08-02
canonical: true
---

# Cloud strategy

The first Fibre implementation is well suited to event-driven serverless infrastructure because cognition is externally hosted and Threads are frozen most of the time.

Cloudflare is attractive for Workers, Durable Objects, Queues, Workflows, D1, and R2. AWS is attractive for enterprise IAM, VPC deployment, mature workflow services, and custom containers.

The domain must remain portable behind interfaces for state, events, queues, artifacts, ledger, model gateway, scheduler, and secrets. A provider decision should follow a thin vertical-slice experiment rather than precede it.
