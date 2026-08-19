---
id: validation-m2-pr39-slice-e2-v1-fresh-world-protocol
status: frozen
last-reviewed: 2026-08-19
canonical: false
---

# Milestone #39 — Slice E2-V1 fresh-world validation protocol

## Status

**Frozen before first model use of E2-V1.**

This protocol closes the remaining Gate-F E2 evidence question identified by hostile review:

> does the E2 mechanism reproduce its between-life particularity advantage on a world that was not used to develop the mechanism?

This is not another E2 development arm. The mechanism is frozen. The world is fresh. No result may feed back into mechanism tuning on E2-V1.

## Why this validation exists

E2-D1 and E2-D2 were used to diagnose and iterate the mechanism:

```text
A0 -> H6 -> A2 -> A2b -> N1
```

That work supports the mechanism argument, but the same two worlds cannot establish that the mechanism generalizes beyond the environments on which it was developed.

Gate-F hostile review therefore requested the narrowest remaining check: **one fresh source-free world, current corrected A0 versus the frozen E2 mechanism, before Slice G freezes a cohort.**

## Fresh world

Implementation fixture:

```text
tools/genesis-rich-life-e2-v1-world.mjs
E2_V1_WORLD_FIXTURE
id: E2-V1
worldSpecId: world_slice_e2_v1_fresh_burned_on_first_use
```

The world was authored after the E2 mechanism had been frozen and before any E2-V1 model call.

The fixture is source-free:

```text
worldAuthorship.sourcesConsulted = []
```

It was authored without access to:

- a validation genome;
- a named source person;
- a target personality;
- a target adult role;
- E2-V1 model output;
- the eventual arm comparison.

The setting is intentionally structurally different from E2-D1/D2: a mixed-use inland urban district with tram travel, a one-caregiver-plus-grandparent household, a community workshop, and public riverside facilities rather than the estuary/ferry or dispersed high-desert settings used in development.

Committing the fixture does **not** burn it. The first model invocation using it burns it permanently for this validation and for final-cohort use.

## Frozen arms

Exactly two arms run on the same WorldSpec.

### A0 — corrected coupled chooser/realizer

A0 uses the current corrected Pass-A path in which the model receives the sampled offer window and realizes one admitted episode through the existing coupled generation surface.

It uses the current participation correction and existing record-repair / record-retry discipline. This is not the mechanically broken pre-H6 A0 execution.

### FROZEN — seeded contingency + selected-opportunity realization

The frozen arm carries forward only the mechanism actually supported by A2b:

```text
9 sampled mechanically eligible offers
+ world_emergent
        ↓
full eligible route surface
        ↓
uniform deterministic SHA-256 seeded contingency
        ↓
fixed opportunity
        ↓
existing factual selected-opportunity Pass-A realization
```

**No plausibility-selector model call is used in E2-V1.**

Reason: in the completed A2b development artifact, the plausibility cognition approved every offered structure plus `world_emergent` in all 60 windows. It supplied no observed selection information on D1/D2. Retaining that call in a fresh-world validation would introduce new selector cognition that E2 did not establish as part of the useful mechanism.

The frozen mechanism version is:

```text
pr39-slice-e2-frozen-seeded-contingency-v1
```

The seeded draw reuses the existing `seededUniformRouteDraw` implementation. The selected opportunity is frozen before scene realization and does not depend on prior-life diversity, target personality, richness, novelty, cumulative-life quality, or downstream outcomes.

## Pairing and sample

Exactly three seeds are frozen:

```text
slice-e2-v1-seed-01
slice-e2-v1-seed-02
slice-e2-v1-seed-03
```

For each seed:

```text
A0 first
FROZEN second
```

Each arm therefore contains:

```text
3 lives
10 developmental episodes / life
9 sampled EventStructures / episode window
max 3 whole-candidate attempts / life
```

The same `buildE2A0Plan(world, seed)` supplies the developmental windows and sampled offer IDs to both arms. The difference under test is the chooser/realizer coupling, not the offered pool.

The two arms use the same provider/model selected at execution time.

## Preflight

The runner exposes a model-free preflight:

```bash
npm run genesis:e2-v1 -- --preflight
```

