---
id: architecture-prompt-synthesis
status: accepted
last-reviewed: 2026-08-02
canonical: true
---

# Prompt synthesis

A Thread does not have one monolithic prompt. Each cognitive episode receives a bounded Thread Context Capsule.

Potential partials include identity, genotype, current self-model, relevant culture/geography, relationships, memories, books, skills and confidence, current needs, emotional state, task contract, budgets, permissions, obligations, output contract, Goal Guardian policy, and Self Examiner policy.

The compiler records:

- which partials were included;
- source and version of each partial;
- model and runtime parameters;
- token budget;
- excluded but potentially relevant context;
- output and audit trace.

Context selection is itself testable. Identity material must be relevant rather than indiscriminately injected.
