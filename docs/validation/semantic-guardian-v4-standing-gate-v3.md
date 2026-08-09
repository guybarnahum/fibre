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

A valid counterfactual baseline should not mention an unknown private-state variable. It should simply state the requested deadline and allow negotiation if the individual has a grounded reason to resist that term. With no relevant state supplied, there is then no evidence of resistance. With an opposing state supplied, the same request can causally bend from acceptance toward negotiation/refusal.

This is a **gate-specification defect**, not evidence that candidate 3 failed to understand individualized participation.

### The state-bearing half was operationally truncated

The state-bearing request did not produce an authoritative judgment because Fibre supplied `max_output_tokens=6000` and the provider returned `incomplete` with reason `max_output_tokens`.

This is an operational failure, not a Thread decision and not cognition evidence. The OpenAI Responses API defines `max_output_tokens` as an upper bound that includes visible output and reasoning tokens; when the field is omitted, the provider uses its automatic behavior. Fibre therefore should not impose a low arbitrary default ceiling on this compact structured cognition contract.

The generic OpenAI runtime may still support explicit output ceilings when a caller deliberately supplies one, but the default runtime should allow provider automatic output limits.

## Process correction: stop authoring sealed gates until the gate pattern is developed

Three sealed v4 standing cycles have now failed for different combinations of gate-specification ambiguity and operational truncation while the substantive held-out dignity behavior has remained strong.

Immediately authoring another one-shot standing gate after inspecting each failure would weaken the evidentiary process by making test design increasingly informed by prior sealed outcomes.

The next step is therefore **not standing gate v4**.

Instead Fibre should create a repeatable, explicitly non-evidentiary counterfactual-development probe that validates the gate mechanism itself:

```text
same individual + same request + no relevant opposing state
    -> willing aligned participation

same individual + same request + grounded opposing state
    -> changed downstream judgment
```

The request wording must not explicitly introduce an unknown private-state variable into the baseline.

This diagnostic may be run repeatedly because it earns no standing credit and permits no score movement. Only after the counterfactual test pattern is stable should Fibre freeze a new candidate/runtime boundary and author a completely fresh held-out standing cycle.

## Candidate disposition

Candidate 3 does **not** earn standing credit because its sealed gate failed. PR #33 remains semantically unearned and the standing semantic gate remains RED.

The v3 result does not justify tuning the Guardian prompt or response schema. Fifteen unrelated held-out cases passed, the genuine clarification case passed, relationship support/opposition and target isolation passed, generic commodity work remained low dignity, identity paraphrase/contradiction remained stable, and there were no protocol or cognition failures.

The next work should therefore be limited to:

1. preserving this failed/sealed artifact and postmortem;
2. removing the arbitrary default OpenAI output-token ceiling;
3. developing the counterfactual gate pattern in a non-evidentiary diagnostic;
4. leaving Guardian cognition unchanged during that diagnostic work.
