# Milestone #39 — Slice E2 A2 Result

Status: development evidence
Arm: `A2_stateless_opportunity_selection`
Paired control: `H6_counterpart_participation_correction`
Model: `gpt-5.1-2025-11-13`
Worlds: E2-D1, E2-D2
Seeds/world: 3
Episodes/life: 10

## Result

**H2 is supported, but the exact A2 mechanism is rejected as a production candidate.**

Separating opportunity selection from scene realization removed a real grounding-cost bias: the blind selector repeatedly chose opportunities that required people who were not yet in the Thread's known cast, and realization successfully introduced those people. However, the single-winner stateless selector also created a new same-world opportunity template. The resulting lives became healthier in cast/role variation while becoming more interchangeable in place sets and structure skeletons.

This is not a Rich-Life success. It is a causal diagnosis plus a failed mechanism candidate.

## Mechanical outcome

The final A2 execution completed all six intended lives with no whole-candidate rejection:

- 2 diagnostic worlds;
- 3 lives per world;
- 10 selected opportunities and 10 realized episodes per life;
- 6 candidate attempts total;
- 0 rejected candidate attempts;
- one record-local retry in D1 seed 02;
- all 60 frozen selector choices were realized as the selected structure.

The first D1/seed-01 selector schedule was reused from the prior failed artifact and cryptographically rebound to the deterministic offer schedule. No selector choice from the failed run was rerolled.

The intellectual-encounter cognition-interface correction made the previously repeated `mentor_optional_path` failure representable without changing canonical stored encounter semantics.

## H2 signal: grounding cost was suppressing cast expansion

The H6 control completed 60 episodes with **zero introduced participants**. Every same-world pair had participant-role Jaccard `1.0`.

A2 produced:

| World | Introductions by life | Total |
| --- | --- | ---: |
| E2-D1 | 3, 2, 3 | 8 |
| E2-D2 | 2, 2, 4 | 8 |
| **Total** | | **16** |

Every life had exactly one mechanically witnessed `newCounterpartPressure` opportunity, and all 6/6 such opportunities were realized with a same-episode legal participant introduction.

Same-world participant-role Jaccard changed to:

- E2-D1: `0.6`, `0.5`, `0.8`;
- E2-D2: `0.6`, `0.6`, `1.0`.

This is strong evidence that the coupled H6 control avoided some opportunities because already-grounded people/scenes were cheaper to instantiate.

**H2 causal diagnosis: supported.**

## Between-life warning: A2 over-templates opportunity selection

The improvement in cast variation came with a predeclared negative signal.

### Place-set overlap

H6 control:

- E2-D1 pairwise place Jaccard: `1.0`, `0.75`, `0.75`; mean ~= `0.833`.
- E2-D2: `0.667`, `0.75`, `0.5`; mean ~= `0.639`.

A2:

- E2-D1: `1.0`, `1.0`, `1.0`; mean `1.0`.
- E2-D2: `1.0`, `1.0`, `1.0`; mean `1.0`.

Mean increase:

- E2-D1: about `+0.167`;
- E2-D2: about `+0.361`.

### Structure-set overlap

H6 control:

- E2-D1: `0.333`, `0.333`, `0.273`; mean ~= `0.313`.
- E2-D2: `0.5`, `0.5`, `0.231`; mean ~= `0.410`.

A2:

- E2-D1: `0.429`, `0.5`, `0.8`; mean ~= `0.576`.
- E2-D2: `0.857`, `0.571`, `0.5`; mean ~= `0.643`.

Mean increase:

- E2-D1: about `+0.263`;
- E2-D2: about `+0.233`.

The E2 interpretation freeze says that within-life breadth accompanied by an absolute Jaccard increase of at least `0.15` on at least two structural dimensions in both worlds is a **template-collapse warning**, not richness success.

A2 hits that warning on **place sets and structure sets in both worlds**.

This is visible directly in the frozen selector schedules. Examples:

- D1 seed 01: `peer_invitation` x3, `mundane_errand_independence` x3, `choose_text_self_directed` x2 before the final mentor opportunity.
- D1 seed 03: `peer_invitation` x3, `mundane_errand_independence` x3, `choose_text_self_directed` x3.
- D2 seeds repeatedly converge on `small_help_request`, `peer_invitation`, runs of `mundane_errand_independence`, then `choose_text_self_directed`, then `public_failure_recovery`.

The selector was correctly blind to subject, household, prior episodes, known participants, counterpart mode, context labels, and prior selector choices. That blindness removed grounding-cost avoidance, but a temperature-zero single-winner model presented with similar public-world/offer inputs repeatedly chooses the same abstract opportunity. The mechanism therefore replaces **scene-grounding monoculture** with an **opportunity-skeleton monoculture**.

## Other observations

### World emergence

A2 selected `world_emergent` zero times in all 60 slots. This is legal, but it shows that the single-winner selector strongly prefers named affordances when forced to choose one explicit opportunity kind.

### Places

Every A2 life used exactly four places, and every same-world life used the same four-place set. This is broader than the worst H6 life but less particular between lives.

### Intellectual encounters

A2 produced 16 intellectual encounters across six lives:

- D1: 3, 2, 3;
- D2: 2, 2, 4.

Intellectual-source Jaccard remained `0` for every same-world pair. This is positive local non-interchangeability evidence, but it does not override the place/structure template warning.

### Form repair

Observable-action repair remains common:

- D1 repairs: 6, 3, 6;
- D2 repairs: 7, 7, 6;
- total: 35/60 records required a form repair.

This remains a mechanical cost, not a Rich-Life score.

## Interpretation

A2 answers the central H2 question:

> Does coupling opportunity choice to immediate scene grounding suppress experiences that require new people or less convenient grounding?

**Yes.**

It does **not** answer the larger production question with "use A2." The exact mechanism has a second-order failure:

> a blind deterministic single-winner selector becomes a same-world template generator.

Therefore:

- H2 diagnosis: **SUPPORTED**;
- single-winner stateless A2 as production mechanism: **REJECTED**;
- H1 prior-prose inertia: still live but no longer the leading explanation for cast collapse;
- H3 static-world pressure: unresolved;
- H4 historical sparsity: unresolved;
- H6 participation correction remains necessary mechanical infrastructure.

## Next bounded experiment: A2b plausibility surface + seeded contingency

The smallest follow-up should preserve the successful H2 separation while removing the selector's obligation to pick one canonical event.

A2b should:

1. keep selector cognition blind to Thread history, roster, household, counterpart economics, prior selector choices, richness diagnostics, and future material;
2. ask the selector only which currently offered abstract opportunities are **plausible** in this public world/time slot;
3. permit multiple plausible opportunities and permit `world_emergent` as a plausible route;
4. have Fibre make one frozen seeded choice from that plausible set **before** realization;
5. give realization only the frozen choice plus normal factual continuity;
6. preserve the same D1/D2 worlds, three seeds, ten strata, nine offers/window, counterpart policy, record retry discipline, and no richness feedback;
7. record the full plausible set, its digest, the seeded draw witness, and the realized episode;
8. treat a one-element plausible set as legal evidence rather than forcing variety.

The seeded draw must be uniform over the selector-approved plausible routes unless a different non-richness weighting is explicitly reviewed before the run. It must not down-weight repeated structures, reward novel places, inspect prior life, or optimize any richness metric.

The purpose is not to manufacture diversity. It is to restore **contingency** after the model has judged what can plausibly happen, so that same-world lives need not inherit the model's deterministic single-best answer as a common biography skeleton.

Do not run H1/H3/H4 until A2b shows whether H2 can be corrected without merely moving monoculture one layer upstream.
