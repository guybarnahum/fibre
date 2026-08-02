---
id: adr-0002
status: accepted
date: 2026-08-02
---

# ADR-0002: Natural language is canonical for meaning-bearing fields

## Context

Fibre requires a stable decision that humans and LLM workers can apply consistently across concept, architecture, implementation, and experiments.

## Decision

Identity, needs, skills, relationships, reputation, and task meaning are stored primarily as prompt-native prose. Numeric data supports measurement and control.

## Consequences

- Documentation, schemas, tests, and human artifacts must reflect this decision.
- Changes require a superseding ADR and updated validation evidence.
- The decision may increase implementation work, but it protects Fibre from collapsing into conventional orchestration.
