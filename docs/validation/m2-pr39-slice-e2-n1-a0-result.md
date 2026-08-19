---
id: validation-m2-pr39-slice-e2-n1-a0-result
status: candidate
last-reviewed: 2026-08-19
canonical: false
---

# Milestone #39 — N1-on-A0 Gate-F result

## Purpose

This experiment was requested by the Gate-F hostile review after E2-V1 falsified the seeded-contingency generation mechanism.

The remaining question was narrow:

> Do the corrected A0 histories that would actually be carried forward produce autobiographical memory/meaning bundles that remain distinguishable from another A0 life?

The protocol was frozen before model execution in:

```text
docs/validation/m2-pr39-slice-e2-n1-a0-protocol.md
```

The source histories were not regenerated. They are the three A0 lives already present in the burned E2-V1 artifact.

## Frozen design

```text
source world: E2-V1
source arm:   A0 corrected coupled chooser/realizer
source lives: 3
pairs:        1↔2, 1↔3, 2↔3
horizons:     6, 8, 10
trials:       9
threshold:    8/9 conservative fertility credit
```

Conservative credit required both:

1. Pass B returned `remembered`; and
2. the blind rater correctly identified the source history.

A correct forced guess on `not_remembered` received zero positive credit.

The threshold and scoring rule were present in the preflight witness before model execution:

```text
positiveThreshold:     8
thresholdChanceTail:   0.01953125
sevenOfNineChanceTail: 0.08984375
criterion: remembered_and_rater_correct >= 8/9
preflightDigest: sha256:ddb1f1c360f66b8cb0bd70d133ca6456d815b866ed9ac06f341fddafbe52372c
```

## Result

The experiment completed all nine trials.

```text
raw forced-choice:          8 / 9
raw exact-binomial tail:    0.01953125

remembered trials:          6 / 9
correct among remembered:   6 / 6
not_remembered trials:      3 / 9

conservative fertility:     6 / 9
frozen threshold:           8 / 9
threshold met:              NO
```

The frozen Gate-F criterion therefore **failed**.

No rerun, threshold change, source-life replacement, prompt change, or score reinterpretation is authorized from this result.

## Trial-level pattern

```text
trial  horizon  source run  Pass B           rater correct  conservative credit
1      6        1           remembered        yes            yes
2      8        2           remembered        yes            yes
3      10       1           not_remembered    no             no
4      6        3           remembered        yes            yes
5      8        1           remembered        yes            yes
6      10       3           remembered        yes            yes
7      6        2           remembered        yes            yes
8      8        3           not_remembered    yes            no
9      10       2           not_remembered    yes            no
```

The three no-memory outcomes are distributed across all three A0 source lives. No source life is uniformly unable to form an autobiographical memory in this diagnostic.

## What the positive six trials establish

Whenever Pass B formed an autobiographical memory, the blind source attribution was perfect in this sample:

```text
6 remembered
6 correctly attributed
6 durable meanings formed
```

The rater rationales used concrete lived details such as:

- retrieving a ball with a broken broom handle and torch;
- a red toy car, chalk roads and a sibling dispute near a drain;
- buying a tram ticket while a grandparent deliberately stood back;
- going alone to buy groceries;
- a bilingual poetry reading and a neighbor's reaction;
- science demonstrations, a rocket book and a structural-engineering booklet.

This is evidence that the corrected A0 histories contain distinguishable autobiographical material **when that material is selected into memory**.

It does not override the frozen 6/9 Gate-F score.

## What the three no-memory trials say

All three `not_remembered` provider outputs gave closely related epistemic reasons rather than identifying a common weakness in one source life.

They said, in substance:

- no prior memories were supplied, so the model could not infer which visible events were actually remembered;
- the inputs were observational life-history records rather than explicit markers of recall;
- selecting a memory would therefore be speculative.

The exact provider raw outputs are retained in the evidence artifact before deterministic no-memory residue canonicalization.

This creates a new diagnostic question:

> Is the failure mainly a property of A0 history fertility, or does the Pass-B development task conflate *generating/selecting autobiographical memory from lived history* with *proving from prior evidence that a memory already exists*?

This result alone cannot answer that question. It must not be resolved by rerunning the same histories with a friendlier prompt or by changing the 8/9 threshold after observing the score.

## Interpretation

The correct interpretation is two-part:

1. **Gate-F downstream-fertility threshold failed.** The canonical result is 6/9, not 8/9.
2. **The failure did not show interchangeability of the memories that formed.** Conditional on memory formation, source identification was 6/6 using concrete lived details.

Therefore the experiment does not support saying that A0 has cleared downstream fertility for Gate F.

It also does not support the stronger claim that A0-generated lives are autobiographically interchangeable.

The newly exposed architectural issue is memory-selection semantics/calibration at the Pass-B boundary.

## Evidence artifact

Retain:

```text
artifacts/validation/m2-pr39/e2/fibre-m2-pr39-slice-e2-n1-a0-v1.json
```

SHA-256 of the completed local evidence artifact:

```text
8b8497fe687dfcb5a728024b83ca65c0f5e88006c645b0fbf5d92524e1adb122
```

The artifact is development-only and burned for final-cohort use.

## Gate-F consequence

Gate F remains **HOLD**.

Do not run another generator experiment or rerun N1-on-A0 merely to obtain a passing score.

The hostile reviewer should decide the narrow architectural consequence of the new evidence:

- whether #39 actually requires the frozen 8/9 *memory-formation plus attribution* rate from Pass B;
- whether Pass B's repeated `no priorMemories` reasoning reveals a task-semantics defect that must be corrected separately;
- or whether another bounded experiment is justified only after that semantic question is settled.

The result must be carried forward as a failed predeclared diagnostic regardless of that decision.
