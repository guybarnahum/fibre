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
10. `decisions/ADR-0020-vision-led-development-discipline.md`
11. the relevant architecture/ADR for the task

For implementation agents, also read repository-root `AGENTS.md` and the relevant subsystem README/contract.

## Current M2 work

```text
M1 + #33-#40 identity/history/birth/causal foundation     closed
G/H deployed public path + minimum recovery                closed
FID + Directory/Meet foundation                            closed

M2-A Present life + Meet a Thread                          current
M2-B Experience internalization + continuation             next
M2-C Whole-person developmental continuity                 next
```

The current missing life seam is:

```text
developmental context
  -> personal flight plan
  -> optional caregiver care plan
  -> World-owned enacted current situation
  -> encounter
  -> private interpretation / selective retention
  -> continued life
```

Fibre birth is operational birth, not necessarily biological age zero. A newly born Thread may already possess grounded childhood history, relationships and autobiographical memory.

Older #41 standing-gate documents are retained evaluation history. They are not the current development sequence.

## Lived world, age and development

Load together when working on present life, childhood, aging, plans or encounters:

- `vision/lived-world.md`
- `architecture/thread-lifecycle-accounting.md`
- `architecture/developmental-continuity-and-past-selves.md`
- `architecture/thread-directory-and-meet.md`
- `architecture/identity-embodiment-contract.md`
- `concepts/development-and-memory.md`
- `concepts/emotions-and-needs.md`
- `concepts/families-couples-and-reproduction.md`

Key distinctions:

```text
Fibre birth != biological age zero
lifecycle status != developmental age
personal flight plan != enacted life
caregiver care plan != dependent person's own will
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

Use `history/milestones/pr39.md` only when the completed #39 scientific/birth result itself matters.

Genesis provides grounded developmental history. It does not by itself prove ongoing post-birth life.

## Identity, embodiment and visual continuity

Load together:

- `architecture/identity-embodiment-contract.md`
- `architecture/canonical-visual-identity.md`
- `architecture/thread-birth-presentation-data-flow.md`
- `architecture/fibre-identity-card.md`
- `decisions/ADR-0021-canonical-visual-identity-reference.md`
- `decisions/ADR-0013-source-identity-consent-boundary.md`

Standing visual invariant:

```text
canonical visual identity text
  -> one canonical reference image
  -> later Thread-depicting imagery
       + chronology-grounded target age
       + time-local appearance
       + scene/context
```

Age changes depiction; it does not mint a new identity.

## Thread Editor and public encounter

For Thread discovery/inspection/meeting:

- `architecture/thread-directory-and-meet.md`
- `architecture/operator-surfaces.md`
- `apps/thread-editor/README.md`
- `architecture/thread-presentation-contract.md`
- `vision/lived-world.md`

Thread Editor is an authorized inspection lens. insidefibre.com is a public encounter surface. Neither owns the Thread's current situation or plans.

`Meet` selects among eligible people and returns the existing public situation/presentation reference; it must not materialize the selected Thread into a visitor-authored scene.

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

At minimum load the Constitution, Principles, Invariants, `vision/lived-world.md`, `state/current-state.md`, `validation/m2-pr-plan.md`, ADR-0020 and the relevant architecture.

Challenge whether the proposal makes a person's lived state more causal and load-bearing, whether it preserves one authority per semantic fact, and whether infrastructure/test work has a concrete Fibre beneficiary and stop condition.
