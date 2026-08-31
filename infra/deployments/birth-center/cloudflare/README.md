# Birth Center — Cloudflare

This deployment hosts Birth Center provisional durability in one SQLite-backed Durable Object scope named `birth`.

The runtime consumes the same provider-neutral `InfraDriver` capabilities as local Birth Center composition:

- `state`
- `scheduler`

A private `POST /internal/births` request durably records a complete provisional birth bundle and schedules reconciliation. The request does not make the Thread live. The Durable Object alarm later resumes the pending handoff and publishes the bundle to World through the `WORLD_KERNEL` service binding. Only World Kernel performs authoritative `publishBirth()` semantics.

The durable model-invocation journal uses the same Birth `InfraDriver.state` scope, so successful model-call witnesses survive Worker replacement without filesystem storage.

This Slice D runtime does not by itself define a public birth product API or claim live production deployment. Provider/model generation is invoked by Birth Center development workflows; this deployment supplies their durable state/recovery and authoritative World handoff boundary.
