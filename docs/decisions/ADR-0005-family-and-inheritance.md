---
id: adr-0005
status: accepted
date: 2026-08-02
---

# ADR-0005: Family and inheritance are first-class

## Context

Fibre requires a stable decision that humans and LLM workers can apply consistently across concept, architecture, implementation, and experiments.

## Decision

Threads may form couples, create children through mixed traits and mutation, support relatives, and transfer FCs and cultural history.

## Consequences

- Documentation, schemas, tests, and human artifacts must reflect this decision.
- Changes require a superseding ADR and updated validation evidence.
- The decision may increase implementation work, but it protects Fibre from collapsing into conventional orchestration.
