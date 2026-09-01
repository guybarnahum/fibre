# Fibre Status

`status.insidefibre.com` is the public, read-only availability surface for Fibre. Staging uses `status.staging.insidefibre.com`.

The Status Worker checks Fibre services through Cloudflare service bindings and checks the separately deployed Viewer through its configured public origin. Its public response contains only coarse component status, environment and check time. It never exposes Thread, Genesis, request, provider, retry, error, or Activity details.

This first version reports current health only. Durable incident history is intentionally deferred until Fibre defines an explicit public incident record instead of inferring incidents from operational telemetry.
