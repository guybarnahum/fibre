---
id: validation-m2-pr39-slice-e2-a2b-result
status: candidate
last-reviewed: 2026-08-19
canonical: false
---

# Milestone #39 — Slice E2 A2b result

## Result

The `A2b_plausibility_surface_seeded_contingency` development arm completed on both E2 diagnostic worlds.

Repository verification immediately before the continuation was user-run and green:

```text
559 tests
559 pass
0 fail
repository validation passed with generated context packs
```

Frozen development artifact:

```text
fibre-m2-pr39-slice-e2-a2b-v2.json
```

The artifact is development-only and burned for final-cohort use. It resumed from the failed A2b-v1 artifact, reused one completed life and one already-burned plausibility/draw schedule, and did not reroll those decisions.

**A2b materially corrects A2's deterministic opportunity-template collapse while preserving the useful H2 separation of opportunity selection from scene grounding. The plausibility-model layer itself, however, contributed no discrimination on D1/D2.**

This is a promising mechanism result, not a production freeze and not an admission verdict.

## Mechanical outcome

The final evidence contains:

```text
2 worlds
3 lives / world
10 episodes / life
60 admitted episodes
10 whole-candidate attempts
4 rejected whole-candidate attempts
```

The four rejected attempts all ended in `record_repair_exhausted`. Because each life retained a frozen opportunity schedule across retries, rejection could not substitute a different opportunity skeleton. It could still bias the surviving scene realization of that fixed skeleton, so the rejection rate remains a material mechanical-survivorship warning.

The completed arm produced:

```text
introduced participants:       7
intellectual encounters:       20
new-counterpart-pressure:      5 episodes
pressure realized with intro:  5 / 5
selected world-emergent:       6 / 60
```

Cast differentiation therefore remains materially healthier than the H6 corrected control, which introduced no new participants in 60 episodes.

## Plausibility layer: no discrimination on these worlds

Every one of the 60 plausibility calls approved:

```text
all 9 offered EventStructures
+ world_emergent
= 10 plausible routes
```

Per-life mean plausible routes is `10.00` throughout and singleton count is `0` throughout.

Therefore the model plausibility layer did not narrow the eligible surface at all on E2-D1 or E2-D2. The useful mechanism actually exercised here was effectively:

```text
blind eligible opportunity surface
        ↓
uniform frozen seeded contingency
        ↓
selected opportunity
        ↓
factual scene realization
```

This is evidence, not a reason to tune the plausibility prompt after the run. Do not infer that a plausibility layer is universally useless; the supported claim is only that it added no information on these two diagnostic worlds under this frozen protocol.

If this mechanism is promoted later, the burden is now on any retained plausibility-model call to justify itself independently. Fibre must not keep an LLM layer merely because it was part of the diagnostic implementation.

## Between-life particularity

### E2-D1

Pairwise Jaccard values:

```text
place:      1.000, 0.750, 0.750   mean ~= 0.833
role:       0.667, 0.750, 0.500   mean ~= 0.639
structure:  0.143, 0.063, 0.071   mean ~= 0.092
source:     0, 0, 0
```

### E2-D2

```text
place:      1.000, 1.000, 1.000   mean = 1.000
role:       0.750, 0.667, 0.500   mean ~= 0.639
structure:  0.200, 0.000, 0.143   mean ~= 0.114
source:     0, 0, 0
```

## H6 → A2 → A2b comparison

Mean same-world Jaccard:

```text
                    H6       A2       A2b
D1 place           0.833    1.000     0.833
D1 role            1.000    0.633     0.639
D1 structure       0.313    0.576     0.092

D2 place           0.639    1.000     1.000
D2 role            1.000    0.733     0.639
D2 structure       0.410    0.643     0.114
```

A2 had triggered the predeclared template-collapse warning because place and structure overlap each rose by at least `0.15` in both worlds relative to H6.

A2b does **not** trigger that warning:

- D1 place overlap returns to the H6 level while role and structure overlap improve materially;
- D2 place overlap remains high, but role and structure overlap improve materially, so only one structural dimension worsens;
- intellectual-source overlap remains zero throughout.

The five-place diagnostic-world ceiling matters when reading D2 place overlap: all three A2b lives use four places, but their structure routes differ sharply. Place identity is therefore still a concern, but it no longer co-moves with a common structure skeleton.

## H2 interpretation

The experimental chain now supports a sharper mechanism diagnosis:

```text
H6 combined chooser/realizer
  -> grounding cost suppresses new cast

A2 blind deterministic single winner
  -> cast expands
  -> common public-world opportunity skeleton appears

A2b seeded contingency
  -> cast differentiation survives
  -> A2 structure-template collapse disappears
```

Therefore:

```text
H2 selection/realization coupling:       SUPPORTED
A2 deterministic single winner:          REJECTED
A2b seeded contingency:                  SUPPORTED AS DEVELOPMENT MECHANISM
A2b plausibility filtering on D1/D2:     NON-DISCRIMINATING
production mechanism freeze:             NOT YET
```

## Mechanical-survivorship warning

A2b required 10 candidate attempts for six completed lives, with four rejected attempts.

The observed failed paths include:

- structure-participation failure followed by an overlong replacement;
- participant-introduction failure followed by an overlong replacement;
- combinations where form repair consumed one of the three generated-version slots before a structural retry.

Because selected opportunities were already frozen, this cannot alter which abstract route was assigned to the life. It can still select among scene realizations that are easier for the model to make mechanically valid. That pressure should be reduced prospectively before fresh-cohort work, but **A2b must not be regenerated after the hardening**.

## Next load-bearing question: downstream fertility

A2b establishes event-route particularity. It does not yet establish Fibre's stronger Rich-Life claim.

The next predeclared diagnostic is N1:

> do these different lived histories produce distinguishable autobiographical memory and meaning when Pass B is `life_only`, genome-unexposed, and Pass C remains genome/history blind?

N1 must consume this frozen A2b artifact without feeding its output back into Pass A or tuning A2b. A positive result must be grounded in concrete lived causes, not seed IDs, structure labels, model metadata, or other cosmetic fingerprints.

Only after downstream fertility and fresh validation worlds should E2 be considered ready for combined E+F review.

No admission verdict is earned by this development result.
