# Milestone #39 — Slice E2 A2b Plausibility + Contingency Protocol

Status: pre-run frozen development protocol
Purpose: retain H2's separation of opportunity plausibility from scene grounding while removing the deterministic single-winner selector that triggered between-life template collapse in A2.

## Claim under test

A stateless model can judge a **set of plausible abstract opportunities** from public world/time facts without seeing Thread continuity or grounding economics. Fibre can then select one route by frozen seeded contingency before scene realization.

This tests whether H2's useful separation can survive without replacing scene-grounding monoculture with a common same-world opportunity skeleton.

## Hard boundaries

The plausibility selector sees exactly the same semantic boundary as A2:

- public/factual world projection;
- developmental window;
- chronology ordinal/total;
- current nine abstract EventStructure offers;
- policy/digest witness.

It does not see:

- subject identity;
- household shape or family relations;
- initial or accumulated roster;
- prior episodes or prose;
- previously introduced participants;
- counterpartMode;
- contextKinds/intellectual labels;
- consequence class;
- prior selector/plausibility outputs;
- genome;
- memory/meaning;
- richness diagnostics;
- future benchmark/material.

The selector does **not** choose one event and does not rank opportunities. It returns:

- zero or more currently offered `plausibleStructureRefs`;
- `worldEmergentPlausible: true|false`.

At least one route must be plausible. A singleton set is legal. All offered routes being plausible is legal. `worldEmergentPlausible=false` is legal.

## Seeded contingency

Fibre constructs the canonical route list from the normalized plausibility response:

- one route for each approved offered structure;
- one `world_emergent` route if approved.

The routes are sorted canonically. Fibre selects one route using a deterministic seed derived only from:

- arm/protocol identity;
- WorldSpec/world id;
- Fibre seed;
- developmental ordinal;
- canonical plausible-route list.

The draw uses deterministic rejection sampling over SHA-256 so every route has equal probability. It does not inspect prior selections, prior history, places, participants, richness, intellectual content, or repetition.

The draw witness records:

- plausible-route list;
- plausible-set digest;
- draw-input digest;
- rejection counter;
- chosen index;
- chosen route;
- selectedOpportunity.

## Realization

After all ten A2b draws for a life are frozen, the existing A2 selected-opportunity realization machinery runs unchanged except for diagnostic identity/client-request labels.

Realization receives canonical factual continuity plus the already frozen selected opportunity. It may introduce participants only through existing WorldSpec authority. It cannot substitute an easier structure.

H6 counterpart semantics, intellectual-encounter canonical semantics, form repair, record-local retry, whole-candidate cap, and Gate-C boundaries remain unchanged.

## Frozen cohort design

Use exactly:

- E2-D1 and E2-D2;
- seeds `slice-e2-a0-seed-01..03`;
- 3 lives/world;
- 10 developmental strata/life;
- 9 offers/window;
- OpenAI `gpt-5.1-2025-11-13`;
- temperature 0 for plausibility judgment and realization.

Do not reuse A2's single-winner selections. A2b is a new arm. D1/D2 are already development-burned; this run remains development-only and cannot enter G/H.

## Comparison

Primary comparison is A2b against:

1. H6 corrected control, to test whether H2 remains beneficial;
2. A2 single-winner arm, to test whether seeded contingency removes A2's template-collapse warning.

Record:

- introductions and new-counterpart-pressure realization;
- place/structure/participant-role/intellectual-source pairwise Jaccard;
- per-life concentration and unique counts;
- plausible-set sizes and singleton/all-offers frequency;
- world-emergent plausibility and actual draws;
- repairs/retries/rejections.

## Interpretation

A2b is promising only if:

- cast expansion remains materially healthier than H6;
- A2's place/structure overlap inflation materially recedes in both worlds;
- the result does not depend on hidden novelty/repetition penalties;
- plausibility sets are not mechanically degenerate singletons in most windows;
- seeded contingency remains fully independent of Thread life-so-far.

Low variation remains legal evidence. If the model returns mostly singleton plausible sets, A2b fails cleanly; Fibre must not widen them for richness.

No production mechanism is frozen from this one development arm. If A2b is promising, E2 still requires the planned downstream-fertility diagnostic and fresh validation worlds before combined E+F review.
