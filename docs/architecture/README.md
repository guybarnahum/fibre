# Architecture

How the current system is built to hold Fibre's concepts.

Architecture documents define technical authorities, boundaries, flows, storage/runtime contracts, and system structures that realize accepted concepts and foundations.

## Current organism architecture

- [`system-overview.md`](system-overview.md) — primary planes and responsibility boundaries.
- [`intrinsic-regulation.md`](intrinsic-regulation.md) — private predictive drives, intrinsic affect, interoception, person/place presence targets, and the R1-R4 organismic substrate.
- [`regulation-drive-extensions.md`](regulation-drive-extensions.md) — **accepted plan, implementation open** for adding small evidenced drive evaluators, bounded genetic tuning, social scarcity, and considerate local-time/weekend contact through existing Body/World/Interior Cognition ([ADR-0025](../decisions/ADR-0025-extensible-body-regulation.md)).
- [`interior-cognition.md`](interior-cognition.md) — reusable private-thought pipeline from organismic pressure through developed-self deliberation to domain-specific stance, plan, reflection or meaning.
- [`lived-now-and-meetings.md`](lived-now-and-meetings.md) — continuous present-life reconciliation across dormancy, Flight Plan renewal, and Person/Thread meetings that enter already-existing lives.
- [`social-discovery-oracle.md`](social-discovery-oracle.md) — **Guy**, the accepted open social-discovery oracle for humans and Threads, Fibre Places and independent public directories; proposed slices distinguish discoverable opportunity from intention, actual attendance and voluntary encounter.
- [`situated-perception-and-salience.md`](situated-perception-and-salience.md) — grounded World opportunities and selective attention.
- [`encounters-and-experience.md`](encounters-and-experience.md) — one objective Encounter Story, separate Thread-specific attention, Experience and optional aftermath.
- [`live-encounters.md`](live-encounters.md) — asynchronous, interruptible encounter coordination without creating a turn owner or chat-session authority.
- [`../concepts/emotions-and-needs.md`](../concepts/emotions-and-needs.md) — meaning-bearing semantic emotion/need doctrine above the regulatory layer.
- [`thread-lifecycle.md`](thread-lifecycle.md) — activation, cognition, freeze and lifecycle behavior.
- [`thread-migration-repair-recovery.md`](thread-migration-repair-recovery.md) — canonical distinction between evolving old authoritative representations, reconstructing derivable state, and resuming quarantined work.

Implemented mechanisms are distinct from **accepted live proof**. See [N6 public acceptance](../validation/n6-public-lived-encounter-slices.md), [N7 live and social-causality acceptance](../validation/n7-live-encounter-slices.md), and [current priorities](../state/current-priorities.md) for the open gates.

## Runtime ownership and dependencies

[`runtime-structure.md`](runtime-structure.md) defines repository ownership: durable capabilities under `services/`, genuinely shared semantic contracts under `domain/`, provider-neutral technical capabilities under `infra/`, and stable `@fibre/...` imports across ownership boundaries.

The corresponding accepted decision is [`../decisions/ADR-0018-runtime-dependency-boundaries.md`](../decisions/ADR-0018-runtime-dependency-boundaries.md).

## Cross-cutting storage and infrastructure

[`production-persistence.md`](production-persistence.md) defines the accepted persistence rule: persistent production state/objects cross provider-neutral infrastructure capabilities while semantic domain stores remain authoritative for Fibre meaning and invariants.

Read with:

- [`storage-model.md`](storage-model.md) — authorities, replay and atomicity;
- [`infrastructure-driver.md`](infrastructure-driver.md) — provider-neutral capability ports;
- [`../state/infra-pure.md`](../state/infra-pure.md) — **live adoption/debt workstream**, including triggers and stop conditions;
- [`thread-migration-repair-recovery.md`](thread-migration-repair-recovery.md) — evidence, provenance and quarantine rules for migration/repair/recovery;
- [`cloud-e2e-closure-plan.md`](cloud-e2e-closure-plan.md) — retained G/H public cloud birth and minimum recovery result; empty-environment rebuild remains an unverified separate proof.

Architecture documents above own the durable rules. The live infra-pure workstream is isolated under `docs/state/`; infrastructure is not an independent completion program and reopens only when a lived Fibre capability or invariant requires it.

## Recorded forward architecture

- [`temporal-world-reuse.md`](temporal-world-reuse.md) records reusable `PlaceSpec`, temporal `WorldSlice`, and Thread-specific `ThreadWorldContext` direction.
- [`runtime-activity-log.md`](runtime-activity-log.md) proposes a small non-authoritative Activity Log for operational visibility.

Forward documents do not claim deferred mechanisms are implemented or authoritative.

## Naming and lifecycle

The current architecture document for a concept should have a semantic name such as `intrinsic-regulation.md`, `birth-center-runtime.md` or `identity-embodiment-contract.md`. Milestone labels and implementation-version suffixes do not belong in permanent filenames merely because that is when a design was introduced.

Superseded architecture normally remains available through Git history. Preserve selected earlier formulations under `docs/history/` only when they retain explanatory value.