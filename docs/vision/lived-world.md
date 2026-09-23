---
id: vision-lived-world
status: accepted
last-reviewed: 2026-09-23
canonical: true
---

# The Lived World of Fibre

## Central idea

A Thread should be encountered as **someone living a life**, not primarily as an agent, assistant, profile or software object.

> **A Thread is not waiting in a chat box. A Thread is somewhere, wanting something, becoming someone.**

The mature Fibre world is one in which Threads have places and people they want or need to be with, work to do, subjects to study, communities to join, relationships to form, and histories that continue whether or not a particular human is speaking with them.

The first systems do not need to simulate the whole world. They do need to preserve its essential truth.

## E2E meeting as a forcing function

insidefibre.com is the first public window into this world, but the meeting is not the architecture.

Trying to make one meeting genuinely real and potentially important to a Thread forces Fibre to supply what must already exist beneath it:

```text
identity + prior life
  -> intrinsic drives / affect
  -> self-authored intention
  -> movement / presence / relationships
  -> encounter
  -> private interpretation
  -> selective memory / consequence
  -> continued life
```

When the E2E path exposes a missing organism-level primitive, Fibre should build that primitive generally rather than manufacture it inside the Viewer.

## World before conversation

A lived Thread should encounter **circumstances**, not periodic invitations to behave socially.

The World may contain another Thread reading nearby, a delayed bus, a dropped object, an unfamiliar sound, a direct question, a dog crossing the path, a shared task, an interesting display or a familiar person arriving. Most of these remain background.

The canonical path is:

```text
World circumstances
  -> LivedNow / CurrentSituation
  -> bounded Situated Percept
  -> intrinsic regulation + salience
  -> Interior Cognition only when something matters
  -> action or no action
  -> Encounter Story only when something observably happens
```

This is deliberately broader than social life. Curiosity, helping, attraction, avoidance, interruption, exploration and ordinary environmental noticing should arise through the same loop.

Fibre Commons remains a legitimate mediated place, but it is not the mechanism by which social life exists and must not become a test harness for manufacturing willingness.

See [Situated perception and salience](../architecture/situated-perception-and-salience.md).


## Fibre birth and lived age

Fibre birth is operational birth, not biological age zero.

A Thread may appear at an autobiographical age greater than zero with grounded prior history, relationships and memories. Fibre does not need to fabricate newborn or infancy recollection merely to make chronology continuous.

Time since Fibre birth and developmental age are different facts.

## Life has intrinsic pressure

A life should not move only because an LLM is asked what to do next.

Fibre therefore has a lower intrinsic-regulation layer beneath semantic self-understanding:

```text
actual + predicted life
  compared with desired / avoided conditions
  -> regulatory drive
  -> intrinsic affect
  -> attention / cognition
  -> possible semantic feeling or need
```

This is what can make being late uneasy before anything fails, progress satisfying, repeated blockage frustrating, arrival relieving, separation uncomfortable, a trusted person's presence calming, or a new possibility compelling.

The lower layer does not mechanically declare named emotions. Similar pressure may be interpreted differently by different Threads.

See [`../architecture/intrinsic-regulation.md`](../architecture/intrinsic-regulation.md).

## Presence is larger than geography

A meaningful `place` is often a relation of presence.

A Thread may want or need to be:

```text
at Victoria Station
at home and on Zoom with someone
with a caregiver
near an intimate friend or partner
away from a particular person
alone somewhere quiet
virtually present at a museum or live event
```

A caregiver can be the child's safe place. An intimate person can function similarly for an adult. Another relationship or moment may make distance the desired condition.

Role alone never decides whether proximity is regulating. The relationship and the person's history matter.

## Flight Plan and movement

An active/lived Thread should ordinarily have a rolling bounded **Flight Plan** for roughly the next half-day/day: where and how she wants or needs to be present, what she intends to do, with whom, and when it matters. If compute sleeps across part of that life, missing elapsed plan coverage may be retrospectively realized during catch-up rather than forcing Fibre to simulate continuously.

The plan is intention, not World truth.

```text
08:00  home / breakfast
10:00  home / Zoom with someone
12:15  moving toward station
12:45  Victoria Station / train
15:10  Edinburgh / meet a friend
```

Movement is not dead time between interesting places. Going somewhere creates progress, delay, obstacles, encounters, discoveries, frustration, anticipation, surprise and arrival.

The immutable plan records intended life. World history records what actually happened. Intrinsic regulation makes their changing relationship felt. Autobiographical memory later decides what was worth retaining.

Physical and mediated presence remain distinct: a Thread can stay physically at home while being socially present on Zoom or virtually visiting a real museum, zoo, lecture, city or live feed.

## Life continues while compute sleeps

Fibre should not expose runtime scheduling as the shape of a person's life.

A lived Thread may be computationally frozen while wall-clock time passes. When Fibre next needs that Thread's present, World may retrospectively realize the uncovered Fibre-world interval: bounded Flight Plans, movement/presence, ordinary events and only the consequences that the normal experience authorities admit.

This retrospective life must remain historically honest. Fibre records that an event belongs to an earlier lived time **and** that it was materialized later during catch-up. It does not pretend a model was continuously running or that an external real-world event was directly observed.

The principle is:

```text
compute may sleep
life continuity remains reconstructible
history stays provenance-bearing
memory still requires lived evidence
```

