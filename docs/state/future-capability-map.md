---
id: fibre-future-capability-map
status: accepted
last-reviewed: 2026-08-24
canonical: true
---

# Future capability map

This document preserves promising Fibre capability and product boundaries without keeping empty implementation directories in the checked-out repository.

A capability listed here is **design intent, not current architecture**. Its presence does not commit Fibre to a dedicated service, application, process, deployment unit, database, or API boundary. Create an implementation namespace when real code, tests, operational ownership, or an accepted architecture decision makes that boundary useful.

## Active near-term homes

### Infrastructure

Top-level `infra/` is intentionally retained as the home for near-term deployment and environment infrastructure. `packages/infra/` remains the home for reusable infrastructure adapters and persistence packages. These are complementary rather than duplicate boundaries.

### Thread Presentation

Thread Presentation is active work. Its provider-neutral capability home is `services/thread-presentation/`.

Current concrete machinery includes:

- `deployments/cloudflare/thread-presentation/` — current Cloudflare delivery and presentation read-model deployment;
- `services/asset-generator/` — provider-neutral generated presentation assets;
- `deployments/cloudflare/asset-generator/` — current Cloudflare Asset Generator deployment;
- `services/c2pa-local/` — local provenance/C2PA support;
- `fixtures/thread-presentation/` — reusable presentation fixtures;
- `docs/architecture/world-presentation.md` — accepted presentation authority and non-cognitive boundary.

Provider-neutral Thread-presentation orchestration and shared interfaces belong in the capability home as that machinery becomes real. Provider-specific executable composition belongs under `deployments/`. Do not create a second presentation authority merely to populate either directory.

## Product surfaces retained as design intent

The following former empty app roots remain useful product ideas but are not current applications:

- **Operator / administration UI** — formerly `apps/admin/`.
- **Thread-facing or public citizen experience** — formerly `apps/citizens/`; use Thread-centered naming when the product boundary becomes real.
- **Marketplace UI** — formerly `apps/marketplace/`.
- **General web experience** — formerly `apps/web/`.

## Capability boundaries retained as design intent

The following former empty service roots describe plausible future capabilities. They should become standalone services only if Fibre's real authority, deployment, scaling, ownership, or failure boundaries justify that split:

- economy;
- event processing;
- Semantic/Goal Guardian service boundary;
- identity service boundary;
- impact auditing;
- memory service boundary;
- model gateway;
- prompt/context compiler;
- relationships;
- task marketplace;
- Thread runtime.

Until then, the current implementation owns these capabilities where the code actually lives.

## Structural ideas retained without empty roots

- **Scenario / acceptance-world harness** — formerly `scenarios/`. Recreate a common scenario root when several current end-to-end worlds need one implementation home; otherwise use fixtures, colocated tests, and use-case docs.
- **Thread authoring/bootstrap templates** — formerly `templates/`. Recreate only if templates become current production semantics. Templates must never become a parallel Genesis biography authority.
- **Top-level test taxonomy** — formerly `tests/`. Recreate only if cross-cutting integration or end-to-end tests genuinely require a repository-level home. Prefer tests beside the code or tool they protect.

## Recreation rule

A removed namespace should normally return only when at least one of these is true:

1. real implementation and tests need a stable home;
2. a deployable or operational boundary exists;
3. an accepted ADR or architecture contract declares a distinct authority boundary;
4. multiple current consumers need a shared namespace.

Future capability names are cheap to recreate. Empty directories are not architecture.
