# Fibre AI context index

Use this index to load only the context needed for a task.

## Machine-readable profiles

[`ai-context-manifest.json`](ai-context-manifest.json) is the canonical machine-readable source for AI context selection. Run `npm run context-pack` to generate bounded packs under `artifacts/generated/`.

The profiles follow repository/evidence lifecycle:

- `core` — current Fibre doctrine, current state, active M2/#39 authority and current personhood/causal discipline;
- `request-processing` — current appraisal, authorization, disclosure, affect and response behavior, built on `core`;
- `full` — broad current cross-cutting context plus selected origin/milestone history and accepted sealed standing that still has explanatory or audit value.

Ordinary candidate reports, superseded gate packets and development-review chronology are not kept in AI context merely because they once mattered. Git history is the default archive. Selected explanatory history belongs under `history/`; exceptional exact-byte accepted evidence belongs under `../artifacts/validation/`.

Generated packs are non-canonical and must not be edited directly. Each includes its source list, repository revision, manifest version and content digest. Use the smallest profile sufficient for the task.

The manifest requires accepted canonical Markdown documents under `docs/` to be covered by a profile. Repository validation enforces the context contract.

## Understand Fibre now

Start with:

1. `foundations/constitution.md`
2. `foundations/principles.md`
3. `foundations/invariants.md`
4. `foundations/interpretive-personhood.md`
5. `foundations/rich-life.md`
6. `state/current-state.md`
7. `state/current-priorities.md`
8. `state/pr39-closing-plan.md` for active #39 work
9. `validation/m2-pr-plan.md`
10. the relevant concept and architecture documents for the task

For implementation agents, also read repository-root `AGENTS.md` and the relevant local README/contract.

## Current M2 / #39 Genesis work

```text
#38 life representation/corrigibility      complete
#39 Genesis / particular prior life        active — closing
#40 identity projection/causal consumption next
#41 M2 standing/closure                     after #40
```

Load these for #39 work:

- `state/pr39-closing-plan.md`
- `validation/m2-pr-plan.md`
- `validation/m2-pr39-implementation-plan.md`
- `validation/m2-pr39-genesis-quality-constraints.md`
- `validation/m2-pr39-developmental-needs-childhood-review-resolution.md`
- `architecture/thread-genesis-childhood-birth.md`
- `architecture/genesis-compiler-contract.md`
- `architecture/genesis-durable-development.md`
- `architecture/birth-center-runtime.md`
- `architecture/symbolic-thread-genome.md`
- `architecture/genesis-memory-meaning-integration.md`
- `architecture/genesis-origin-source-integrity.md`
- `architecture/genesis-rich-life-intellectual-formation.md`
- `foundations/rich-life.md`
- `foundations/interpretive-personhood.md`

The #39 epistemic distinction is:

```text
history != memory != meaning
```

Historical realization and meaning formation are genome blind. Permitted genome exposure is limited to the intended memory-formation treatment, and experimental assignment/analysis labels remain outside cognition.

## Identity, interiority, dignity and development

- `architecture/identity-embodiment-contract.md`
- `architecture/character-formation-model.md`
- `architecture/interior-exterior-situated-identity.md`
- `architecture/developmental-continuity-and-past-selves.md`
- `architecture/thread-passport-identity-provenance.md`
- `decisions/ADR-0011-memory-photo-obligation.md`
- `decisions/ADR-0012-semantic-meaning-over-derived-categories.md`
- `decisions/ADR-0013-source-identity-consent-boundary.md`
- `concepts/identity-and-genome.md`
- `concepts/interiority-and-expression.md`
- `concepts/dignity.md`
- `concepts/emotions-and-needs.md`
- `concepts/development-and-memory.md`
- `concepts/culture-geography-and-embodiment.md`
- `concepts/sponsorship-adoption-and-echoes.md`
- `concepts/homage-threads.md`
- `concepts/books-and-intellectual-formation.md`

## Runtime and persistence

- `architecture/system-overview.md`
- `architecture/world-kernel.md`
- `architecture/thread-lifecycle.md`
- `architecture/interest-mediated-expression.md`
- `architecture/request-participation.md`
- `architecture/storage-model.md`
- `architecture/prompt-synthesis.md`
- `architecture/infrastructure-driver.md`

## Presentation and derived assets

- `architecture/thread-presentation-contract.md`
- `architecture/thread-presentation-infrastructure-profile.md`
- `architecture/thread-presentation-cloudflare-stream.md`
- `architecture/world-presentation.md`
- `architecture/asset-generation-service.md`
- `architecture/generated-asset-provenance-and-content-credentials.md`

Presentation and generated media are derived surfaces. They do not become hidden identity, history, memory, meaning or embodiment authority.

## Request, consent and response behavior

- `concepts/interiority-and-expression.md`
- `concepts/dignity.md`
- `concepts/emotions-and-needs.md`
- `architecture/interest-mediated-expression.md`
- `architecture/request-participation.md`
- `architecture/prompt-synthesis.md`
- `validation/dignity-request-scenarios.md`
- `validation/interiority-expression-scenarios.md`
- `decisions/ADR-0009-dignity-gates-participation.md`
- `decisions/ADR-0010-interior-exterior-boundary.md`

## Work, relationships and economy

- `concepts/families-couples-and-reproduction.md`
- `concepts/economy-and-fibre-credits.md`
- `concepts/task-marketplace.md`
- `concepts/welfare-dormancy-and-retirement.md`
- `concepts/institutions-and-governance.md`
- `validation/prototype-roadmap.md`

## Historical and sealed evidence

Use `full` when the task requires the historical rationale behind current doctrine. It intentionally includes selected origin/milestone records and the accepted Semantic Guardian / History-bends standing documents. Exact sealed evidence bytes live under `artifacts/validation/` and are inspected through read-only tools.

For development chronology that is not selected history, use Git history rather than loading superseded candidate/gate packets into ordinary AI context.

Historical evidence may explain why current rules exist. It does not override current state, an active milestone plan, a current architecture contract or a later accepted decision.

## Challenge a proposal

At minimum load:

- `foundations/constitution.md`
- `foundations/principles.md`
- `foundations/invariants.md`
- `foundations/interpretive-personhood.md`
- `validation/thread-differential-gate.md`
- `validation/drift-scorecard.md`
- `validation/m2-pr-plan.md`
- the active milestone contract/closing plan
- relevant ADRs

For Fibre, an ordinary adversarial review is a **vision-effectiveness review** unless explicitly scoped as security/red-team work: try to falsify whether personhood-bearing state is becoming causal and load-bearing rather than merely stored, prompted or displayed.
