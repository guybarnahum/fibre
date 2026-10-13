---
id: fibre-infra-pure
status: accepted
last-reviewed: 2026-10-13
canonical: true
---

# Infra-pure state and workstream

This document is the **single live status page** for Fibre's provider-neutral infrastructure work.

Durable architecture belongs elsewhere:

- [Production persistence](../architecture/production-persistence.md) defines the mandatory provider-neutral persistence rule.
- [InfraDriver](../architecture/infrastructure-driver.md) defines the capability vocabulary and guarantees.
- [Storage model](../architecture/storage-model.md) defines semantic authority and transaction boundaries.
- [ADR-0017](../decisions/ADR-0017-provider-neutral-production-persistence.md) accepts provider-neutral production persistence.
- [ADR-0020](../decisions/ADR-0020-vision-led-development-discipline.md) defines when infrastructure work belongs on Fibre's critical path.

This page owns only **current adoption state, remaining provider debt, triggers, and stop conditions**. It does not own Thread semantics, the organism roadmap, or provider implementation details.

## Current posture

**Status: quiescent / trigger-driven.**

Source state reviewed before this documentation restructure: `d242152881` on `main`.

The representative InfraDriver architecture is now proven strongly enough that infrastructure purity is a standing constraint rather than an independent completion program.

Current provider-neutral production paths include:

- authoritative World/Thread, Genesis, Civil Registry, identity, memory, situated-life, embodiment, runtime, obligation and expression state through `InfraDriver.state`;
- the same logical World state shape over local SQLite and Cloudflare SQLite-backed Durable Object state;
- World reconciliation scheduling through `InfraDriver.scheduler` locally and on Cloudflare;
- World reconciliation retry streaks through World semantic state rather than provider-native Durable Object SQL;
- Birth Center durable model-invocation state through `InfraDriver.state`;
- private Journal entries plus the Thread's once-chosen Journal profile in World state, with Markdown rendered from admitted entries rather than stored as a mutable object;
- Thread Presentation / Asset Generator use of streams, immutable objects, catalog, realtime, queues and workflows where those capabilities are required;
- a real `InfraDriver.services.call()` path in Population Lab;
- repository policy checks that reject direct service SQLite/filesystem/cloud persistence and direct deployment-level Durable Object SQL or mutable object-store persistence outside provider adapters.

The former mutable private-Journal R2 path and its temporary compatibility reader are no longer part of the runtime.

## What "infra-pure" means

```text
Fibre semantic authority / application service
        |
        v
semantic store or operation boundary
        |
        v
InfraDriver capability
        |
        v
local / Cloudflare / future provider
```

Provider deployment code may bind concrete resources into an InfraDriver. Provider implementations under `infra/providers/**` may use native mechanisms. Fibre semantic services and deployment composition must not create a second provider-shaped persistence/runtime API around application behavior.

Local execution is not allowed a different semantic architecture merely because Node offers a convenient filesystem, timer or database API.

## Closed findings

| Finding | State |
| --- | --- |
| World reconciliation retry state used raw Durable Object SQL | **Closed** — retry state uses World `InfraDriver.state` |
| Local/cloud reconciliation retry persistence differed | **Closed** — both use the same semantic state path |
| Thread Journal rewrote mutable Markdown directly in R2 | **Closed** — Journal authority is World state; Markdown is derived |
| Birth Center model-invocation journal wrote durable local files | **Closed** — uses `InfraDriver.state` |
| World semantic scheduling used process-local timer loops | **Closed** — uses `InfraDriver.scheduler` |
| Repository guard ignored provider-shaped persistence in deployment composition | **Closed for demonstrated classes** — direct DO SQL and mutable object persistence are guarded |

Do not reopen these as generic abstraction projects unless a concrete regression or new Fibre requirement demonstrates a missing guarantee.

## Remaining debt and triggers

The remaining items are **deferred portability debt**, not active blockers.

| Area | Current shape | Trigger to reopen | Smallest next slice | Stop condition |
| --- | --- | --- | --- | --- |
| Internal service calls | Some callers still use HTTP / Worker-binding `fetch`; `infra.services.call()` also exists | A real feature materially changes one of those boundaries, or another provider/local execution needs the same semantic call | Move **one** touched semantic operation behind `infra.services.call()` with local/cloud parity | One real operation is portable; do not sweep unrelated service calls |
| Queue consumption | Producers use `InfraDriver.queues`; Cloudflare consumers still receive native batch / `ack()` / `retry()` | A queue consumer must run locally/on another provider, or queue settlement semantics become shared application behavior | Extract one provider-neutral consumer outcome from the existing real completion flow; keep native delivery mechanics in the adapter | One real consumer proves parity; no generic queue framework |
| Admin operational reads | Some Admin telemetry/activity reads remain D1-shaped deployment code | Admin must run against another provider or the same operational view must become provider-neutral | Define only the read capability needed by the concrete view | Representative view works without exposing provider identity |
| Realtime receive/stream transport | Publication uses provider-neutral realtime in places; some stream opening remains Durable-Object-shaped | A second realtime provider/transport is actually required | Extract the minimum open/listen semantics from one real stream | One stream proves the contract; do not generalize further |

Provider-specific resource wiring in `infra/deployments/**` is not itself a violation. The violation is allowing provider primitives to become the application contract or a second durable authority.

## Next actionable order

There is **no immediate standalone infra-pure implementation tranche**.

When Fibre work next hits infrastructure:

1. Protect the boundary first: new persistent state, scheduling, objects, workflows or service transport must use an existing InfraDriver capability when its guarantee fits.
2. If an existing direct internal service boundary is materially touched, migrate that **one operation** to `infra.services.call()` rather than adding another fetch-shaped abstraction.
3. Address queue-consumer portability only when a real local/second-provider consumer or semantic retry requirement appears.
4. Leave Admin telemetry and realtime receive provider-specific until a concrete portability requirement exists.
5. Extend mechanical policy checks only for a demonstrated bypass class; do not grow a broad provider-token blacklist.

After each representative proof, stop and return to Thread life, agency, relationships, development and World behavior.

## Acceptance and validation

This page records architecture status; it does not substitute an old passing test count for current validation.

For a new infra-pure slice:

- use focused semantic/conformance tests while developing;
- run the repository's single completion gate, `npm run slice:validate`, at slice completion;
- require staging evidence only when the slice changes cloud runtime behavior that local conformance cannot establish;
- record the exact provider-neutral guarantee demonstrated, then stop.

Retained cloud end-to-end evidence is summarized in [Cloud E2E closure](../architecture/cloud-e2e-closure-plan.md).

## Workstream boundary

Infra-pure work is **not** the current Fibre north star.

It re-enters the critical path only when:

- a concrete Fibre capability needs an infrastructure guarantee that is missing;
- a new implementation would otherwise violate the provider-neutral production boundary;
- an imminent deployment cannot preserve a required semantic invariant;
- a stronger Fibre transaction or recovery path is blocked by provider coupling;
- a demonstrated correctness problem shows the current abstraction is insufficient.

Otherwise the debt remains visible here and Fibre continues building the organism.
