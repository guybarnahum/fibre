# Architecture

How the current system is built to hold Fibre's concepts.

Architecture documents define current technical authorities, boundaries, flows, storage and runtime contracts, and system structures that realize accepted concepts and foundations.

## Runtime ownership and dependencies

[`runtime-structure.md`](runtime-structure.md) defines the repository's runtime ownership model: durable capabilities under `services/`, genuinely shared semantic contracts under `domain/`, provider-neutral technical capabilities under `infra/`, and stable `@fibre/...` imports across ownership boundaries.

The corresponding accepted decision is [`../decisions/ADR-0018-runtime-dependency-boundaries.md`](../decisions/ADR-0018-runtime-dependency-boundaries.md).

## Cross-cutting storage and infrastructure

The accepted production persistence rule is [`production-persistence.md`](production-persistence.md): every persistent production state or byte object used by a Fibre service crosses a provider-neutral `InfraDriver` capability, while semantic domain stores remain the authority for Fibre meaning and invariants.

Read it together with:

- [`storage-model.md`](storage-model.md) — semantic storage authorities, replay, atomicity, and repository/world separation;
- [`infrastructure-driver.md`](infrastructure-driver.md) — the evolving provider-neutral capability bundle and concrete port designs;
- [`cloud-e2e-closure-plan.md`](cloud-e2e-closure-plan.md) — the active live-Cloudflare acceptance slices from one genuine cloud birth through public media, retry/restart hardening, and empty-environment rebuild.

The persistence rule applies to all services and generated production artifacts. Presentation is only the first vertical slice that implemented the pattern.

## Recorded forward architecture

- [`temporal-world-reuse.md`](temporal-world-reuse.md) records the M2 data-model optimization direction for reusable `PlaceSpec`, temporal `WorldSlice`, and Thread-specific `ThreadWorldContext` rather than repeatedly regenerating one monolithic World per Thread.
- [`runtime-activity-log.md`](runtime-activity-log.md) proposes a small non-authoritative global Activity Log for success/failure/retry visibility across Genesis, World, media, Presentation, Viewer and later lived Experiences.

These documents preserve forward architecture without claiming the deferred mechanisms are already implemented or authoritative.

## Naming and lifecycle

The one current architecture document for a concept should have a semantic name such as `birth-center-runtime.md` or `identity-embodiment-contract.md`. Milestone labels (`m2`, `pr39`, slices, stages, passes) and implementation-version suffixes (`-v1`, `-v0.1`) do not belong in the permanent filename merely because that is when the design was introduced.

A version remains part of the name only when the version itself is the subject: for example a frozen wire protocol, schema, migration, compatibility contract, or historical record. Current architecture may document the active protocol/schema version inside the document without adopting that version as the document's identity.

Superseded architecture normally remains available through Git history. Preserve a selected earlier formulation under `docs/history/` only when understanding the old design and why it changed has continuing explanatory value.
