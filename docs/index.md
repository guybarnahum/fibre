# Fibre documentation

The documentation is modular so humans and LLM workers can load only the context needed for a task.

## Canonical order

1. `vision/constitution.md`
2. `vision/invariants.md`
3. `state/current-state.md`
4. Relevant concept or architecture document
5. Related ADRs
6. Validation and scenario tests

## Authority

- Accepted documents under `docs/vision`, `docs/concepts`, and `docs/architecture` are canonical.
- ADRs explain why durable decisions were made.
- `docs/state/current-state.md` is the compact current summary.
- `source-material/` and `docs/history/` preserve provenance but may contain superseded terminology.
- Generated white papers and proposal documents are publications, not independent sources of truth.
