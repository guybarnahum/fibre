---
id: architecture-intrinsic-regulation
status: accepted
last-reviewed: 2026-09-10
canonical: true
---

# Intrinsic regulation

## Purpose

A Thread should not need to consciously invent every motive or feeling before anything can matter.

```text
World reality + commitments/relationships/resources
  -> predictive regulatory drive
  -> intrinsic affect
  -> attention / cognition
  -> Thread-authored semantic feeling or need
  -> action / learning / changed plans
```

Drive and intrinsic affect are private organism-like control state, not semantic claims. This lower architecture can also serve simpler non-verbal animals; semantic cognition is optional, regulation is not.

## Primitive drive substrate

Fibre begins from a small, largely shared set of **axiomatic animal drives**. They are not personality traits and should not vary enough for one Thread to lack the basic organismic forces that define the class.

Initial families:

- **safety / threat avoidance** — reduce danger, pain, instability and exposure;
- **energy / nourishment** — restore energy and satisfy hunger-like resource deficit;
- **rest / recovery** — recover from sustained demand and fatigue;
- **attachment / social proximity** — seek closeness, co-regulation and belonging, or distance when a relationship/situation is aversive;
- **reproduction / mating** — developmentally appropriate attraction and mating motivation where applicable;
- **exploration / information** — seek novelty, information, play and uncertainty reduction;
- **commitment / presence** — satisfy learned promises, plans and obligations by being where/how one intends or needs to be.

The first six are primitive organismic families. `commitment / presence` is a learned/higher-order regulator built on the same machinery and is especially important for Flight Plans.

A physical or social place matters because it can satisfy several drives at once: home may provide safety/rest; a kitchen nourishment; a caregiver safety/attachment; a partner attachment/mating; a museum exploration; a station progress toward a commitment.

## Drive, affect, meaning

**Regulatory drive** is mechanically evaluated discrepancy between a desired/avoided condition and actual or predicted condition. It may be numeric because it is control state.

**Intrinsic affect** is the immediate felt consequence of regulation: valence/activation, approach-avoid-maintain pressure, progress, attainment, blockage and surprise. It is closer to interoception than an emotion sentence.

**Semantic internal state** is the Thread's interpreted natural-language emotion, need or relationship meaning.

Therefore:

```text
regulatory drive  != semantic need
intrinsic affect  != semantic emotion
presence pressure != attachment meaning
```

Fibre must not implement `late => anxious`, `arrived => happy`, or `caregiver nearby => secure`. Similar regulator states may become worry, irritation, excitement, relief, comfort, curiosity or no durable semantic state depending on the person and context.

## Predictive regulation

Regulation is allostatic: compare predicted future condition with desired future condition, not only `actual now` with `desired now`.

A Thread can become uneasy before missing an 11:00 Zoom if current location plus expected travel predicts that required presence will fail. Progress faster than expected can reduce pressure; an obstacle can increase it; arrival can collapse discrepancy and create relief/satisfaction potential.

## Presence is a relation

For regulation, `place` is often a desired relation of presence rather than coordinates.

```text
at Victoria Station
with caregiver
near partner
away_from person
connected_to Alex on Zoom
available_for appointment
alone somewhere quiet
```

Conceptually:

```text
PresenceTarget
  target      place | entity | mediated setting | activity | obligation
  relation    at | with | near | away_from | connected_to | available_for
  window?
  source      attachment | commitment | plan | safety | rest | exploration | other
  private regulatory configuration
```

A caregiver can be a child's safe place; a partner or intimate friend can regulate an adult through presence. Distance may instead be desired. `parent`, `partner` and `friend` never mechanically determine polarity.

## Small generic control surface

Regulators should expose generic drive signals, not a giant emotion ontology:

```text
DriveSignal
  target/ref
  family
  orientation       approach | avoid | maintain
  pressure
  urgency
  progressError
  predictionError
  attained
  asOf
  evidenceRefs[]
```

Exact schema is not frozen here.

High sustained pressure plus poor progress can create blockage conditions. Pressure reduction and attainment can create relief/satisfaction potential. Low current value plus stronger alternatives can create exploration pressure that cognition may experience as boredom, restlessness or curiosity.

## Genetic invariance and bounded variation

Primitive regulation should be **more uniform across Threads than semantic character**.

The basic regulator families and their broad dynamics are Fibre-species invariants. Genetics may tune sensitivity, persistence, recovery rate, novelty appetite, threat reactivity, social-proximity sensitivity and similar control parameters only within bounded plausible ranges.

```text
shared regulator law
  + narrow inherited runtime baselines
  + developmental state
  + learned history / relationships
  + current World context
  -> individual drive state
```

A Thread should not genetically have `safety = 0` or `attachment = 20x normal`. Large individuality should come primarily from what particular targets mean to the person, learned expectations, relationships, memories, commitments and semantic interpretation.

These bounded regulator parameters belong in the existing genome `runtimeBaselines` surface because they have genuine numeric/control semantics. They do not replace natural-language symbolic loci and are not personality coordinates.

Development may activate or reshape a regulator family. Reproductive/mating drive, for example, is developmentally gated rather than applied to children merely because the family exists in the species substrate.

## Co-regulation

People can regulate each other. A trusted person's presence may reduce perceived threat/effort; separation may increase pressure; one person's distress may change another's priorities. Each person retains separate drives, affect, meaning and agency.

