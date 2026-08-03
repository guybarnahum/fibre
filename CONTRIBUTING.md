# Contributing to Fibre

Fibre is currently a private concept and prototype project.

## Change types

- **Concept:** modifies what Fibre or a Thread means.
- **Architecture:** changes the laws, boundaries, or storage/runtime model.
- **Experiment:** tests a falsifiable behavioral hypothesis.
- **Implementation:** adds or changes production-oriented code.
- **Artifact:** improves human-visible documentation or demonstrations.

## Pull request checklist

- Which accepted concept does this implement or change?
- Which invariant supports or conflicts with it?
- Which canonical scenario demonstrates it?
- What observable behavior should change?
- What human-inspectable artifact demonstrates it?
- What drift risk does it introduce?
- Which ADR records the durable decision?
- What is deferred, which extension path stays open, and does anything become a permanent constraint?

Unless a change neither defers a capability nor moves a domain boundary, it must also satisfy the **Vision and ambition guard** in [`AGENTS.md`](AGENTS.md) and answer the fidelity and ambition questions in [`docs/vision/invariants.md`](docs/vision/invariants.md).

Never treat a compelling LLM-generated proposal as accepted merely because it is well written.
