---
id: architecture-intrinsic-regulation
status: accepted
last-reviewed: 2026-09-10
canonical: true
---

# Intrinsic regulation

## Purpose

A Thread should not need to consciously invent every motive or feeling before anything can matter.

Fibre therefore separates **intrinsic regulation** from semantic self-understanding.

```text
World reality + Thread commitments/relationships/resources
  -> predictive regulators
  -> drive state
  -> intrinsic affect
  -> attention / cognition
  -> Thread-authored semantic emotion, need or meaning
  -> action / learning / changed plans
```

The lower layers are organism-like control machinery. They are private and causally real, but they are **not semantic claims about the person**.

This architecture is general enough for Threads and simpler non-verbal animals. Higher semantic cognition is optional; regulation is not.

## Three different things

### Regulatory drive

A drive is a mechanically evaluated discrepancy between a desired/avoided condition and the Thread's actual or predicted condition.

Examples:

- be physically at Victoria Station before a train leaves;
- be at home and connected to a particular Zoom meeting at 11:00;
- be near a trusted caregiver when distressed;
- seek a partner whose presence is comforting;
- seek distance from a person or situation that currently feels unsafe or exhausting;
- recover rest/resources after sustained demand;
- reduce uncertainty by exploring something novel.

Drive state may be numeric because it is control state rather than autobiographical meaning.

### Intrinsic affect

Intrinsic affect is the immediate felt pressure produced by regulation: positive/negative valence, activation, approach/avoid/maintain tendency, attainment, blockage and surprise.

It is closer to an interoceptive signal than an emotion sentence. Fibre must not mechanically turn `high negative pressure` into `I am anxious` or `proximity pressure` into `I love this person`.

### Semantic internal state

Semantic emotion, need, relationship attitude and meaning remain Thread-owned natural-language state.

Temporary cognition may interpret intrinsic affect in context and form statements such as:

```text
I am relieved we made it.
I am getting restless because I do not want to miss the call.
I miss her and want to be near her tonight.
I care about him, but right now I need distance.
```

Different Threads may interpret the same regulatory pattern differently because history, relationships, identity and current context differ.

## Predictive, not merely reactive

Regulation is allostatic: it compares not only `actual now` with `desired now`, but predicted future state with desired future state.

A Thread can therefore become uneasy **before** being late:

```text
11:00 required Zoom presence
10:35 actual location is 18 minutes from home
expected travel is 20-25 minutes

predicted presence misses desired presence
  -> pressure rises now
```

Likewise, progress faster than expected can reduce pressure before arrival; an obstacle can increase it; arrival can collapse discrepancy and create relief/satisfaction potential.

## Presence is a relation, not just geography

For regulation, a `place` is often a desired **relation of presence**.

The target may be:

- a physical place — `at Victoria Station`;
- a person — `with my caregiver`, `near my partner`, `away from this person`;
- a mediated social setting — `on Zoom with Sam`;
- an activity/context — `alone somewhere quiet`, `available for class`;
- an obligation — `present for the appointment before 15:00`.

A useful conceptual form is:

```text
PresenceTarget
  target            place | entity | mediated setting | activity | obligation
  relation          at | with | near | away_from | connected_to | available_for
  window?           when the relation matters
  source             attachment | commitment | plan | safety | rest | curiosity | other
  strength/context   private regulatory configuration, not semantic meaning
```

This is why a caregiver can function as a child's safe place, and why an intimate partner can function similarly for an adult. The inverse is equally important: relationship history may make distance, not proximity, the regulated condition.

Role alone never determines polarity. `parent`, `partner` or `friend` must not mechanically mean `seek proximity`.

## Generic drive signals

Regulators should expose a very small generic control surface rather than a large emotion taxonomy.

Conceptually:

```text
DriveSignal
  target/ref
  orientation        approach | avoid | maintain
  pressure           how strongly regulation currently demands change
  urgency            how quickly the condition is becoming consequential
  progressError      actual progress versus expected progress
  predictionError    actual outcome versus predicted outcome
  attained           desired relation currently satisfied?
  asOf
  evidenceRefs[]
```

