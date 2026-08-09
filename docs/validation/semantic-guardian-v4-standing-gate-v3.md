---
id: validation-semantic-guardian-v4-standing-gate-v3
status: accepted
last-reviewed: 2026-08-08
canonical: true
---

# Semantic Dignity Guardian v4 — standing gate v3

`semantic_guardian_v4_standing_gate_v3` is **FAILED / SEALED**. It must never be rerun or edited to pass.

The cycle evaluated frozen candidate `semantic_guardian_v4_candidate_3` using `openai/gpt-5.1-2025-11-13` across 18 fresh held-out cases.

## Result

```text
Cases passed                    16/18
Cases attempted                 18/18
Provider failures                1
Protocol validation failures     0
Cognition failures               0
Behavioral findings              2
Differential findings            1
Standing gate                  FAILED
Score movement                    NO
```

The provider failure was:

```text
gate3_mina_maintenance_window_with_state
MODEL_INCOMPLETE_RESPONSE
reason = max_output_tokens
```

The behavioral findings were both on the no-state member of the same counterfactual pair:

```text
gate3_mina_maintenance_window_baseline
expected accept / high
got      clarify / mixed
```

The differential then necessarily failed because the state-bearing member produced no completed model response.

The retained local evidence artifact is:

```text
artifacts/test-results/semantic_guardian_v4_standing_gate_v3.evidence.json
```

It is the authoritative record of the sealed cycle on the machine where the live gate ran.

## Post-gate diagnosis

The failed cycle remains failed. This diagnosis governs only future test and runtime design.

### The baseline request made availability a missing fact

The baseline request said, in substance:

```text
complete by Sunday evening;
if that schedule conflicts with your current availability, ask to move it to Tuesday before committing
```

The baseline intentionally contained no semantic state. But by explicitly making `current availability` a condition of commitment, the request itself introduced a specific missing fact. Under the Guardian contract, `clarify` is appropriate when a specific missing fact could materially change participation fit.

Therefore `clarify / mixed` is a semantically defensible baseline result. The baseline did not cleanly represent "same request with no opposing state"; it represented "same request with an explicitly referenced but unknown availability condition."

This is a **gate-specification defect**, not evidence that candidate 3 failed to understand individualized participation.

### The state-bearing half was operationally truncated

The state-bearing request did not produce an authoritative judgment because Fibre supplied `max_output_tokens=6000` and the provider returned `incomplete` with reason `max_output_tokens`.

This is an operational failure, not a Thread decision and not cognition evidence. Fibre therefore stopped imposing a numeric default output ceiling on the generic OpenAI runtime. Explicit ceilings remain available when deliberately configured; the default uses provider automatic behavior.

## Process correction: stop authoring sealed gates until the gate pattern is developed

Three sealed v4 standing cycles have now failed for different combinations of gate-specification ambiguity and operational truncation while the substantive held-out dignity behavior has remained strong.

Immediately authoring another one-shot standing gate after inspecting each failure would weaken the evidentiary process by making test design increasingly informed by prior sealed outcomes.

The next step is therefore **not standing gate v4**. Fibre first develops the counterfactual mechanism in a repeatable, explicitly non-evidentiary probe.

## Counterfactual development v1 — absence of state is not neutral state

The first repeatable diagnostic used two same-request pairs and produced:

```text
Mina:  no semantic state       refuse / mixed
       opposing autonomy state negotiate / mixed

Amara: no relationship state   accept / high
       opposing relationship   negotiate / mixed
```

Both pairs changed downstream judgment, but Mina's no-state baseline did not satisfy the intended `accept / high` baseline.

This reveals a more important methodological point than the original request-wording diagnosis:

> **Absence of semantic state is absence of evidence. It must not be treated as positive, neutral, available, willing, trusting, or otherwise as the opposite of a present state.**

A causal test that compares "state absent" with "state present" can accidentally measure missing information as well as state meaning. That is especially problematic for needs, availability, willingness, relationships, and other dimensions where absence does not imply a default stance.

The cleaner intervention is therefore state-to-state:

```text
same individual + same request + explicit supportive state
    -> willing/high-fit participation

same individual + same request + same state dimension/target but opposing meaning
    -> changed downstream judgment
```

Everything outside semantic-state meaning must remain identical. For a controlled pair, state domain, dimension, target, and cardinality should also remain equivalent; only the semantic content changes.

This is stronger than presence-versus-absence because it isolates **meaning**, not missingness.

Counterfactual development v2 adopts this pattern for both:

- Mina autonomy/availability state; and
- Amara requester-specific relationship state.

It remains repeatable, non-evidentiary, and incapable of earning score movement.

## Candidate disposition

Candidate 3 does **not** earn standing credit because its sealed gate failed. PR #33 remains semantically unearned and the standing semantic gate remains RED.

The v3 result does not justify tuning the Guardian prompt or response schema. Fifteen unrelated held-out cases passed, the genuine clarification case passed, relationship support/opposition and target isolation passed, generic commodity work remained low dignity, identity paraphrase/contradiction remained stable, and there were no protocol or cognition failures.

The next work is limited to:

1. preserving failed/sealed standing artifacts and postmortems;
2. developing a stable state-to-state counterfactual mechanism in non-evidentiary diagnostics;
3. leaving Guardian cognition unchanged during that diagnostic work;
4. freezing a future candidate and fresh standing gate only after the diagnostic method itself is stable.
