# Fibre AI context index

Use this index to load only the context needed for a task.

## Machine-readable profiles

[`ai-context-manifest.json`](ai-context-manifest.json) is the canonical machine-readable source for AI context selection. Run `npm run context-pack` to generate bounded packs under `artifacts/generated/`.

- `core` — minimum context for understanding Fibre, including interiority and dignity.
- `request-processing` — private appraisal, authorization, disclosure, affect, and response behavior.
- `full` — broad cross-cutting concept, architecture, milestone, use-case, and validation context.

Generated packs are non-canonical and must not be edited directly. Each includes its source list, repository revision, manifest version, and content digest. Use the smallest profile sufficient for the task.

Every accepted canonical concept under `docs/concepts/` must appear in at least one manifest profile. Repository validation enforces this rule.

## Understand Fibre

1. `vision/constitution.md`
2. `vision/invariants.md`
3. `state/current-state.md`
4. `concepts/thread.md`
5. `concepts/interiority-and-expression.md`
6. `concepts/dignity.md`

## Identity, interiority, dignity, and development

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

- `vision/invariants.md`
- `validation/drift-scorecard.md`
- `validation/canonical-scenario-tests.md`
- `validation/dignity-request-scenarios.md`
- `validation/interiority-expression-scenarios.md`
- relevant ADRs under `decisions/`
