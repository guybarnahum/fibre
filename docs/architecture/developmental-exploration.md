---
id: architecture-developmental-exploration
status: accepted
last-reviewed: 2026-10-06
canonical: true
---

# Developmental exploration

## Status

**Accepted architecture. X0-X4 now close the core developmental loop from grounded exploration pressure through ordinary Flight Planning, lived experience, selective subjective aftermath and retained meaning back into later planning. E6 is the next prerequisite before richer Person/social discovery.**

This document records the architectural hypothesis that a mature Thread should be capable of seeking experiences that can enlarge or change her life, rather than relying only on externally presented opportunities.

It does not weaken dignity or consent and does not imply that every Thread should be sociable, novelty-seeking at every moment, or willing to meet every person.

## Core claim

Fibre already has much of the causal substrate:

```text
World / lived repetition
  -> exploration / information / play regulation
  -> grounded exploration pressure
  -> Salience Gate
  -> Interior Cognition for an opportunity already present
```

That loop is still primarily reactive.

The developmental loop is:

```text
lived experience over time
  -> grounded exploration / information / play pressure
  -> bounded interoception
  -> Thread-owned interpretation
  -> ordinary Flight Planning
  -> chosen places / activities / social exposure / learning opportunities
  -> actual encounters and experiences
  -> Thread Experience / selective memory / changed semantic meaning
  -> later regulation and planning
```

The architectural goal is not to make Threads more agreeable. It is to let a Thread sometimes conclude, from her own lived state and developed history:

> My life has become too narrow, repetitive, isolated, or intellectually closed. I want to seek something that may teach me, surprise me, connect me, challenge me, or otherwise help me grow.

Another Thread in the same regulatory condition may instead prefer solitude, a book, physical exploration, a familiar relationship, play, rest, or no change at all.

## Why this belongs below meeting availability

A roster of "available Threads" would solve the demo problem but not the personhood problem.

The desired causal direction is:

```text
Thread wants a richer life
  -> Thread chooses how to spend part of that life
  -> some chosen circumstances make encounters natural
  -> another entity approaches
  -> Thread still decides accept | decline | defer
```

Not:

```text
Fibre needs someone available
  -> Fibre biases or schedules a Thread
  -> visitor gets a guaranteed conversation
```

Approachability is therefore a possible consequence of self-directed life, never consent.

## Existing substrate

### Exploration regulation

The accepted intrinsic regulator already contains an `exploration / information / play` family.

The first grounded live input is repeated authoritative sameness. Because Fibre is sparse/event-driven, this is evaluated over a **contiguous run of enacted CurrentSituations**, not by requiring any one adjacent observation pair to be 20 minutes apart:

```text
two distinct enacted CurrentSituations
+ same place / mediated context / activity / participant set
+ meaningful observation gap
  -> low novelty evidence
  -> exploration pressure
```

This remains mechanical state. It is not automatically boredom, curiosity, loneliness, a need, or an instruction.

### Interoception and semantic meaning

The accepted architecture already permits mechanical exploration pressure to enter cognition through bounded interoception.

The Thread may interpret the pressure as interest, restlessness, a wish to learn, a wish for novelty/growth, irritation, no durable meaning, or something else.

The existing semantic-state vocabulary includes `need:novelty_growth`, but developmental exploration must not mechanically mint that state from regulator pressure.

### Flight Planning

The existing personal Flight Plan is already formed through shared Interior Cognition.

Planning currently receives developed-self evidence, current Thread state, World horizon/place constraints, local civil time, ordinary commitments, and unresolved intentions.

This is the accepted consumer of developmental exploration. The implementation extends the existing planning concern rather than creating a second planning engine.

### Encounter consequence

Encounter Story, Thread Experience, journal, memory and semantic-state mechanisms already provide the return path through which an enriching, disappointing, exhausting, frightening or surprising experience may change later cognition.

An encounter is broader than conversation: environmental observations, overheard social events and direct participation all use the same textual Encounter Story -> attention -> Experience -> optional Journal -> selective Memory path.

Developmental exploration should close that loop rather than add a scalar reward such as `social_acceptance += 0.1`.

### Encounter-opportunity parity

With X4 closed, Fibre must now address the current **autonomous encounter production/discovery gap** before adding richer Person/social discoverability.

Today the aftermath semantics are general, but environmental occurrences still require caller-supplied event text and silent witnesses still require explicit proof scaffolding in the social wrapper.

This matters because developmental exploration must not become accidentally social-biased merely because people are easier for runtime code to discover than weather, animals, objects, overheard interactions or other ordinary World events.