Preflight records:

- WorldSpec digest;
- protocol/evidence versions;
- source-free witness;
- frozen seeds;
- sampled offer IDs for every seed/window;
- deterministic frozen-arm route counts and selected opportunities;
- frozen schedule digests;
- generator/pool/prompt/policy witnesses;
- the predeclared interpretation rule.

`--preflight` creates no model adapter and performs no model invocation. It may be run repeatedly without burning E2-V1.

## Primary measure

The primary measure is **between-life event-structure overlap**, not event count or within-life breadth.

For each arm, compute all three pairwise Jaccard values over the set of admitted non-null `structureRef`s used by each of its three lives, then take their mean:

```text
mean_same_world_pairwise_structure_ref_jaccard
```

Define:

```text
improvement = A0 mean structure Jaccard - FROZEN mean structure Jaccard
```

The primary fresh-world replication criterion is frozen **before model use**:

```text
improvement >= 0.15
```

The `0.15` magnitude is not newly tuned to E2-V1. E2 development already used a 0.15 change in overlap as the warning magnitude for meaningful template collapse. E2-V1 applies that same magnitude in the beneficial direction.

A valid comparison requires all three lives in each arm to complete under the existing candidate-attempt discipline.

## Characterization only

The following are recorded but are **not** independent pass/fail gates:

- mean pairwise place Jaccard;
- mean pairwise participant-role Jaccard;
- intellectual-subject overlap;
- distinct places or structures within one life;
- introduced-participant count;
- intellectual-encounter count;
- world-emergent episode count;
- record repairs;
- record retries;
- candidate-attempt rejection rate;
- locality concentration.

These values help interpret the mechanism and detect obvious regressions, but Fibre must not manufacture a new Rich-Life score or quota from them.

Candidate-attempt exhaustion is different: if an arm cannot produce the frozen three-life sample under the existing three-attempt cap, the planned comparison is incomplete and Gate F remains HOLD. Do not regenerate the world or raise the cap to obtain a preferred result.

## Interpretation rule

After both arms complete:

```text
if improvement >= 0.15:
    fresh-world mechanism replication supported
else:
    fresh-world mechanism replication not demonstrated
```

If replication is not demonstrated:

- do not tune E2-V1;
- do not rerun it with different seeds;
- do not change the threshold;
- do not add a richness objective;
- do not select a replacement fresh world after seeing the result.

Record the result and return Gate F to hostile review / interpretation.

A positive result is also narrow. It supports one-world off-development generalization of the observed mechanism. It is **not** publication-grade statistical proof and does not replace final G/H cohort evidence.

## Failure discipline

The first model call burns E2-V1.

The runner requires a new output path and refuses to overwrite an existing output. On failure it writes the evidence accumulated so far, including completed lives and provider model events, when available.

If execution fails mechanically:

1. preserve the failure artifact;
2. do not delete or overwrite it;
3. diagnose whether continuation can preserve already-generated cognition and frozen schedules;
4. do not silently restart the fresh-world experiment.

If candidate attempts exhaust under the frozen protocol, that is an observed validation outcome, not a reason to reroll.

## No downstream N1 rerun

E2-V1 does **not** repeat N1.

N1 already tested whether particular A2b histories can survive into genome-blind memory/meaning. E2-V1 answers a different remaining question: whether the **generation mechanism itself** produces lower between-life structural overlap off the worlds used to develop it.

Repeating N1 here would increase cost and introduce a new post-hoc validation stage not required by the Gate-F HOLD.

## Expected evidence artifact

Use one immutable output artifact:

```text
artifacts/validation/m2-pr39/e2/fibre-m2-pr39-slice-e2-v1-fresh-world-v1.json
```

After execution, record its SHA-256 and result in a short validation-result document. The artifact is development/Gate-F evidence, not live Thread authority and not final-cohort evidence.

## Gate consequence

E2-V1 exists only to close Gate-F S2-2.

A positive fresh-world replication plus the already-pushed E2 evidence and publication-enforced Slice-F origin boundaries may be resubmitted to hostile Gate-F review.

No Gate-F CLEAR is claimed by this protocol.
