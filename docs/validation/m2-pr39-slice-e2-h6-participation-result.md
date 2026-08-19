---
id: validation-m2-pr39-slice-e2-h6-participation-result
status: candidate
last-reviewed: 2026-08-19
canonical: false
---

# Milestone #39 — Slice E2 H6 participation result

## Result

The `H6_counterpart_participation_correction` arm completed on both diagnostic worlds.

Repository verification immediately before the run was green:

```text
550 tests
550 pass
0 fail
repository validation passed with generated context packs
```

Frozen development artifact:

```text
fibre-m2-pr39-slice-e2-h6-participation-v1.json
sha256:672c68613de8d4c8c972ab65f3b1aad26b95d80c3d7f456da3f84aa97746ff3b
```

Paired failed A0 artifact retained unchanged:

```text
fibre-m2-pr39-slice-e2-a0-baseline-v1.json
sha256:868f0fa94cc9a08e846de6f9a406379347cb4a5c602fe2eb5db8da728a077a5e
```

Both artifacts are development-only and burned for final-cohort use.

## Mechanical outcome

The correction fixed the blocking H6 contradiction.

All six intended lives completed:

```text
2 worlds
3 lives / world
10 episodes / life
60 admitted episodes total
```

The failed A0 baseline had exhausted all three whole-candidate attempts on D1 seed 1 before one life completed, twice on `ges_v2_choose_text_self_directed` because a self-directed text choice had no librarian/teacher/peer participant, and once on a genuinely invalid peer-joke record.

Under the corrected participation contract, self-directed realizations admitted naturally. Examples include:

```text
ges_v2_mundane_errand_independence
  subject-only realization admitted

ges_v2_choose_text_self_directed
  subject-only realization admitted with self_directed book/text encounter

ges_v2_religious_or_philosophical_text
  subject-only realization admitted with self_directed source encounter

ges_v2_scientific_claim_test
  self-directed realization admitted where generated
```

The arm produced 17 intellectual encounters across 60 admitted episodes. Every completed life contained at least one intellectual encounter:

```text
E2-D1: 3, 2, 6
E2-D2: 1, 1, 4
```

This is not a richness quota result. It establishes that the corrected affordance surface no longer mechanically suppresses those legal experiences.

## Retry outcome

The record-local retry mechanism was exercised once in a rejected D2 seed-2 candidate attempt.

The episode path was:

```text
initial candidate
  -> pass_a_observable_action_bounds
form repair
  -> pass_a_structure_participation
full record retry from same frozen Pass-A input
  -> third generated version remained mechanically invalid / overlong
record generation exhausted at the existing three-version cap
  -> bounded whole-candidate retry
```

The second whole-candidate attempt completed. Aggregate candidate evidence:

```text
7 candidate attempts
1 rejected candidate attempt
1 rejected-attempt form repair
1 rejected-attempt full record retry
```

The rejected record remained visible in evidence. No rejected scene or Rich-Life quality signal was supplied to retry cognition.

## Within-life characterization

### E2-D1

```text
seed 01: places=4  structures=5  intellectual encounters=3
seed 02: places=4  structures=7  intellectual encounters=2
seed 03: places=3  structures=7  intellectual encounters=6

mean unique places:     3.67
mean unique structures: 6.33
mean place top-share:   0.367
mean structure top-share: 0.267
```

Two D1 histories contained one world-emergent episode each. The third contained none.

### E2-D2

```text
seed 01: places=3  structures=7  intellectual encounters=1
seed 02: places=2  structures=8  intellectual encounters=1
seed 03: places=4  structures=8  intellectual encounters=4

mean unique places:     3.00
mean unique structures: 7.67
mean place top-share:   0.600
mean structure top-share: 0.267
```

D2 seed 2 remains an important negative reading: nine of ten admitted episodes occur at home, despite eight distinct instantiated structures.

## Residual Rich-Life failure signals

H6 is **supported and necessary, but insufficient** for the E2 claim.

The strongest residual signal is cast/grounding collapse:

```text
introduced participants across all 60 episodes: 0
same-world participant-role Jaccard: 1.0 for every pair
```

The histories therefore vary in structures and intellectual subjects while still relying on the same initial household-role surface. World-facing episodes often become subject-only rather than introducing a peer, teacher, mentor, librarian, shopkeeper, neighbor or other recurring person.

The original narrative-inertia symptom also remains visible in several lives:

```text
D1 seed 01: home x3 -> market x3 -> civic room x3
D1 seed 03: home x3 -> market x3 -> civic room x4
D2 seed 02: home x9 -> shared hall x1
```

Repeated local structures also persist, including three consecutive `mundane_errand_independence` episodes in some D1 histories and three `family_fact_disagreement` episodes in D2 seed 2.

Only two of 60 admitted episodes are world-emergent.

Observable-action form repair also remains common:

```text
30 repairs / 60 admitted episodes = 50%
```

This is primarily a generation-cost/record-form issue because the repair path preserves event facts, but it remains relevant to rejection pressure. The one rejected whole candidate demonstrates how a form repair can consume part of the three-version record budget before a later structural retry.

## Between-life particularity

Same-world structure overlap is moderate rather than collapsed:

```text
E2-D1 structure Jaccard: 0.333, 0.333, 0.273
E2-D2 structure Jaccard: 0.500, 0.500, 0.231
```

Intellectual-source overlap is zero for every pair in both worlds.

Place overlap is substantially higher:

```text
E2-D1 place Jaccard: 1.000, 0.750, 0.750
E2-D2 place Jaccard: 0.667, 0.750, 0.500
```

And participant-role overlap is exactly 1.0 for every pair.

Therefore the result is not a same-template collapse on structure or intellectual-source identity, but it also does not yet establish sufficiently particular social/lived routes. The same household-role substrate remains dominant.

## Hypothesis reading

```text
H6 affordance/participation contradiction: SUPPORTED
H6 as complete explanation of E1 monoculture: CONTRADICTED
H1 prior-prose inertia: still live
H2 selection/scene-realization coupling: strengthened
H3 static-world under-pressure: unresolved
H4 historical sparsity: unresolved
```

H2 now has priority among the remaining diagnostics because the most uniform residual fact is not lack of available structures; it is that the combined chooser/realizer never introduces a new person across 60 episodes and every same-world life uses the same participant-role set.

That is exactly the failure mode H2 was designed to test: selecting an opportunity and realizing a mechanically grounded scene in one cognition step may favor already-grounded people or subject-only scenes because they are cheaper to instantiate.

H1 remains important because several histories still develop long local prose/place motifs. It should follow H2 if H2 alone does not explain the residual collapse.

## Execution amendment

The completed H6 arm becomes the **corrected control** for subsequent E2 mechanism diagnosis on D1/D2. The failed A0 artifact remains the historical mechanical baseline and must not be rerun.

Do not compare future arms to a regenerated A0 with corrected semantics.

Next diagnostic:

```text
A2 / H2
stateless opportunity choice + scene realization
```

The opportunity-choice stage retains the already-frozen E2 H2 allowlist:

```text
world public/factual projection
developmental window
chronology index
current offered affordances
policy witness
```

It must not receive:

```text
prior episodes / prior prose
known or introduced participant set
current relationship state
genome
memory / meaning
richness diagnostics
future material
```

It chooses only one offered structureRef or bounded world-emergent intent. Scene realization then receives canonical factual history and must produce one ordinary valid Pass-A episode. The H6 counterpart policy and record-local retry semantics remain in force.

No participant, place, structure, intellectual or novelty quota is added.

The H6 result is preserved unchanged before A2 implementation.