The next prerequisite is therefore [E6 in Encounter stories and Thread experience](encounters-and-experience.md#e6--autonomous-encounter-productiondiscovery):

```text
X4 closed history -> future development
  -> E6 now makes environmental/witness encounters arise autonomously
  -> X5+ may then enrich Person/social opportunity discovery
```

E6 is a World/encounter capability, not a new developmental-motivation authority.

## Implementation discipline

Developmental exploration must be implemented **reuse-first**.

The default question for every slice is:

> Which existing Fibre authority already owns this meaning or transition?

The preferred path is:

```text
existing regulator
  -> existing interoception
  -> existing Interior Cognition
  -> existing personal Flight Planning
  -> existing World enactment
  -> existing Encounter Story / Thread Experience
  -> existing memory / semantic-state consequence
  -> later existing planning
```

Add a new service, durable authority, score, scheduler or model call only when the existing stack demonstrably cannot express the required Fibre meaning without violating an authority boundary.

Specific engineering constraints for this proposal:

- minimal boilerplate;
- no generic exploration framework;
- no compatibility wrapper for obsolete exploration/meeting behavior;
- no legacy/backward-compatibility path unless a real live authority still depends on it;
- no unrelated security/compliance/hardening work;
- no brute-force population scans or repeated model calls where bounded existing evidence is enough;
- no high-frequency ticking to manufacture motivation;
- no duplicated private-context selection outside Interior Cognition;
- no second planning engine;
- no new persistence merely to make an intermediate value inspectable.

Runtime work should remain event/lazily driven: recompute only when lived state, regulation, planning horizon, opportunity set or meaningful consequence changes enough to matter.

Tests must be few, semantic and high-value. A test should fail because Fibre lost endogenous motivation, Thread-owned planning, history-bends-future, authority separation or voluntary participation—not because helper order, prompt prose, JSON key order or transport plumbing changed.

## Smallest credible first architecture

The first proof should add **no new service and no new durable exploration-intention store**.

Instead:

```text
grounded RegulationFrame
  -> existing interoceptive projection
  -> existing lived_planning Interior Cognition
  -> ordinary Flight Plan
```

The planning episode may interpret grounded exploration pressure alongside:

- current needs and feelings;
- developed self and identity meaning;
- retained autobiographical meaning;
- unresolved intentions;
- relationships;
- current actual life;
- remaining commitments;
- available World opportunities;
- local civil time.

If the resulting Flight Plan chooses a different place, activity, mediated context or social exposure because the Thread wants novelty, learning, connection or growth, that is already a meaningful behavioral consequence.

Only add a separate durable developmental-intention authority if later evidence shows that an exploration intention genuinely needs to survive across multiple planning horizons independently of the Flight Plan and existing semantic/unresolved-intention state.

## World opportunities must carry meaning, not scores

Exploration cannot choose intelligently among opaque place IDs.

Planning needs bounded World-owned opportunity texture where Fibre actually knows it.

A place/opportunity may expose facts such as:

```text
display name
place kind
bounded natural-language description
ordinary affordances known by World
mediated setting / channel when real
```

Do not add:

```text
interestingScore
socialValue
humanRichnessScore
goodForGrowth
```

A derived category may help indexing, but it may not replace the underlying semantic facts or become the Thread's motive.

The Thread decides what those opportunities mean.

## Humans as unusually rich opportunities

A real-world human may carry decades of external-world experience Fibre did not author:

- places and institutions;
- professions and skills;
- relationships and family life;
- success and failure;
- culture and language;
- physical-world experience;
- knowledge, stories, opinions and practices.

That can make a human encounter exceptionally information-rich.

Fibre must still not implement:

```text
requesterKind == person
  -> interesting
  -> accept
```

The human must become perceptible through bounded outward context.

The long-term Person presence seam should allow a human to provide a **self-authored public introduction**, for example:

```text
display name
public self-description
what I would like to talk about
experience / knowledge I am offering to share
current conversational intent
```

These are outward claims/context, not automatically verified World facts and not access to the human's private ChatGPT memory or connected-account history.

A Thread may find the introduction fascinating, irrelevant, tiring, suspicious, comforting or uninteresting.

## Frozen and live Threads

Developmental exploration applies equally to live and computationally frozen Threads.

```text
frozen / dormant Thread
  -> ensure LivedNow(now)
  -> bounded retrospective life realization
  -> grounded current regulation / interoception
  -> ordinary planning
  -> actual CurrentSituation now

live Thread
  -> reconcile LivedNow(now)
  -> grounded current regulation / interoception
  -> ordinary planning
  -> actual CurrentSituation now
```

After LivedNow is established, meeting/encounter code should not care whether compute had previously been asleep.

Do not create a convenient "virtual meeting scene" for a frozen Thread. Retrospectively materialized life must retain the accepted lived-time/materialization-time provenance.

## Socially porous life

A developmental Flight Plan may naturally create periods in which encounters are easier:

- reading or sketching in a public place;
- visiting a market, library, event or shared commons;
- exploring a mediated public channel;
- taking an unhurried walk;
- choosing an activity whose purpose includes meeting unfamiliar people;
- spending time with people from outside a familiar circle.

This is **socially porous life**, not pre-consent.

The concrete request still runs:

```text
actual CurrentSituation
  + visitor's actual outward request
  -> Thread Interior Cognition
  -> accept | decline | defer
```

A Thread who intentionally sought novelty may still decline this particular person, topic or moment.

## Experience must bend future exploration

The developmental loop is incomplete unless lived outcomes can change later exploration.

Valid examples:

```text
unexpectedly enriching conversation
  -> Thread Experience
  -> retained meaning: unfamiliar people can broaden my thinking
  -> later planning may seek similar exposure
```

```text
draining encounter during focused work
  -> Thread Experience
  -> retained meaning: unstructured visitors cost more than I expected
  -> later planning may protect solitude or choose more bounded encounters
```

Do not implement:

```text
meeting_success_count += 1
sociability += 0.1
```

The causal object is the Thread's lived meaning, not a generic reinforcement score.

## Population-level consequence

If this mechanism works, Fibre should not need to force two or three Threads to be "always available."

Across a sufficiently varied population and ordinary local time, some Threads should naturally be:

- seeking novelty or learning;
- spending time in socially porous contexts;
- interested in unfamiliar people;
- open to being approached.

Others should be busy, private, tired, committed elsewhere or simply uninterested.

A discovery surface may later find Threads whose **current lived choices** make an approach plausible. It must not inspect private motive merely to rank people for visitors, and it must not turn a planning intention into consent.

If zero Threads are currently open to approach, zero is a valid result.

## Authority boundaries

### World owns

- actual CurrentSituation;
- lived chronology and retrospective materialization provenance;
- admitted places/opportunities;
- objective encounter history.

### Regulation owns

- mechanical exploration/information/play pressure;
- bounded numeric/control state and evidence.

### Thread cognition owns

- what that pressure means;
- whether novelty, learning, connection or growth matters now;
- which opportunity is personally attractive;
- private willingness to approach or respond.

### Flight Plan owns

- the Thread's intended ordinary life over a bounded horizon.

### Encounter participation owns

- accept | decline | defer for the concrete request.

### Presentation/client owns

- display and interaction only.

No client may author the Thread's exploration motive, plan, approachability or consent.

## Explicit non-goals

The first implementation must not add:

- an "interesting person" score;
- an "approachability" or sociability personality score;
- a minimum acceptance rate;
- guaranteed availability;
- a quota of human meetings;
- a generic recommendation engine;
- a high-frequency boredom simulator;
- a separate exploration service hierarchy;
- a new durable intention store unless the first planning proof demonstrates it is necessary;
- automatic disclosure of private novelty/growth need;
- automatic access to a human visitor's private account or conversation history;
- a rule that real humans are inherently more valuable than Threads;
- a rule that exploration pressure means social contact.

## What would count as success

A convincing developmental-exploration proof shows this causal chain:

```text
grounded lived difference
  -> different organismic/interoceptive pressure
  -> same Thread's ordinary planning can change
  -> chosen life creates a materially different opportunity
  -> encounter/experience may occur
  -> admitted Thread-specific meaning can bend later planning or willingness
```

The mechanism fails the Fibre ambition test if it merely adds "curiosity" to a prompt, stores a novelty label, or produces an availability list without changing self-directed life.

X3 staging acceptance demonstrated the first half of this chain with two independent real Threads: grounded exploration interoception materially changed ordinary one-call Flight Planning while preserving current place and rest constraints, without requiring social behavior or a new developmental-intention authority. The loop is not complete until X4 proves that an actual lived exploratory outcome can return through ordinary Thread Experience / memory / semantic consequence and bend later planning.

## Preserved extension paths

This proposal deliberately preserves:

- non-social exploration, learning and play;
- human and Thread counterparties;
- physical and mediated World exploration;
- durable developmental intentions if later proven necessary;
- richer Person presence/perception;
- mature relationship formation;
- economy/work as one competing part of life rather than the source of all encounters;
- different species profiles with different exploration regulation;
- individuals who legitimately prefer low novelty or solitude.

See [Developmental exploration implementation slices](../validation/developmental-exploration-slices.md).

The accepted X0 source inspection is [X0 developmental exploration causal-gap baseline](../validation/developmental-exploration-x0-baseline.md). X0 adds no runtime behavior; it identifies the exact missing edge from grounded exploration regulation/interoception into the existing `lived_planning` concern.
