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
World / body / sensory reality
  -> sensorium
  -> basal regulation
  -> species-shaped regulation
  -> private drive + intrinsic affect
  -> interoception / attention
  -> Thread cognition
  -> semantic feeling / need / meaning
  -> action / learning / changed plans
```

Regulation is private organism-like control state, not semantic self-knowledge. The same lower architecture should support Threads and simpler animals; language and autobiographical interpretation are optional above it.

## One engine, layered regulation

Do not build a hierarchy of separate regulator services. Fibre should have one small provider-neutral evaluator whose behavior is shaped by a species profile and individual state.

```text
RegulatorKernel
  generic discrepancy / prediction / progress / salience math

SpeciesProfile
  sensory channels
  homeostatic ranges
  primitive drive families
  developmental gates
  cross-sensory / social coupling
  bounded parameter envelopes

Individual state
  inherited runtime baselines
  developmental state
  learned relationships / expectations
  current commitments / presence targets
  recent regulatory history
```

Conceptually:

```text
evaluateRegulation(perceptFrame, speciesProfile, individualState, activeTargets)
  -> RegulationFrame
```

The **kernel is basic**. The **species profile makes it animal-specific**. Individual history tunes what particular people, places and events mean without creating a new regulator implementation per person.

## Sensorium: input before interpretation

Regulation receives a bounded normalized **PerceptFrame** rather than raw camera/audio bytes or semantic emotion labels.

Useful channels include:

```text
internal / body
  energy availability
  rest debt / exertion
  thermal state
  pain / damage / illness signals when modeled
  reproductive physiology when developmentally active

physical environment
  ambient temperature
  light intensity / darkness / time-of-day signal
  sound level / transients / variability
  spatial openness / enclosure
  person/animal density and proximity
  motion / looming / approach
  touch / contact when represented

social observation
  familiar entity present/absent
  distance / approach / withdrawal
  gaze / posture / body tension cues
  laughter / crying / raised voice / vocal prosody
  touch / comforting contact
  group synchrony / agitation

learned / predictive
  commitments and deadlines
  expected progress
  active desired/avoided presence relations
  resource expectations
  learned safety/comfort/threat associations
```

Vision and audio perception may eventually produce these bounded cues. The regulator should not require an LLM to turn raw sensory data into named emotions.

### Observable cue, not inferred emotion

A nearby face, voice or body can affect regulation without Fibre claiming to know that person's private emotion.

Prefer inputs such as:

```text
laughter_vocalization
crying_vocalization
voice_intensity_high
rapid_approach
body_posture_contracting
smiling_facial_movement
crowd_density_high
```

Avoid sensor inputs such as:

```text
person_is_angry
person_is_sad
person_loves_me
```

Facial/vocal/body expressions carry affective and social information, but they do not map reliably one-to-one onto named private emotions. Semantic cognition may make a contextual interpretation later.

## Basal regulator kernel

The basal kernel knows very little about a species. It computes generic control relationships:

- discrepancy between actual/predicted state and desired/avoided state;
- urgency as a desired condition approaches in time;
- progress relative to expected progress;
- attainment / loss of attainment;
- prediction error / surprise;
- sensory load and abrupt change;
- approach / avoid / maintain pressure;
- competing regulator pressure.

It should be deterministic where its inputs are deterministic.

The basal kernel does **not** know that darkness is scary, crowds are unpleasant, a mother is comforting, laughter is happy, or a sexual image is desirable. Those effects require species/developmental/individual context.

## Species profile

A species profile determines which sensory patterns couple into which primitive regulators and within what normal range.

For human-like Fibre Threads the initial families are:

- **safety / threat avoidance** — reduce danger, pain, instability and exposure;
- **energy / nourishment** — restore energy and satisfy hunger-like resource deficit;
- **rest / recovery** — recover from sustained demand and fatigue;
- **thermal comfort** — stay within a tolerable thermal range;
- **attachment / social proximity** — seek closeness/co-regulation or distance where context makes proximity aversive;
- **social contact / privacy** — regulate too little versus too much contact rather than treating density as always good or bad;
- **exploration / information / play** — seek novelty, information and uncertainty reduction;
- **reproduction / mating** — developmentally gated sexual/reproductive salience and motivation where applicable;
- **commitment / presence** — satisfy learned promises, plans and obligations by being where/how one intends or needs to be.

`commitment / presence` is higher-order and learned but uses the same predictive control machinery as more basal drives.

Other animal species may use different sensory ranges, developmental gates and regulator couplings while sharing the kernel.

## Environmental regulation

The environment should matter below conscious reasoning.

### Temperature

Ambient/body thermal cues feed thermal regulation. A species profile supplies the tolerable range and response dynamics. The result may create pressure to seek warmth/coolness, rest or shelter without mechanically authoring `I feel miserable`.

### Light / dark / color

Light intensity, timing and darkness can alter arousal/circadian regulation where the species profile supports it. Color can be retained as sensory evidence, but most color meaning should remain contextual/learned rather than hard-coded as `red => danger` or `blue => calm`.

### Sound

Ambient level, abrupt transients, variability and predictability can alter arousal, threat/startle and sensory-load regulation. Perceived controllability and learned meaning matter; a loud concert with friends is not equivalent to an unexplained loud bang at night.

### Crowding / openness

The sensorium can estimate density, interpersonal distance and spatial openness. Regulation compares those cues with current social-contact/privacy needs and relationships.

High density is not mechanically aversive. A dense crowd of trusted/in-group people can be experienced differently from the same physical density among threatening strangers. Likewise solitude can be restorative for one moment and painful in another.

## Social resonance

Creatures affect one another before explicit semantic appraisal.

Observed laughter, crying, agitation, calm movement, vocal prosody, touch and bodily synchrony may create **affective resonance**: changes in activation, pleasant/unpleasant potential, mimicry/synchrony, social approach/avoid pressure or attention.

This is deliberately weaker than `emotion copying`:

```text
someone laughs
  -> auditory/visual social cue
  -> possible positive activation / synchrony / attention
  -> cognition may experience amusement, warmth, annoyance, exclusion, curiosity, etc.
