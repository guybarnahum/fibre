---
id: fibre-operator-surfaces
status: accepted
last-reviewed: 2026-09-10
canonical: true
---

# Fibre operator and status surfaces

Fibre has cloud-facing operational applications and a local Thread inspection surface with deliberately different trust boundaries.

## Admin dashboard

`admin.insidefibre.com` is the authenticated operator application. Staging is `admin.staging.insidefibre.com`.

The first Admin capability is Activity inspection. The Admin Worker has read-only access to the shared structured Activity Log and exposes bounded filters for recent activity, failures/retries, request/Genesis/Thread ID, service, stage and status. It must not become a semantic authority or generic database browser.

Admin has two independent gates:

1. Cloudflare Access authenticates the human and supplies the signed identity JWT.
2. Fibre authorizes that identity from `fibre_admin_entitlements`.

Private/admin service tokens are never delivered to browser JavaScript. Admin entitlement controls access to an operator surface only; it never decides whether a birth, World mutation, Embodiment admission, publication or Thread state is true.

## Public status

`status.insidefibre.com` is public. Staging is `status.staging.insidefibre.com`.

The Status Worker publishes coarse component health and check time only. It does not expose Thread, request, provider, retry, Activity, database or deployment internals.

Incident history requires explicit durable incident/publication records; it must not be inferred from missing Activity.

## Thread Editor

`apps/thread-editor` is the loopback-only authorized Thread inspection application.

Its M1 history remains useful regression evidence, but its forward role is to visualize Fibre-native life through production-independent service boundaries:

```text
identity / developmental context
  -> relationships and dependency
  -> personal + care plans
  -> enacted current situation
  -> history / memory / interpretation
  -> embodiment / provenance
```

The editor may consume Thread Directory plus authorized World/Presentation projections. It must not become a second semantic authority, a generic database browser or a direct mutation path.

A future remote Admin Thread Inspector may reuse these deterministic presentation concepts, but must use production-safe authenticated APIs rather than the editor's local token/session scheme.

## Public encounter boundary

insidefibre.com is not an operator surface. It receives public Thread Presentation/Directory projections and lets a visitor encounter a Thread where that person already is.

Thread Editor may explain private/operator-authorized causes. insidefibre.com shows only admitted exterior state appropriate to the encounter.

## Deployment boundary

These are applications, not Fibre semantic authorities. They live under `apps/` with deployment composition under `infra/deployments/`.

Cloudflare Access configuration and operator entitlements remain operational access controls; neither may become Thread-life authority.
