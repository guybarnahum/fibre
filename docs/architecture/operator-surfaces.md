---
id: fibre-operator-surfaces
status: accepted
last-reviewed: 2026-09-01
canonical: true
---

# Fibre operator and status surfaces

Fibre has two cloud-facing operational web surfaces with deliberately different trust boundaries, plus a local Thread-focused development surface.

## Admin dashboard

`admin.insidefibre.com` is the authenticated operator application. Staging is `admin.staging.insidefibre.com`.

The first Admin capability is Activity inspection. The Admin Worker has a read-only binding to the shared `ACTIVITY_LOG` D1 and exposes structured filters for recent activity, failures/retries, request ID, Genesis ID, Thread ID, service, stage and status. It must not become a new semantic authority or a generic database browser.

Cloudflare Access protects the Worker. The Worker also validates the Access JWT audience, issuer, signature and expiry before serving its assets or API. Fibre private/admin service tokens are never delivered to browser JavaScript.

Activity remains non-authoritative and fail-open. Admin may explain operational evidence but must not decide whether a birth, World mutation, Embodiment admission, publication or Thread state is true.

## Public status

`status.insidefibre.com` is public. Staging is `status.staging.insidefibre.com`.

The Status Worker checks Fibre runtime health through Cloudflare service bindings and checks the independently deployed Viewer at its configured public origin. It publishes only coarse component state and check time. It does not expose request, Genesis, Thread, provider, retry, error, Activity, database or deployment internals.

The initial status surface is current-state only. Incident history must not be inferred from Activity records or periods of missing Activity. A future history view requires an explicit durable incident/publication record.

## Thread Editor

`apps/thread-editor` is Fibre's local Thread-focused development and inspection application. It is no longer defined by the historical M1 database shape.

The editor is an application consumer of Fibre service contracts:

```text
browser
  -> local Thread Editor application boundary
       -> World Kernel private inspection API
       -> Birth Center Genesis development / inspection API
       -> Thread Presentation read API
            -> Fibre semantic services
                 -> InfraDriver
                      -> selected local or cloud provider
```

The editor must not:

- open a World or Birth Center database directly;
- import semantic stores as an application-side shortcut;
- know SQLite tables, Durable Object SQL, D1 schemas, object-store keys or provider-native resource identities;
- synthesize a birth by calling the legacy Thread seed route;
- turn presentation data into an alternate Thread authority;
- reinterpret private records with an untracked model merely for display.

Thread inspection is supplied by World-owned read contracts over authoritative readers. The first modern inspection aggregate includes the Thread projection and history, World/identity integrity, Thread Passport/current identity, autobiographical memories, situated relationships and places, symbolic genome, civil registration and current Embodiment.

Genesis-development inspection remains Birth Center owned, including durable request identity, provisional state and model-invocation provenance. Birth creation must call the Birth Center development/birth boundary. New origin capabilities such as sponsorship, Echo or Homage belong in Birth Center/World semantic contracts first; the editor may expose them only after those contracts exist.

The local editor credential/session design remains a development boundary and is not reused as production Admin authentication. A later Admin Thread Inspector should consume the same production-safe World/Birth/Presentation inspection contracts through Cloudflare Access rather than recreating database inspection logic.

## Deployment boundary

These are applications, not Fibre semantic services. They therefore live under `apps/` with Cloudflare or local composition under `infra/deployments/`, rather than being added as World/Birth/Presentation/Asset semantic services in the deployment manifest.

`cloud:deploy:apps` resolves staging/production domains, existing Activity D1 identity and runtime service-binding names from Fibre's checked Cloudflare topology. Admin Access team domain and audience are explicit operator configuration supplied with `--file`; they are not inferred or copied into source control.
