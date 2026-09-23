---
id: architecture-system-overview
status: accepted
last-reviewed: 2026-09-22
canonical: true
---

# System overview

Fibre has three primary planes:

1. **World state** — durable identity, history, relationships, plans, economy, contracts, artifacts, and consequential private state.
2. **Runtime** — event/time-triggered regulation, thaw, context synthesis, temporary cognition/tool execution, validation, and freeze.
3. **Applications** — Thread Editor, citizen directory, marketplace, human portal, and future Thread-built institutions.

The repository contains laws and machinery. Live world stores contain Threads. Temporary workers provide cognition.

## Important internal layers

A Thread's lived causality is not all LLM cognition:

```text
World reality
  -> LivedNow / CurrentSituation
  -> Situated Percept
  -> intrinsic regulation + cheap salience
  -> Interior Cognition when material
  -> semantic meaning / intention / ordinary choice
  -> validated World consequence
  -> experience / memory / relationship change
  -> future perception and planning
```

[`situated-perception-and-salience.md`](situated-perception-and-salience.md) defines the bounded exterior-perception and materiality seam. [`intrinsic-regulation.md`](intrinsic-regulation.md) defines the lower organism-like control layer. [`interior-cognition.md`](interior-cognition.md) defines the reusable private-mind boundary above them.

Situated Percept is not a second World store, Salience Gate is not a semantic motive engine, and neither replaces Interior Cognition. Meaning-bearing emotion, need, relationship state, memory and self-understanding remain natural-language-first and Thread-owned.

## Initial service boundaries

- World Kernel
- Intrinsic Regulation
- Thread Runtime
- Prompt Compiler
- Memory and Provenance
- Identity and Development
- Relationships and Lineage
- Economy and Ledger
- Task Marketplace
- Model Gateway
- Goal Guardian
- Self/Impact Auditor
- Event Processor

These names express semantic responsibility, not a requirement for one deployable service or package per line. Keep implementation boundaries as small as the current capability requires.

Cloud provider and orchestration framework remain adapters rather than domain dependencies.

The Model Gateway/runtime boundary treats provider output as fallible candidate machinery rather than authority. Provider-specific schema projection may improve compatibility, while Fibre-owned mechanical recovery and canonical validation remain provider-neutral. Domain authorities still own semantic admission and any retry budget. See [`model-output-recovery.md`](model-output-recovery.md).