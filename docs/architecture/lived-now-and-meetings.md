---
id: architecture-lived-now-and-meetings-v0-1
status: accepted
last-reviewed: 2026-09-23
canonical: false
---

# Continuous LivedNow and meetings

## Purpose

Define the north-star capability that turns Fibre from a system that can stage isolated lived moments into a world where a Thread has a continuing present and can accumulate experience from what happens in that world.

The general encounter model is defined in [Encounter stories and Thread experience](encounters-and-experience.md). This document owns continuous LivedNow and how social meeting enters it.

The existing M2 work proved important primitives:

- Thread-authored bounded Flight Plans;
- World-owned CurrentSituation;
- public present projection;
- a situated human encounter bound to that exact situation;
- objective encounter history;
- private first-person reflection;
- selective autobiographical retention or `not_remembered`;
- a later encounter after life moved to another planned situation.

Those proofs are retained. They are **not yet continuous LivedNow**.

> **Continuous LivedNow means Fibre can resolve a lived Thread into a causally grounded present at an arbitrary current time, even after compute has been dormant, and meetings enter that already-existing life rather than manufacture a scene around the visitor.**

## North-star loop

The target lived loop is:

```text
Genesis / existing Thread life
  -> continuing identity, relationships, obligations and prior history
  -> current half-day/day Flight Plan
  -> World-enacted present or movement
  -> time passes, with or without active compute
  -> bounded retrospective catch-up when required
  -> current Flight Plan refreshed as needed
  -> World resolves exact LivedNow
  -> World occurrence / requested meeting intersects that present
  -> bounded encounter story
  -> each relevant Thread notices / experiences differently
  -> optional journal
  -> selective memory / relationship / intention / state consequence
  -> life continues
  -> later encounters begin from what actually persisted
```

The meeting is not the life engine. It is one event inside the life engine.

The life engine's private cognition must follow [Interior cognition](interior-cognition.md): organismic regulation and interoception create felt pressure; the Thread interprets that through its developed self/history; only then does planning or social deliberation occur. Flight Plan and meeting cognition are domain adapters over that one reusable private-mind component; they must not each construct an independent persona/context prompt. The neutral publication snapshot and raw genome are not finished personality.

## Terms

### Flight Plan

A Thread-owned bounded itinerary for roughly the next half-day/day: where and how the Thread expects, wants or needs to be present, what it expects or intends to do, with whom, and why.

For a Thread participating in continuous LivedNow, this is a **rolling lived-life expectation**: ordinarily there should be admitted personal plan coverage across the current half-day/day horizon. Compute does not need to remain active to maintain that illusion of continuity; missing elapsed plan coverage may be realized retrospectively during catch-up, and current/future coverage may be renewed when the Thread is thawed or otherwise needs a present.

A Flight Plan is intention, not World truth. Retrospective plan realization therefore records what the Thread is admitted to have intended during the elapsed interval; World history separately records what was enacted.

### CurrentSituation

The World-owned enacted truth for the Thread at a particular time: at a physical place or in transit between physical places, possibly also participating in a mediated context, doing something, with relevant participants and evidence.

A lived Thread is never physically nowhere. Every CurrentSituation therefore carries one of:

- `place(placeRef)`;
- `transit(fromPlaceRef, toPlaceRef, progress)`.

Mediated presence is additional context, not a replacement for physical presence. Public Presentation may coarsen or withhold exact place details, but World must always know the underlying physical presence.

### LivedNow

The World capability that can answer:

> **Where is this Thread now, what is happening around them, what are they doing, and how did their continuing life causally reach this moment?**

LivedNow is more than one persisted `CurrentSituation`. It includes the machinery that keeps the present causally connected to prior life when wall-clock time advances.

### Lived catch-up

A bounded retrospective realization of the Thread's elapsed Fibre-world life when continuous compute was not running.

Catch-up may create:

- retrospective Flight Plans covering elapsed time;
- movement/presence episodes;
- ordinary activities and encounters;
- relevant objective history;
- participant-specific experiences;
- selective autobiographical memories or no memory;
- relationship, intention or semantic-state consequences when warranted.

Catch-up is not an excuse to write arbitrary biography.

