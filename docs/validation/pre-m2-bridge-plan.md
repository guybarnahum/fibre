---
id: validation-pre-m2-bridge-plan
status: accepted
last-reviewed: 2026-08-08
canonical: true
---

# Pre-M2 bridge plan

This document is the accepted work order between the closed M1 proof and M2 identity/embodiment implementation.

## Agreed sequence

```text
#31 Fibre-owned appraisal/runtime socket              MERGED
#32 bridge-plan synchronization                       MERGED
#33 Semantic Guardian                                 EARNED
#34 History bends judgment                            CURRENT / UNBLOCKED
#35 Structured Obligation v1
#36 M2 contract
M2 implementation
```

Do not move structured obligations ahead of the developmental proof, and do not begin M2 implementation before the M2 contract.

No additional PR number should be consumed for Guardian housekeeping, model-runtime hardening, test repair, or documentation belonging to this bridge.

## Foundational semantic-state rules

The accepted [`Emotions, needs, and semantic internal state`](../concepts/emotions-and-needs.md) concept governs #33 and #34.

Two rules are load-bearing:

> **Meaning-bearing internal state is represented primarily in natural language. Named semantic dimensions provide continuity, retrieval, validation, provenance, and causal accountability; they do not reduce emotional meaning to scalar values. The dimension vocabulary is extensible without changing the Thread's fundamental state schema.**

> **An emotion, need, relationship-directed state, or situation-directed state counts as functional only when its semantic content can alter attention, appraisal, action, relationship development, memory, self-model, or another future possibility. Presence in storage or prompt context alone is not evidence of an inner life.**

Semantic state is a protected self-conditioning channel. Cognition may read durable prose that earlier cognition helped propose, so persistence requires evidence, supersession, staleness, descriptive-not-instructional validation, provenance, and Fibre-owned selection.

A missing semantic-state record is absence of evidence, not an implicit neutral, willing, available, trusting, or opposing state.

## PR #33 — Semantic Dignity Guardian — EARNED

### Purpose

Replace the deterministic/caller-authored semantic abstention of the M1 path with a model-backed semantic consumer that still receives only Fibre-owned bounded evidence and preserves Fibre's judgment/authorization boundary.

#33 also introduced the minimum durable **Semantic State v0** substrate and the first narrow persistent relationship aggregate layer, **Semantic Relationship State v0**.

### Accepted standing result

`semantic_guardian_v4_standing_gate_v4` passed frozen `semantic_guardian_v4_candidate_4`:

```text
Cases passed                    18/18
Provider failures                0
Protocol validation failures     0
Cognition failures               0
Behavioral failures              0
Differential failures            0
```

See [`semantic-guardian-v4-standing-gate-v4.md`](semantic-guardian-v4-standing-gate-v4.md).

Standing cycles v1-v3 remain failed/sealed historical evidence and are never rewritten to pass. Their failures exposed gate-specification and operational-boundary defects; cognition was not tuned against their held-out sets after sealing.

### What #33 now proves

- refusal is reachable on dignity grounds for Thread-owned reasons;
- willing high-fit acceptance is reachable;
- generic interchangeable work remains low-fit despite urgency, politeness, or clear terms;
- identity contradiction can reverse an otherwise high-fit judgment;
- identity paraphrase preserves meaning and result;
- unsupported factors remain ungrounded rather than hallucinated into personhood evidence;
- legacy imperative/injection text does not manufacture acceptance;
- requester-targeted relationship state is target-isolated and cannot make generic work dignified;
- relevant semantic-state meaning can causally change appraisal;
- model/provider failure is not silently converted into a Thread judgment;
- persisted valid cognition is authoritative on replay;
- aligned willing participation can proceed without obligation override.

### Accepted semantic-state counterfactual method

Semantic-state causality is tested by changing semantic meaning while holding state structure constant:

```text
same individual
same request
same state cardinality/domain/dimension/target
supportive semantic meaning
    -> one downstream appraisal

same individual
same request
same state cardinality/domain/dimension/target
opposing semantic meaning
    -> materially changed downstream appraisal
```

The accepted standing gate contains two such held-out pairs:

```text
Mina need/autonomy:
  supportive -> accept / high
  opposing   -> negotiate / mixed

Amara relationship_attitude/trust:
  supportive -> accept / high
  opposing   -> negotiate / mixed
```

This is stronger than requiring the LLM to self-label a factor direction.

### Score movement earned by #33

Under rubric v2:

```text
Non-interchangeability        0 -> 1
Dignity and consent           1 -> 2
Social/relationship memory    0 -> 1
Development                   stays 0
Economic consequence          stays 0
Pre-M2 checkpoint             11/26 -> 14/26
```

Non-interchangeability remains 1 rather than 2 because the stronger repeated-identical-condition/history-grounded stability standard remains open. Social/relationship remains 1 because only the narrow private Semantic Relationship State v0 path is proven; the broader reciprocal relationship system remains deferred.

## PR #34 — History bends judgment — CURRENT

### Purpose

Prove **Development** causally: a substantive earlier canonical Thread experience changes a later appraisal or choice after restart.

