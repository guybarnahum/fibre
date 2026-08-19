# Milestone #39 / Slice E2 — A2b first-run finding

Status: development evidence; A2b-v1 failed mechanically and MUST NOT be rerun from scratch for quality.

Arm: `A2b_plausibility_surface_seeded_contingency`
Provider/model: OpenAI / `gpt-5.1-2025-11-13`
Worlds: E2-D1, E2-D2
Seeds: the frozen A0 seed triplet
Density: 10 developmental slots/life, 9 offered structures/slot

## Verification before the run

The user reported:

- 557 tests;
- 557 pass / 0 fail;
- generated context packs written successfully;
- repository validation passed with generated context packs.

This is user-run evidence; connector writes alone are not treated as test evidence.

## What happened

The first A2b execution reached:

- all ten plausibility/draw slots for E2-D1 / seed-01;
- a complete ten-episode candidate for E2-D1 / seed-01;
- all ten plausibility/draw slots for E2-D1 / seed-02;
- repeated realization failure at E2-D1 / seed-02, slot 4, whose frozen selected opportunity was `ges_v2_drawing_or_making_seen`.

The candidate-attempt sequence for seed-02 was:

1. attempt 1: slot 4 `pass_a_structure_participation`, then one observable-action repair, then `record_repair_exhausted`;
2. attempt 2: slot 4 `pass_a_structure_participation` twice, then `record_repair_exhausted`;
3. attempt 3: slot 4 `pass_a_structure_participation`, then one observable-action repair, then `record_repair_exhausted`.

The whole Thread candidate therefore exhausted after three attempts and the CLI wrote `fibre-m2-pr39-slice-e2-a2b-v1.json` as a failure artifact.

## Finding A — the plausibility layer did not discriminate

Every plausibility result shown before failure reported:

```text
routes=10
```

There are nine offered EventStructures per slot, so `routes=10` means:

- every offered EventStructure was marked plausible; and
- `world_emergent` was also marked plausible.

This occurred for all ten slots in D1/seed-01 and all ten slots in D1/seed-02: 20/20 observed plausibility calls.

This does **not** invalidate the seeded-contingency diagnostic. It means that, in the observed portion of this run, A2b behaved as:

```text
all currently offered developmental routes
        + world-emergent
              ↓
uniform frozen seeded draw
              ↓
scene realization
```

rather than as a selective plausibility filter.

Do not tune the plausibility prompt to force narrower sets. “All routes plausible” was explicitly legal in the frozen A2b protocol and is now evidence.

## Finding B — seeded contingency immediately broke A2's deterministic structure skeleton

The first D1 schedule selected:

```text
shared_object_disagreement
adult_finishes_task_unasked
simple_explanation_disputed
peer_joke_or_reference_missed
scientific_claim_test
world-emergent
public_disagreement
choose_against_peer_group
art_unsettles_expectation
argument_encounter
```

The second D1 schedule began:

```text
world-emergent
small_help_request
simple_explanation_disputed
drawing_or_making_seen
...
```

This is qualitatively unlike A2's repeated deterministic sequence of peer invitations, mundane errands and self-directed text choices. That is encouraging evidence for the contingency mechanism, but the arm is incomplete and no final richness/particularity judgment is made from this partial run.

## Finding C — the failure is a retry-cognition defect, not a structure contradiction

`ges_v2_drawing_or_making_seen` is authored as:

> another person notices an unfinished drawing, model, story, or made object and comments on something concrete in it

Its allowed counterpart roles are:

```text
peer | caregiver | teacher
```

and its rich counterpart mode is the default `present_required`.

D1 already contains caregivers, so the selected opportunity is mechanically realizable without changing the pool or inventing a new authority rule.

The repeated failure shows that a `pass_a_structure_participation` record retry was not receiving the exact gate-level counterpart requirement that Fibre already knew from the frozen selected opportunity. The generic retry prompt exposed the gate name but no structured reminder of the selected structure's `counterpartMode` and `participatingRoles`.

The correction therefore does **not** relax validation and does not change A2b selection. It supplies a gate-derived retry constraint containing only:

- the frozen counterpart mode;
- the allowed counterpart roles;
- whether same-episode introduction can satisfy the contract.

It exposes no rejected scene, prose, participant choice, place choice, or quality/richness signal.

## Evidence-preserving continuation rule

A2b-v1 is frozen as failed evidence.

The continuation must:

- reuse any completed life already present in the v1 failure artifact;
- reuse every already-burned plausibility output and seeded draw exactly;
- verify deterministic offered sets, selector-input digests, plausible routes, seeded-draw evidence and schedule digest before reuse;
- make new plausibility calls only for lives whose schedules were never reached;
- retain the same 10-slot density, 9-offer policy, worlds, seeds, pool, H6 counterpart semantics and seeded-draw algorithm.

No rerun-until-good behavior is permitted.

## Current interpretation

```text
H2 selection/realization coupling:          strongly supported by A2
A2 deterministic single winner:             rejected as production mechanism
A2b seeded contingency:                     promising but incomplete
A2b plausibility filtering:                  no discrimination in 20/20 observed calls
A2b first-run failure:                       mechanical retry-cognition defect
H1 prior-prose inertia:                      still live
H3 static-world pressure:                    still live
H4 historical sparsity:                      still live
```

No admission verdict is earned by this development run.