A caregiver can therefore literally be a regulatory destination for a child: `with caregiver` may satisfy safety and attachment at once. The same architecture lets an adult seek a partner or intimate friend for comfort, or seek distance when closeness is currently aversive.

## Interoception boundary

Mechanical regulation may affect cognition only through an explicit private **interoceptive projection** of control/sensation evidence.

Allowed:

```text
target: upcoming appointment
orientation: approach
pressure: rising
progress: behind expectation
```

Not allowed:

```text
you are anxious
you love this person
you resent your caregiver
you should leave now
```

Cognition may interpret the first form and propose semantic state through normal admission/provenance. This refines the existing rule that mechanical conditions are not semantic state; it does not remove it.

## Behavioral and authority boundary

Regulators may change attention, trigger bounded cognition, bias ordinary approach/avoid/explore/rest tendencies, and influence planning/replanning.

They may not mint permission, consent, money, relationship authority or protected external action. A drive can wake a Thread and make something matter; normal Fibre authority still governs action.

For simpler animals, a bounded behavior controller may eventually consume intrinsic affect directly for ordinary non-protected actions. Threads do not gain an authorization bypass.

## Time and persistence

No high-frequency organism simulator is required.

Evaluate when something can materially change regulation: World/situation transitions, meaningful clock boundaries, movement/progress, social-presence changes, resource/rest changes, or plans/cognition.

Recompute deterministic time-dependent values lazily. Persist durable targets/configuration and consequential transitions/checkpoints needed for replay, not every numeric tick.

## Flight Plan integration

A half-day/day Flight Plan is a major source of presence targets:

```text
Zoom with Alex at 11:00
  -> desired presence
  -> predicted attainability
  -> pressure/progress while time passes
  -> preparation or movement
  -> obstacle/surprise
  -> arrival/connection
```

Physical travel is only one case. The same mechanism covers Zoom, caregiver proximity, partner proximity/distance and other required presence.

The immutable plan records intended life. World history records enacted life. Regulation makes the difference **felt** before semantic interpretation decides what it means.

## Thread Editor: organism debugger

Thread Editor is the authorized way to inspect this causal stack. It should make the organism legible without turning the UI into an authority.

```text
DNA / genome
  symbolic inherited loci
  regulator runtime baselines + allowed species envelope
  source parent / mutation provenance

Regulation now
  active primitive drives
  targets
  pressure / urgency / progress / attainment
  why each signal changed

Interoception
  exact bounded cues exposed to cognition

Semantic interior
  feelings / needs / relationship attitudes formed by the Thread

Behavior
  attention / intention / plan / action consequences
```

The useful debugging question is not merely `what is the value?` but:

> **Why does this Thread want to move, stay, approach, avoid, eat, rest, explore or seek someone right now?**

For every consequential signal the Editor should allow drill-down to the World evidence, regulator configuration, inherited baseline, previous checkpoint and subsequent semantic/behavioral consequence.

Raw regulator state and DNA remain private/operator-authorized and are not public Presentation fields by default.

## Relationship to Semantic State

[`../concepts/emotions-and-needs.md`](../concepts/emotions-and-needs.md) owns meaning-bearing state doctrine. ADR-0012 still applies: numeric/categorical control state may never replace semantic meaning. It is legitimate here only because it performs regulation rather than claiming to summarize the person.

## Implementation detour

Continue on `agent/m2-lived-encounter`; do not create a parallel branch or generic simulation framework.

### R1 — Regulatory kernel + primitive drives

Build one small provider-neutral regulator domain with shared family definitions and bounded genome/runtime tuning. Implement enough mechanics to prove safety/energy-rest/exploration baselines plus the presence/commitment case needed by Flight Plans; do not simulate a body.

Prove pressure changes from real World state, progress/attainment, prediction error, bounded genetic variance, and equivalent result after restart/recomputation. No LLM.

### R2 — Person as place / co-regulation

Add person-targeted presence relations.

Prove a child/caregiver secure-base case and an adult case where Thread-owned context can make either proximity or distance desired. Do not infer attachment from role alone.

### R3 — Interoception -> semantic feeling

Project bounded private drive/affect into existing temporary cognition. Reuse Semantic State for interpretation.

Prove similar mechanical pressure can yield different grounded semantic feelings in different Threads, with no mechanically injected emotion.

### R4 — Functional drive loop + Thread Editor

Let meaningful drive changes trigger attention/cognition and influence a subsequent intention or ordinary life choice without granting protected authority.

Expose the full causal chain plus DNA/regulatory-baseline inspection in Thread Editor.

**Closure:** motivation, unease, satisfaction/relief, hunger/rest pressure, exploration and social pull/push arise causally from the organism and its life rather than prompt-authored feeling. Then resume Flight Plan, movement and the E2E meeting using regulation as their felt substrate.

## Research grounding

The design borrows principles rather than claiming a settled neuroscience ontology:

- homeostatic reinforcement learning: drive reduction can act as intrinsic reward;
- allostasis/interoception: regulation anticipates future needs;
- attachment research: caregivers can provide safe haven/secure base and motivate proximity;
- social-baseline/social-homeostasis work: close others can reduce risk/effort and social setpoints vary by person/history;
- curiosity research: information seeking can be intrinsically motivated.

Named human emotions are intentionally not fixed outputs of these mechanisms.