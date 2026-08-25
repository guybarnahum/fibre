---
id: adr-0015
status: accepted
date: 2026-08-23
---

# ADR-0015: Fibre-centric development

## Context

Fibre is experimental software whose difficult questions are semantic and architectural: does a Thread become a persistent, particular person; does its history remain honest; do memories and meanings belong to it; and do those differences eventually matter to cognition and action?

During #39, development drifted into a slower pattern where every iteration accumulated frozen packets, prompt hashes, one-shot authorization witnesses, preflight states, review-state tests and parallel replacement implementations. Those artifacts helped answer some specific questions, but they began to compete with the actual development goal: making Genesis produce rich lives and birth rich Threads.

Git already preserves the path by which the repository evolved. ADR-0016 therefore established that current `HEAD` should describe current Fibre rather than retain development archaeology.

This ADR defines the complementary development method.

## Decision

### 1. Advance Fibre capability first

The primary unit of progress is a Fibre capability or personhood property, not an evidence packet.

For each milestone, ask first:

> What new thing can a Thread or the Fibre world meaningfully be, remember, do, preserve, or have causally matter after this change?

Implementation, inspection and tests should be organized around that answer.

### 2. Keep development state disposable

Ordinary generated runs, provider journals, failed candidates, exploratory outputs and temporary diagnostics belong under ignored `.fibre/` state or another disposable local development location.

They do not become repository history merely because they were useful while debugging.

### 3. Keep current inputs as fixtures/configuration, not evidence

Worlds, genomes, rosters, policies and other material actively consumed by the current implementation belong in ordinary current fixture/configuration paths.

`artifacts/validation/` is not a configuration database.

### 4. Test invariants, not old states

The active suite protects current Fibre semantics: authority boundaries, append-only history, provenance, memory/history separation, privacy, atomic birth, retry bounds, source eligibility, and similar enduring properties.

A test whose only claim is that an old prompt had a particular hash, an old output directory did not exist, or an obsolete gate was not yet authorized is historical evidence rather than a current invariant. It must not block improvement of current Fibre.

### 5. One current implementation by default

Do not retain `v1`, `v2`, `replacement`, `recovery`, or gate-specific executable stacks solely because they once existed.

Keep compatibility code only when an actual persisted Thread, external API, migration obligation or deployed client needs it. Otherwise fold the useful behavior into the current implementation and remove the superseded executable path from `HEAD`.

### 6. Use review at architectural and closure boundaries

Adversarial/"hostile" review remains valuable when it can discover a Fibre-level mistake: laundering authority, breaking personhood semantics, overfitting a diagnostic, confusing memory with fact, losing provenance, or falsely claiming a milestone is closed.

It is not required before every prompt adjustment, retry fix, fixture change or development generation.

A milestone should normally have:

1. iterative development against disposable development material;
2. active invariant tests;
3. direct human inspection of the resulting Fibre behavior;
4. a fresh/held-out evaluation when scientific independence matters;
5. one adversarial closing review focused on the milestone claim;
6. one concise retained milestone record.

### 7. Preserve scientific independence without ceremony

Some claims genuinely require fresh material. For example, a Genesis compiler tuned on particular development Worlds must not call those same Worlds a held-out final cohort.

Preserve the substantive control: use fresh final material once the compiler is stable, avoid quality-driven regeneration, and report failures honestly.

Do not replace this principle with layers of frozen pre-authorization packets whose hashes become the development objective.

### 8. Model output is evidence about the generator

A weak, generic or contradictory generated life is useful evidence that Genesis needs improvement. Fibre may reject structurally impossible or authority-violating records, but development must not silently resample whole lives until a quality metric passes.

Mechanical repair may repair mechanical form. It must not become hidden aesthetic selection.

### 9. Prefer reusable tools and readable progress

If a development or validation action will be repeated, make it a small repository script with a short command rather than a long terminal paste.

Tools that make model calls should report the Fibre stage they are performing—history, memory, meaning, birth—not streams of opaque punctuation or internal request IDs.

### 10. Record progress in two levels

Current state and milestone summaries should prefer:

**Simple English** — what Fibre can now do or what remains visibly wrong.

**More accurate description** — the authority, data-flow or causal distinction that makes that statement technically true.

Do not substitute gate names, hash status or artifact counts for either description.

## Consequences

- Development should become faster and easier to reason about.
- Fewer historical files remain in current `HEAD`; Git history remains available when archaeology is actually needed.
- Review becomes more valuable because it challenges substantive claims rather than approving routine iteration.
- Fresh held-out cohorts and adversarial closing review remain legitimate when they protect scientific validity.
- Milestone evidence becomes a compact consequence of completed work rather than the organizing principle of the work itself.

## Relationship to ADR-0016

ADR-0016 governs **what the repository retains**. This ADR governs **how Fibre is developed**.

Together:

> **Build the current Fibre directly; keep current invariants and inputs close to the implementation; use disposable development runs; evaluate important claims honestly; retain only the decisions and final outcomes worth carrying forward.**
