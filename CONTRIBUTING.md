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

Answer what applies; a change that only touches wording or tooling will answer little of it.

A change the **Vision and ambition guard** in [`AGENTS.md`](AGENTS.md) covers must also satisfy that guard and answer the [fidelity and ambition questions](docs/foundations/invariants.md#required-proposal-and-release-questions).

## Development versioning

Fibre is still in active development. Do not preserve obsolete executable versions by default.

- Prefer one current implementation. If no deployed or persisted data requires compatibility, replace or rename the implementation instead of adding another `v2`/`v3` compatibility branch.
- Keep parallel executable versions only when a real compatibility boundary exists: persisted data, an external wire/API contract, a migration that must run across versions, or another explicitly supported consumer.
- Frozen experiments may keep versioned artifacts, digests, protocols, and review packets so the evidence remains attributable. That does **not** require current runtime code to reconstruct or execute an obsolete experiment byte-for-byte.
- When an experiment or recovery path is retired, remove its executable CLI/runner/compatibility layer unless a current tool still depends on it. Preserve the result/failure evidence instead.
- Consolidate tests onto the current invariant or regression class rather than retaining exact compatibility tests for undeployed development history.

A version label used to identify evidence is not, by itself, a reason to keep a second implementation alive.

## Test lifecycle

When adding or materially changing non-trivial tests, classify their intended lifecycle as **permanent**, **regression**, or **milestone** when that lifecycle is not already obvious. Milestone-scoped tests remain active while the milestone is open; the marker exists so they can be explicitly deleted, consolidated, or promoted when the milestone closes rather than accumulating indefinitely.

See [`docs/validation/test-lifecycle-best-practice.md`](docs/validation/test-lifecycle-best-practice.md) for the metadata convention, classification guidance, and milestone-closeout procedure.

Never treat a compelling LLM-generated proposal as accepted merely because it is well written.
