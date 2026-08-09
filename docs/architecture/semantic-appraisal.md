---
id: architecture-semantic-appraisal
status: accepted
last-reviewed: 2026-08-08
canonical: true
---

# Semantic appraisal

Fibre owns the meaning and consequences of a Thread's dignity. A model invocation is not the source of dignity and is not the Thread. It is a temporary semantic worker used to interpret rich Thread-owned evidence in the context of a request.

> **Fibre owns dignity; the LLM supplies the world understanding needed to interpret it.**

## Why semantic appraisal needs broad world understanding

Dignity appraisal is not primarily a classification problem. It asks whether a request has individualized participation value for a particular person given identity, self-model, history, relationships, current semantic state, commitments, requester context, and the meaning of the request itself.

Correct appraisal therefore depends on more than lexical similarity or a fixed skill taxonomy. It may require:

- understanding paraphrases and preserving meaning across different wording;
- recognizing negation, aversion, qualification, and contradiction;
- relating roles and abilities to unfamiliar real-world tasks;
- distinguishing generic capability from individualized advantage;
- judging whether another competent person would be meaningfully interchangeable;
- understanding social and relational meaning;
- interpreting current needs or attitudes that can oppose an otherwise strong identity match;
- distinguishing respectful or urgent request framing from genuine individualized fit;
- applying commonsense and broad domain knowledge without requiring Fibre to pre-encode every possible request category.

A deterministic rules engine can handle explicit invariants and structured facts, but a sufficiently broad rule system for these semantic judgments quickly becomes brittle. Embedding similarity can help with retrieval or relevance, but similarity alone does not reliably resolve negation, conflict, social meaning, causal context, or interchangeability. A narrow classifier would require a large representative labeled distribution and would still inherit the limits of what it was trained to distinguish.

General-purpose LLMs are currently the practical non-brittle mechanism for this layer because their training exposes them to a very broad distribution of language, situations, domains, social conventions, and world knowledge. That breadth allows Fibre to keep identity and internal state semantically rich rather than forcing them into a large product-specific ontology merely to make appraisal computable.

This is a present implementation judgment, not a metaphysical requirement. Fibre requires **broad semantic and commonsense interpretation**; today a capable LLM is the practical worker for that function. A future model class could replace it if it provides equivalent semantic breadth, reliability, and grounding.

## Responsibility boundary

The semantic worker answers a narrow question:

```text
What does this supplied evidence mean for this individual's participation in this request?
```

Fibre remains authoritative for:

```text
What is true about the individual?
Which evidence is admissible?
Which state/history/relationship records are selected?
Which conclusions are structurally valid and sufficiently grounded?
What action is authorized?
What consequence is persisted?
```

The worker does not discover or invent the Thread's state. It does not own continuity, consent, authorization, persistence, routing, or life history. It interprets bounded evidence selected by Fibre and returns the smallest structured semantic judgment Fibre cannot safely derive itself.

## Deterministic logic still matters

Using an LLM for semantic appraisal does not imply that all dignity logic belongs in the model. Fibre should keep deterministic constraints outside cognition whenever the answer is structurally knowable. Examples include:

- evidence eligibility and provenance;
- requester/relationship target binding;
- impossible action combinations;
- explicit authorization boundaries;
- obligation applicability once represented structurally;
- persistence and replay;
- model/provider failure handling;
- validation and conservative normalization;
- delegation and routing to other individuals.

The architectural goal is therefore not "AI decides dignity." It is:

> **Fibre owns dignity and its consequences. A stateless semantic worker supplies broad world interpretation where deterministic state alone cannot resolve individualized participation fit.**

This keeps the person/world boundary stable even if the underlying model provider, model size, or semantic-worker implementation changes later.

## Relationship to reasoning workers

This note specializes the stateless-worker principles in [`prompt-synthesis.md`](./prompt-synthesis.md). The same design rule applies: the worker should know only the local semantic problem, actors, bounded evidence, atomic rules, and smallest required output. It does not need to understand Fibre, Threads, persistence, or the architecture that surrounds its call.
