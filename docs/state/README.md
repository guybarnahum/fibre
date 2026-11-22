# Fibre state documents

Three live files own what is true about Fibre right now:

1. **[`public-progress.json`](public-progress.json)** (companion: [`public-progress.md`](public-progress.md), schema: [`public-progress.schema.json`](public-progress.schema.json)) — Canonical external truth in two layers (plain English first, accurate mechanism and limitation second). Consumed by public surfaces; external claims may never exceed it.
2. **[`current-state.md`](current-state.md)** — Engineering truth by capability, evidence level (`Source`, `Deployed`, `Observed`, `Standing`), and causal maturity.
3. **[`current-priorities.md`](current-priorities.md)** — Active execution tracks (Social life and Model efficiency) and immediate sequencing.

Older workstream status logs (`infra-pure.md`, `future-capability-map.md`, `thread-preservation-and-migration.md`, `unresolved-decisions.md`) are archived in Git history (`690b3f0`) per [ADR-0016](../decisions/ADR-0016-repository-retention.md).
