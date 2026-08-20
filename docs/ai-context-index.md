# Fibre AI context index

Use this index to load only the context needed for a task.

## Machine-readable profiles

[`ai-context-manifest.json`](ai-context-manifest.json) is the canonical machine-readable source for AI context selection. Run `npm run context-pack` to generate bounded packs under `artifacts/generated/`.

The profiles intentionally follow evidence lifecycle:

- `core` — current Fibre doctrine, current state, active M2/#39 authority and current personhood/causal discipline;
- `request-processing` — current private appraisal, authorization, disclosure, affect and response behavior, built on `core`;
- `full` — broad cross-cutting context **plus** sealed/failed historical experiments, older bridge material, use cases and long-form validation history.

A sealed or failed document leaving `core` is **not deleted or deprecated**. It remains available in `full` when its historical evidence matters. This prevents a minimum working context from confusing an old candidate/protocol with current authority while preserving Fibre's falsification history.

Generated packs are non-canonical and must not be edited directly. Each includes its source list, repository revision, manifest version and content digest. Use the smallest profile sufficient for the task.

The manifest requires every accepted canonical Markdown document under `docs/` to appear in at least one profile. Repository validation enforces this rule. Context publication also rejects textual path traversal, symlinked sources and symlinked output paths.

Canonical Markdown fragments may additionally declare named `fibre:region` blocks. Human-facing documents needing an exact in-place copy use generated `fibre:include` blocks synchronized by `npm run includes:sync`. AI context profiles consume the canonical source file directly, not the rendered include copy.

## Understand Fibre now

Start with:

1. `foundations/constitution.md`
2. `foundations/principles.md`
3. `foundations/invariants.md`
4. `foundations/interpretive-personhood.md`
5. `foundations/rich-life.md`
6. `state/current-state.md`
7. `state/current-priorities.md`
8. `validation/m2-pr-plan.md`
9. `validation/m2-pr39-implementation-plan.md`
10. the relevant concept and architecture documents for the task

For implementation agents, also read repository-root `AGENTS.md` and the relevant local README/contract.

## Current M2 / #39 Genesis work

The active sequence is:

```text
#38 life representation/corrigibility     complete
#39 Genesis / particular prior life       active
#40 identity projection/causal consumption next
#41 M2 standing/closure                    after #40
```

Load these for #39 work:

- `validation/m2-pr-plan.md`
- `validation/m2-pr39-implementation-plan.md`
- `validation/m2-pr39-pre-g-seam-status.md` when working specifically on the cleanup seam
- `validation/m2-pr39-developmental-needs-childhood-review-resolution.md`
- `validation/m2-pr39-genesis-quality-constraints.md`
- `validation/symbolic-thread-genome-implementation-plan.md`
- `validation/m2-pr39-slice-ef-gate-f-result.md` for the current E+F blocking-gate posture
- `architecture/thread-genesis-childhood-birth-v1.md`
- `architecture/genesis-compiler-contract-v1.md`
- `architecture/symbolic-thread-genome-v1.md`
- `architecture/genesis-memory-meaning-integration-v1.md`
- `architecture/genesis-rich-life-intellectual-formation-v1.md`
- `foundations/rich-life.md`
- `foundations/interpretive-personhood.md`

The #39 three-pass distinction is:

```text
Pass A  history
Pass B  memory
Pass C  durable meaning
```

with history != memory != meaning, Pass A/Pass C genome blind, and all three Genesis passes blind to Fibre-computed semantic-need conclusions and mechanical-condition values.

## Identity, interiority, dignity and development

- `architecture/m2-identity-embodiment-contract.md`
- `architecture/m2-character-formation-model.md`
- `architecture/m2-interior-exterior-situated-identity.md`
- `architecture/m2-developmental-continuity-past-selves.md`
- `architecture/thread-passport-identity-provenance-v1.md`
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

## Historical/sealed evidence

Use `full` when the task requires the falsification history behind current doctrine. Examples include:

- failed Semantic Guardian standing v1-v3 and accepted v4;
- History-bends-judgment candidate/gate lineage;
- the pre-M2 bridge history;
- pre-#39 Whole-Person characterization;
- #39 symbolic-genome control evidence;
- retained Genesis E1/E2/A0/H6/A2/A2b/N1/N2/V1/V2 records under validation/artifacts.

Historical evidence may explain why current rules exist. It does not override the current state, current milestone plan, current compiler contract or a later accepted decision.

## Challenge a proposal

At minimum load:

- `foundations/constitution.md`
- `foundations/principles.md`
- `foundations/invariants.md`
- `foundations/interpretive-personhood.md`
- `validation/thread-differential-gate.md`
- `validation/drift-scorecard.md`
- `validation/m2-pr-plan.md`
- the active milestone contract/implementation plan
- relevant ADRs

For Fibre, an ordinary “adversarial review” means a **vision-effectiveness review** unless explicitly scoped as security/red-team work: try to falsify whether personhood-bearing state is becoming causal and load-bearing rather than merely stored, prompted or displayed.