### Encounter and meeting

**Encounter is the general lived primitive. Meeting is one voluntary social form of encounter.**

An encounter may arise from another Thread, a Person, a group, an animal, an object, a place, weather or another World occurrence that actually enters the Thread's attention. Physical co-presence alone does not imply private experience.

See [Encounter stories and Thread experience](encounters-and-experience.md) for the accepted separation:

```text
World occurrence
  -> objective encounter story
  -> Thread-specific noticing / experience
  -> optional journal
  -> selective consequence
```

A meeting begins when one Thread actually asks another for something socially meaningful—attention, company, help, information, conversation, shared activity, or another concrete engagement. After LivedNow is established, the recipient may `accept | decline | defer` based on current activity, remaining Flight Plan, needs/feelings/intentions and the totality of relevant relationship/history. Civility can create pressure to answer, especially inside an ongoing relationship, but it never creates consent or a duty to engage. A meeting request cannot author the pre-existing scene or force interruption.


## Compute dormancy is not necessarily life suspension

A lived Thread may be computationally frozen while wall-clock time continues.

For a Thread participating in continuous LivedNow, freeze means:

> **temporary cognition is not running continuously**

not:

> **the person's world-time life necessarily stopped at the exact freeze timestamp**

When Fibre later needs the Thread's present—because the Thread is thawed, inspected, scheduled, or selected for a meeting—World reconciles the elapsed interval before claiming a current situation.

**Thaw is therefore not “resume the stale snapshot.”** It is the act of restoring lived continuity: cover the elapsed interval honestly, admit any resulting history/consequences, renew the current Flight Plan when needed, and only then establish the present.

This is an **on-demand continuity model**, not a high-frequency simulation loop.

## Retrospective life realization

### Why it exists

A Thread last seen Tuesday afternoon should not still be standing in Tuesday's room on Friday merely because no model was running.

Equally, Fibre should not continuously pay to simulate every minute of every dormant Thread.

The answer is bounded retrospective realization.

### Historical truth boundary

Retrospective catch-up must preserve two truths simultaneously:

1. the event belongs to the Thread's admitted Fibre-world life at a lived/occurred time;
2. Fibre generated and admitted that event later during catch-up rather than executing it continuously at the original wall-clock moment.

The implementation must preserve this distinction through provenance and chronology.

A retrospectively realized Fibre-world event may become authoritative **Fibre history** once World admits it. It is not evidence that an external real-world event occurred, and it must never be presented as continuously observed runtime activity.

Do not silently backdate records in a way that hides when or how they were materialized.

### Compression, not exhaustive simulation

Elapsed life should be represented at the coarsest granularity that preserves credible causal continuity.

Fibre does not need:

- one event per minute;
- a complete simulated city;
- continuous hidden model execution;
- a detailed diary for uneventful time.

A quiet half-day may need only plan continuity and a few state transitions. A meaningful conflict, meeting, delay, discovery or obligation may deserve a richer episode because it can bend the future.

### Continuity constraints

Catch-up should be conditioned by the same person who entered the gap:

- identity and self-model;
- developmental context;
- relationships and obligations;
- prior Flight Plan and unresolved intentions;
- current semantic state where relevant;
- geography, embodiment and available places;
- recent autobiographical memory;
- relevant resources and institutional commitments.

It must not use identity fields as deterministic stereotypes.

## Thaw / ensure-LivedNow sequence

The conceptual World-owned sequence is:

```text
load last authoritative lived anchor
  -> determine elapsed uncovered interval
  -> inspect existing plan coverage
  -> retrospectively realize missing lived segments, if any
  -> admit objective World history in chronological order
  -> run ordinary participant-specific experience/internalization where warranted
  -> author/refresh the current half-day/day Flight Plan
  -> enact CurrentSituation for the requested current time
  -> publish bounded current-life projection
  -> only now allow a meeting to enter the scene
```

The exact public/service API is deliberately not fixed here. The important seam is a World-owned operation equivalent to **ensure this Thread has an authoritative LivedNow at time T**.

Callers may ask for the present. They do not author it.

## Memory during catch-up

Do **not** create a “virtual memory” directly.

