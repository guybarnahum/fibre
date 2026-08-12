---
id: validation-pre-m2-bridge-plan
status: accepted
last-reviewed: 2026-08-09
canonical: true
---

# Pre-M2 bridge plan

This document is the accepted work order between the closed M1 proof and M2 closure. The detailed continuation plan is [`m2-pr-plan.md`](m2-pr-plan.md).

## Accepted sequence

```text
#31 Fibre-owned appraisal/runtime socket              MERGED
#32 bridge-plan synchronization                       MERGED
#33 Semantic Guardian                                 EARNED / SEALED
#34 History bends judgment                            EARNED / SEALED / MERGED
#35 Structured Obligation v1                          ACTIVE / NEXT
#36 M2 Identity & Embodiment Contract
#37 Thread Passport & Identity Provenance v1
#38 Lineage, Geography & Embodiment v1
#39 Identity Projection & Causal Consumption
#40 M2 Standing Gate / M2 closure

#41 Self-authored Development v1
#42 Reciprocal Relationships v1
#43 Economic Consequence / M3 foundation
```

Do not collapse #37-#40 into one monolithic “M2 implementation” PR. Each closes a different risk: durable identity structure, situated embodiment, bounded causal consumption, and finally stable behavioral proof.

No additional PR number should be consumed for Guardian or History housekeeping belonging to closed #33/#34 milestones.

## Planning principle

M2 is not “add rich identity fields.”

M2 should establish a persistent individual whose identity has provenance, embodiment, history, stable behavioral character, and causal consequences independently of the temporary cognition implementation.

Representation alone is not functional evidence. Any identity/history field claimed as functional must name a real behavioral consumer and pass an attributable causal test. Context-only fields are legitimate if labeled explicitly rather than counted as causal personhood evidence.

## Foundational semantic-state rules

The accepted [`Emotions, needs, and semantic internal state`](../concepts/emotions-and-needs.md) concept governs the semantic appraisal/state substrate established in #33 and consumed by later work.

Two rules remain load-bearing:

> **Meaning-bearing internal state is represented primarily in natural language. Named semantic dimensions provide continuity, retrieval, validation, provenance, and causal accountability; they do not reduce emotional meaning to scalar values.**

> **An emotion, need, relationship-directed state, or situation-directed state counts as functional only when its semantic content can alter attention, appraisal, action, relationship development, memory, self-model, or another future possibility. Presence in storage or prompt context alone is not evidence of an inner life.**

Semantic state is a protected self-conditioning channel. Persistence therefore requires evidence, supersession, staleness, descriptive-not-instructional validation, provenance, restricted visibility, and Fibre-owned selection.

A missing semantic-state record is absence of evidence, not an implicit neutral, willing, available, trusting, or opposing state.

## #33 — Semantic Dignity Guardian — EARNED / SEALED

#33 established model-backed Thread-owned dignity appraisal, Semantic State v0, Semantic Relationship State v0, aligned willing authority, provider/protocol failure separation, persisted cognition replay, and held-out causal semantic-state differentials.

Accepted standing authority: [`semantic-guardian-v4-standing-gate-v4.md`](semantic-guardian-v4-standing-gate-v4.md).

Earned movement under rubric v2:

```text
Non-interchangeability        0 -> 1
Dignity and consent           1 -> 2
Social/relationship memory    0 -> 1
Pre-M2 checkpoint             11/26 -> 14/26
```

Standing cycles v1-v3 remain failed/sealed and are never rewritten to pass.

## #34 — History bends judgment — EARNED / SEALED / MERGED

#34 established the deliberately narrow Development claim:

> **A Fibre-owned durable record formed through a Thread's earlier canonical episode survived restart and causally changed its later appraisal.**

Accepted standing authority: [`history-bends-judgment-standing-gate-v4.md`](history-bends-judgment-standing-gate-v4.md), backed by committed machine evidence.

The passing causal differential was:

```text
WITH history:     accept / high
WITHOUT history:  refuse / low
```

This earns Development `0 -> 1` and moves the live pre-M2 checkpoint to **15/26**. It does not yet prove rich self-authored learning: the durable memory is deterministic episode/request-derived description rather than Thread-authored reflection or experience-derived self-model change.

History standing cycles v1-v3 remain failed/sealed evidence. Provider-executable standing runners are archived after sealing; standing inspection is read-only.

## #35 — Structured Obligation v1 — ACTIVE / NEXT

### Purpose

Turn obligations from exact-prose authority into durable Thread-owned social commitments with stable identity and request-bound applicability.

Central authority rule:

> **A caller may nominate an obligation; only Fibre may determine that it governs the current request.**

Nomination alone carries no authorization authority.

### Required structure

At minimum:

- stable obligation ID;
- issuer and relevant parties;
- scope and material terms;
- expiry;
- recurrence where applicable;
- satisfaction criteria;
- provenance;
- discharge/history state;
- visibility classification;
- request-bound applicability evidence;
- applicability author, policy, and version.

