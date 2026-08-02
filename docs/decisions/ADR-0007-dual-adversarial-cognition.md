---
id: adr-0007
status: accepted
date: 2026-08-02
---

# ADR-0007: Use Goal Guardian and Self Examiner

## Context

Fibre requires a stable decision that humans and LLM workers can apply consistently across concept, architecture, implementation, and experiments.

## Decision

Threads audit whether model output advances goals and whether claimed impact is evidence-based, with a Steward counterweight.

## Consequences

- Documentation, schemas, tests, and human artifacts must reflect this decision.
- Changes require a superseding ADR and updated validation evidence.
- The decision may increase implementation work, but it protects Fibre from collapsing into conventional orchestration.
