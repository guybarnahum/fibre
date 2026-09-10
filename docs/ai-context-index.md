# Fibre AI context index

Use this index to load only the context needed for a task.

## Machine-readable profiles

[`ai-context-manifest.json`](ai-context-manifest.json) is the canonical source for AI context selection. Run `npm run context-pack` to generate bounded non-canonical packs under `artifacts/generated/`.

Profiles follow evidence lifecycle:

- `core` — current doctrine, lived-world vision, current state and active M2 authority;
- `request-processing` — appraisal, authorization, disclosure, affect and response behavior built on `core`;
- `full` — broad current context plus selected historical/sealed evidence with continuing explanatory value.

Use the smallest profile sufficient for the task. Historical milestone/gate material explains why current rules exist; it does not override current state or roadmap authority.

## Understand Fibre now

Start with:

1. `foundations/constitution.md`
2. `foundations/principles.md`
3. `foundations/invariants.md`
4. `foundations/interpretive-personhood.md`
5. `foundations/rich-life.md`
6. `vision/lived-world.md`
7. `state/current-state.md`
8. `state/current-priorities.md`
9. `validation/m2-pr-plan.md`
10. `architecture/intrinsic-regulation.md`
11. `decisions/ADR-0020-vision-led-development-discipline.md`
12. the relevant architecture/ADR for the task

For implementation agents, also read repository-root `AGENTS.md` and the relevant subsystem README/contract.

## Current work

```text
M1 + #33-#40 identity/history/birth/causal foundation     closed
G/H deployed public path + minimum recovery                closed
FID + Directory/Meet foundation                            closed

R1-R4 Intrinsic regulation                                 current detour
M2-A Present life + Meet a Thread                          resumes after R4
M2-B Experience internalization + continuation             then
```

The E2E meeting is an architectural forcing function: when making the encounter real exposes a missing life primitive, build that primitive generally rather than faking it in the Viewer.

Current active chain:

```text
World reality + desired/avoided conditions
  -> intrinsic regulation
  -> private drive / affect
  -> cognition / semantic feeling
  -> Flight Plan / action
  -> enacted presence / movement
  -> encounter / experience
  -> selective consequence
  -> continued life
```

## Intrinsic regulation, emotions and needs

Load together when working on drives, affect, motivation, movement pressure, attachment/proximity or semantic feeling:

- `architecture/intrinsic-regulation.md`
- `concepts/emotions-and-needs.md`
- `architecture/thread-lifecycle.md`
- `architecture/system-overview.md`
- `decisions/ADR-0012-semantic-meaning-over-derived-categories.md`

Key distinctions:

```text
regulatory drive  != semantic need
intrinsic affect  != semantic emotion
presence pressure != relationship meaning
mechanical state may be numeric
meaning-bearing state remains natural-language-first
```

Mechanical regulator output may enter cognition only through a bounded private interoceptive projection, never as a pre-authored emotion verdict or hidden instruction.

Presence targets may be places, people, mediated settings, activities or obligations. A Thread may seek proximity or distance; `parent`, `partner` and `friend` roles do not determine polarity.

## Lived world, age and development

Load together when working on present life, childhood, aging, plans or encounters:

- `vision/lived-world.md`
- `architecture/intrinsic-regulation.md`
- `architecture/thread-lifecycle-accounting.md`
- `architecture/developmental-continuity-and-past-selves.md`
- `architecture/thread-directory-and-meet.md`
- `architecture/identity-embodiment-contract.md`
- `concepts/development-and-memory.md`
- `concepts/emotions-and-needs.md`
- `concepts/families-couples-and-reproduction.md`

```text
Fibre birth != biological age zero
lifecycle status != developmental age
personal Flight Plan != enacted life
caregiver care plan != dependent person's own will
presence != geography only
history != memory != meaning
```

Development changes affordances and agency relative to care; it is not a rigid maturity ladder or numeric personality progression.

## Genesis and prior life

Use Genesis documents when the task concerns how a Thread arrives with a particular past:

- `architecture/thread-genesis-childhood-birth.md`
- `architecture/genesis-compiler-contract.md`
- `architecture/genesis-durable-development.md`
- `architecture/symbolic-thread-genome.md`
- `architecture/genesis-memory-meaning-integration.md`
- `architecture/genesis-origin-source-integrity.md`
- `architecture/genesis-rich-life-intellectual-formation.md`
- `validation/generative-diagnostic-methodology.md`

Genesis provides grounded developmental history. It does not by itself prove ongoing post-birth life or intrinsic regulation.

## Identity, embodiment and visual continuity

Load together:

- `architecture/identity-embodiment-contract.md`
- `architecture/canonical-visual-identity.md`
- `architecture/thread-birth-presentation-data-flow.md`
- `architecture/fibre-identity-card.md`
- `decisions/ADR-0021-canonical-visual-identity-reference.md`
- `decisions/ADR-0013-source-identity-consent-boundary.md`

Age changes depiction; it does not mint a new identity.

## Thread Editor and public encounter

For Thread discovery/inspection/meeting:

- `architecture/thread-directory-and-meet.md`
- `architecture/operator-surfaces.md`
- `apps/thread-editor/README.md`
- `architecture/thread-presentation-contract.md`
- `vision/lived-world.md`
- `architecture/intrinsic-regulation.md`

Thread Editor is an authorized causal inspection lens. insidefibre.com is a public encounter surface. Neither owns current situation, plans, drives or semantic feelings.

## Runtime and persistence

- `architecture/system-overview.md`
- `architecture/world-kernel.md`
- `architecture/thread-lifecycle.md`
- `architecture/storage-model.md`
- `architecture/production-persistence.md`
- `architecture/infrastructure-driver.md`
- `decisions/ADR-0017-provider-neutral-production-persistence.md`
- `decisions/ADR-0020-vision-led-development-discipline.md`

Provider-neutral persistence remains mandatory for authoritative production state, but infrastructure is not an independent completion program. Build only what a real Fibre capability requires.

## Request, consent and expression

- `concepts/interiority-and-expression.md`
- `concepts/dignity.md`
- `concepts/emotions-and-needs.md`
- `architecture/interest-mediated-expression.md`
- `architecture/request-participation.md`
- `architecture/prompt-synthesis.md`
- `decisions/ADR-0009-dignity-gates-participation.md`
- `decisions/ADR-0010-interior-exterior-boundary.md`

## Work, relationships and society

- `concepts/families-couples-and-reproduction.md`
- `concepts/economy-and-fibre-credits.md`
- `concepts/task-marketplace.md`
- `concepts/welfare-dormancy-and-retirement.md`
- `concepts/institutions-and-governance.md`
- `validation/prototype-roadmap.md`

## Challenge a proposal

At minimum load the Constitution, Principles, Invariants, `vision/lived-world.md`, `state/current-state.md`, `state/current-priorities.md`, `validation/m2-pr-plan.md`, `architecture/intrinsic-regulation.md`, ADR-0020 and the relevant architecture.

Challenge whether the proposal makes the person's lived control loop more causal and load-bearing, preserves one authority per semantic fact, and avoids replacing semantic meaning with derived control labels.