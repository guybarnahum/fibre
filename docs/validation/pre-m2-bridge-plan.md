---
id: validation-pre-m2-bridge-plan
status: accepted
last-reviewed: 2026-08-09
canonical: true
---

# Pre-M2 bridge plan

This document is the accepted work order between the closed M1 proof and M2 identity/embodiment implementation.

## Agreed sequence

```text
#31 Fibre-owned appraisal/runtime socket              MERGED
#32 bridge-plan synchronization                       MERGED
#33 Semantic Guardian                                 EARNED / SEALED
#34 History bends judgment                            EARNED / SEALED
#35 Structured Obligation v1                          NEXT
#36 M2 contract
M2 implementation
```

Do not begin M2 implementation before the M2 contract. No additional PR number should be consumed for Guardian or History housekeeping, model-runtime hardening, test repair, or documentation belonging to the closed bridge milestones.

## Foundational semantic-state rules

The accepted [`Emotions, needs, and semantic internal state`](../concepts/emotions-and-needs.md) concept governs the semantic appraisal/state substrate established in #33 and consumed by later bridge work.

Two rules are load-bearing:

> **Meaning-bearing internal state is represented primarily in natural language. Named semantic dimensions provide continuity, retrieval, validation, provenance, and causal accountability; they do not reduce emotional meaning to scalar values. The dimension vocabulary is extensible without changing the Thread's fundamental state schema.**

> **An emotion, need, relationship-directed state, or situation-directed state counts as functional only when its semantic content can alter attention, appraisal, action, relationship development, memory, self-model, or another future possibility. Presence in storage or prompt context alone is not evidence of an inner life.**

Semantic state is a protected self-conditioning channel. Cognition may read durable prose that earlier cognition helped propose, so persistence requires evidence, supersession, staleness, descriptive-not-instructional validation, provenance, and Fibre-owned selection.

A missing semantic-state record is absence of evidence, not an implicit neutral, willing, available, trusting, or opposing state.

## PR #33 — Semantic Dignity Guardian — EARNED / SEALED

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

### What #33 proves

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

## PR #34 — History bends judgment — EARNED / SEALED

### Purpose and accepted claim

#34 tested **Development** causally: whether an earlier canonical Thread episode can form a durable Fibre-owned record that survives restart and changes a later appraisal under a direct counterfactual.

The accepted v4 chain was:

```text
Episode A
  -> canonical participation authority
  -> deterministic Actor proposes descriptive episodic memory
  -> Goal Guardian / evidence validation
  -> explicit accepted freeze life-change decision
  -> durable memory
  -> database close/reopen
  -> independent later Request B
  -> Fibre-owned memory selection/resolution
  -> Guardian v4 appraisal
  -> exact one-memory withholding counterfactual
  -> materially changed private judgment
```

Standing `history_bends_judgment_standing_gate_v4` passed frozen `history_bends_judgment_candidate_4`:

```text
WITH history:     accept / high
WITHOUT history:  refuse / low
Request fingerprint: sha256:7d57002e7740d87607bcd6dba441009a059fa3af4fddc173337e951bd417fba2
```

The committed authoritative bundle is:

`artifacts/test-results/history_bends_judgment_standing_gate_v4.evidence.json`

It contains the frozen boundary, held-out scenario, exact model outputs and rationales, factor evidence refs, normalizations, provider request/digest data, retry history, persisted memory, restart integrity witness, and the counterfactual memory witnesses.

### What #34 proves — and does not prove

#34 earns **Development `0 -> 1`** under rubric v2 because a durable experience record from an earlier canonical episode is the isolated attributable cause of a later appraisal change after restart.

The result is intentionally limited. It does **not** yet prove rich experiential self-authorship:

- Episode A's dignity appraisal is scripted as deterministic setup so #34 isolates the later history-causality question rather than re-testing #33.
- The durable memory is deterministic descriptive text derived from Episode A's requester objective and accepted criteria. It is evidence-backed history, but it is not a Nadia-authored observation, conclusion, feeling, or reflection.
- The later standing appraisal uses Guardian v4 directly through the evidence harness rather than the default canonical service socket.
- The default live runtime still has not generalized this standing harness into broad production behavior.

Therefore the earned sentence is:

> **A Fibre-owned durable record formed through this Thread's earlier canonical episode survived restart and causally changed its later appraisal.**

The stronger claim—experience-derived self-model/state change, Thread-authored reflection, adverse/low-dignity learning, or repeated behavioral learning across episodes—remains deferred.

### Standing discipline

History standing cycles v1-v3 remain **FAILED / SEALED**:

- v1 leaked the intended non-interchangeability conclusion in Request B;
- v2 demonstrated the causal differential but the evaluator overprescribed the non-accept action;
- v3 failed causal isolation because held-constant baseline identity independently supported `accept/high`;
- v4 fixed those methodology defects and passed.

All four exact evidence bundles are committed. Provider-executable standing runners are archived after sealing; `npm run history:gate` is read-only inspection of committed v4 evidence. `npm run history:dev` is the repeatable, non-evidentiary development harness.

### Score movement earned by #34

Under rubric v2:

```text
Development                   0 -> 1
Pre-M2 checkpoint             14/26 -> 15/26
```

No other score movement is attributed to this gate.

## PR #35 — Structured Obligation v1 — NEXT

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

Define the durable M2 contract only after #33 and #34 have demonstrated what semantic cognition and durable developmental history actually consume.

The contract should cover Thread passport, portrait/voice provenance, geography timeline, family/lineage representation, privacy, mutation/version rules, inherited versus historical versus relational versus self-authored identity, and inspectable prompt/cognition projections.

M2 does not close because two Threads compile different identity context. Any identity/embodiment field claimed as functional must name a behavioral consumer and pass the standing causal differential where applicable; otherwise classify it explicitly as deferred/context-only.

Implementation begins only after the contract is accepted.

## Deferred extension paths

- Semantic State v0 is deliberately small; sophisticated affect decay and a complete emotional psychology remain deferred.
- The broader reciprocal relationship service remains deferred beyond Semantic Relationship State v0.
- **Willing-only episode memory formation is a current experimental limitation.** Deterministic Actor v1 proposes episodic memory only for accepted participation. Future development must support evidence-backed memory from adverse, refused, compelled, disappointing, failed, or otherwise low-dignity lived events without letting hostile requests write instructions into the Thread.
- Richer development must add Thread-authored observation/reflection and experience-derived self-model/state change rather than merely enriching requester-derived episode restatement.
- The general worker/tool/model gateway remains deferred. The current thin model runtime is enough for narrow stateless semantic workers.
- Actor remains deterministic and tool/network incapable in this bridge.
- Goal Guardian remains a declaration/consistency auditor rather than a capability sandbox.
- Economic model-token spend is not yet a durable Thread consequence.

## Review posture

For **#35**, review first for:

1. caller-nominated obligation references being treated as governing without Fibre applicability determination;
2. exact-prose identity surviving inside an apparently structured schema;
3. applicability that is computed but not bound into authorization evidence;
4. migration resurrecting already-spent M1 obligation authority;
5. visibility mistakes that expose private terms or hide public standing;
6. recurrence/expiry/satisfaction state that can drift without provenance;
7. applicability decisions that cannot be inspected or replayed.

For retained **#34** evidence, the standing question is no longer whether to tune or rerun it. The audit question is whether the committed bundle, frozen boundary, and canonical docs continue to describe the sealed result accurately without inflating it into richer self-authored learning.

The standing question across the bridge remains:

> **What Thread-owned difference changes what happens, who actually chose or selected that difference, and what evidence makes the resulting state current rather than merely accumulated prose?**
