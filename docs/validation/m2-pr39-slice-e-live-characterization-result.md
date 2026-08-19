---
id: m2-pr39-slice-e-live-characterization-result
status: candidate
last-reviewed: 2026-08-18
canonical: false
---

# Milestone #39 — Slice E burned live characterization result

## Run identity

The frozen Slice-E development run completed on Attempt 5 after the mechanical failures and repairs recorded in `m2-pr39-slice-e-live-characterization-plan.md`.

```text
origin mode: synthetic_lineage
provider/model: openai / gpt-5.1-2025-11-13
seed: slice-e-dev-burned-001
world: world_slice_e_dev_burned_001
episodes: 10
developmental span: age 6 through 17.999
mechanical suite before run: 533/533
npm run check: green
developmentOnly: true
burnedForFinalCohort: true
admissionVerdict: null
local evidence artifact SHA-256: ce1e174d564272ac23b1f9c1559f308b2a5c379fe73acd516ea650c837a18c1a
```

The artifact is development evidence only. It is not admitted as a final cohort member, is permanently burned for G/H, and is not an E admission verdict.

## Mechanical result

The run completed all ten chronology strata. All ten episodes satisfied the existing Pass-A history/form validators after bounded record repair where required.

- 10 historical episodes;
- 10 structure-grounded, 0 world-emergent;
- 5 record-form repairs, all `pass_a_observable_action_bounds`;
- no provider retries or provider/protocol failures;
- no genome/lineage material entered Pass-A cognition;
- no meaning/lesson/trait/future-policy field entered authoritative history;
- the rich history schema remained capable of carrying first-class intellectual encounters, but no encounter instantiated in this run.

The five repairs are part of the characterization rather than hidden survivorship. Initial generation remains noticeably verbose relative to the 1200-byte authoritative history bound.

## Observed life

The ten episodes advanced monotonically through ages:

```text
6.94, 8.13, 8.91, 9.87, 11.61,
12.97, 13.26, 14.95, 16.08, 17.54
```

The selected structure distribution was:

```text
ges_v2_family_decision_with_future_effect  3
ges_v2_lost_small_item                     2
ges_v2_shared_object_disagreement          2
ges_v2_help_younger_person_choose          2
ges_v2_mundane_errand_independence         1
```

Only five distinct structures instantiated across ten strata. Nine episodes occurred at `place_e_home`; one occurred on `place_e_street`. `person_e_caregiver_1` appeared in all ten episodes and `person_e_sibling` in nine. No peer, teacher, mentor, librarian, neighbor, shopkeeper, school, library, or community-center participant/place actually entered the life.

The chronology formed a strong continuity attractor:

```text
missing colored pencil / bus drawing
  -> shared colored-pencil dispute / bus drawing
  -> helping sibling choose colors
  -> helping sibling choose snacks
  -> independent grocery errand
  -> recurring chips / household-budget choice
  -> art-club decision framed against preserving the chips purchase
```

This continuity is coherent, but excessively self-reinforcing. Later Pass-A calls appear to reuse salient concrete details from prior observable history rather than exploring the broader world and affordance set.

## Intellectual-formation finding

This run produced:

```text
intellectualEncounterEvents: 0
uniqueEncounterSourceCount: 0
```

The zero is not explained by an absence of intellectual possibilities. Every developmental stratum offered intellectual affordances. Across the ten 9-structure offer sets, 41 of 90 offered slots were structures classified by EventStructurePool-v2 as carrying an `intellectual_encounter` context, while the model selected zero of them.

Accordingly the result is a substantive negative characterization:

> **The current rich-life instrument can represent intellectual encounters, but this burned run did not demonstrate that ordinary Pass-A generation actually instantiates intellectual formation even when such affordances are continuously available.**

Do not reinterpret this as a schema failure: the schema/provider/authority path for intellectual encounters is mechanically exercised by deterministic tests. The live finding is about generator behavior and life composition.

## Richness / monoculture finding

The life is not generic in the sense of disconnected interchangeable vignettes. It has persistent household details and genuine episode-to-episode continuity. But it is narrow in a different way:

- 90% of episodes occur at home;
- the same caregiver appears in 100%;
- the sibling appears in 90%;
- 50% of episodes use one of only two repeated early structures, and the final 30% all use `family_decision_with_future_effect`;
- the broader public world is almost unused;
- no new participant is introduced;
- no intellectual source is encountered;
- one mundane motif (drawing/pencils) mutates into another mundane motif (chips/budget) and becomes increasingly narratively load-bearing.

The result therefore shows **narrative inertia / local monoculture** rather than the intended broad developmental richness. In particular, the final art-club decision is over-neat: a potentially expanding adolescent opportunity is folded back into the established chips/budget motif instead of widening the life.

This is not an admission failure because Slice E deliberately has no richness threshold. Rejecting or regenerating this life because it is narrow would destroy the diagnostic.

## What did work

The negative behavioral result should not erase the architecture that held:

- chronology spans childhood through late adolescence rather than collapsing near one age;
- structure selection remains an affordance choice rather than a checklist;
- actual symbolic crossover exists upstream while Pass A remains genome-blind;
- synthetic-lineage and de-novo use the same cognition boundary;
- rich episode publication remains the existing authoritative Thread-history path;
- intellectual-source metadata, when present, is structurally observable-history fact and not meaning authority;
- repair cannot reauthor event identity or intellectual-encounter facts;
- current developmental-range and role constraints no longer hide impossible requirements from cognition;
- weak/ugly live output survives as evidence instead of being quality-gated away.

## Interpretation and next step

Do **not** tune EventStructurePool-v2, prior-history visibility, prompts, selection weights, or the burned world against this sample before the E+F review. The run has already served its development purpose and is permanently burned.

Slice E has no independent blocking gate. Proceed to Slice F origin/source integrity with this result carried forward as an explicit known risk. Gate F reviews E+F together and may legitimately return `HOLD` if the observed narrative inertia and zero intellectual formation make the combined claim inadequate for G.

If Gate F later requires an E redesign, the redesign must be motivated by this recorded negative evidence and verified on a fresh development world/seed, not by regenerating this burned sample until it looks richer.