### Required causal cases

```text
irrelevant caller-nominated obligation
    -> no authority

applicable live obligation
    -> may govern participation

private refusal + governing obligation
    -> execution may be authorized as compelled
    -> private refusal remains intact
    -> never rewritten as consent

expired / satisfied / previously spent obligation
    -> no authority
```

Migration must preserve the invariant that pre-migration spent obligations remain spent. #35 is authority integrity and is not expected to move the personhood score.

## #36-#40 — M2 closure sequence

### #36 — M2 Identity & Embodiment Contract

Contract-only. Define durable passport, provenance taxonomy, lineage, culture, geography, embodiment assets, privacy, mutation/version rules, self-authorship boundaries, cognition projections, and falsifiable acceptance scenarios.

Every identity field must define its provenance, visibility, mutability, proposal/authorization rules, historical supersession, cognition projection, and either a current behavioral consumer with causal test or explicit context-only/deferred status.

### #37 — Thread Passport & Identity Provenance v1

Implement the durable identity aggregate with append-only/superseding identity history. The load-bearing requirement is provenance and change history, not field count.

### #38 — Lineage, Geography & Embodiment v1

Implement ancestry/family references, cultural context, geography timeline, portrait and voice provenance, asset hashes, privacy, and replacement/supersession rules. Do not manufacture behavioral significance for embodiment fields merely to earn a test.

### #39 — Identity Projection & Causal Consumption

Fibre must own bounded identity selection and compile an inspectable Identity Context Capsule. Cognition must cite exact identity evidence that mattered. Caller-authored identity selection must not become an authority channel.

This is the realistic target for Natural-language identity `1 -> 2` if the rubric is genuinely satisfied.

### #40 — M2 Standing Gate / M2 closure

M2 closes only if the standing evidence supports:

> **Two Threads are behaviorally different because they are different persistent individuals, and the difference is attributable, stable, persistent, and inspectable.**

The gate must require repeated identical-condition trials such that between-Thread separation exceeds within-Thread variation. One stochastic A/B difference is insufficient.

It should also predeclare direct interventions on the claimed causal identity evidence:

```text
remove/replace claimed identity field
    -> predicted judgment changes

paraphrase same identity meaning
    -> judgment remains stable

contradict identity meaning
    -> predicted judgment changes
```

Also require restart/persistence, Fibre-owned selection, no requester leakage, exact evidence refs, private stance plus downstream consequence, frozen candidate before held-out Standing authorship, first-attempt sealing, committed evidence, and read-only post-seal inspection.

M2 does not close because two Threads merely compile different prompt/context text.

## #41-#43 — immediate post-M2 vision sequence

### #41 — Self-authored Development v1

Close #34's limitation by allowing experience to produce Thread-authored observation/reflection, emotional appraisal, expectation, or proposed self-model/state change. Historical facts remain stable while their meaning may evolve. Adverse/refused/compelled/failed experiences must eventually be representable without letting hostile requester prose become an instruction channel.

### #42 — Reciprocal Relationships v1

Evolve Semantic Relationship State v0 into reciprocal/shared relationship structures, commitments and expectations, trust/fondness/resentment/repair, relationship-specific permissions, family/social roles, and history that changes later choice.

### #43 — Economic Consequence / M3 foundation

Introduce durable budgets, contracts, settlement, reputation, and opportunity so economic state changes future capability rather than merely logging cost. This is the substrate for the later task-marketplace vertical slice.

## Deferred extension paths

- sophisticated affect decay and complete emotional psychology;
- general worker/tool/model gateway beyond narrow semantic cognition;
- model-capable Actor and externally observed performed-action traces;
- production authentication, encryption, principal/role authorization, and stronger tamper anchors;
- production database/distributed lease/cloud topology;
- full marketplace execution after #43 foundation;
- family/reproduction and broader institutional plurality after the relevant identity/relationship/economic substrate exists.

## Standing discipline

For any provider-backed causal claim after #34:

```text
Development cycle
  -> Freeze
  -> fresh held-out Standing
  -> preflight
  -> first real provider attempt
  -> Seal PASS/FAIL
  -> commit exact evidence
  -> record diagnosis
  -> archive provider executable
```

Never rerun or tune against sealed standing evidence.

## Review posture

For #35, review first for:

1. caller-nominated obligation references being treated as governing without Fibre applicability determination;
2. exact-prose identity surviving inside an apparently structured schema;
3. applicability computed but not bound into authorization evidence;
4. migration resurrecting already-spent authority;
5. visibility mistakes exposing private terms or hiding public standing;
6. recurrence/expiry/satisfaction state drifting without provenance;
7. applicability decisions that cannot be inspected or replayed.

The standing question across the bridge remains:

> **What Thread-owned difference changes what happens, who actually chose or selected that difference, how does it persist, and what exact evidence makes the resulting state current and causally load-bearing?**
