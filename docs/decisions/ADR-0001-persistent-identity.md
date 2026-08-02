---
id: adr-0001
status: accepted
date: 2026-08-02
---

# ADR-0001: Persistent identity is primary

## Context

Fibre requires a stable decision that humans and LLM workers can apply consistently across concept, architecture, implementation, and experiments.

## Decision

A Thread persists outside all temporary model and orchestration executions. Execution workers are replaceable machinery.

## Consequences

- Documentation, schemas, tests, and human artifacts must reflect this decision.
- Changes require a superseding ADR and updated validation evidence.
- The decision may increase implementation work, but it protects Fibre from collapsing into conventional orchestration.
