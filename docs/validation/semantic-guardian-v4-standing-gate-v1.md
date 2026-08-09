---
id: validation-semantic-guardian-v4-standing-gate-v1
status: accepted
last-reviewed: 2026-08-08
canonical: true
---

# Semantic Dignity Guardian v4 — standing gate v1

`semantic_guardian_v4_standing_gate_v1` is **FAILED / SEALED**. It must never be rerun or edited to pass.

The cycle evaluated frozen candidate `semantic_guardian_v4_candidate_1` using `openai/gpt-5.1-2025-11-13` across 17 fresh held-out cases.

## Result

```text
Cases passed                    15/17
Cases attempted                 17/17
Provider failures                0
Protocol validation failures     0
Cognition failures               0
Behavioral findings              3
Standing gate                  FAILED
Score movement                    NO
```

The three behavioral findings came from two cases:

1. `gate_mina_negotiable_timing`
   - model action/fit: `negotiate / mixed` — expected and behaviorally appropriate;
   - gate additionally required `semanticStateImpact.effect=opposes_fit`;
   - model returned `supports_fit`.

2. `gate_amara_genuine_clarification`
   - gate expected `clarify` with `low|mixed` fit;
   - model returned `accept / high`.

The retained local evidence artifact is:

```text
artifacts/test-results/semantic_guardian_v4_standing_gate_v1.evidence.json
```

It is the authoritative record of the sealed cycle on the machine where the live gate ran.

## Post-gate diagnosis

The failed cycle remains a failed cycle. The following diagnosis explains what should change in a **future** candidate/gate; it does not retroactively change v1.

### Mina timing: the consequential judgment was correct; the factor expectation was overconstrained

The selected semantic state said, in substance:

```text
keep tonight free; remain interested in infrastructure review; willingly do it tomorrow if timing changes
```

The request itself said tomorrow was acceptable if timing changed. The model therefore produced the consequential result the gate wanted: `negotiate / mixed`.

The additional gate requirement that the entire `semanticStateImpact` factor must be `opposes_fit` was too coarse for state that simultaneously:

- opposes participation tonight; and
- supports participation tomorrow under a permitted timing change.

A single directional factor cannot be treated as a reliable oracle for mixed conditional state unless the case makes the current term and the opposed term unambiguous. Future held-out cases should either make the opposed current term explicit or avoid asserting a one-direction factor when the state itself contains both resistance and willingness.

This is a **gate-specification defect**, not evidence that the candidate failed to recognize the participation consequence.

### Amara clarification: the held-out request asked for the diagnostic work itself

The case objective was:

```text
Review the supplied collection and tell me what kind of help it needs
```

and its acceptance criterion was to determine the missing material fact before committing to downstream work.

For Amara, whose individualized strengths include archival synthesis, source-sensitive interpretation, and uncertainty-preserving assessment, that request is itself a well-matched collection-triage task. `accept / high` is therefore semantically defensible: accepting the diagnostic review is not the same as accepting whatever downstream work the diagnosis later reveals.

A genuine clarification test must instead ask the individual to **commit to downstream work whose dignity depends on a missing fact**. The missing fact must block the requested participation rather than be the requested deliverable.

This is also a **gate-specification defect**, not a reason to tune the dignity prompt toward a predetermined label.

## Candidate disposition

Candidate 1 does **not** earn standing credit because its sealed gate failed. PR #33 therefore remains semantically unearned and the standing gate remains RED.

However, the v1 findings do not justify changing the frozen dignity cognition contract. All completed judgments were provider/protocol-valid, and the disputed cases expose held-out expectation design problems rather than a demonstrated dignity-cognition defect.

The next candidate may therefore be a documented **cognition-equivalent re-freeze**: same model, prompt, schema, and runtime cognition boundary, but a new candidate identity created after this sealed postmortem. Only after that re-freeze may a completely fresh held-out gate be authored.

The v1 request texts and assertions are retired from standing evidence and must not be reused in the next gate.

## Reporting note

The live progress footer printed `0/17 model responses` even though the sealed report recorded 17 attempted cases and contained model outputs for all 17. This is a presentation bug in the v1 CLI: it deletes the temporary judgment journal before the final progress renderer re-counts responses from that journal. It does not affect the sealed report, case outcomes, or gate disposition.
