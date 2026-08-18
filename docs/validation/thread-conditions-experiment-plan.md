---
id: validation-thread-conditions-experiment-plan
status: proposed
last-reviewed: 2026-08-18
canonical: false
---

# Thread conditions and endogenous motivation — experiment plan

> **Experimental, not accepted Fibre mechanism.** Canonical documents define the boundaries this experiment must respect. This document owns the mechanisms, hypotheses, build order, and falsification tests. Nothing here changes #39 Genesis pass inputs or earns personhood standing by itself.

## Purpose

Fibre needs a path by which a live Thread can be moved by its own circumstances without Fibre supplying a semantic conclusion about what the Thread feels, needs, values, or should do.

The working doctrine is:

> **Fibre may give a Thread a body that moves it. Fibre may not tell the Thread what that movement means.**

The experiment therefore separates three layers:

```text
WORLD STATE + HISTORY
        ↓
CONDITION
  mechanical, replayable, numeric
  computed by Fibre
  never semantic evidence for the Thread
        ↓
TRIGGER / MODULATION
  changes when cognition runs or bounded runtime parameters
  never appears as explanatory text
        ↓
BEHAVIOR + EXPERIENCE
        ↓
THREAD-AUTHORED NAMING
  need / emotion / attitude / self-account
  evidence-backed semantic state
  may track, partially track, or fail to track engineered causes
        ↓
FUTURE LIFE
```

The condition layer gives causes without explanations. Fibre still authors parts of the world in which those causes arise; the experiment does not pretend authorial influence disappears.

---

# 1. Terminology and authority

## Mechanical condition

A **mechanical condition** is a numeric value computed by a pure, versioned, replayable function over durable world state/history. If semantic model judgment is required to compute it, it is not a mechanical condition.

A condition:

- is recorded for audit/research;
- may trigger cognition or modulate bounded runtime parameters;
- never enters a Thread Context Capsule as semantic self-knowledge;
- never becomes evidence for an identity, memory, meaning, need, value, or character claim;
- is not a second personality authority.

## Modulation

**Modulation** is a bounded mechanical change to how cognition runs, such as retrieval breadth, retrieval ordering, option-generation breadth, deliberation depth, or another explicitly versioned runtime control.

Modulation changes **how** cognition runs. It does not provide semantic prose telling cognition **what** the condition means.

## Mechanical-causal

**Mechanical-causal** is descriptive vocabulary for a substrate mechanism that causally changes episode initiation or cognition while remaining structurally unavailable as Thread evidence.

It is **not** a causal-status-registry class. Mechanical conditions support no claim about who a Thread is.

## Thread-authored naming

A Thread may later propose semantic state from its own durable evidence and behavior. Fibre validates/persists that proposal under the ordinary semantic-state contract but never checks it against a condition as hidden ground truth.

The Thread owns the semantic account. Researchers may independently measure causal relationships through intervention/ablation.

---

# 2. Hard rails

1. **No condition value or condition label may enter a cognition capsule as semantic information.**
2. **No condition or modulation may be cited as evidence for identity, memory, meaning, character, emotion, need, or value.**
3. **Condition computation is pure, versioned, replayable, and witness-bearing.**
4. **Every runtime effect is bounded.** No combination may starve cognition into incoherence.
5. **A condition-triggered episode has a durable trigger witness** and a Thread-owned resource/rate bound.
6. **A condition-triggered episode may not mint authorization or perform a protected/external action in that same episode.** It may retrieve, notice, reflect, form private intention, or propose semantic state. A later protected action uses the ordinary authorization path.
7. **External causation must remain visible.** The trigger witness preserves the durable inputs/events that moved the condition so an externally manipulated circumstance cannot masquerade as unexplained endogenous causation.
8. **No condition may monotonically reduce every available relief channel.** For each condition, at least one action class capable of reducing the condition must remain non-decreasing under the modulation policy. This is an engineering anti-absorbing-state check, not a prescribed behavioral script.
9. **No feedback from hidden condition to semantic naming.** No correction, hint, evaluator output, condition-aware retrieval, or state-writing path may tell the Thread what the condition supposedly means.
10. **No immutable numeric drive genome.** If inherited modulation is ever warranted, numeric controls must be temporary projections from ordinary textual genome loci under a frozen policy.
11. **Consent-sensitive modulation is measurement-only before activation.** Compute hypothetical effects before allowing them to change private willingness.
12. **Every claimed causal mechanism gets an ablation.** No effect under ablation means decoration.