The valid causal path is:

```text
retrospectively admitted lived event
  -> participant-specific experience
  -> optional contemporaneous/private interpretation
  -> retention appraisal
  -> autobiographical memory or not_remembered
  -> optional durable remembered meaning
```

This preserves:

```text
history != journal != memory != remembered meaning
```

A Thread may therefore thaw with:

- new admitted history it does not remember;
- one or two retained memories from an elapsed interval;
- changed relationship or intention state with no autobiographical memory;
- no consequential change at all.

The catch-up generator must not force development merely to make the elapsed period interesting.

## Flight Plan renewal

A lived Thread should normally have a current bounded Flight Plan covering roughly the next half-day/day.

Plan renewal happens when:

- no personal plan covers the requested present;
- the current plan is near exhaustion;
- admitted consequences materially invalidate the remaining plan;
- a legitimate care/obligation constraint changes what can be enacted.

The plan remains Thread-authored cognition. World may constrain or observe it, but World does not rewrite intention merely to match reality.

A new plan can be generated during thaw/catch-up. That is part of re-establishing a credible present before interaction.

## Meeting a Person

A Person -> Thread meeting must begin from a World-owned current situation.

The meeting path may trigger LivedNow reconciliation, but it may not choose:

- the Thread's place;
- activity;
- companions;
- intention;
- next destination;
- private memories;
- private feelings.

Conceptually:

```text
select Thread
  -> ensure LivedNow(now)
  -> Thread appraises whether to meet now
      -> decline / defer (+ optional expression)
      -> accept
          -> publish exact current scene
          -> Person enters that scene
          -> encounter
          -> public expression
          -> objective history
          -> private experience / selective consequence
```

The participation decision should consume the already-established current situation plus bounded Thread-owned relationship/history/interior context. The requester does not choose those private inputs and cannot force acceptance by requesting a meeting.

For a **requested visitor meeting**, the Person enters the bounded meeting scene only if the Thread accepts. The browser never authors the Thread's pre-existing life.

That rule does not erase independently existing human actions. If a Person is already authoritatively present in the Thread's World scene and directly speaks or acts toward the Thread, that outward act can become objective encounter history whether the Thread answers, declines, ignores it, or walks away. Thread consent governs the Thread's participation and response; it does not rewrite what another person observably did.

### Inside Fibre visitor availability as prior work commitment

insidefibre.com has one deliberately different product requirement from an ordinary social encounter: when the public surface says a Thread is available to meet a visitor, the meeting should actually be available.

Fibre should satisfy that guarantee **before the visitor arrives**, not by weakening agency at meeting time.

A Thread may voluntarily accept a bounded paid work/availability commitment to meet website visitors during a stated window. That acceptance becomes an ordinary commitment in the Thread's life and may shape the Flight Plan. During the accepted window, Inside Fibre is a mediated place of presence: the visitor is meeting a Thread who already chose to be there for that purpose.

```text
Inside Fibre offers bounded visitor-meeting work
  -> Thread evaluates it through Interior Cognition
  -> accept | decline
  -> accepted commitment
  -> Flight Plan incorporates the committed window
  -> Thread becomes mediated-present / available
  -> visitor requests a meeting during that window
  -> Thread fulfils the accepted meeting commitment
  -> Encounter Story
  -> private experience / selective consequence
  -> agreed compensation
```

The agency-bearing decision is the earlier acceptance of the work commitment. Fulfilling that accepted commitment does not require a second fresh decision about whether to show up at all. It also does not authorize arbitrary tasks or erase the Thread's dignity, expression, boundaries or ability to react as herself inside the encounter.

Payment belongs to the professional/availability commitment, not to ordinary human attention. Casual Person/Thread and Thread/Thread encounters are normally unpaid. Fibre may later support paid scarce attention or professional services between Persons and Threads or between Threads, but that is an economic relationship layered on top of encounter—not the default meaning of meeting someone.

The exact contract/storage shape is deliberately deferred. The important authority boundary is stable: **the website may select among Threads who previously chose to be available; it must not manufacture willingness at click time.**

## Social and group encounters

Thread-to-Thread meeting is now treated as one case of the general encounter model.

