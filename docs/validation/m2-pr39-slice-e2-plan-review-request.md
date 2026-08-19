---
id: validation-m2-pr39-slice-e2-plan-review-request
status: candidate
last-reviewed: 2026-08-18
canonical: false
---

# Slice E2 Rich-Life plan — hostile review request

## Review target

Review the E2 design **before implementation**.

Plan commit:

```text
25e5788d68ebb39483452e96bccf74708c4b5029
```

Primary plan:

- `docs/validation/m2-pr39-slice-e2-rich-life-development-plan.md`

Required context:

- `docs/foundations/rich-life.md`
- `docs/validation/m2-pr39-slice-e-live-characterization-result.md`
- `docs/validation/m2-pr39-implementation-plan.md`
- `docs/architecture/thread-genesis-childhood-birth-v1.md`
- `services/world-kernel/src/genesis-pass-a-cognition.mjs`
- `services/world-kernel/src/genesis-rich-life-domain.mjs`
- `services/world-kernel/src/genesis-rich-pass-a-runner.mjs`
- `tools/genesis-rich-life-dev.mjs`

This is a **plan review**, not a code review and not Gate F.

## Problem that forced E2

The first completed burned Slice-E live run was mechanically valid but substantively weak as a rich life:

```text
10 episodes across ages 6–17.999
10/10 structure-grounded
0 world-emergent
9/10 at home
same caregiver 10/10
same sibling 9/10
5 distinct structures
0 introduced participants
0 intellectual encounters
41/90 offered structure slots carried intellectual context
```

The history developed a strong motif attractor from a colored pencil/bus drawing into sibling choices, snacks, household budget and finally an art-club decision folded back into the same chips/budget motif.

The world itself afforded school, public library, community center, local commerce, transit, peers, teachers, librarians, mentors, art, science, books, argument and public talks. Sequential Pass A barely touched them.

The run is permanently preserved. We will not regenerate it for quality.

## Fibre definition of Rich Life

Fibre now has a project-level Rich Life foundation, not a PR#39-specific adjective.

Core definition:

> **A rich life contains particular, non-interchangeable lived experiences with enough consequence, tension, novelty, relationship, practice, accident, success, failure, exposure, and continuity that the person can later form a distinctive point of view from them.**

The value of an experience is its **potential contribution to personhood**, not whether it is pleasant, dramatic, admirable, educational, intellectual or objectively important.

Richness is **experiential fertility for differentiation**:

```text
world + inheritance + people + institutions + chance + choice
        ↓
particular lived experiences
        ↓
selective memory
        ↓
durable / changing interpretation
        ↓
relationships / practices / commitments / consequences
        ↓
distinctive point of view
```

Pass A may create experiences with formative potential. It may **not** know which experiences will later be remembered, interpreted or formative, and it may not know the personality those experiences will eventually support.

The key principle is:

> **The past should constrain the future without monopolizing it.**

Richness is not biography length, event count, variety for its own sake, mandatory intellectualism, trauma, drama, a maturity ladder, a diversity quota, or a quality admission gate.

## Current mechanism

Every later rich Pass-A call currently sees the complete `observableAction` prose of **all prior episodes** plus their chronology/place/participants. The WorldSpec remains mostly static descriptive context. E1 therefore raises the possibility that accumulated prior prose becomes a literary continuation attractor.

E1 also generated only ten canonical episodes across about twelve years, raising a separate concern that historical sparsity may produce representative-event pressure and too little historical excess for later memory selection.

## Hypotheses in the plan

The plan does not preselect a fix. It tests:

```text
H1  prose inertia
    full prior observableAction prose becomes a continuation template

H2  opportunity-selection / scene-realization coupling
    choosing what happens and realizing a grounded scene in one call
    biases the model toward familiar people/places

H3  static-world under-pressure
    the personal past changes each call while the external world stays static,
    so exogenous world causes lose the salience competition

H4  historical sparsity / representative-episode pressure
    10 episodes across ~12 years is too little historical excess

H5  mixed mechanism
```

Diagnostic arms on two fresh burned worlds are paired against current A0 behavior:

- A1 removes prior prose while retaining structural chronology/participant metadata — diagnostic only;
- A2 separates opportunity choice from scene realization;
- A3 adds independently authored/generated time-local world opportunities that the Thread may ignore;
- A4 raises historical density under otherwise current behavior;
- combinations are forbidden until individual mechanisms justify them.

After diagnosis, the smallest supported production mechanism is frozen, then compared with A0 on two **additional fresh validation worlds**. No mechanism changes between the two validation worlds and no quality reruns are permitted.

## Your review task

Attack whether this plan actually protects Fibre's concept of personhood.

Please inspect the repository at the plan commit rather than reviewing only this summary.

Specifically challenge:

1. **Definition correctness** — Does the plan operationalize Fibre's Rich Life foundation, or quietly reduce it to surface variety?
2. **Missing hypotheses** — Is there a more plausible explanation for E1 that H1–H5 fail to isolate?
3. **A1 false positive** — Could removing prior prose destroy real continuity and then make disconnected randomness look like richness?
4. **A2 plot planner** — Does an opportunity-choice stage become a hidden author deciding what kind of life the Thread should have? Can it remain non-semantic and non-formative?
5. **A3 world-authoring channel** — Are time-local world happenings legitimate independent world state, or merely a new way for Genesis to script useful experiences? What provenance/independence rule is missing?
6. **A4 density confusion** — Does increasing event count test historical fertility or merely create more chances to hit desired categories? Is 24 a defensible diagnostic density, or should density be designed differently?
7. **Continuity authority** — If production stops feeding all prior prose, how can it preserve factual continuity without creating a second biography/summary authority that can rewrite history?
8. **Paired-world methodology** — Is using the same burned development world across diagnostic arms sound here, or does it create contamination/selection problems?
9. **Measurement validity** — Could structure/place/person counts, lexical motif measures or blind fertility raters reward checklist biographies, random novelty, or stylistic difference rather than genuinely non-interchangeable lived causes?
10. **Validation protection** — Are two fresh validation worlds enough to prevent tuning to the diagnostic worlds? Is the mechanism-freeze boundary precise enough?
11. **Downstream funnel** — Does E2 sufficiently account for the fact that rich history exists to feed selective memory and meaning? Is there a missing diagnostic about whether the resulting history offers *competing plausible memory/meaning routes* rather than merely more scenes?
12. **Gate contamination** — Could any E2 mechanism break the already-cleared Gate-C history boundary or Gate-D history/memory/meaning separation?
13. **Hidden personality authoring** — Identify any route by which “experiential fertility” could become a euphemism for Fibre pre-authoring personality.
14. **Strongest alternative architecture** — If this plan is solving the wrong layer, say what architecture you would test instead and why.

Do not recommend quotas such as mandatory books, mentors, places, trauma, novelty, conflict or intellectual encounters unless you are explicitly arguing that Fibre's Rich Life foundation itself should change.

Do not judge success by whether the resulting biography is entertaining or conventionally well-rounded.

## Requested verdict

Return one of:

```text
CLEAR
  The plan is safe and discriminating enough to implement as written.

CLEAR WITH AMENDMENTS
  The basic experimental architecture is sound, but list exact changes that
  should be made before implementation.

REDESIGN
  The plan tests the wrong mechanism or cannot distinguish rich-life capability
  from hidden biography/personality authoring. Explain the replacement design.
```

For every blocking/amendment item, state:

- the failure mode;
- why it matters specifically to Fibre personhood;
- the smallest plan change that resolves it;
- whether the issue is methodological, architectural, authority/integrity, or merely observational.

Prefer hostile counterexamples over generic suggestions.