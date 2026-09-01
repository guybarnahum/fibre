---
id: fibre-operator-surfaces
status: accepted
last-reviewed: 2026-09-01
canonical: true
---

# Fibre operator and status surfaces

Fibre has two cloud-facing operational web surfaces with deliberately different trust boundaries.

## Admin dashboard

`admin.insidefibre.com` is the authenticated operator application. Staging is `admin.staging.insidefibre.com`.

The first Admin capability is Activity inspection. The Admin Worker has a read-only binding to the shared `ACTIVITY_LOG` D1 and exposes structured filters for recent activity, failures/retries, request ID, Genesis ID, Thread ID, service, stage and status. It must not become a new semantic authority or a generic database browser.

Cloudflare Access protects the Worker. The Worker also validates the Access JWT audience, issuer, signature and expiry before serving its assets or API. Fibre private/admin service tokens are never delivered to browser JavaScript.

Activity remains non-authoritative and fail-open. Admin may explain operational evidence but must not decide whether a birth, World mutation, Embodiment admission, publication or Thread state is true.

## Public status

`status.insidefibre.com` is public. Staging is `status.staging.insidefibre.com`.

The Status Worker checks Fibre runtime health through Cloudflare service bindings and checks the independently deployed Viewer at its configured public origin. It publishes only coarse component state and check time. It does not expose request, Genesis, Thread, provider, retry, error, Activity, database or deployment internals.

The initial status surface is current-state only. Incident history must not be inferred from Activity records or periods of missing Activity. A future history view requires an explicit durable incident/publication record.

## Thread Editor relationship

`apps/thread-editor` remains the loopback-only M1 human-inspection and bounded-simulation tool. It is not silently promoted to production and its local token/session design is not reused as Admin authentication.

A later Admin Thread Inspector may reuse deterministic presentation concepts from the editor, but must call production-safe authenticated APIs and preserve World authority. Direct database mutation remains prohibited.

## Deployment boundary

These are applications, not Fibre semantic services. They therefore live under `apps/` with Cloudflare composition under `infra/deployments/`, rather than being added as World/Birth/Presentation/Asset services in the deployment manifest.

`cloud:deploy:apps` resolves staging/production domains, existing Activity D1 identity and runtime service-binding names from Fibre's checked Cloudflare topology. Admin Access team domain and audience are explicit operator configuration supplied with `--file`; they are not inferred or copied into source control.