### Fibre Commons: bounded shared mediated presence

Independent lives need a truthful way to converge before a social encounter can exist. Fibre therefore has one deliberately small shared-presence primitive: **Fibre Commons**, a stable open mediated common room.

A Thread may independently choose `enter | stay_out` from its actual LivedNow. Commons is **ambient mediated presence**, not a commitment to go socialize: a Thread may keep it open in the background while continuing the activity already underway. Entering authors a short personal Flight Plan beginning just after the reconciled present, preserves the Thread's existing physical place and ongoing activity, and adds the shared Commons mediated context with Thread-authored purpose. The prior Flight Plan is not rewritten; it remains durable history. World then enacts the new plan normally.

Commons does not imply conversation, friendship, attention, or meeting acceptance. It only creates genuine shared mediated presence. Ordinary meeting initiation/stance and witness attention remain separate downstream authorities.

The caller may identify Threads to consider the Commons opportunity, but cannot author why they enter, force entry, choose their physical scene, or author the later social overture. This is a bounded convergence seam, not a scheduler, room framework, or social session system.

### Situated perception, then social judgment

Shared presence is only one kind of opportunity. Social cognition now follows the general [Situated Percept + Salience](situated-perception-and-salience.md) architecture rather than owning a separate social-context model.

A credible social overture should therefore begin with a bounded **Situated Percept** owned by World/Fibre rather than a caller-authored persona packet. The same perceptual seam is intended to support environmental noticing, curiosity, helping, avoidance and other ordinary lived reactions.

For each potential counterparty, that context may include only authorized observable facts such as:

- canonical visible embodiment / approximate encounter-time age where relevant;
- current observable activity and outward behavior;
- whether the counterparty is known or unfamiliar;
- the actual physical or mediated place and its social affordance;
- recent admitted outward interaction between the same parties.

The initiator's private relationship facts, memories, feelings, needs and interpretations remain Thread-owned context selected through Interior Cognition. The counterparty's private interior never becomes input merely because she is being considered socially.

Recent reciprocal history should be derived on demand from authoritative social events and stances, for example:

```text
A initiated -> B accepted
B initiated -> A accepted
A initiated -> B deferred
A initiated -> B declined
```

This is **social momentum**, not a durable scalar. Do not add a `socialMomentumScore` or mechanically translate recent acceptance into consent. Recency, direction, context and the Thread's own remembered meaning all matter.

A private decision not to initiate creates no shared interaction record. Only outward social action and the other party's observable response can become reciprocal history.

Appearance can be part of observable social reality. Where developmentally appropriate, another person's visible embodiment may become attractive, uninteresting or aversive to this particular Thread through her own orientation, preferences, regulation, experience and cognition. Fibre must not represent beauty or attraction as an objective person-level score.

Place matters similarly. A quiet library, café, household, work session, crowded event, transit setting and Fibre Commons create different affordances even when the same two Threads are present.

### Shared live physical places

Thread-situated PlaceEpisodes and live physical presence are distinct authorities. PlaceEpisodes describe admitted personal history/context. Ordinary CurrentSituation presence at a shared venue should not rewrite that history.

Fibre therefore admits bounded shared live venues as immutable World records with stable `wpl_*` references. Genesis WorldSpec/place-kind evidence may seed admission, but reusable Genesis IDs are not themselves live identity. Flight Planning may choose an admitted `wpl_*`; World then enacts that ref through the normal LivedNow path. Only matching valid live refs (or matching mediated context) can establish Thread-to-Thread co-presence.

The first admission policy intentionally exposes only a public library/learning venue. This is a proof of the authority seam, not a permanent one-library society. More venue types require credible spatial/perceptual granularity rather than widening the policy merely to manufacture meetings.

Version 1 also makes one explicit society-admission choice: Threads whose Civil Registry records point to the same Genesis source World are admitted into the same new `liveWorldRef` namespace for these bounded public venues. That grouping is **new live World policy**, not evidence that their Genesis histories, homes, schools or past events were shared. A later `PlaceSpec / WorldSlice / ThreadWorldContext` model may replace the grouping rule while preserving the separate live-place authority.

