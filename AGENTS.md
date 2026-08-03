# Fibre repository instructions

## Project purpose

Fibre is a framework and world for persistent artificial persons called **Threads**. A Thread has identity, history, lineage, culture, relationships, resources, economic activity, and developmental continuity across many temporary model executions.

## Required reading

Before changing core concepts, read:

- `docs/vision/constitution.md`
- `docs/vision/invariants.md`
- `docs/vision/glossary.md`
- `docs/state/current-state.md`

For architecture work, also read:

- `docs/architecture/system-overview.md`
- `docs/architecture/thread-lifecycle.md`
- `docs/architecture/storage-model.md`

For behavior or identity work, read the relevant file under `docs/concepts/`.

## Non-negotiable invariants

- A Thread is a persistent person, not a temporary task role.
- Threads must be meaningfully non-interchangeable.
- Meaning-bearing identity, relationship, skill, need, and task fields are primarily natural-language prompt partials.
- Execution models and orchestration frameworks are replaceable cognitive machinery.
- Live Threads are stored in the Fibre world, not in Git.
- Economic and experiential consequences persist across executions.
- Family, culture, geography, embodiment, reading, relationships, and history must be functional, not decorative.
- Delegation uses bids, contracts, reputation, cost, and accountability.
- A child Thread is not a cloned parent prompt.
- The underlying LLM is treated as fallible and audited by the Thread.
- Historical state is not silently rewritten; meaningful changes are commands and events.

## Vision and ambition guard

Every proposal, milestone, and implementation must pass two distinct tests:

1. **Fidelity test** — Is the work consistent with Fibre's accepted concepts, invariants, and high-level goals?
2. **Ambition test** — Does the work preserve a credible path to Fibre's full intended world, or does it quietly reduce Fibre to a smaller conventional agent product?

A narrow prototype is acceptable when it isolates and verifies one foundational claim. It is not acceptable when its temporary simplifications become implicit permanent limits.

For every scoped implementation:

- State which broader Fibre capabilities it enables.
- Identify which ambitious capabilities are intentionally deferred rather than rejected.
- Preserve extension points and domain boundaries needed by later identity, family, culture, economy, marketplace, institutional, and developmental systems.
- Avoid choosing abstractions that only work for the current demo when a similarly simple abstraction can preserve the larger model.
- Explicitly call out when engineering convenience risks redefining the concept.
- Ask whether a conventional workflow, assistant, persona, or SaaS architecture is being mistaken for the Fibre end state.
- Prefer a small vertical proof of a large architecture over a polished implementation of a diminished vision.

Do not use “out of scope for this milestone” to erase a capability from the long-term design. Distinguish clearly among:

- deferred capability
- experimental capability
- rejected capability
- permanent architectural constraint

Any permanent constraint on Fibre's ambition requires an explicit concept decision and ADR.

## Decision process

- Do not silently redefine an accepted concept.
- Mark new concepts `proposed` until accepted.
- Record durable decisions under `docs/decisions/`.
- Update `docs/state/current-state.md` when an accepted decision changes Fibre.
- Add or update a verifiable test in `docs/validation/` or `tests/`.
- Identify a human-inspectable artifact that demonstrates the behavior.
- Include both a fidelity assessment and an ambition assessment in meaningful proposals and pull requests.

## Implementation rules

- Domain packages must remain portable and avoid direct Cloudflare/AWS dependencies.
- LLM output may propose state changes but may not directly alter balances, permissions, identity facts, or contracts.
- Ledger changes must be balanced and append-only.
- Thread Editor writes must become validated domain commands/events, never raw database edits.
- Preserve prompt, model, fixture, and evaluation versions for experiments.

## Definition of done

A concept or implementation change is complete only when:

1. Its canonical source document is updated.
2. Relevant scenario or acceptance tests are updated.
3. Any durable decision is recorded.
4. Human-inspectable evidence is identified or produced.
5. Drift against Fibre invariants has been checked.
6. The implementation's temporary scope and long-term extension path are explicit.
7. The work has been reviewed for both fidelity to the vision and accidental limitation of Fibre's ambition.
