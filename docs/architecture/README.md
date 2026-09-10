# Architecture

How the current system is built to hold Fibre's concepts.

Architecture documents define technical authorities, boundaries, flows, storage/runtime contracts, and system structures that realize accepted concepts and foundations.

## Current organism architecture

- [`system-overview.md`](system-overview.md) — primary planes and responsibility boundaries.
- [`intrinsic-regulation.md`](intrinsic-regulation.md) — private predictive drives, intrinsic affect, interoception, person/place presence targets, and the active R1-R4 detour.
- [`../concepts/emotions-and-needs.md`](../concepts/emotions-and-needs.md) — meaning-bearing semantic emotion/need doctrine above the regulatory layer.
- [`thread-lifecycle.md`](thread-lifecycle.md) — activation, cognition, freeze and lifecycle behavior.

## Runtime ownership and dependencies

[`runtime-structure.md`](runtime-structure.md) defines repository ownership: durable capabilities under `services/`, genuinely shared semantic contracts under `domain/`, provider-neutral technical capabilities under `infra/`, and stable `@fibre/...` imports across ownership boundaries.

The corresponding accepted decision is [`../decisions/ADR-0018-runtime-dependency-boundaries.md`](../decisions/ADR-0018-runtime-dependency-boundaries.md).

## Cross-cutting storage and infrastructure

[`production-persistence.md`](production-persistence.md) defines the accepted persistence rule: persistent production state/objects cross provider-neutral infrastructure capabilities while semantic domain stores remain authoritative for Fibre meaning and invariants.

Read with:

- [`storage-model.md`](storage-model.md) — authorities, replay and atomicity;
- [`infrastructure-driver.md`](infrastructure-driver.md) — provider-neutral capability ports;
- [`cloud-e2e-closure-plan.md`](cloud-e2e-closure-plan.md) — completed Cloudflare E2E/recovery design record.

Infrastructure is not an independent completion program; build it when a lived Fibre capability requires it.

## Recorded forward architecture

- [`temporal-world-reuse.md`](temporal-world-reuse.md) records reusable `PlaceSpec`, temporal `WorldSlice`, and Thread-specific `ThreadWorldContext` direction.
- [`runtime-activity-log.md`](runtime-activity-log.md) proposes a small non-authoritative Activity Log for operational visibility.

Forward documents do not claim deferred mechanisms are implemented or authoritative.

## Naming and lifecycle

The current architecture document for a concept should have a semantic name such as `intrinsic-regulation.md`, `birth-center-runtime.md` or `identity-embodiment-contract.md`. Milestone labels and implementation-version suffixes do not belong in permanent filenames merely because that is when a design was introduced.

Superseded architecture normally remains available through Git history. Preserve selected earlier formulations under `docs/history/` only when they retain explanatory value.