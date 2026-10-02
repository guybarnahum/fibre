---
id: fibre-operator-surfaces
status: accepted
last-reviewed: 2026-09-30
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

World Thread Registry defines the admitted population. Activity only annotates recent observation and may surface identifiers that were observed operationally but never admitted as Threads; those remain explicitly outside the admitted population. Activity records must never be treated as authority for the person's name, sex, lifecycle, health, migration state or recoverability. Those facts are resolved at read time from World and the owning maintenance/reconciliation authorities.

Population statistics such as sex counts, health counts, migration availability and dead-letter counts are therefore computed from authoritative World-derived Thread rows, not from telemetry payloads.

Population inspection is operator-driven and bounded. It should not become a background polling loop or a second directory authority. Normal Activity auto-refresh may pause while the population view is active so population diagnosis does not create avoidable infrastructure load.

While Threads is open, the same single Admin live connection used by other operator views carries best-effort Thread invalidation hints. Thread Presentation publishes those hints only through the provider-neutral `InfraDriver.realtime` capability; no Fibre semantic code depends on Durable Objects, WebSocket sessions or another cloud primitive. The deployment adapter owns the browser transport. Cloudflare currently maps that transport and the `admin` realtime channel to one environment-wide Admin-live Durable Object; another provider may realize the same capability differently. A normal Thread hint causes one exact authoritative reread for that Thread and replaces only that row; an open Thread Observatory also rereads that same Thread rather than remaining stale until reopened. The browser recomputes table statistics and map presentation from its already-authoritative local population state. It must not call the full population endpoint for a single-Thread mutation. A live reconnect is different: because hints may have been missed while disconnected, Admin performs one bounded full population reconciliation. Visual reconciliation has two authoritative edges: when World requeues work it emits a reconciliation hint so Admin can show `pending` immediately, and after World commits completion or terminal dead-letter it emits the final reconciliation hint. The browser therefore cannot depend on reload timing for either transition. Presentation-only media changes may emit Presentation invalidation hints, but raw asset or intermediate FID/Presentation completion is never treated as World readiness.

### Appearance workbench

Admin **Appearance** is a top-level operator surface over Population Lab coverage, not a second appearance engine and not a subview of Threads, Birth Center or Stillborn.

Its A1 responsibilities are deliberately read-mostly and cheap:

- one bounded World scan of admitted Thread birth-location context plus durable maternal/paternal physical ancestry;
- the shared Population Lab coverage engine classifies explicit, partial, broad, fallback and missing calibration coverage;
- ranked holes are mapped only as represented Thread/family context, never as geographic phenotype inference;
- the model matrix exposes each reference node's local version, parent, calibrated axes and stable population IDs;
- the workbench exposes existing Threads whose stored appearance-calibration dependencies differ from the current registry;
- experiment and research controls prepare explicit Population Lab action specifications in A1; they do not mutate calibration authority.

Thread migration domains remain semantically separate in their owning surfaces, but the Threads population view deliberately exposes only one **Needs migration** filter backed by authoritative `migration_required` health. Appearance-specific impact belongs in Admin Appearance; identity-specific migration detail belongs in Thread Health/Observatory. The population table does not become a second migration taxonomy UI.

### Appearance / Population Lab

Admin **Appearance** is the operator control surface over the shared Population Lab and current Human Appearance registry. It is not a second appearance model and does not infer ancestry in the browser.

World supplies one bounded authoritative projection of:
- admitted Threads;
- canonical birth-location context for mapping demand;
- durable maternal/paternal physical ancestry evidence;
- the calibration dependency snapshot consumed by the current physical genome.

The shared Population Lab coverage engine combines those facts with the current reference-population registry and reports:
- explicit, partial, broad, fallback and missing coverage;
- ranked coverage holes based on actual Thread lineage demand;
- represented locations as context only;
- current reference-node versions and inheritance chains;
- existing Threads whose stored appearance dependencies no longer match the current registry.

The map answers **where Fibre currently has demand for weak calibration**. It must never be interpreted as a map of how people in a country look.