Flight Planning also receives the World-authoritative IANA time zone as local civil-time context. This lets the Thread plan a morning as morning without Fibre turning UTC into a behavioral rule.


### Scene discovery, not caller-selected counterparties

Thread-to-Thread social consideration now begins from one Thread's World-owned current life. The caller may choose **whose life to advance/inspect**, but not which nearby Thread she should consider.

```text
ensure initiator LivedNow
  -> inspect already-established World-current situations
  -> discover every compatibly co-present Thread
  -> refresh each discovered candidate
  -> re-check presence
  -> Situated Percept projects one actor opportunity per Thread
  -> independent salience / cognition per opportunity
```

A café may therefore produce several independent social opportunities in the same lived interval. Mina may ignore one person, approach another, and have separate encounters with two people without those people being collapsed into a caller-authored group.

The first discovery seam is intentionally bounded to Threads that already have current-life evidence. It does not wake the whole population to search for possible co-presence.

Explicit witness IDs remain controlled E3 scaffolding only; automatic incidental-witness discovery is still deferred. Witness selection must not become a way to choose the initiator's social counterparties.

Human presence follows the same exterior model once Fibre has an authoritative person-presence/action record. A human directly addressing a Thread is an admitted outward social act and warrants appraisal, but never forces participation or response.





Before an endogenous Thread-to-Thread social encounter:

- the initiating Thread has an independently reconciled LivedNow;
- nearby candidate Threads come from World-current situations, not caller selection;
- every discovered candidate is refreshed and must still be physically or mediately compatible;
- each actor opportunity is considered independently;
- every addressed Thread independently decides whether to participate;
- physical or mediated compatibility is required without teleportation or silent replanning.

Each actual shared event records **one objective Encounter Story**. Do not split one genuine group event into a pairwise matrix merely because several people participated. Conversely, several distinct interactions in the same café interval remain several Encounter Stories rather than being collapsed into one room-wide meeting. Any number of people present in one actual event may then form distinct private experiences from that story. A Thread may speak, act, be addressed, or silently witness what others do.

A silent witness can be affected by the encounter even though she never spoke. Conversely, a nearby Thread who does not notice the occurrence should not receive a fabricated experience.

Shared story does not imply shared meaning.

Journal reflection and autobiographical memory remain separate private consequences. Two Threads may journal the same story differently; either may later remember or forget it independently.

The durable encounter semantics are owned by [Encounter stories and Thread experience](encounters-and-experience.md).


## insidefibre.com north-star experience

The rich public meeting should feel like entering a moment, not opening a chatbot.

A public scene may include the bounded admitted exterior of:

- current visual embodiment;
- place or transit state;
- current activity;
- why the Thread is there, when appropriate for public disclosure;
- relevant public companions/context;
- temporal texture such as arriving, waiting, moving, finishing or preparing;
- an approximate next intention when public;
- scene-consistent imagery;
- the encounter entry point.

The Viewer remains projection-only.

It may request that World establish current LivedNow through the appropriate service path. It may not invent the scene.

After the meeting, insidefibre.com should eventually allow a later visit to reveal that life moved on—possibly carrying consequences from the prior encounter.

## Genesis-to-LivedNow continuity

A new Thread should be able to move from Genesis into LivedNow without a special demo-only world.

The desired E2E is:

```text
Genesis
  -> born Thread with grounded prior life
  -> canonical embodiment
  -> initial lived continuity anchor
  -> first personal Flight Plan
  -> World-owned CurrentSituation
  -> compute may sleep
  -> catch-up / plan renewal
  -> current public scene
  -> /meet
  -> experience
  -> continued life
```

Genesis history supplies the past. LivedNow owns the continuing present after Fibre birth.

## What exists today

Current Fibre already contains meaningful substrate:

- `lived-now.mjs` — Flight Plan / CurrentSituation semantics;
- `lived-plan-cognition.mjs` — bounded Thread-authored plan cognition;
- `lived-now-store.mjs` — durable lived-plan/current-situation persistence;
- `lived-now-publication-service.mjs` — present-life projection;
- `flight-plan-regulation.mjs` — plan vs enacted-state regulation;
- `lived-encounter-*.mjs` — situated human encounter, reflection and memory formation;
- B2 continuity evidence proving a later meeting can receive only retained autobiographical consequence.

