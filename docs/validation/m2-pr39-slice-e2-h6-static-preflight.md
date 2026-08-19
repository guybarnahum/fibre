---
id: validation-m2-pr39-slice-e2-h6-static-preflight
status: candidate
last-reviewed: 2026-08-19
canonical: false
---

# Milestone #39 — Slice E2 H6 static preflight

## Purpose

Record the H6 evidence available **without generating another life** and before interpreting any H1-H4 mechanism arm.

H6 asks whether the binding constraint is the affordance surface itself:

```text
Pool-v2 realization surface
x current known roster / participant-introduction cost
x developmental full-stratum eligibility
x offered-set width
x rich-output schema cost
```

None of the findings below establishes causality. They determine what must be measured next.

## H6-a — E1 intellectual encounters were avoided, not rejected

The preserved completed E1 artifact records ten initial rich Pass-A calls and five later record-form repairs.

Observed:

```text
initial intellectualEncounter values: null
pass_a_intellectual_encounter repair failures: 0
record repairs: pass_a_observable_action_bounds
```

Therefore the zero-intellectual result did not come from repeated attempted intellectual encounters being rejected by the encounter validator.

Interpretation:

> The model selected the cheap/null path at generation. Schema economics, prompt framing, realization cost and affordance selection remain plausible explanations; encounter-validation failure does not explain E1.

## Pool-v2 size and intellectual subset

Current Pool-v2 contains:

```text
total structures: 32
structures carrying intellectual_encounter context: 13
```

The intellectual-context structures are not all equally expensive to realize from the initial E1/D1/D2 roster.

The matched four-person roster provides these non-subject roles immediately:

```text
caregiver
caregiver
sibling
```

Among the 13 intellectual-context structures:

- 8 have at least one `caregiver` counterpart alternative and can therefore be grounded without introducing a new non-household participant;
- 5 require a `peer`, `teacher`, `librarian` and/or `mentor` counterpart and therefore require same-episode or prior participant introduction before they can be realized.

The five introduction-requiring intellectual structures are:

```text
ges_v2_choose_text_self_directed
ges_v2_scientific_claim_test
ges_v2_mentor_optional_path
ges_v2_text_conflicts_with_expectation
ges_v2_art_unsettles_expectation
```

Participant-introduction cost can therefore explain **some but not all** intellectual avoidance. The other eight still have a household-groundable route, while every genuine non-null intellectual encounter also carries the richer encounter object:

```text
kind
subjectKind
subjectLabel
participantRef
accessMode
```

The blind H6-b probe must determine whether these abstract structures remain broadly realizable in the worlds despite those costs.

## Developmental full-stratum eligibility ceiling

The ten current age strata have the following eligible Pool-v2 counts under the full-stratum coverage rule:

```text
01   9
02  12
03  14
04  15
05  16
06  13
07  18
08  15
09  13
10  11
```

A0 currently offers nine structures per stratum.

Consequences:

- stratum 01 already exposes **100%** of its eligible Pool-v2 surface;
- stratum 10 exposes 9/11, leaving only two additional structures available;
- the largest offer-width expansion is possible in the middle developmental windows;
- a fixed >=12-offer A6 condition across all ten strata is impossible without changing Pool-v2 or the stratum design.

The plan already says that if a common >=12 count is unavailable, the limitation is itself H6 evidence. That condition is now met.

Do not mutate Pool-v2 merely to make A6 executable.

If a wider-offer diagnostic is retained, it must be explicitly reframed as a **variable middle-strata exposure probe**, with the youngest stratum unchanged and the oldest only modestly wider, or replaced by a different controlled affordance-surface test after H6-b.

## Next evidence

The next required step is the blind H6-b realization-diversity probe:

```text
E1 WorldSpec semantic projection + Pool-v2
E2-D1 semantic projection + Pool-v2
E2-D2 semantic projection + Pool-v2
```

The rater receives neutral world IDs and no:

- generated E1 life;
- episode history;
- world provenance/authoring metadata;
- experiment-arm identity;
- genome;
- memory/meaning;
- seed;
- E1 failure summary.

Tool:

```text
tools/genesis-rich-life-e2-h6-probe.mjs
```

The probe is measurement only and produces `admissionVerdict: null`.

## Interpretation discipline

If H6-b finds more than half of structures have at most two materially distinct plausible realizations, or more than half are effectively household-dominant, H6 is live and prompt-assembly experiments should pause.

If H6-b instead finds broad realization capacity, that does not refute schema/choice cost. It only tells us the abstract pool/world combination is not obviously realization-degenerate. The next controlled test must then isolate selection cost rather than equating theoretical affordance breadth with actual uptake.
