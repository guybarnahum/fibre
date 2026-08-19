---
id: validation-m2-pr39-slice-e2-v1-fresh-world-result
status: failed-replication
last-reviewed: 2026-08-19
canonical: false
---

# Milestone #39 — Slice E2-V1 fresh-world result

## Verdict

**FAILED REPLICATION. DO NOT RERUN OR TUNE E2-V1.**

The fresh-world validation did not reproduce the development-world advantage of the frozen seeded-contingency mechanism over the corrected coupled A0 chooser/realizer.

The predeclared primary measure moved in the wrong direction:

```text
A0 mean same-world pairwise structure Jaccard:     0.202020202020202
FROZEN mean same-world pairwise structure Jaccard: 0.2496031746031746
FROZEN improvement over A0:                       -0.047582972582972616
required improvement:                              0.15
primary replication met:                           NO
```

Gate F therefore remains HOLD pending interpretation. This result must not be repaired with another seed set, another fresh world, a changed threshold, or a tuned version of the mechanism.

## Question

Claude's first Gate-F review identified that A2b had been developed and evaluated on the same D1/D2 diagnostic worlds. E2-V1 was frozen to test one narrow question on an entirely fresh world:

> Does the mechanism inferred from D1/D2 — mechanically eligible opportunity surface → Thread-blind seeded contingency → fixed-opportunity factual realization — reduce between-life abstract event-template overlap relative to the corrected coupled A0 chooser/realizer without being tuned to D1/D2?

Only one primary comparison was permitted.

## Frozen protocol identity

```text
evidenceVersion:   pr39-slice-e2-v1-fresh-world-v1
protocolVersion:   pr39-slice-e2-v1-fresh-world-protocol-v1
worldId:           E2-V1
worldSpecId:       world_slice_e2_v1_fresh_burned_on_first_use
worldSpec SHA-256: 6f03e145922133d010968892c6a1c069c12ce20cdf154bfe25c04cbec4f5721b
preflight SHA-256: a136b9939b08c17948a695f55e23eaf7c65ae922ae4e45f8bd05bf8b1fca7061
provider:          openai
model:             gpt-5.1-2025-11-13
```

The world was source-free and first model use burned it for final-cohort purposes.

Both arms used the same three frozen seeds, 10 developmental strata, 10 episodes per life, 9 mechanically sampled EventStructures per window, the same event pool, the same counterpart policy, and the same maximum of three candidate attempts per life.

Arm order was frozen within each seed:

```text
seed 01: A0 → FROZEN
seed 02: A0 → FROZEN
seed 03: A0 → FROZEN
```

The FROZEN arm used no selector cognition. Its opportunity surface was the 9 mechanically sampled offers plus a world-emergent route, followed by the already-frozen SHA-256 uniform draw and the existing selected-opportunity Pass-A realizer.

## Execution validity

Repository verification immediately before the run was locally reported as:

```text
tests: 565
pass:  565
fail:  0
repository validation: passed
```

The experimental artifact completed successfully:

```text
A0 lives:       3 / 3
FROZEN lives:   3 / 3
A0 episodes:   30
FROZEN episodes: 30
candidate-attempt exhaustion: none
```

A0 had one whole-candidate rejection and completed that seed on candidate 2/3. FROZEN completed all three lives on candidate 1/3.

The user's separate shell attempt to parse redirected `npm run genesis:e2-v1 -- --preflight` output failed because npm's command banner was included in stdout. This was a CLI-output ergonomics issue, not a protocol failure: the completed artifact itself contains the frozen preflight object and digest used by the runner before model execution. It is not a basis for rerun.

## Primary result

The frozen decision rule was:

```text
primaryMeasure = mean_same_world_pairwise_structure_ref_jaccard

improvement = A0 structure Jaccard - FROZEN structure Jaccard

replication requires improvement >= 0.15
```

Observed:

| Arm | Mean pairwise structure Jaccard |
|---|---:|
| A0 | 0.202020202020202 |
| FROZEN | 0.2496031746031746 |

Therefore:

```text
improvement = -0.047582972582972616
required    =  0.15
replication =  NO
```