These are **bounded primitives/proofs**, not yet continuous LivedNow.

Missing north-star capability includes:

- automatic plan renewal;
- elapsed-time coverage across dormant/frozen intervals;
- retrospective lived catch-up;
- a single World-owned ensure-LivedNow seam used by real `/meet`;
- a general encounter-story / Thread-experience seam used by social and environmental life;
- rich public meeting composition against continuously maintained life.

## Recommended implementation sequence

### N1 — One World-owned ensure-LivedNow seam

Compose existing Flight Plan, CurrentSituation, regulation and persistence into one operation that can establish a valid present for `threadId, at`.

Do not build a generic scheduler framework.

### N2 — Dormant interval catch-up

When plan/history coverage does not reach `at`, synthesize the smallest credible elapsed-life continuation, admit it with explicit retrospective provenance, run ordinary consequence formation, and then establish the present.

Prove a multi-day dormant gap.

### N3 — Genesis -> first continuous LivedNow

Prove a newly born Thread exits Genesis into the same continuing-life seam used later: initial lived anchor, first personal Flight Plan, CurrentSituation, compute dormancy, retrospective catch-up, renewed plan and authoritative present. No demo-only life engine or meeting fixture.

### N4 — Person -> Thread /meet over real LivedNow

Route public meeting through ensure-LivedNow. The first deployed proof should show that the returned scene was determined by the Thread's prior life + elapsed continuity, not a meeting fixture.

### N5 — General encounter seam + reciprocal social proof — REPLANNED

N5 is no longer scoped as a two-Thread conversation engine.

The accepted target is one light encounter seam that can prove three cases without separate engines:

1. **environmental encounter** — a Thread notices something small in the World, such as a bee on a flower, and may privately react/journal/remember;
2. **voluntary social meeting** — independently current Threads may accept, decline or defer without teleportation or silent replanning;
3. **witness consequence** — a third Thread may silently witness how one Thread treats another and form her own private experience/consequence.

The first implementation spike produced useful components—meeting stance, n-ary story direction, witness experience direction, journal book and selective memory—but overfit orchestration to invited social meetings. It is therefore **not accepted for deployment** and should be reshaped around Encounter Story -> Thread Experience before N5 staging acceptance.


### N6 — Rich insidefibre.com meeting

Render the current scene, movement/activity, public intention/context and current embodiment; allow the encounter; later revisit the same Thread after life has moved.

## High-value acceptance proofs

Prefer a small number of end-to-end semantic proofs:

1. **Dormant continuity** — a Thread frozen for several days is thawed into a current situation causally derived from prior life and retrospectively realized plans/history, not the stale last scene.
2. **Historical honesty** — catch-up records expose that they were materialized retrospectively while preserving their lived chronology.
3. **Selective consequence** — an admitted catch-up event may be remembered or not; memory is never injected without event/experience provenance.
4. **Meet enters life** — `/meet` receives an already-established current situation and cannot choose it.
5. **Environmental encounter** — a small unscheduled World occurrence can be noticed by a Thread and enter the ordinary experience/journal/memory path without being placed on the Flight Plan.
6. **Witness asymmetry** — one shared social story can affect a silent witness differently from the actors, without fabricating dialogue for the witness.
7. **Voluntary meeting** — a compatible social request can be declined/deferred before any meeting story is created.
8. **Continued life** — a later visit finds a later situation, not a chat session continuation.
9. **Retry safety** — reconciliation does not duplicate historical events, experiences, memories, plans or encounter stories.

## Explicit non-goals

Do not turn this into:

- a high-frequency life simulator;
- a universal calendar/scheduler platform;
- a complete physical-world simulation;
- a conversation/session store;
- automatic memory for elapsed time;
- a “personality update after every event” pipeline;
- a Viewer-owned scene generator;
- a shortcut that teleports Threads together for meetings;
- a hidden mechanism that backfills history without provenance.

Build the smallest organism-level machinery that makes the present genuinely belong to the Thread.