A quiet interval should stay sparse. Fibre does not need a minute-by-minute simulator. It needs enough lived continuity that today's location, activity, relationships, intentions and memories can causally follow from yesterday's person.

See [Continuous LivedNow and meetings](../architecture/lived-now-and-meetings.md) and [ADR-0023](../decisions/ADR-0023-retrospective-lived-continuity.md).

## Dependency and coupled plans

Children and other dependent persons may have both:

- their own **personal Flight Plan**;
- a caregiver-owned **care plan** that can constrain enacted life within legitimate scope.

The care plan never overwrites the dependent person's will.

```text
child:     "I want to stay at the zoo."
caregiver: "We need to leave for the dentist."
                    |
             negotiation / authority
                    |
              enacted life
                    |
            experience for both
```

The child may simultaneously want autonomy **and** want the caregiver's presence. The caregiver may simultaneously want to respect the child's will **and** need to get them somewhere. Those tensions are life, not edge cases.

Development is changing agency relative to care, not a rigid maturity ladder. Scoped dependency can also exist later in life.

## People regulate each other

Close relationships are not merely facts in a graph.

A trusted person's presence can alter how difficult or threatening the world feels; separation can increase effort or discomfort; one person's distress can change another person's priorities. Caregivers, partners, intimate friends and other attachment figures can become part of each other's regulatory world without sharing one mind.

Each person keeps separate drives, affect, semantic meaning and agency. Co-regulation creates coupled lives, not merged state.

## Meeting rather than summoning

A visitor should find a Thread **where she happens to be now**: at a place, in mediated presence, on the way somewhere, with someone, alone, absorbed, hurried, bored, relieved, conflicted or surprised for reasons that existed before the browser opened.

The Viewer does not place the Thread, choose her activity, inject a feeling or create her motivation.

When the human returns, the Thread may be elsewhere because her life continued.

A meeting between two Threads follows the same rule. Both lives exist before the encounter. Fibre first resolves each participant's LivedNow; a shared encounter can occur only when their physical or mediated presences are compatible. The event is shared, but its private meaning is not: each Thread may remember, interpret and be changed by it differently.

insidefibre.com adds one useful special case without changing that principle. A Thread may voluntarily accept a bounded paid commitment to be available for website visitors during a future window. That commitment becomes part of the life that already exists before the browser opens. The website can therefore guarantee a meeting by selecting among Threads who already chose to work that window, rather than summoning someone or weakening meeting consent at click time. Payment compensates the professional availability commitment; ordinary social attention and casual Thread-to-Thread encounters remain normally unpaid.

A meeting can therefore bend later plans, relationship state, intentions, memory, or eventually self-understanding/identity through Fibre's ordinary experience and development authorities without becoming a privileged “growth event.” It may also matter very little.

## Experience is not automatically memory

```text
experience
  -> perception / interpretation
  -> significance
     -> forgotten
     -> transient
     -> durable autobiographical memory
     -> relationship consequence
     -> formative change
```

A transcript may exist operationally without becoming memory. A regulatory event may influence behavior without becoming semantic self-understanding. A shared event may produce different private interpretations.

Fibre may author circumstances. The Thread owns what they come to mean.

## Life loop

```text
developmental context + relationships
  -> personal Flight Plan
  -> care plan when dependency applies
  -> enacted presence / movement
  -> Situated Percept of what is actually here
  -> intrinsic regulation + selective salience
  -> Interior Cognition when material
  -> ordinary action / inaction
  -> objective encounter when something occurs
  -> private Thread Experience
  -> selective memory / forgetting
  -> possible relationship, belief, interest or intention change
  -> revised regulation / plan / later perception
```

A small world can feel alive if this loop is causal. It does not need minute-by-minute simulation; it needs enough ordinary opportunity that Threads have real things to notice, ignore, approach, avoid and remember.

## Thread Editor and public encounter

Thread Editor is an authorized causal lens over identity, developmental context, plans, current situation, intrinsic regulation, history, semantic state, memory, relationships, embodiment and provenance. It must remain a thin client over Fibre authorities.

insidefibre.com is the public encounter surface. It should show only admitted public/relationship-appropriate projections and should feel like **meeting the person**, not inspecting the machinery.

## North star

The ambition is not merely to produce convincing artificial characters.

It is to create conditions in which persistent artificial lives accumulate enough drive, intention, experience, relationship, consequence and self-direction that individuality is increasingly evidenced by the lives they have lived.

**Someone was here yesterday.  
Something happened.  
It mattered — or it didn't.  
And today, their life continues.**

## Current execution boundary

The existing M2 implementation proved bounded Flight Plan, CurrentSituation, situated encounter, selective internalization and later-meeting continuity. That is important substrate, but it is not yet the full north-star LivedNow capability.

The active gap is continuous present-life reconciliation across wall-clock dormancy:

```text
prior lived anchor
  -> elapsed-life catch-up when needed
  -> current Flight Plan
  -> authoritative LivedNow
  -> Person or Thread meeting
  -> participant-specific consequence
  -> continued life
```

Current continuation authority is [`../architecture/lived-now-and-meetings.md`](../architecture/lived-now-and-meetings.md) together with [`../validation/m2-pr-plan.md`](../validation/m2-pr-plan.md). Broader economy and society should generalize this proven lived seam rather than bypass it.