The exact schema is not frozen by this document. The invariant is that these are **mechanical/private control variables**, not compressed semantic feelings.

`blockage` can emerge from sustained pressure plus inadequate progress. `relief` is not stored here; pressure reduction and attainment create the conditions from which a Thread may experience relief. `boredom` is not stored here either; low value/progress in the present state plus stronger alternative opportunities may create an exploration pressure that cognition experiences as boredom, restlessness, curiosity or something else.

## Initial regulator families

The architecture is extensible, but Fibre should begin with a few biologically/computationally useful families rather than enumerate human emotion.

- **presence / commitment** — be where/how one wants or needs to be at a relevant time;
- **social / attachment proximity** — seek or avoid closeness to particular people or social availability;
- **safety / threat** — reduce exposure to consequential threat or instability;
- **rest / resource** — recover from sustained demand and preserve scarce resources;
- **exploration / information** — reduce uncertainty, seek novelty and learn;
- **connection** — regulate broader social contact distinct from one attachment figure.

Progress, attainment, blockage and surprise are generic properties of these regulators rather than separate emotions.

Do not implement all families at once. The first executable proof needs only presence/commitment and one person-targeted social/attachment regulator.

## Individuality and development

Intrinsic regulation must not make Threads interchangeable.

Regulatory sensitivity, thresholds, target formation and persistence may be influenced by:

- developmental age and dependency;
- genome/runtime baselines where they genuinely describe non-semantic control characteristics;
- repeated history and learned expectations;
- current relationships and prior co-regulation;
- commitments and personal plans;
- available resources and current World conditions.

These influences tune the control system; they do not pre-author a semantic emotion or relationship meaning.

A child may strongly seek a caregiver as a secure base. Another child with different history may show weaker or conflicted proximity seeking. An adult may seek a partner for comfort, enjoy solitude, or actively want distance from the same person in another context.

## Co-regulation

People can regulate each other.

The presence of a trusted caregiver, partner or friend may reduce perceived threat, effort or uncertainty. Separation may increase regulatory pressure. A caregiver can also become regulated by the child's state: protecting, soothing, finding the child, or changing their own plans.

This creates coupled life without collapsing two persons into one state:

```text
Thread A regulators -> A affect -> A cognition/action
          |                         |
          +------ shared event -----+
          |                         |
Thread B regulators -> B affect -> B cognition/action
```

Each person keeps private regulatory and semantic state.

## Interoception boundary

Mechanical regulation must be able to affect a Thread without masquerading as semantic self-knowledge.

The allowed bridge is an explicit **interoceptive projection**: a bounded private description of the current control signal supplied to cognition as sensation/control evidence, not as an emotion verdict.

Allowed in principle:

```text
target: upcoming appointment
orientation: approach
pressure: rising
progress: behind expectation
```

Not allowed:

```text
you are anxious
you resent your caregiver
you love this person
you should cancel the meeting
```

Cognition may interpret the first form into semantic state. That semantic result is still candidate Thread cognition and must pass normal admission/provenance rules.

This refines, rather than removes, the existing rule that mechanical conditions are not semantic state.

## Behavioral effect and safety

Regulators may:

- change attention/salience;
- trigger bounded cognition when pressure crosses a meaningful threshold;
- bias approach/avoid/explore/rest tendencies;
- influence planning and replanning;
- provide private interoceptive evidence for semantic interpretation.

They may not mint permission, consent, money, relationship authority or protected external action. A drive can wake a Thread and make something matter; normal Fibre authority still governs what the Thread may actually do.

For simpler animals without semantic cognition, a bounded behavior controller may consume intrinsic affect directly for ordinary non-protected actions. This does not imply that Threads bypass cognition or authorization.

## Time and persistence

Fibre does not need a high-frequency organism simulator.

Evaluate regulators when something can materially change them:

- World event or situation transition;
- meaningful clock/deadline boundary;
- movement/progress update;
- relationship/social-presence change;
- resource/rest change;
- cognition or plan change.

Between events, deterministic time-dependent values can be recomputed lazily. Persist source targets/configuration and consequential regulatory transitions/checkpoints needed for replay; do not write every numerical tick.

## Relationship to flight plans

A half-day/day flight plan will be one major source of presence targets.

```text
flight-plan stop: Zoom with Alex at 11:00
  -> desired presence relation
  -> predicted ability to satisfy it
  -> rising/falling pressure while time passes
  -> movement or preparation
  -> obstacles/surprises alter progress
  -> arrival/connection changes drive state
```

Physical travel is only one case. The same machinery covers being home in front of a Zoom screen, being with a caregiver, wanting to see a partner, or wanting distance.

The immutable plan records intended life. World history records enacted life. Regulation makes the difference between the two **felt** before semantic interpretation decides what it means.

## Relationship to Semantic State

[`../concepts/emotions-and-needs.md`](../concepts/emotions-and-needs.md) owns meaning-bearing internal-state doctrine.

```text
regulatory state != semantic need
intrinsic affect  != semantic emotion
presence pressure != attachment meaning
```

ADR-0012 still applies: numeric or categorical control variables may never replace meaning-bearing semantic state. They are legitimate here because they control regulation rather than claim to summarize the Thread's meaning.

## Implementation detour

Build on the existing `agent/m2-lived-encounter` branch. Do not create a parallel branch or a generic simulation framework.

### R1 — Regulatory kernel + presence drive

Build one provider-neutral intrinsic-regulation domain that can evaluate a `PresenceTarget` against actual/predicted World state and time.

Prove:

- pressure rises before a deadline when predicted presence becomes unlikely;
- progress reduces pressure;
- arrival/connection attains the target and reduces drive;
- surprise/progress error is observable;
- restart/recomputation preserves the same result.

No LLM is needed for R1.

### R2 — Person as place

Add person-targeted presence relations and one relationship/development-sensitive source of proximity or distance regulation.

Prove two cases without hard-coded emotion:

- child seeks a trusted caregiver / caregiver functions as secure base;
- adult relationship can produce either desired proximity or desired distance depending on Thread-owned context/history.

Do not infer positive attachment solely from `parent` or `partner` role.

### R3 — Interoception -> semantic feeling

Project bounded private drive/affect signals into existing temporary cognition as interoceptive evidence.

Reuse Semantic State for the interpreted result. Prove that the same or similar mechanical pressure can yield different grounded semantic feelings in different Threads, and that no emotion is mechanically injected.

### R4 — Functional drive loop + inspection

Let meaningful drive changes trigger attention/cognition and influence a subsequent intention or ordinary life choice without granting protected authority.

Thread Editor should be able to inspect, under operator authorization:

```text
regulatory target -> drive change -> interoceptive cue -> semantic interpretation -> behavioral consequence
```

Keep raw control state private from public Presentation by default.

**Closure:** a Thread can become motivated, uneasy, relieved/satisfied, socially drawn or pushed away for causal reasons arising from its own life, rather than because a prompt author wrote a feeling into it.

After R4, resume the Flight Plan / movement / E2E meeting sequence and use these regulators as its felt substrate.

## Research grounding

This architecture borrows principles rather than claiming a settled neuroscientific ontology:

- homeostatic reinforcement learning: drive reduction can act as intrinsic reward and support predictive control;
- allostasis/interoception: organisms regulate predicted future needs, not only current deficits;
- attachment research: trusted caregivers can function as safe haven and secure base, with proximity seeking under distress;
- social-baseline/social-homeostasis work: close others can reduce perceived risk/effort, while desired social contact varies by person and history;
- curiosity/information-seeking research: exploration can be intrinsically motivated rather than reducible to external reward.

Named human emotions are not treated as fixed outputs of these mechanisms. Fibre preserves the uncertainty between low-level regulation and a person's lived interpretation.