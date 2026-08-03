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

Every concept, architecture, experiment, and implementation change must pass two tests. Artifact-only changes — typos, formatting, non-substantive editing — are exempt.

1. **Fidelity test** — Is the work consistent with Fibre's accepted concepts, invariants, and high-level goals?
2. **Ambition test** — Does the work preserve a credible path to Fibre's full intended world, or does it quietly reduce Fibre to a smaller conventional agent product?

The standard is: **build the smallest proof that preserves the largest credible architecture.** A narrow prototype is acceptable when it isolates and verifies one foundational claim; it is not acceptable when its temporary simplifications harden into unexamined permanent constraints.

### Required statements

State each of the following in the issue or pull request. One sentence each is enough.

- Which Fibre capability the work proves or enables.
- Which capabilities are intentionally deferred, and where each deferral is recorded.
- Which extension path remains open for each deferred capability.
- Which shortcuts are temporary, and what would reverse them.
- Whether any choice creates a permanent constraint, and if so which ADR records it.

### Required review questions

Answer each explicitly. An uncomfortable answer must be justified, not omitted.

- Does the design keep a credible extension path for every item in [`docs/vision/invariants.md`](docs/vision/invariants.md#preserved-ambition-paths)? Name any path it closes.
- Would a similarly simple abstraction have preserved more of those paths? If so, why was it rejected?
- Is a conventional workflow, assistant, persona, or SaaS architecture being mistaken for the Fibre end state?
- Does engineering convenience risk redefining an accepted concept?

Preserving an extension path means preserving domain boundaries, interfaces, and vocabulary. It does not mean implementing the future subsystem now, and it does not justify abstraction that is not exercised by the current proof.

### Capability status

Do not use “out of scope for this milestone” to erase a capability from the long-term design. Classify every excluded capability as **deferred**, **experimental**, **rejected**, or a **permanent constraint**, as defined in [`docs/vision/invariants.md`](docs/vision/invariants.md#capability-status). Only a permanent constraint requires a concept decision and an ADR; reversible local engineering choices do not.

## Decision process

- Do not silently redefine an accepted concept.
- Mark new concepts `proposed` until accepted.
- Record durable decisions under `docs/decisions/`.
- Update `docs/state/current-state.md` when an accepted decision changes Fibre.
- Add or update a verifiable test in `docs/validation/` or `tests/`.
- Identify a human-inspectable artifact that demonstrates the behavior.
- Include a fidelity assessment and an ambition assessment in every concept, architecture, experiment, or implementation proposal and pull request.

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
6. The required statements under **Vision and ambition guard** are present, and every excluded capability has a named status.
