# World Kernel — Cloudflare

This deployment hosts authoritative World relational state and durable reconciliation in one SQLite-backed Durable Object scope named `world`.

The runtime consumes the same provider-neutral `InfraDriver` capabilities as local World composition:

- `state`
- `scheduler`

`InfraDriver.state` maps the World scope to Durable Object SQLite. `InfraDriver.scheduler` maps that same scope to the Durable Object alarm. The Durable Object `alarm()` handler runs the same World reconciliation process used locally, so pending Genesis presentation delivery and canonical visual publication survive Worker instance loss without a second semantic workflow state.

Internal calls to Thread Presentation and Asset Generator use Cloudflare service bindings while preserving the existing fetch-shaped Fibre service contracts. The private Genesis birth endpoint is `/internal/genesis/births`; it requires `FIBRE_PRIVATE_TOKEN` and schedules durable reconciliation after authoritative publication.

This slice does not move Birth Center provisional persistence into Cloudflare; that remains Slice D.
