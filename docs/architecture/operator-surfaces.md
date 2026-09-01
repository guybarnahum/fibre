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

Admin has two independent gates:

1. Cloudflare Access authenticates the human and supplies the signed identity JWT.
2. Fibre authorizes that identity from `fibre_admin_entitlements` in the shared `ACTIVITY_LOG` D1 database.

The Worker validates the Access JWT audience, issuer, signature and expiry, normalizes the authenticated `email` claim to lower case, then requires an exact D1 row with `admin = 1`. A valid Access identity without that D1 entitlement receives `403`. If the entitlement store cannot be queried, Admin fails closed with `503`. `/healthz` remains the only unauthenticated Admin route.

There is no browser or Worker mutation endpoint for Admin entitlements. Operators grant or revoke the flag directly through trusted D1 tooling, including the Cloudflare D1 dashboard. For example:

```sql
INSERT INTO fibre_admin_entitlements(email, admin)
VALUES ('operator@example.com', 1)
ON CONFLICT(email) DO UPDATE SET admin = excluded.admin;
```

To revoke while retaining an explicit row:

```sql
UPDATE fibre_admin_entitlements
SET admin = 0
WHERE email = 'operator@example.com';
```

The stored email should be lower-case and must match the email asserted by Cloudflare Access after normalization.

Fibre private/admin service tokens are never delivered to browser JavaScript. Activity remains non-authoritative and fail-open. Admin entitlement controls access to an operator surface only; it must never decide whether a birth, World mutation, Embodiment admission, publication or Thread state is true.

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

`cloud:provision` applies the ordered D1 schemas, including `0002_admin_entitlements.sql`, so existing staging Activity databases acquire the entitlement table idempotently without creating any administrator rows.

The Cloudflare Access application and its authentication policy are external operator configuration. Fibre does not create or mutate Access policies and does not encode Admin identities in deployment configuration. `cloud:deploy:apps` verifies that exactly one self-hosted Access application protects the Admin hostname, verifies that it has an allow policy, reads the Zero Trust organization `auth_domain` and application JWT audience, and injects those values into the Admin Worker configuration.

The Cloudflare operator token used by `cloud:deploy:apps` therefore needs read access to Zero Trust organization settings and Access applications/policies in addition to the permissions already required for Worker deployment. No human email addresses are written to deployment evidence.

For staging, after the runtime topology has been provisioned and the Access application has been configured in the Cloudflare Zero Trust dashboard:

```sh
npm run cloud:deploy:apps -- --file .env --env staging
```

The command writes SHA-bound operator evidence to `.fibre/cloudflare/staging/apps-deployment.json`, including the Access application identity, JWT verification configuration, policy counts and the deployed Admin/Status domains.
