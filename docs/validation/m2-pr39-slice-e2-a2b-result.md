---
id: validation-m2-pr39-slice-e2-a2b-result
status: candidate
last-reviewed: 2026-08-19
canonical: false
---

# Milestone #39 — Slice E2 A2b result

## Result

`A2b_plausibility_surface_seeded_contingency` completed on both E2 diagnostic worlds after the evidence-preserving continuation from the earlier failed artifacts.

Repository verification immediately before the successful continuation was user-run and green:

```text
563 tests
563 pass
0 fail
repository validation passed with generated context packs
```

Completed development artifact:

```text
fibre-m2-pr39-slice-e2-a2b-v3.json
```

The artifact is development-only and burned for final-cohort use. It records:

```text
status:                    complete
worlds:                    2
lives / world:             3
episodes / life:           10
admitted episodes:         60
candidate attempts:        8
rejected attempts:         2
reused completed lives:    1
reused frozen schedules:   1
admission verdict:         null
```

The continuation reused the already-completed E2-D1 / seed-01 life and the already-burned E2-D1 / seed-02 plausibility/draw schedule. It did not reroll those decisions.

**A2b materially corrects A2's deterministic opportunity-template collapse while preserving the useful H2 separation of opportunity selection from scene realization. The plausibility-model layer itself contributed no discrimination on D1/D2.**

This is a development mechanism result, not a production freeze and not an admission verdict.

## Mechanical outcome

Across the six completed lives:

```text
mean distinct places / life:             3.33   (range 2..4)
mean distinct structures / life:         8.17   (range 7..9)
introduced participants:                10      (5/6 lives introduce someone)
selected intellectual structures:       29 / 60
intellectual encounters:                23 / 60
world-emergent episodes:                 6 / 60
record-form repairs:                    27
record retries:                          1
new-counterpart-pressure episodes:       5
pressure realized with introduction:     5 / 5
```

Every completed life contains intellectual encounters; counts range from 2 to 5. The E1 pattern of zero intellectual realization therefore does not reproduce under A2b.

The two rejected whole-candidate attempts both occurred in E2-D1 / seed-02 and ended in `record_repair_exhausted`. The final surviving life for that frozen schedule completed on attempt 3.

Because the opportunity schedule was already frozen, candidate rejection could not substitute a different abstract event route. It could still select among scene realizations that are easier for the model to encode mechanically. That survivorship pressure remains material evidence and must not be erased from interpretation.

## Plausibility layer: non-discriminating on D1/D2

Every plausibility call approved:

```text
all 9 offered EventStructures
+ world_emergent
= 10 plausible routes
```

For all six lives:

```text
mean plausible routes / window = 10.00
singleton plausibility windows = 0
all-offers-plausible windows    = 60 / 60
```

Therefore the model plausibility layer added no selection information on these two diagnostic worlds under this protocol. The mechanism actually exercised was effectively:

```text
blind eligible opportunity surface
        ↓
uniform frozen seeded contingency
        ↓
selected opportunity
        ↓
factual scene realization
```

This does not establish that a plausibility model could never be useful. It establishes that this call added no discrimination here. Any production design that retains it must justify the extra cognition independently rather than preserving it merely because it appeared in the development arm.

## Between-life particularity

### E2-D1

Pairwise Jaccard:

```text
place:      1.000, 0.750, 0.750   mean = 0.833
role:       0.750, 0.750, 1.000   mean = 0.833
structure:  0.143, 0.063, 0.071   mean = 0.092
source:     0,     0,     0       mean = 0
```

### E2-D2

```text
place:      0.750, 0.667, 0.500   mean = 0.639
role:       1.000, 0.500, 0.500   mean = 0.667
structure:  0.200, 0.000, 0.143   mean = 0.114
source:     0,     0,     0       mean = 0
```

## H6 → A2 → A2b comparison

Mean same-world Jaccard:

```text
                    H6       A2       A2b
D1 place           0.833    1.000     0.833
D1 role            1.000    0.633     0.833
D1 structure       0.313    0.576     0.092

D2 place           0.639    1.000     0.639
D2 role            1.000    0.733     0.667
D2 structure       0.410    0.643     0.114
```

A2 triggered the predeclared template-collapse warning because place and structure overlap each worsened by at least `0.15` in both worlds relative to H6.

A2b does **not** trigger that warning:

- place overlap returns exactly to the H6 diagnostic baseline in both worlds;
- structure overlap falls dramatically below both H6 and A2 in both worlds;
- role overlap improves relative to H6 in both worlds, although D2 remains more role-overlapping than D1;
- intellectual-subject overlap remains zero.

The strongest evidence here is not that every life visits many places. It is that the six lives no longer share a common event-structure skeleton.

## Remaining locality caveat

A2b is not uniformly broad in locality.

The clearest case is E2-D2 / seed-03:

```text
distinct places: 2
place top-share: 0.70
structures:      7
encounters:      3
introduced:      0
```

This life remains substantially more home/locality-concentrated than the others. That is a real warning, but it is not by itself a reason to tune Pass A again. Rich Life is not a place-count quota. The next load-bearing question is whether the actual differences among these lived histories survive selective memory and meaning formation.

## H2 interpretation

The diagnostic chain now supports:

```text
H6 combined chooser/realizer
  -> grounding cost suppresses new cast and route realization

A2 deterministic stateless winner
  -> cast expands
  -> common opportunity skeleton appears

A2b frozen seeded contingency
  -> cast expansion survives
  -> deterministic structure-template collapse disappears
```

Current interpretation:

```text
H2 selection/realization coupling:       SUPPORTED
A2 deterministic single winner:          REJECTED
A2b seeded contingency:                  SUPPORTED AS DEVELOPMENT MECHANISM
A2b plausibility filtering on D1/D2:     NON-DISCRIMINATING
production mechanism freeze:             NOT YET
```

## Next load-bearing question: N1 downstream fertility

A2b establishes event-route particularity. It does not yet establish Fibre's stronger Rich-Life claim.

The predeclared N1 diagnostic is now unblocked:

> do these different lived histories produce distinguishable autobiographical memory and meaning when Pass B is `life_only`, genome-unexposed, and Pass C sees only the resulting memory?

N1 is frozen as an 18-trial same-world 2AFC diagnostic over horizons 6, 8, and 10. Each of the six source lives is used exactly three times; truth labels and candidate order are balanced 9/9. The positive threshold is 13/18, whose exact one-sided chance tail is approximately `0.0481262`.

N1 must consume `fibre-m2-pr39-slice-e2-a2b-v3.json` as frozen input. Its output must not feed back into Pass A and A2b must not be regenerated to improve downstream results.

A positive N1 result must be grounded in concrete lived causes, not neutralized identifiers, seed identity, EventStructure labels, model metadata, or formatting artifacts. A chance-level result would mean A2b's route particularity has not yet demonstrated downstream experiential fertility; it would not automatically imply that more Pass-A breadth is the correct fix.

Only after N1 and fresh validation-world evidence should E2 be considered ready for combined E+F hostile review.

No admission verdict is earned by this development result.
