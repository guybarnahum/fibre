---
id: adr-0008
status: accepted
date: 2026-08-02
---

# ADR-0008: Live Threads do not live in Git

## Context

Fibre requires a stable decision that humans and LLM workers can apply consistently across concept, architecture, implementation, and experiments.

## Decision

The repository contains laws, code, schemas, fixtures, editor, experiments, and artifacts. Live Thread aggregates live in world storage and are accessed through validated APIs.

## Consequences

- Documentation, schemas, tests, and human artifacts must reflect this decision.
- Changes require a superseding ADR and updated validation evidence.
- The decision may increase implementation work, but it protects Fibre from collapsing into conventional orchestration.