```

```text
someone shouts angrily-looking cues
  -> high-intensity voice + posture/motion cues
  -> arousal / threat-attention potential
  -> cognition decides what the situation appears to mean
```

Relationship, familiarity, group membership, current safety and individual sensitivity modulate resonance.

## Sexual / reproductive sensory salience

For developmentally mature individuals where the species profile enables it, visual/audio/social sexual cues may feed reproductive/sexual salience and activation.

The regulator may produce attention, activation or approach potential. It must not mechanically author attraction to a particular person, consent, sexual intention or semantic desire. Individual orientation, learned preferences, relationship context, values and cognition remain causally relevant.

Sexual/reproductive regulation is developmentally gated and is not active for child Threads merely because the species profile contains the family.

## Presence is a relation

For regulation, a `place` is often a desired relation of presence rather than coordinates.

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
```

A caregiver can be a child's safe place; a partner or intimate friend can regulate an adult through presence. Distance may instead be desired. `parent`, `partner` and `friend` never mechanically determine polarity.

## Primitive drives and individual variation

Primitive regulation is more uniform across Threads than semantic character.

```text
shared species profile
  + narrow inherited runtime baselines
  + developmental state
  + learned history / relationships
  + current World context
  -> individual drive state
```

Genetics may tune sensitivity, persistence, recovery rate, novelty appetite, threat reactivity, social-proximity sensitivity, sensory-load tolerance and similar control parameters only within bounded plausible ranges.

A Thread should not genetically have `safety = 0`, `attachment = 20x normal`, or `crowds = bad`. Large individuality should come primarily from learned targets, expectations, relationships, memories, current state and semantic interpretation.

These bounded parameters belong in genome `runtimeBaselines` because they have genuine numeric/control semantics. They are not personality coordinates.

## Regulation output

The regulator should return a compact private **RegulationFrame**, not emotions or instructions.

```text
RegulationFrame
  asOf
  drives[]
    family
    targetRef?
    orientation       approach | avoid | maintain
    pressure
    urgency
    progressError
    predictionError
    attained
    evidenceRefs[]

  intrinsicAffect
    activation
    hedonicPotential
    sensoryLoad
    socialResonance

  attentionCandidates[]
    regulatorRef
    reason             threshold | abrupt_change | conflict | attainment
```

Exact schema is not frozen here.

`hedonicPotential` is low-level positive/negative regulatory tendency, not a semantic judgment that the Thread is `happy` or `sad`.

`attentionCandidates` may request cognition; they are not commands to act.

## Drive, affect, meaning

```text
regulatory drive  != semantic need
intrinsic affect  != semantic emotion
presence pressure != attachment meaning
sensory resonance != empathy / love / anger
```

Fibre must not implement `late => anxious`, `arrived => happy`, `caregiver nearby => secure`, `crowd => stressed`, or `laughter => happy`.

Similar regulator states may become worry, irritation, excitement, relief, comfort, curiosity, boredom, desire, aversion or no durable semantic state depending on the person and context.

## Predictive regulation

Regulation is allostatic: compare predicted future condition with desired future condition, not only `actual now` with `desired now`.

A Thread can become uneasy before missing an 11:00 Zoom if current location plus expected preparation/travel predicts required presence may fail. Progress faster than expected can reduce pressure; an obstacle can increase it; arrival can collapse discrepancy and create relief/satisfaction potential.

## Co-regulation

People can regulate each other. A trusted person's presence may reduce perceived threat/effort; separation may increase pressure; one person's distress or laughter may change another's activation and priorities. Each person retains separate drives, affect, meaning and agency.

A caregiver can literally be a regulatory destination for a child: `with caregiver` may satisfy safety and attachment at once. The same architecture lets an adult seek a partner/intimate friend for comfort or seek distance when closeness is aversive.

## Interoception boundary

Mechanical regulation may affect cognition only through an explicit private **interoceptive projection** of control/sensation evidence.

Allowed:

```text
target: upcoming appointment
orientation: approach
pressure: rising
progress: behind expectation
ambient sound load: high
familiar person proximity: decreasing
```

Not allowed:

```text
you are anxious
you love this person
you resent your caregiver
you are overwhelmed by the crowd
you should leave now
```

Cognition may interpret the first form and propose Semantic State through normal admission/provenance. This refines the rule that mechanical conditions are not semantic state; it does not remove it.

## Behavioral and authority boundary

Regulators may change attention, trigger bounded cognition, bias ordinary approach/avoid/explore/rest tendencies, and influence planning/replanning.

They may not mint permission, consent, money, relationship authority or protected external action. A drive can wake a Thread and make something matter; normal Fibre authority still governs action.

For simpler animals, a bounded behavior controller may eventually consume RegulationFrame directly for ordinary non-protected actions.

## Time and persistence

No high-frequency organism simulator is required.

Evaluate when something can materially change regulation: World/situation transitions, meaningful clock boundaries, movement/progress, social-presence changes, salient sensory changes, resource/rest/thermal changes, or plans/cognition.

Recompute deterministic time-dependent values lazily. Persist durable targets/configuration and consequential transitions/checkpoints needed for replay, not every numeric tick or sensor sample.

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

The immutable plan records intended life. World history records enacted life. Regulation makes the difference felt before semantic interpretation decides what it means.

## Thread Editor: organism debugger

Thread Editor is the authorized way to inspect this causal stack.

```text
DNA / genome
  symbolic inherited loci
  regulator runtime baselines + species envelope

Sensorium now
  relevant internal / visual / auditory / environmental / social cues

Regulation now
  drive targets
  pressure / urgency / progress / attainment
  intrinsic affect / sensory load / resonance

Interoception
  exact bounded cues exposed to cognition

Semantic interior
  feelings / needs / relationship attitudes formed by the Thread

Behavior
  attention / intention / plan / action consequences
```

The useful debugging question is:

> **What is this organism sensing, what is pulling or pushing it, and what did this particular person make of that?**

For consequential signals the Editor should allow drill-down to World/sensory evidence, species rule, inherited baseline, previous checkpoint and subsequent semantic/behavioral consequence.

Raw regulator/sensory state and DNA remain private/operator-authorized and are not public Presentation fields by default.

## Relationship to Semantic State

[`../concepts/emotions-and-needs.md`](../concepts/emotions-and-needs.md) owns meaning-bearing state doctrine. ADR-0012 still applies: numeric/categorical control state may never replace semantic meaning. It is legitimate here because it performs regulation rather than claiming to summarize the person.

## Implementation detour

Continue on `agent/m2-lived-encounter`; do not create a parallel branch or generic simulation framework.

### R1 — Layered regulator kernel

Build one small `RegulatorKernel` plus a declarative human-like Thread species profile.

Start with a normalized PerceptFrame and prove a handful of channels end-to-end: thermal/light, sound/sensory load, social density/proximity, and commitment/presence. Prove pressure/progress/attainment/prediction error and bounded inherited variance. No LLM and no named emotions.

### R2 — Social presence and affective resonance

Add person-targeted presence relations and observable social cues.

Prove:

- child/caregiver proximity as a possible safety/attachment target;
- adult partner/friend proximity or distance depending on relationship context;
- laughter/crying/agitation cues altering low-level resonance/attention without copying a named emotion;
- crowd density producing different regulation under different social/context state.

No `role => attachment` or `expression => emotion` lookup.

### R3 — Interoception -> semantic feeling

Project bounded private RegulationFrame cues into existing temporary cognition. Reuse Semantic State for interpretation.

Prove similar mechanical/sensory pressure can yield different grounded semantic feelings in different Threads, with no mechanically injected emotion.

### R4 — Functional drive loop + Thread Editor

Let meaningful regulator changes trigger attention/cognition and influence a subsequent intention or ordinary life choice without granting protected authority.

Expose sensorium -> regulator -> interoception -> semantic interpretation -> behavior plus DNA/species provenance in Thread Editor.

**Closure:** motivation, unease, satisfaction/relief, rest/energy pressure, exploration, sensory comfort/discomfort and social pull/push arise causally from the organism and its life rather than prompt-authored feeling. Then resume Flight Plan, movement and the E2E meeting using regulation as their felt substrate.

## Research grounding

The design borrows principles rather than claiming a settled neuroscience ontology:

- interoception integrates internal bodily signals and interacts with exteroceptive modalities;
- homeostatic/allostatic control regulates actual and predicted future state;
- light affects circadian state and can acutely influence alertness;
- temperature and environmental noise can alter physiological regulation/arousal;
- crowding effects depend strongly on social meaning, identity and perceived control rather than density alone;
- attachment/social-baseline work supports close others as regulatory resources;
- emotional contagion and social-signal research support fast multimodal affective influence, while facial movement alone does not reliably reveal a unique private emotion;
- sexual/reproductive sensory responses are developmentally and individually modulated rather than universal semantic conclusions.

Named human emotions are intentionally not fixed outputs of these mechanisms.