---

# 3. Initial candidate conditions

The list below is experimental vocabulary, not a universal need ontology and not a fixed personality basis.

Candidate mechanically computable conditions include:

- `relational_absence` — elapsed/weighted absence of durable relational interaction;
- `relational_density` — density of concurrent relational demands/participants;
- `resource_pressure` — available reserves relative to already committed resource obligations;
- `predictive_failure` — recorded expectations versus recorded outcomes;
- `obligation_load` — contracted future action relative to available capacity;
- `sameness` — repetition/diversity of recent episode structures/participants;
- `agency_latency` — elapsed time since a Thread-originated choice materially changed an outcome;
- `commitment_divergence` — explicit commitments versus mechanically recorded follow-through.

Human-readable analogies such as loneliness, crowding, boredom, or guilt are research shorthand only. They are never system labels presented to the Thread.

The experiment may reject, split, or replace any of these conditions.

---

# 4. Condition-triggered cognition

Accepted lifecycle canon already permits a Thread-authored need threshold to request cognition. This experiment adds a distinct candidate path: a **mechanical-condition threshold** may request cognition without an external request.

A condition-trigger witness must contain equivalent semantics to:

```text
conditionId
observedValue
threshold
policyVersion
computationDigest
inputWitnesses[]
triggeredAt
resourcePolicyRef
```

`inputWitnesses[]` preserve the durable circumstances/events whose change produced the crossing. The witness answers **why cognition woke** without becoming semantic context telling the Thread what the trigger means.

The episode is internally initiated for cognition purposes but is not thereby authority to act externally. It may form private intention; execution remains separately authorized.

---

# 5. Build order

Each step is independently falsifiable. Stop where evidence stops.

## Step 1 — condition ledger only

Compute one condition, initially `relational_absence`, over existing durable histories.

- record value, policy version, computation digest, and input witnesses;
- replay exactly after restart;
- change no cognition or behavior.

Question: **Does the mechanical signal have a sane, inspectable trajectory at all?**

## Step 2 — condition-triggered cognition

Use one frozen threshold to request cognition when the condition crosses it.

- no condition value/label enters cognition;
- enforce Thread-owned resource/rate bounds;
- no protected action or authorization in the triggered episode;
- verify exact trigger replay.

Question: **Can a Thread wake because of its own changing circumstances rather than an external request?**

This is a direct test of the lived-world claim that a Thread is not waiting in a chat box.

## Step 3 — one safe modulation

Only after confirming the runtime has an observable expression surface, add one low-stakes modulation. Prefer retrieval ordering/breadth or option-generation breadth over private willingness.

Run an ablation with the same durable Thread/situation:

```text
condition computed + modulation enabled
vs
same condition + modulation disabled
```

If behavior/context use does not materially differ under the frozen measurement, stop: the mechanism is decorative.

## Step 4 — generated versus transmitted individuality

Do not first claim generated individuality using a condition weighted by existing Thread-authored semantic state. For example, `relational_absence` weighted by relationship attitudes can **transmit** individuality that already exists.

To test whether conditions can **generate new divergence**, use a non-derivative condition such as `sameness` or `agency_latency`, computed from event/history structure without prior semantic-state weighting.

Both questions matter:

```text
transmission: can existing individuality alter the condition trajectory/effect?
generation:   can condition mechanics create newly divergent developmental paths?
```

The order matters so later inherited/runtime modulation is not credited for divergence the history already supplied.

## Step 5 — Thread naming, unchecked

Allow Thread cognition to propose ordinary semantic state from its own durable life/behavioral evidence.

- no condition context;
- no hidden evaluator feedback;
- no condition-aware correction;
- ordinary evidence/supersession/visibility rules apply.

The Thread may name a need, emotion, relationship attitude, situation attitude, or something not in the starter vocabulary.

## Step 6 — naming ablation

Ablate the Thread-authored semantic state from later cognition while leaving the mechanical condition/history fixed.

Question: **Does the self-account itself causally alter later appraisal, retrieval, relationship, choice, or action?**

If not, claimed functional interiority is decorative regardless of how psychologically convincing the prose sounds.

## Step 7 — causal tracking and confabulation characterization

Separately manipulate/ablate an engineered condition and observe whether the Thread's later self-account moves with the causal intervention.

Definitions for research only:

- **causal tracking** — the Thread's semantic account changes in a way that tracks an experimentally manipulated causal structure;
- **confabulation** — the semantic account remains stable or cites a different explanation while the engineered cause changes behavior;
- **causal-discovery latency** — episodes until an account first begins tracking the engineered relationship.