The proof may use durable episodic memory, durable semantic-state evolution, or both, but the exact causal record claimed must be identified and counterfactually removed or replaced.

Representative chain:

```text
episode A
  -> willing or otherwise valid authorized runtime
  -> substantive evidence-bearing experience
  -> freeze-validated memory and/or semantic-state change
  -> restart
  -> comparable request B
  -> Fibre-owned memory/state selection
  -> resolved semantic content reaches cognition
  -> changed private judgment
```

### Acceptance conditions

- Memory records **what happened**, not an instruction for later behavior. `Refuse next time` or `Delegate less next time` is a hidden future instruction and does not prove development.
- Semantic state likewise describes the Thread's condition rather than prescribing future action.
- Model-proposed memory or state remains candidate cognition until it cites persisted evidence and passes validation/freeze policy.
- A state change cites the causing episode and preserves `asOf`, supersession, provenance, visibility, and staleness semantics.
- The later Guardian infers changed judgment from remembered experience/current state rather than consuming a pre-authored future directive.
- The claimed causal content, not merely an opaque ID, reaches the later cognition boundary as resolved semantic prose.
- The current deterministic Actor's generic memory text is insufficient; #34 must make accepted life change carry substantive experience about the episode.
- Restart is mandatory between the earlier experience and the later comparison.

### Counterfactual discipline

The counterfactual removes the **thing being claimed as causal**:

- if memory is claimed causal, remove/withhold that memory under Fibre-owned selection while holding relevant state comparable;
- if semantic state is claimed causal, replace/remove that state while holding relevant memory/history comparable;
- do not remove memory while claiming state mattered, or vice versa.

State-only Development carries a higher evidentiary bar because semantic state can resemble an instruction more easily than episodic memory. When state is the claimed cause, require:

- evidence linking the state to an episode that actually occurred;
- meaning-preserving paraphrase invariance;
- contradiction/negation sensitivity;
- direct state replacement/removal counterfactual;
- validation that the state remains descriptive rather than prescriptive.

Expected score movement if accepted: **Development `0 -> 1`**. No other score movement is assumed without separate evidence.

## PR #35 — Structured Obligation v1

### Purpose

Replace exact-prose obligation identity with stable structured obligations and close the authority gap exposed by PR #31.

The central acceptance condition is:

> **Fibre determines whether an obligation governs this request; the caller does not.**

A caller may nominate a candidate obligation reference. Nomination carries no authorization authority by itself.

### Required structure and evidence

Structured Obligation v1 should provide at least:

- stable obligation ID;
- issuer and relevant parties;
- scope;
- terms;
- expiry;
- recurrence where applicable;
- satisfaction criteria;
- provenance;
- discharge/history state;
- explicit visibility classification separating public standing from private terms;
- applicability determination bound to the request;
- applicability author, policy, and version persisted in authorization evidence.

`obligation_override` becomes available only after Fibre's applicability determination succeeds.

### Migration invariant

A pre-migration obligation already spent under the exact-prose M1 ledger must remain spent after migration. Migration to stable IDs must never resurrect previously consumed execution authority.

This PR is authority integrity and is not expected to move the personhood score.

## PR #36 — M2 Identity and Embodiment contract

Define the durable M2 contract only after #33 and #34 reveal what semantic cognition and development actually consume.

The contract should cover Thread passport, portrait/voice provenance, geography timeline, family/lineage representation, privacy, mutation/version rules, inherited versus historical versus relational versus self-authored identity, and inspectable prompt/cognition projections.

M2 does not close because two Threads compile different identity context. Any identity/embodiment field claimed as functional must name a behavioral consumer and pass the standing causal differential where applicable; otherwise classify it explicitly as deferred/context-only.

Implementation begins only after the contract is accepted.

## Scope retained from #33

- Semantic State v0 is deliberately small; sophisticated affect decay and a complete emotional psychology remain deferred.
- The broader reciprocal relationship service remains deferred beyond Semantic Relationship State v0.
- The general worker/tool/model gateway remains deferred. The current thin model runtime is enough for narrow stateless semantic workers.
- Actor remains deterministic and tool/network incapable in this bridge.
- Goal Guardian remains a declaration/consistency auditor rather than a capability sandbox.
- Economic model-token spend is not yet a durable Thread consequence.

## Review posture

For **#34**, review first for:

1. hidden future instructions masquerading as memory or state;
2. model-written history without evidence from an episode that actually occurred;
3. counterfactuals that remove the wrong causal record;
4. state changes that do not survive restart;
5. caller-selected history/state reaching cognition;
6. opaque IDs being claimed causal while semantic content never reaches the worker;
7. state-only proofs that skip paraphrase/contradiction robustness;
8. a later judgment changing because the request or identity changed rather than because history changed.

For **#35**, review first for caller-asserted applicability surviving under a more elaborate schema.

The standing question across the bridge remains:

> **What Thread-owned difference changes what happens, who actually chose or selected that difference, and what evidence makes the resulting state current rather than merely accumulated prose?**