A1 kept expensive work explicit through prepared action specifications. A2 now lets the operator **Run experiment** for a coverage hole that already resolves to durable physical-ancestry evidence. Admin queues a bounded controlled physical cohort through a Cloudflare Workflow and returns immediately; Population Lab persists the manifest, cohort, diagnostics and report through InfraDriver. Missing-provenance holes cannot run a calibration experiment because geography is not ancestry authority. **Prepare research** remains specification-only until A3. Experiment output is evidence only and cannot change appearance authority.

A future approved calibration changes the authoritative versioned registry. That approval deterministically exposes only affected Threads as appearance migration candidates. Threads view provides:
- **Needs migration** — all authoritative `migration_required` Threads;
- **Appearance migration** — only migration-required Threads whose affected domain is appearance;
- **Identity migration** — the corresponding identity-domain subset.

Filters are projections of World health/migration domains, never inferred from whether an action button happens to be rendered.

### Thread health and operator actions

Admin may diagnose and invoke bounded Thread maintenance actions, but the authority for each action remains in the owning Fibre service. The canonical semantics are defined in [`thread-migration-repair-recovery.md`](thread-migration-repair-recovery.md).

Admin must keep three operations visibly distinct:

- **Migrate Thread** — transform an older authoritative representation only when a named migration has legitimate evidence.
- **Fix Thread** — reconstruct state already derivable from current authority.
- **Recover** — reactivate one quarantined/dead-letter work item after its blocker is resolved.

A named migration may declare explicit operator inputs when its domain rule genuinely requires them. Admin may collect and pass only those migration-specific inputs; it must not expose a generic arbitrary-field editor as a substitute for migration authority.

Appearance authority is likewise not generic **Fix**. Thread Details has a dedicated **Appearance** surface for the ordinary inherited-appearance workflow: missing/outdated physical authority uses **Migrate appearance / Upgrade appearance model**, while a current healthy model uses **Re-render appearance**. Recorded parental physical-origin evidence is shown and reused. If none exists, Fibre should preselect one editable maternal/paternal family path from its ranked place/era population context rather than leave required fields empty; the operator may override any proposed value. The proposal is operator assistance, not ancestry authority. Admin also pre-fills routine migration and re-render reasons so the operator edits only when the default is wrong. Admin collects only the explicit inputs declared by World. The browser submits one authority action and never rerolls. Pending appearance work uses the single Admin live invalidation socket rather than a status polling loop. A completion hint triggers one authoritative reread of the affected view; the hint itself carries no Thread state and is never semantic authority.

Changing the canonical specification manually remains an exceptional correction rather than ordinary Admin maintenance. The procedure is defined in [`canonical-visual-identity.md`](canonical-visual-identity.md#operator-runbook-correcting-appearance) and [Appearance operations](../operations/appearance.md).


### Appearance coverage workbench

Admin **Appearance** is the operator UI over the shared Population Lab coverage engine. It does not own phenotype logic, ancestry inference or calibration authority.

One bounded World scan supplies authoritative Thread facts: admitted Thread identity/location plus durable maternal/paternal physical-ancestry evidence. Population Lab classifies those facts against the current versioned reference-population hierarchy and returns:

- explicit, partial, broad, fallback and missing coverage counts;
- ranked coverage holes weighted by actual Thread lineage demand;
- represented birth locations for mapping demand context;
- the current reference-population/version matrix;
- existing Threads whose stored calibration dependency snapshot differs from current authority.

The map must never be interpreted as a country-to-face mapping. Location is context for where Fibre's represented families occur; durable ancestry evidence selects the physical reference.

A1 kept expensive actions explicit through prepared action specifications. A2 now executes bounded Population Lab experiments while preserving that explicit operator boundary: **Run experiment** queues the model-free numerical cohort, and a completed experiment may optionally **Run visuals** for a four-person geometry-first fidelity sample through Asset Generator. **Prepare research** remains specification-only until A3. Neither experiment path can modify calibration authority.

The Threads population view exposes one **Needs migration** filter for all `migration_required` Threads. Filtering is presentation only; World health remains authority.

An approved appearance calibration is expected to invalidate/recompute the affected migration projection so dependent Threads become visible as `migration_required`. Unrelated Threads must remain healthy. Existing Thread migration remains explicit; Admin does not silently rewrite a person's physical authority merely because a new calibration was approved.

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
