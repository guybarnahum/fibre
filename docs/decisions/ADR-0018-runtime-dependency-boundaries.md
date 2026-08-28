---
id: ADR-0018
status: accepted
last-reviewed: 2026-08-25
---

# ADR-0018: Runtime ownership and import boundaries

## Status

Accepted.

## Context

Fibre's semantic architecture is increasingly modular, but repository topology and imports still encode historical implementation convenience:

- reusable infrastructure lives under a generic `packages/` bucket while a second top-level `infra/` tree exists;
- a shared Civil Identity contract is mixed with an older parallel Thread/domain prototype;
- Thread Presentation is nominally a service but still re-exports substantial implementation from World Kernel;
- cross-owner callers use repository aliases and private `src/` paths, which makes ownership and relocation brittle.

ADR-0017 already establishes the provider-neutral production-persistence direction:

```text
semantic authority -> domain store/repository -> InfraDriver -> provider adapter
```

This decision makes the repository and import graph express that architecture directly.

## Decision

Fibre runtime code is organized by durable ownership, and cross-owner dependencies use stable named `@fibre/...` package entry points rather than repository-relative or private-source paths.

The durable repository roles are:

- `services/` — durable Fibre capabilities and application behavior;
- `domain/` — semantic contracts genuinely shared by multiple capability owners;
- `infra/` — provider-neutral technical capability contracts and provider adapters;
- `apps/` — user-facing applications;
- `tools/` — development, validation, inspection, replay and operator machinery.

A generic `packages/` directory is not an architectural role. npm workspace mechanics must follow repository ownership rather than define it.

## Import rule

Cross-owner runtime dependencies use public package identities, for example:

```js
import { normalizeFibreCivilRegistration } from "@fibre/domain/civil-identity";
import { InfraDriver } from "@fibre/infra";
import { createThreadPresentationServer } from "@fibre/thread-presentation";
```

A runtime owner must not:

- traverse into another owner with `../`;
- import another owner's private `src/` path;
- depend on a root alias whose only purpose is to expose another owner's repository location.

Within one tightly owned module, `./local-module.mjs` is normal. Existing same-owner `../` imports are migration debt rather than a reason for a repo-wide rewrite in one change; they should disappear as capability entry points and internal structure become clearer.

`package.json#exports` defines each cross-owner public surface. Repository validation must enforce the boundary mechanically.

## Shared domain rule

A contract belongs in `domain/` only when multiple real capability owners must agree on the same Fibre meaning and representation.

Civil Identity is a current example: Birth Center, World Kernel and Thread Presentation all consume the same normalized registration/FIN contract.

`domain/` must not become a second application layer or a historical grab bag. Service behavior, persistence, orchestration and capability-specific semantics stay with their owning service. Older parallel implementations should be audited for unique current invariants and then removed or reconciled rather than extended indefinitely.

## Infrastructure rule

`infra/` is the repository home of `@fibre/infra` and implements ADR-0017. Services depend on infrastructure underneath semantic stores and application behavior; generic infrastructure APIs do not replace Fibre semantic authorities such as WorldStore, MemoryStore, CivilRegistryStore or Genesis publication.

Provider-native identifiers and mechanisms remain below the infrastructure boundary or in explicitly classified operational metadata.

## Service ownership rule

A capability physically owns implementation that exists only to realize that capability. A service facade that mainly re-exports another service's private files is transitional debt.

World Kernel remains an authoritative consistency boundary where Fibre semantics require atomicity. This decision favors a modular monolith where appropriate; it does not require network microservices.

Pure capability tests should live with the capability. Cross-domain integration tests may remain with the authority whose integrated behavior they prove.

## Deployment rule

Provider-specific process wiring is a small composition root. It may construct provider drivers and Fibre services, but it may not become a second semantic implementation.

Provider-specific fixture/debug behavior remains explicitly gated and should migrate to development/e2e harnesses when doing so clarifies the production boundary.

## Compatibility rule

Structural cleanup preserves external runtime inputs and outputs by default: serialized records, routes, environment variables, durable schema versions, packet/event shapes, hashes and error contracts remain unchanged unless a separate decision explicitly justifies a compatibility break.

Moving code between owners is not permission to change Fibre semantics.

Genesis Pass A/B/C runtime naming and ownership churn remains deferred until #39 closes, so the final Birth Center / World Kernel seam follows proven behavior rather than guessing it in advance.

## Consequences

- `packages/` is retired in favor of explicit `domain/` and `infra/` ownership;
- shared contracts must earn their place through demonstrated reuse;
- cross-owner runtime imports become stable `@fibre/...` dependencies;
- Thread Presentation and other capabilities expose real public seams rather than private reach-throughs;
- repository tests enforce dependency direction;
- npm workspaces and clean installation become part of the repository build contract rather than developer-machine assumptions.

The staged implementation is documented in [`../architecture/runtime-structure.md`](../architecture/runtime-structure.md). Production persistence remains governed by [ADR-0017](ADR-0017-provider-neutral-production-persistence.md).
