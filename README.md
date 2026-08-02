# Fibre

**Fibre is a framework and persistent world for artificial persons called Threads.**

A Thread is not a temporary prompt or agent process. It is a durable person-like identity with inherited personality, family and cultural context, memories, relationships, economic accounts, reputation, obligations, embodiment, and a developmental history. Most of the time a Thread is frozen as persistent world state. Fibre thaws it into temporary cognition through replaceable LLM workers, lets it think, work, communicate, audit its own results, and then freezes validated life changes back into the world.

This repository is the canonical, version-controlled source for Fibre's concept, architecture, experiments, implementation, tests, and human-visible artifacts. **Live Threads do not live in Git.** The repository contains the laws and machinery of Fibre; databases and object stores contain the living world.

## Start here

1. Read [`docs/vision/constitution.md`](docs/vision/constitution.md).
2. Read [`docs/state/current-state.md`](docs/state/current-state.md).
3. Read [`docs/vision/invariants.md`](docs/vision/invariants.md).
4. For implementation, read [`docs/architecture/system-overview.md`](docs/architecture/system-overview.md).
5. For LLM workers, read [`AGENTS.md`](AGENTS.md).

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

## Quick commands

```bash
npm run build
npm test
npm run validate
npm run context-pack
npm run editor
```

Then open <http://localhost:4173>.

## Current status

`v0.1-concept-foundation`: concept captured, schemas and synthetic fixtures established, minimal domain package and Thread Editor prototype included. No production world database or LLM integration exists yet.

## License

Private research and development repository. See [`LICENSE`](LICENSE).
