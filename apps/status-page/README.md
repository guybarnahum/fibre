# Fibre Status

`status.insidefibre.com` is the public, read-only status page for Fibre. Staging uses `status.staging.insidefibre.com`.

It reports what a visitor relies on, not how Fibre is built:
- **Thread life:** whether Threads are living their days;
- **Births:** whether new Threads can be born;
- **insidefibre.com:** whether the website, Thread pages and new portraits are there.

Each is **Running**, **Partly running** or **Paused**, with one plain sentence.

The Status Worker judges each from the services it rests on:
- whether they answer through their Cloudflare service bindings;
- whether the separately deployed Viewer answers at its public origin;
- whether Admin's infrastructure health found a real failure in them, as a coarse level per service.

A model provider that cannot be paid for pauses Thread life, though the World still answers. A failure in media generation only makes the website partly running. Usage thresholds never reach this page, and stale infrastructure health is left out rather than read either way.

The public response holds only the three experiences, environment and check time. It never exposes Thread, Genesis, request, service, resource, provider, retry, error or Activity details. The operator's detail is the Admin infrastructure panel.

Durable incident history is deferred until Fibre defines an explicit public incident record instead of inferring incidents from operational telemetry.
