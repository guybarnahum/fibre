---
id: architecture-prompt-synthesis
status: accepted
last-reviewed: 2026-08-04
canonical: true
---

# Prompt synthesis

A Thread does not have one monolithic prompt. Each cognitive episode receives a bounded context capsule.

## Request appraisal capsule

An externally initiated request first receives a limited Request Appraisal Capsule. Potential partials include identity, genotype, current self-model, relevant values and roles, skills, current needs, emotional state, requester identity, stated need, relationship history, obligations, prior dignity outcomes, generic alternatives, and the versioned Dignity Guardian policy.

The appraisal capsule exists only to decide participation. It must not contain unnecessary task context or silently perform the requested work.

Its output proposes:

- a dignity score and band;
- natural-language factor judgments;
- feelings produced by the request;
- bounded fondness and resentment effects toward the requester;
- repair questions when missing context might improve dignity;
- one participation action: accept, clarify, negotiate, delegate, or refuse.

Only acceptance permits compilation of a full execution capsule.

## Execution capsule

After accepted participation, potential partials include identity, genotype, current self-model, relevant culture/geography, relationships, memories, books, skills and confidence, current needs, emotional state, task contract, budgets, permissions, obligations, output contract, the accepted dignity decision, Goal Guardian policy, and Self Examiner policy.

The compiler records:

- which partials were included;
- source and version of each partial;
- requester identity and request provenance;
- dignity policy, score, factors, and participation action;
- source and version of relationship context;
- model and runtime parameters;
- token budget;
- excluded but potentially relevant context;
- output and audit trace.

Context selection is itself testable. Identity and relationship material must be relevant rather than indiscriminately injected. The dignity preflight must remain smaller than full execution so refusal does not consume the resources required to perform the unwanted task.
