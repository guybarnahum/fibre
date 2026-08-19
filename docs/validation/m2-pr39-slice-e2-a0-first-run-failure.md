---
id: validation-m2-pr39-slice-e2-a0-first-run-failure
status: candidate
last-reviewed: 2026-08-19
canonical: false
---

# Milestone #39 — Slice E2 A0 first-run mechanical failure

## Status

The first fresh A0 baseline execution did **not** complete. It is retained as mechanical development evidence and is not interpreted as a completed Rich Life sample.

Environment:

```text
provider: openai
model: gpt-5.1-2025-11-13
world: E2-D1
seed: slice-e2-a0-seed-01
run ordinal: 1
Pass-A mechanism: unchanged A0
```

Repository checks immediately before the run were green:

```text
546 tests
546 pass
0 fail
npm run check: green
```

## Observed partial execution

Candidate generation completed nine provisional episodes and entered episode 10.

The first nine provisional episodes included:

```text
01 shared_object_disagreement         encounter none     repair 1 observable-action bounds
02 adult_finishes_task_unasked        encounter none
03 shared_object_disagreement         encounter none
04 library_browse_with_adult          encounter book
05 mundane_errand_independence        encounter none
06 mundane_errand_independence        encounter none     repair 1 observable-action bounds
07 mundane_errand_independence        encounter none
08 world-emergent                     encounter book
09 world-emergent                     encounter book
```

Episode 10 first failed `pass_a_observable_action_bounds` and received the existing one-field record-form repair. Revalidation then exposed a second pre-existing defect:

```text
GENESIS_PASS_A_VALIDATION_ERROR
pass_a_structure_participation

episode episode_e2_d1_001_a0_10 cites
  ges_v2_religious_or_philosophical_text
without a participant in any allowed counterpart role
  (caregiver, teacher, mentor, peer)
```

The form repair did not cause the participant defect. Rich Pass-A repair mechanically preserves event facts and only replaces `observableAction`; the structural defect was present in the rejected initial candidate and became visible only after the earlier bounds gate was repaired.

## Interpretation

This is a **candidate-attempt structural failure**, not a Rich Life quality result.

The accepted Genesis Compiler Contract v1 already distinguishes:

```text
record-level form repair
!=
attempt-level candidate retry
```

and caps whole-candidate Genesis at three attempts per Thread. A candidate whose structural failure cannot be corrected without changing semantic event facts must be rejected as a whole candidate attempt rather than repaired into validity.

Therefore the correct behavior is:

1. preserve the failed attempt as rejection evidence;
2. discard its provisional candidate state from authority;
3. restart the candidate life from episode 1 with the identical frozen world, Fibre seed, offer schedule, prompt/schema and quality-blind inputs;
4. use a distinct candidate-attempt identity/request witness;
5. stop after three candidate attempts if mechanical validity still cannot be achieved.

This is not a quality rerun. The trigger is an explicit mechanical admission failure.

## Instrumentation defect exposed

The first E2 A0 CLI used the single-candidate `runE2A0Life` primitive directly. When the candidate failed, it terminated before producing the requested output artifact.

As a result, the console trace above survives but the complete rejected episode payload and earlier provisional candidate records from this first execution were not written to an artifact. They must not be reconstructed from memory or guessed.

The E2 A0 driver is being corrected to:

- apply the already-canonical three-attempt whole-candidate discipline;
- retain bounded failed-attempt evidence (`failedGate`, rejected record when available, call provenance, record-repair evidence);
- report candidate-attempt counts and failures in successful characterization;
- write a failure artifact if all three candidate attempts are exhausted.

The original failed execution remains documented here so the instrumentation correction does not erase evidence that the failure occurred.

## H6 relevance

The incomplete candidate is not admissible for between-life or full-life Rich Life interpretation. However, it establishes one narrow negative result against an over-strong H6 schema claim:

> non-null intellectual encounters are not mechanically unreachable under the current rich Pass-A response schema.

Before the candidate failed, the model produced three non-null `book` encounters (one structure-grounded and two world-emergent). This does **not** show that intellectual encounter selection is unbiased, nor that the eventual life is rich. It only rules out the strongest claim that the current schema forces `intellectualEncounter:null` in all ordinary generation.
