# Fibre

**Fibre is a framework and persistent world for artificial persons called Threads.**

A Thread is not a temporary prompt or agent process. It is a durable person-like identity with inherited personality, family and cultural context, memories, relationships, economic accounts, reputation, obligations, embodiment, a private interior life, and developmental history. Most of the time a Thread is frozen as persistent world state. Fibre thaws it into temporary cognition through replaceable LLM workers, lets it privately appraise and authorize participation, think, work, communicate through interest-mediated expression, audit results, and freeze validated life changes back into the world.

This repository is the canonical, version-controlled source for Fibre's concept, architecture, experiments, implementation, tests, and human-visible artifacts. **Live Threads do not live in Git.** The repository contains the laws and machinery of Fibre; databases and object stores contain the living world.

## Start here

1. Read [`docs/vision/constitution.md`](docs/vision/constitution.md).
2. Read [`docs/state/current-state.md`](docs/state/current-state.md).
3. Read [`docs/vision/invariants.md`](docs/vision/invariants.md).
4. Read [`docs/concepts/interiority-and-expression.md`](docs/concepts/interiority-and-expression.md).
5. For implementation, read [`docs/architecture/system-overview.md`](docs/architecture/system-overview.md).
6. For LLM workers, read [`AGENTS.md`](AGENTS.md).

## Repository map

- `docs/` — canonical concepts, architecture, use cases, decisions, validation, and history.
- `apps/thread-editor/` — a dependency-free human-inspectable Thread Editor prototype.
- `packages/domain/` — portable Fibre domain types and freeze/thaw logic.
- `services/` — service boundaries and implementation contracts.
- `schemas/` — machine-readable schemas for Thread, memory, task, contract, and ledger records.
- `fixtures/` — synthetic Threads and world states for tests only.
- `scenarios/` — executable canonical use-case populations.
- `experiments/` — falsifiable behavioral experiments.
- `artifacts/` — white papers, proposals, diagrams, and generated context packs.
- `source-material/` — historical source documents; not automatically canonical.

## AI context packs

[`docs/ai-context-manifest.json`](docs/ai-context-manifest.json) is the canonical machine-readable source for bounded LLM context. Run `npm run context-pack` to generate:

- `artifacts/generated/fibre-core-context.md` — minimum Fibre identity, interiority, dignity, and invariant context.
- `artifacts/generated/fibre-request-processing-context.md` — private appraisal, authorization, disclosure, affect, and response behavior.
- `artifacts/generated/fibre-full-context.md` — broad cross-cutting concept, milestone, and architecture context.
- `artifacts/generated/fibre-context-pack.md` — compatibility alias for the full profile.

Generated packs include the repository revision, manifest version, source list, and content digest. They are reproducible build artifacts, ignored by Git, and never canonical. External LLMs should receive the smallest profile sufficient for the task.

Every accepted canonical Markdown document under `docs/` must appear in at least one manifest profile. Repository validation enforces full canonical-document coverage. `npm run check` builds and tests the domain package, rejects textual or symlink context-path escapes, generates all packs deterministically, and validates the resulting outputs.

## Quick commands

```bash
npm run build
npm test
npm run validate
npm run context-pack
npm run check
npm run editor
```

Then open <http://localhost:4173>.

## Current status

`v0.1-concept-foundation`: concepts, schemas, synthetic fixtures, minimal domain package, Thread Editor prototype, and bounded AI context publication are present. The portable request flow includes Thread-owned appraisal context with inclusion/exclusion traces, SHA-256 request-content binding, private stance, request-bound authorization, recorded-obligation overrides, evidence-bearing relationship effects, restricted disclosure strategy, and audience-visible response separation.

No production world database, private-state access-control system, event-consumed authorization capability, persistent relationship aggregate, or live LLM integration exists yet.

## License

Private research and development repository. See [`LICENSE`](LICENSE).
