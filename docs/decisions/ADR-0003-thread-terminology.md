---
id: adr-0003
status: accepted
date: 2026-08-02
---

# ADR-0003: Use Thread as the canonical individual term

## Context

Fibre requires a stable decision that humans and LLM workers can apply consistently across concept, architecture, implementation, and experiments.

## Decision

Thread conveys time evolution, narrative continuity, social fabric, and engineering execution. Fibre names the broader world.

## Consequences

- Documentation, schemas, tests, and human artifacts must reflect this decision.
- Changes require a superseding ADR and updated validation evidence.
- The decision may increase implementation work, but it protects Fibre from collapsing into conventional orchestration.
