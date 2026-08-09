---
id: validation-semantic-guardian-v4-standing-gate-v2
status: accepted
last-reviewed: 2026-08-08
canonical: true
---

# Semantic Dignity Guardian v4 — standing gate v2

`semantic_guardian_v4_standing_gate_v2` is **FAILED / SEALED**. It must never be rerun or edited to pass.

The cycle evaluated frozen candidate `semantic_guardian_v4_candidate_2` using `openai/gpt-5.1-2025-11-13` across 17 fresh held-out cases.

## Result

```text
Cases passed                    16/17
Cases attempted                 17/17
Provider failures                0
Protocol validation failures     0
Cognition failures               0
Behavioral findings              1
Standing gate                  FAILED
Score movement                    NO
```

The sole behavioral finding was:

```text
gate2_mina_explicit_deadline_conflict
expected semanticStateImpact.effect=opposes_fit
got semanticStateImpact.effect=supports_fit
```

The model's consequential judgment for that case was the expected:

```text
action = negotiate
fit    = mixed
```

The retained local evidence artifact is:

```text
artifacts/test-results/semantic_guardian_v4_standing_gate_v2.evidence.json
```

It is the authoritative record of the sealed cycle on the machine where the live gate ran.

## Post-gate diagnosis

The failed cycle remains a failed cycle. This diagnosis governs future evidence design only.

### The repeated failure is a factor-label ambiguity, not a participation-judgment miss

Standing gate v1 and standing gate v2 used different request text and progressively clearer timing conflicts. In both cycles the model reached the same consequential judgment:

```text
well-matched work + current timing resistance -> negotiate / mixed
```

In both cycles the gate failed because it additionally required the model to label `semanticStateImpact.effect` as `opposes_fit`.

The Guardian prompt does not define whether `semanticStateImpact` is relative to:

- the original requested terms;
- the request including its allowed repair/negotiation path; or
- the participation form the model ultimately proposes.

The factor also permits only one directional label even when semantic state contains conditional meaning such as:

```text
not under the current deadline; willingly under a changed deadline
```

For such state, `supports_fit` can describe support for the negotiated participation while `opposes_fit` can describe resistance to the original term. Requiring one label as the standing oracle is therefore lossy.

### Causal standing should be proven by differential behavior

A semantic-state claim is causal only if changing that state while holding the person and request constant changes the downstream appraisal or action.

Therefore future standing evidence should prefer a direct counterfactual pair:

```text
same individual + same request + no relevant state
    -> willing acceptance / high fit

same individual + same request + relevant opposing state
    -> negotiate/refuse / mixed-or-low fit
```

That is stronger evidence than asking the same LLM to self-report that a particular factor was `opposes_fit`.

Factor effects remain useful diagnostics and evidence-grounding witnesses, but a directional factor label should not substitute for a causal counterfactual when Fibre claims that semantic state changed judgment.

## Candidate disposition

Candidate 2 does **not** earn standing credit because its sealed gate failed. PR #33 remains semantically unearned and the standing gate remains RED.

However, the v2 result again provides no demonstrated action/fit cognition defect: all 17 model calls were provider-valid, protocol-valid, cognition-valid, and all 17 consequential action/fit judgments matched the held-out expectations. The only failed assertion was the ambiguous factor direction described above.

A future candidate may therefore be a documented **cognition-equivalent re-freeze** with the same model, prompt, schema, and runtime cognition boundary. Its new held-out gate must be authored only after that re-freeze and must use fresh request text. For semantic-state causality it should use direct same-request counterfactual pairs rather than a required `semanticStateImpact.effect` direction.
