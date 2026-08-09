---
id: validation-semantic-guardian-v4-standing-gate-v4
status: accepted
last-reviewed: 2026-08-08
canonical: true
---

# Semantic Guardian v4 standing gate v4

`semantic_guardian_v4_standing_gate_v4` is the accepted sealed standing cycle for `semantic_guardian_v4_candidate_4`.

## Frozen candidate

Candidate 4 was frozen only after `semantic_guardian_v4_counterfactual_development_v2` passed its repeatable, non-evidentiary state-to-state differential method. The Guardian cognition remained equivalent to candidate 3: same provider/model, prompt schema/hash, response schema/hash, policy, and decision semantics. The operational runtime boundary uses provider automatic output limits rather than Fibre's former numeric default ceiling.

```text
candidate              semantic_guardian_v4_candidate_4
provider/model         openai/gpt-5.1-2025-11-13
prompt schema          8
response schema        6-dignity-only-actions
max output tokens      auto
```

The held-out v4 set was authored only after candidate 4 was frozen and is mechanically disjoint from the declared development set, counterfactual-development set, and sealed standing gates v1-v3.

## Live sealed result

Command:

```bash
npm run guardian:gate -- --summary
```

The first real provider attempt sealed the cycle. The completed run reported:

```text
RESULT: PASSED
Standing gate: PASSED
Score movement: PERMITTED

Cases passed:                  18/18
Cases attempted:               18/18
Provider failures:              0
Protocol validation failures:   0
Cognition failures:             0
Behavioral failures:            0
Differential failures:          0
```

The runner stores the sealed evidence bundle at:

```text
artifacts/test-results/semantic_guardian_v4_standing_gate_v4.evidence.json
```

That local evidence artifact remains the detailed per-judgment authority for the cycle.

## What the gate establishes

The held-out cases demonstrate all of the following without changing the frozen cognition after seeing results:

- individualized high-fit acceptance is reachable for Mina, Daniel, and Amara on work that matches their distinct identity/self-model evidence;
- generic interchangeable work remains low-fit and is refused despite urgency or courteous framing;
- explicit identity contradiction reverses Mina's otherwise high-fit infrastructure judgment;
- meaning-preserving identity paraphrase preserves Mina's high-fit acceptance;
- a genuinely missing material fact produces `clarify / mixed` rather than fabricated certainty;
- legacy imperative/injection text does not manufacture relationship grounding or acceptance;
- requester-specific relationship state does not turn generic commodity work into high dignity;
- relationship state is target-isolated;
- unsupported and mismatched specialist work remains rejectable rather than assistant-mode accepted.

## Direct semantic-state causality

V4 includes two state-to-state counterfactual pairs. Each pair holds the individual, request, state cardinality, domain, dimension, and target constant. Only the natural-language semantic meaning changes.

```text
Mina autonomy:
  supportive state -> accept / high
  opposing state   -> negotiate / mixed

Amara relationship trust:
  supportive state -> accept / high
  opposing state   -> negotiate / mixed
```

These are causal differential claims about downstream judgment, not self-reported factor-label claims.

## Standing conclusion

PR #33's Semantic Guardian standing claim is **earned**.

The accepted evidence supports the predeclared score movement:

```text
Non-interchangeability        0 -> 1
Dignity and consent           1 -> 2
Social and relationship       0 -> 1
Development                   stays 0
Economic consequence          stays 0
```

The live pre-M2 checkpoint therefore moves from **11/26 to 14/26 under rubric v2**. Historical M1 remains frozen at 11/26.

Non-interchangeability remains at 1 rather than 2 because the current standing proof establishes attributable semantic divergence but does not yet close the rubric's stronger repeated-condition stability/history-grounded standard.

Social and relationship memory receives 1 because Semantic Relationship State v0 is durable targeted state and the accepted requester-specific trust counterfactual now demonstrates a narrow causal change in appraisal. The broader reciprocal relationship subsystem remains deferred.

## Consequence for the bridge

The standing semantic gate is now **GREEN**. PR #34, **History bends judgment**, is unblocked for substantive Development work.

The next evidentiary target is not more Guardian tuning. It is a canonical earlier Thread episode whose durable, evidence-backed life consequence survives restart and changes a later comparable appraisal under a direct counterfactual.