This is not a near miss. The direction reversed: the frozen mechanism produced **more**, not less, abstract structure overlap between lives than A0 on the fresh world.

## Characterization

The following measures were frozen as characterization only and do not replace the failed primary result.

### Between-life overlap

| Arm | Place Jaccard | Role Jaccard | Structure Jaccard | Intellectual-subject Jaccard |
|---|---:|---:|---:|---:|
| A0 | 0.5666666666666668 | 0.7166666666666667 | 0.202020202020202 | 0 |
| FROZEN | 1.0 | 0.7000000000000001 | 0.2496031746031746 | 0 |

The most conspicuous secondary observation is place overlap: every FROZEN life used the same three-place set, giving pairwise place Jaccard 1.0. A0 used different place sets across seeds, with mean place Jaccard about 0.567.

This must remain characterization because place overlap was not the primary replication gate. It nevertheless points in the same qualitative direction as the failed primary result rather than rescuing it.

### Within-life breadth and other counts

```text
A0
  episodes:                  30
  unique structures/life:    7, 7, 7
  unique places/life:        3, 3, 5
  introduced participants:   3 total
  intellectual encounters:  11 total
  world-emergent episodes:    0
  accepted-record repairs:   13
  accepted-record retries:    0
  candidate attempts:         4
  rejected candidates:        1

FROZEN
  episodes:                  30
  unique structures/life:    9, 10, 9
  unique places/life:        3, 3, 3
  introduced participants:   4 total
  intellectual encounters:  10 total
  world-emergent episodes:    0
  accepted-record repairs:   12
  accepted-record retries:    1
  candidate attempts:         3
  rejected candidates:        0
```

This exposes an important distinction already central to Rich-Life doctrine:

> Within-life breadth is not between-life particularity.

FROZEN produced more distinct EventStructures *inside each life* while failing to make the lives more distinct from one another on the predeclared measure. It also collapsed all three lives onto the same place set.

## Interpretation

E2-V1 falsifies the following generalization from D1/D2:

> Uniform seeded contingency over the mechanically eligible opportunity surface is, by itself, a generally supported mechanism for improving between-life particularity.

That mechanism looked strong on the two worlds on which E2 was developed, but its advantage did not transfer to the first genuinely fresh validation world.

The result does **not** establish the opposite universal claim that coupled A0 is always better. It establishes only what this protocol can establish:

- the D1/D2 A2b advantage did not replicate on E2-V1;
- the frozen mechanism cannot now be carried into Slice G as an empirically established general solution;
- tuning E2-V1 to recover the expected result would invalidate the point of the fresh-world test.

## Consequence for N1

N1 remains valid evidence about the six D1/D2 A2b histories it actually tested:

```text
particular D1/D2 histories
        ↓
selective memory
        ↓
possible durable meaning
        ↓
source life remained distinguishable in the informative trials
```

N1 does **not** rescue E2-V1. It shows that the particular histories produced in the successful D1/D2 development arm had downstream autobiographical fertility. It does not establish that the A2b/seeded-contingency generation mechanism will reliably produce more particular histories on a fresh world.

The canonical conservative N1 interpretation remains 13/18 with zero margin against its frozen development threshold.

## Evidence artifact

Canonical artifact path:

```text
artifacts/validation/m2-pr39/e2/fibre-m2-pr39-slice-e2-v1-fresh-world-v1.json
```

SHA-256 of the completed artifact supplied for review:

```text
e6f59d1e62e7856914598b8f10424f778bef0ed6256ad771385af67f2e4cc720
```

The artifact should be retained even though the replication failed. A negative frozen experiment is first-class validation evidence.

## Gate-F consequence

Gate F remains **HOLD**.

This experiment completes Claude's requested fresh-world check, but the result is negative. The next action is not another experiment. The result should be presented back to the hostile reviewer together with the now-wired Slice-F publication enforcement and the pushed evidence set.

The next review should answer the architectural question exposed by the falsification:

> Is Slice E sufficient for #39 with the corrected coupled A0 mechanism and E2 retained as diagnostic evidence, or does #39 require a different generation mechanism before Gate F may clear?

No answer is asserted here. In particular, this document does not silently promote A0 to the production mechanism merely because it won this one fresh-world comparison.
