---
id: fibre-operator-surfaces
status: accepted
last-reviewed: 2026-09-16
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

### Thread population

The Activity workspace may expose a **Threads** population view beside Causal and Raw Activity.

Activity supplies population discovery only: a Thread appears because Activity has observed its `threadId`. Activity records must never be treated as authority for the person's name, sex, lifecycle, health, migration state or recoverability. Those facts are resolved at read time from World and the owning maintenance/reconciliation authorities.

Population statistics such as sex counts, health counts, migration availability and dead-letter counts are therefore computed from the authoritative Thread diagnoses returned for the Activity-discovered population, not from telemetry payloads.

Population inspection is operator-driven and bounded. It should not become a background polling loop or a second directory authority. Normal Activity auto-refresh may pause while the population view is active so population diagnosis does not create avoidable infrastructure load.

### Thread health and operator actions

Admin may diagnose and invoke bounded Thread maintenance actions, but the authority for each action remains in the owning Fibre service. The canonical semantics are defined in [`thread-migration-repair-recovery.md`](thread-migration-repair-recovery.md).

Admin must keep three operations visibly distinct:

- **Migrate Thread** — transform an older authoritative representation only when a named migration has legitimate evidence.
- **Fix Thread** — reconstruct state already derivable from current authority.
- **Recover** — reactivate one quarantined/dead-letter work item after its blocker is resolved.

A named migration may declare explicit operator inputs when its domain rule genuinely requires them. Admin may collect and pass only those migration-specific inputs; it must not expose a generic arbitrary-field editor as a substitute for migration authority.

A compound UI action such as **Fix & Recover** may sequence those operations but does not merge their authority. A Thread with unresolved `migration_required`, integrity conflict or operator-decision state remains quarantined rather than being retried merely because an operator opened the page.

Dead-letter reconciliation state and its last failure should be visible in Thread Observatory and the population view. `dead_letter` is operational quarantine, not a Thread lifecycle or personhood state.

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
