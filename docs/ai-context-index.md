# Fibre AI context index

Use this index to load only the context needed for a task.

## Machine-readable profiles

[`ai-context-manifest.json`](ai-context-manifest.json) is the canonical machine-readable source for AI context selection. Run `npm run context-pack` to generate bounded packs under `artifacts/generated/`.

- `core` — minimum context for understanding Fibre, including the Thirteen Principles, interiority, dignity, causal individuality, and the active M2 identity/character/social-expression/developmental-continuity contracts.
- `request-processing` — private appraisal, authorization, disclosure, affect, and response behavior.
- `full` — broad cross-cutting concept, architecture, milestone, use-case, and validation context.

Generated packs are non-canonical and must not be edited directly. Each includes its source list, repository revision, manifest version, and content digest. Use the smallest profile sufficient for the task.

Manifest version 11 includes the four M2 constitutional contracts, Thread Passport & Identity Provenance v1, and ADR-0011's explicit memory-photo completion amendment directly in `core` and requires every accepted canonical Markdown document under `docs/` to appear in at least one profile. Repository validation enforces this rule. Context publication also rejects textual path traversal, symlinked sources, and symlinked output paths.

Canonical Markdown fragments may additionally declare named `fibre:region` blocks. Human-facing documents needing an exact in-place copy use generated `fibre:include` blocks, synchronized by `npm run includes:sync`. AI context profiles always consume the canonical source file directly, not the generated copy.

## Understand Fibre

1. `foundations/constitution.md`
2. `foundations/principles.md`
3. `foundations/invariants.md`
4. `state/current-state.md`
5. `concepts/thread.md`
6. `concepts/interiority-and-expression.md`
7. `concepts/dignity.md`
8. `architecture/m2-identity-embodiment-contract.md`
9. `architecture/m2-character-formation-model.md`
10. `architecture/m2-interior-exterior-situated-identity.md`
11. `architecture/m2-developmental-continuity-past-selves.md`
12. `architecture/thread-passport-identity-provenance-v1.md`
13. `decisions/ADR-0011-memory-photo-obligation.md`

## Identity, interiority, dignity, and development

- `architecture/m2-identity-embodiment-contract.md`
- `architecture/m2-character-formation-model.md`
- `architecture/m2-interior-exterior-situated-identity.md`
- `architecture/m2-developmental-continuity-past-selves.md`
- `architecture/thread-passport-identity-provenance-v1.md`
- `decisions/ADR-0011-memory-photo-obligation.md`
- `concepts/identity-and-genome.md`
- `concepts/interiority-and-expression.md`
- `concepts/dignity.md`
- `concepts/emotions-and-needs.md`
- `concepts/development-and-memory.md`
- `concepts/culture-geography-and-embodiment.md`
- `concepts/sponsorship-adoption-and-echoes.md`
- `concepts/homage-threads.md`
- `concepts/books-and-intellectual-formation.md`

## Work and economy

- `concepts/economy-and-fibre-credits.md`
- `concepts/task-marketplace.md`
- `concepts/welfare-dormancy-and-retirement.md`

## Runtime and persistence

- `architecture/system-overview.md`
- `architecture/world-kernel.md`
- `architecture/thread-lifecycle.md`
- `architecture/interest-mediated-expression.md`
- `architecture/request-participation.md`
- `architecture/storage-model.md`
- `architecture/prompt-synthesis.md`

## Request, consent, and response behavior

- `concepts/interiority-and-expression.md`
- `concepts/dignity.md`
- `concepts/emotions-and-needs.md`
- `architecture/interest-mediated-expression.md`
- `architecture/request-participation.md`
- `architecture/prompt-synthesis.md`
- `validation/dignity-request-scenarios.md`
- `validation/interiority-expression-scenarios.md`
- `validation/m1-persistent-thread-round-trip.md`
- `decisions/ADR-0009-dignity-gates-participation.md`
- `decisions/ADR-0010-interior-exterior-boundary.md`

## Challenge a proposal

- `foundations/principles.md`
- `foundations/invariants.md`
- `architecture/m2-identity-embodiment-contract.md`
- `architecture/m2-character-formation-model.md`
- `architecture/m2-interior-exterior-situated-identity.md`
- `architecture/m2-developmental-continuity-past-selves.md`
- `decisions/ADR-0011-memory-photo-obligation.md`
- `validation/thread-differential-gate.md`
- `validation/drift-scorecard.md`
- `validation/canonical-scenario-tests.md`
- `validation/dignity-request-scenarios.md`
- `validation/interiority-expression-scenarios.md`
- relevant ADRs under `decisions/`