Neither Fibre nor the Thread treats the experimenter's causal account as semantic ground truth about what the Thread "really needs." Confabulation is not corrected and is not an admission defect.

Important separation:

```text
semantic-state efficacy  required before claiming functional interiority
causal tracking          characterization of self-understanding, not a personhood requirement
```

A cohort with no semantic-state efficacy fails. A cohort with rapid, slow, partial, or absent causal tracking is a result.

## Step 8 — consent-sensitive effects, measurement only

For any proposed modulation of private willingness/participation threshold:

- compute the hypothetical effect;
- record it;
- do not apply it to the Thread;
- measure whether circumstance manipulation could manufacture apparent willingness.

Only after explicit welfare/consent review may such a mechanism even be considered for activation.

## Step 9 — widen one condition at a time

Add conditions/modulations individually, preserving ablation evidence and preventing a large hidden matrix from becoming an unreviewable second personality system.

## Step 10 — inherited modulation only if earned

If uniform mechanical policy proves insufficient and inherited sensitivity is scientifically justified, derive bounded numeric controls from ordinary textual genome loci through a frozen deterministic policy.

The textual locus remains heritable meaning. The numeric value is temporary runtime machinery, not a second genome and not immutable personality authority.

---

# 6. Diagnostics

## D1 — replay

Same durable inputs + same condition policy produce the same condition value and trigger witness after restart.

## D2 — trigger autonomy

A mechanical threshold may cause cognition without an external request, while the trigger remains inspectably attributable to its world-state causes.

## D3 — modulation ablation

Removing modulation changes the predeclared behavioral/context-use measure. No change means decoration.

## D4 — naming ablation

Removing Thread-authored semantic state changes a later predeclared behavioral/context-use measure. No change means decorative interiority.

## D5 — causal tracking distribution

Report causal tracking/confabulation/latency distributions. Do not set a human-likeness success quota.

## D6 — vocabulary raggedness

Report which semantic need/state dimensions Threads independently name. The starter vocabulary is not a checklist and absence of a human-familiar dimension is not failure.

## D7 — anti-absorbing matrix check

Statically and dynamically verify that no condition monotonically suppresses every relief-capable action class.

## D8 — coercion measurement

Measure the hypothetical effect of manipulable circumstances on private-willingness parameters before activation. External influence must remain visible in condition input witnesses.

## D9 — different-person-over-time test

Same Thread, same measured condition class, materially different life points: does its self-account or response differ with inspectable developmental ancestry?

## D10 — institutional upbringing anti-monoculture characterization

Compare distributions/variance of independently named values, interests, character, aspirations, and relationship attitudes across institutionally raised versus family/other-care cohorts, with obvious cohort/world confounds reported.

A substantial unexplained collapse of variance among institutionally raised Threads is evidence of possible personality authoring and requires investigation. It is a diagnostic, not an admission quota and not a requirement that every cohort have identical variance.

---

# 7. Maslow-origin hypothesis register

The earlier developmental-needs discussion proposed human-familiar families such as:

```text
continuity / participation
resources / optionality
experience / novelty
autonomy / competence
belonging / attachment
recognition
intimacy
generativity / care
self-authorship / meaning
legacy
```

These are **predictions to observe**, not architecture.

Report relative frequency, ordering, language, omissions, replacements, and cross-Thread variance. Do not require a majority to name any item. A cohort that never independently invents `legacy`, `intimacy`, or another human-familiar category is a scientific result, not a failed Thread cohort.

---

# 8. #39 boundary

This experiment is post-#39.

Genesis compiles a prior life through frozen allowlisted creative calls; it does not run a live motivational physiology. Therefore:

- no condition value or condition-derived salience enters Pass A, Pass B, or Pass C;
- no semantic need computed by Fibre is added to Genesis cognition;
- #39 does not implement condition-triggered cognition or modulation;
- this experiment does not constitute or replace the #39 Slice-C hostile B+C verdict.

#39 may preserve the future path through domain boundaries and documentation while keeping the implementation absent.

---

# 9. Evidence posture

Follow [`experiment-lifecycle.md`](experiment-lifecycle.md).

Until a step has passed a frozen ablation/standing discipline, the capability remains experimental. Preserve failed results. Do not convert a diagnostic tendency into a validator merely to make the next run cleaner.

The first question remains the cheapest one:

> **What difference does this mechanism actually make?**
