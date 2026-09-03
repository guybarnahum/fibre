---
id: fibre-future-capability-map
status: accepted
last-reviewed: 2026-09-02
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

## Follow-on: Activity lifecycle and compaction

Activity is diagnostic and non-authoritative, so successful process execution should eventually be compactable without weakening World, Birth Center, Presentation, or Asset Generator authority.

Retain this as a follow-on design direction rather than current critical-path work:

- group intermediate Activity records under a stable process-run identity such as `processRunId`;
- represent terminal process state once at the run level (`active`, `completed`, `failed`) rather than rewriting every intermediate row after completion;
- classify Activity retention semantics explicitly, for example `transient`, `diagnostic`, `evidence`, and `terminal`;
- only successful terminal runs become eligible for routine compaction, and only after a grace period suitable for recent debugging;
- preserve failures, retries, warnings, provider/reconciliation evidence, meaningful state-changing milestones, and the terminal outcome;
- compact routine successful intermediate rows into a surviving terminal summary containing enough diagnostics to explain the run (duration, stage count, retry count, significant stages, and relevant provider/job references where appropriate);
- never compact an active or incomplete process;
- use periodic housekeeping as the normal trigger and D1 pressure as an accelerator for already-eligible runs, not as permission for a more aggressive semantic retention policy;
- suppress meaningless Activity at creation time independently of compaction: admission discipline prevents noise, while compaction manages legitimate high-volume process history.

Any implementation should remain deterministic and auditable. D1 pressure or storage thresholds may change *when* eligible records are compacted, but must not change *which semantic classes* Fibre is allowed to discard.

## Recreation rule

A removed namespace should normally return only when at least one of these is true:

1. real implementation and tests need a stable home;
2. a deployable or operational boundary exists;
3. an accepted ADR or architecture contract declares a distinct authority boundary;
4. multiple current consumers need a shared namespace.

Future capability names are cheap to recreate. Empty directories are not architecture.