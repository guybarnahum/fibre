---
id: validation-developmental-exploration-slices
status: proposed
last-reviewed: 2026-10-06
canonical: true
---

# Developmental exploration implementation slices

## Status

**Proposed for owner review. Do not implement these slices until the architecture and ordering are accepted.**

Architecture: [Developmental exploration](../architecture/developmental-exploration.md).

## Goal

Close the missing causal loop between Fibre's existing exploration regulation and a Thread's self-directed life:

```text
lived repetition / low novelty
  -> grounded exploration pressure
  -> bounded interoception
  -> Thread-owned planning
  -> chosen opportunity
  -> experience
  -> retained meaning / changed state
  -> later planning
```

The first tranche must stay small:

- reuse the existing regulator;
- reuse existing interoception;
- reuse Interior Cognition;
- reuse personal Flight Planning;
- reuse Encounter Story / Thread Experience / memory / semantic state;
- add no exploration service;
- add no generic scheduler;
- add no sociability score;
- add no durable intention authority until evidence proves it is needed.

## Execution order

```text
X0  prove and record the current causal gap
X1  let grounded exploration interoception reach Flight Planning
X2  give planning meaningful World opportunity texture
X3  prove self-directed exploration can bend ordinary Flight Plan
X4  prove lived outcome bends later exploration/planning
X5  add bounded rich Person presence
X6  derive discoverable socially porous life without pre-consent
X7  live mixed frozen/live demonstration
```

X1-X4 are the **core developmental loop**.

X5-X7 are the **human encounter / discoverability extension**.

Do not implement X5 merely to make the current N6 demo easier. N6 public encounter acceptance remains a separate capability and should not require a new human-profile subsystem.

---

# X0 — causal gap baseline

## Claim

Fibre already has grounded exploration pressure, but it currently changes salience for opportunities already present rather than reliably changing the Thread's chosen life.

## Work

No runtime feature should be added in X0.

Record one focused baseline proof showing:

```text
repeated authoritative sameness
  -> exploration RegulationFrame
  -> Salience Gate can become salient
```

while also showing that the same pressure has no explicit causal path into the existing Flight Planning concern.

This slice should be documentation/inspection-level unless one tiny diagnostic is needed to make the missing edge visible.

## Acceptance

A reviewer can point to the exact current source boundary and answer:

- where exploration pressure is produced;
- where it is currently consumed;
- why Flight Planning does not yet receive it;
- why adding a social-acceptance bias would solve the wrong problem.

## Stop condition

Do not add production behavior in X0.

---

# X1 — grounded exploration reaches ordinary Flight Planning

## Claim

A Thread's existing personal Flight Planning cognition can receive grounded exploration pressure through the accepted interoception boundary, without a new cognition service or new semantic state.

## Implementation shape

Extend the existing LivedNow/planning call path so `formPersonalLivedPlan()` may receive a bounded **interoceptive planning projection** when a meaningful regulator condition exists.

The planning cognition should see evidence shaped like:

```text
interoception
  exploration/information/play pressure
  grounded evidence refs
  relevant change / persistence
```

It must not see:

```text
you are bored
you need novelty
you should meet someone
go somewhere interesting
```

The existing `lived_planning` Interior Cognition adapter remains the one planning mind.

Do not create a `developmental_exploration` service or second model call in this slice.

## Important authority rule

The regulator/interoceptive evidence may influence private cognition, but it does not become World plan evidence.

Continue the accepted split:

```text
plan.sourceReferences
  = World/situated authority

plan.cognition.*
  = private causal cognition provenance
```

## High-value test

Hold constant:

- Thread;
- developed-self evidence;
- planning horizon;
- available World places;
- commitments.

Change only whether the accepted grounded exploration interoception is present.

Require the planning cognition input/provenance to differ through the interoceptive seam while:

- raw genome remains absent;
- no semantic `need:novelty_growth` is mechanically authored;
- private exploration evidence does not leak into `plan.sourceReferences`.

A controlled fixture may author different plan outputs to prove the causal wire, but this test is **wiring evidence**, not a claim that live model quality is accepted.

## Stop condition

One existing planning concern consumes grounded interoception. No new store/service.

---

# X2 — planning sees meaningful World opportunities

## Claim

Self-directed exploration requires meaningful alternatives, not opaque place IDs.

## Current gap

The planning seam currently receives roughly:

```text
availablePlaces[]
  ref
  displayName
```

That is too thin for a Thread to reason well about whether an alternative offers learning, novelty, social exposure, quiet, culture, play or another meaningful affordance.

## Implementation shape

Enrich each offered planning opportunity only from existing World/situated authority.

Preferred shape:

```text
availablePlaces[]
  ref
  displayName
  placeKind?             derived/indexing aid
  description?           natural-language World meaning
  ordinaryAffordances?   only when already grounded
```

Exact fields should reuse existing live-world-place / situated-place authority rather than create a new opportunity catalog.

Natural-language description remains authoritative meaning. A `placeKind` may assist indexing but may not replace the description.

## Do not add

- `interestingScore`;
- `socialScore`;
- `growthValue`;
- `humanDensity` guesses;
- generated claims about what a place is like;
- automatic "good for curiosity" labels.

## High-value test

Give one Thread two admitted World opportunities whose meaning differs in existing authority.

Require the planning cognition to receive those real differences while caller code supplies only the refs/context needed to resolve them.

A test must fail if a caller can decorate the same place with arbitrary "interesting" metadata and thereby manufacture exploration.

## Stop condition

Planning can distinguish meaningful offered opportunities from World evidence without a recommendation subsystem.

---

# X3 — exploration bends an ordinary Flight Plan

## Claim

Grounded exploration pressure can cause a Thread to choose a materially different ordinary life.

This is the first slice that upgrades developmental exploration from **Context-only** to **Behaviorally causal**.

## Expected path

```text
same Thread
+ same obligations
+ same World opportunity set
+ grounded exploration pressure
  -> lived_planning Interior Cognition
  -> one valid Flight Plan

same Thread
+ same obligations
+ same World opportunity set
+ no grounded exploration pressure
  -> lived_planning Interior Cognition
  -> potentially different valid Flight Plan
```

The changed plan may involve:

- different place;
- different activity;
- different mediated context;
- different amount of unstructured exploration;
- different social exposure;
- or no change if this Thread's developed self/history makes continuity preferable.

## Important constraint

Do **not** require:

```text
exploration pressure -> social activity
```

The mechanism must permit:

- books;
- physical exploration;
- play;
- learning;
- art;
- a familiar relationship;
- a new person;
- a new Thread;
- solitude in a new setting;
- staying put.

## Proof strategy

Use two levels.

### Semantic unit proof

Use a controlled cognition fixture to require a materially different admitted Flight Plan when the only causal input difference is grounded exploration interoception.

This proves the architecture.

### Live diagnostic

Run a small live diagnostic over several existing Threads and inspect whether real model cognition can make plausible varied choices.

The diagnostic is evidence for quality, not a brittle CI threshold. Do not require a fixed percentage of Threads to move, socialize or choose novelty.

## Review question after X3

Does the existing one-call planning concern adequately express:

> What kind of experience do I want to seek now?

If yes, stop.

Only if repeated evidence shows that a developmental intention needs to persist independently across planning horizons should Fibre propose a separate durable developmental-intention authority.

Do not pre-build it.

## Stop condition

At least one meaningful behavioral path exists from grounded exploration pressure to an admitted ordinary Flight Plan.

---

# X4 — experience closes the developmental loop

## Claim

What happened during exploration can change what the Thread seeks later.

Without X4, Fibre has novelty-seeking but not development.

## Existing reusable authorities

Use:

```text
Encounter Story
  -> Thread Experience
  -> optional journal
  -> selective memory / not_remembered
  -> semantic meaning/state where warranted
  -> later Interior Cognition / Flight Planning
```

Do not add an exploration reward score.

## High-value differential proof

Construct two otherwise equivalent later planning episodes where the only meaningful Thread-owned historical difference is retained lived meaning from an earlier exploratory encounter.

Example A:

> Talking with someone outside my usual world unexpectedly broadened how I think about ordinary work.

Example B:

> An unstructured interruption while I was focused left me feeling invaded and protective of quiet time.

Require later planning to be capable of diverging under identical current World opportunity.

The causal evidence must be Thread-owned retained meaning/semantic state selected through normal Interior Cognition.

Do not inject a caller-authored "prefer social" flag.

## Negative proof

If an earlier encounter was `not_remembered` and produced no durable semantic consequence, later planning may not reconstruct its enriching/aversive meaning merely because Encounter Story history still exists.

History is not memory.

## Stop condition

A lived exploratory outcome can bend later self-directed life through existing consequence authorities.

---

# X5 — bounded rich Person presence

## Claim

A real-world human can become an information-rich social opportunity because of outward experience/context the human chooses to make perceptible, not because `requesterKind === person`.

## Current gap

The ordinary public visitor is intentionally thin:

```text
requesterKind: person
utterance: ...
```

This is enough for voluntary response but too little for a Thread to develop genuine curiosity about the person before or during a richer encounter.

## Proposed minimal Person public context

A visitor may optionally provide a bounded outward introduction such as:

```text
displayName
publicSelfDescription
conversationIntent
experienceOffered
topicsOffered
```

Naming is reviewable; the authority boundary is not.

This context must be:

- explicitly supplied/approved by the human;
- public to the Thread for this interaction;
- treated as self-authored claim/context unless independently grounded;
- separate from the human's private ChatGPT memory, email, calendar, health, files or account history;
- optional.

## Situated Percept integration

Eventually represent the visitor as a real external actor in the same exterior seam:

```text
actor kind: person
observable/public introduction
direct social act
current conversation context
```

Do not fabricate a Thread record, private interior or relationship for the human.

## High-value proof

Hold Thread and current situation constant.

Change only the human's outward self-authored introduction.

Require a Thread's private appraisal to be capable of changing because the content actually differs.

The test must fail if only the enum `person` is needed to produce the difference.

## Stop condition

A Thread can respond to *who this outward person appears to be*, not merely "a human spoke."

---

# X6 — socially porous life and discovery

## Claim

Fibre can discover Threads whose **self-directed current life** makes a human approach plausible without converting that into consent or manufacturing availability.

## Preferred causal path

```text
developmental exploration / other personal motives
  -> ordinary Flight Plan
  -> actual CurrentSituation
  -> socially porous current life
  -> discoverable candidate
  -> human approaches
  -> accept | decline | defer
```

Examples of socially porous life may include:

- public reading/sketching;
- a market/library/event;
- an unhurried walk;
- a chosen mediated public channel;
- an explicit current activity whose ordinary purpose includes meeting unfamiliar people.

## Discovery rule

Candidate discovery should rely on public/World observable current-life facts or an explicit Thread-owned outward expression of openness.

It must not rank people by secretly reading:

- private `need:novelty_growth`;
- private feelings;
- private exploration pressure;
- memories;
- hidden plan rationale.

Private state may cause the life; it does not automatically become visitor-facing metadata.

## No availability guarantee

The system may aim to *find* 2-3 plausible candidates by checking a bounded cohort, but:

- zero is a valid outcome;
- no minimum acceptance rate exists;
- candidate selection does not preauthorize conversation;
- the concrete visitor request still receives accept | decline | defer.

## Frozen Threads

A frozen candidate is first brought to actual present through ordinary `ensure LivedNow(now)`.

Do not select from stale last-enacted scenes.

## Review point

If public current-life facts alone are insufficient to tell whether approach is socially plausible, consider a small Thread-owned outward expression such as:

> open to being approached right now

That expression must be authored through ordinary cognition and may expire/change. It is not a consent token.

Only add this if X6 demonstrates the need.

## Stop condition

A bounded candidate search can surface self-directed socially porous lives without inspecting private motives or creating availability commitments.

---

# X7 — live mixed frozen/live demonstration

## Claim

The complete developmental loop works for the actual Fibre population, including both computationally frozen and live Threads.

## Demo cohort

Choose a small mixed cohort containing:

- frozen/dormant Threads;
- live/recently active Threads;
- different local times;
- different developed histories.

No caller may preselect who should accept.

## Live sequence

```text
bounded cohort
  -> ensure LivedNow(now) for candidates as needed
  -> current regulation/interoception
  -> ordinary developmental Flight Planning when horizon renewal is warranted
  -> actual CurrentSituation
  -> discover socially porous current lives
  -> human chooses one
  -> human presents bounded outward introduction + concrete request
  -> Thread accept | decline | defer
  -> accepted encounter
  -> Thread Experience / selective aftermath
  -> later planning
```

## Required evidence

1. A frozen Thread reaches a non-stale present through retrospective LivedNow, not a meeting fixture.
2. A live Thread uses the same planning/meeting authorities after present reconciliation.
3. At least one Thread's self-directed plan materially reflects grounded exploration/learning/growth pressure.
4. Human richness is represented through outward content, not `person => interesting`.
5. A concrete request remains independently voluntary.
6. An accepted encounter produces ordinary Encounter Story / Thread Experience.
7. A later planning episode can consume a retained consequence from earlier exploration.
8. A Thread may legitimately decline/defer despite having sought a richer day.

## What would invalidate the proof

Reject the implementation if success depends on:

- selecting a known-agreeable Thread;
- retrying different prompts until one accepts;
- changing the Thread's plan for the visitor;
- caller-authored curiosity;
- hidden sociability/interestingness scores;
- guaranteed open slots;
- treating a human's private external data as visible Person context;
- claiming development when only Encounter Story history exists.

## Stop condition

The operator can point to one causal chain from endogenous exploration pressure through self-directed life into experience and back into later planning, while another Thread remains free to choose differently.

---

# Review decisions before implementation

The owner review should explicitly answer these questions.

## 1. First implementation boundary

Recommended:

> Connect existing exploration interoception directly to existing Flight Planning before inventing a separate developmental-intention cognition/store.

Alternative:

> Add a dedicated developmental-exploration cognition concern immediately.

Recommendation: **do not choose the alternative yet**. One extra model call and another authority are unjustified until the simpler planning loop proves insufficient.

## 2. Durable intention

Recommended:

> No new durable exploration-intention record in X1-X4.

Revisit only if an intention must persist independently across Flight Plans.

Do not casually overload `currentState.unresolvedIntentions`; today that field is also consumed by older participation/obligation machinery.

## 3. Opportunity semantics

Recommended:

> Reuse existing World/situated place meaning and modestly enrich planning's `availablePlaces` projection.

Do not build a generic recommendation or affordance service.

## 4. Humans

Recommended:

> Humans are potentially high-information opportunities because of actual outward content and external lived experience, not because they belong to a privileged actor category.

A future Person public context should remain optional and human-controlled.

## 5. Population availability

Recommended:

> Do not target "always 3 available Threads" as a semantic invariant.

Target:

> Across a varied population, Fibre can usually discover some Threads whose self-directed current life is plausibly open to approach; zero remains valid.

Operational product goals may later maintain a larger population or richer World so 2-3 candidates are usually present without changing individual consent.

## 6. N6 relationship

Recommended:

> Do not block N6.6 ordinary public encounter closure on developmental exploration.

N6 proves that a human can meet an existing life and the Thread can choose.

Developmental exploration proves why Threads themselves seek richer lives and why some naturally become more encounterable.

The mechanisms should meet later, but neither should fake the other's acceptance proof.

---

# Fibre vision review

## Capability this plan enables

Endogenous developmental exploration: lived regulation and history can cause a Thread to seek different experiences, alter ordinary life, encounter richer World/human opportunities, and be changed by the outcome.

## Deliberately deferred

- durable developmental-intention authority — deferred until planning-only loop is insufficient;
- rich universal Person identity/profile system — deferred; X5 proposes the minimum public presence context;
- generic world recommendation engine — rejected for this tranche;
- high-frequency organism simulation — rejected;
- guaranteed meeting availability — rejected;
- society-scale institutions that produce exploration opportunities — deferred;
- proactive Thread-to-human outreach outside Fibre clients — deferred, extension path preserved.

## Temporary shortcuts

- repeated sameness remains the first narrow exploration-pressure input;
- planning opportunity texture is bounded to already-admitted World information;
- human public context is self-authored claim/context rather than a verified biography;
- live evaluation remains a diagnostic rather than a statistical acceptance threshold.

## Permanent constraints

None proposed.

## Ambition check

This plan advances Fibre only if it creates:

```text
Thread-owned lived difference
  -> Thread-owned choice of life
  -> durable consequence
  -> changed future possibility
```

If implementation stops at a novelty label, prompt decoration, candidate ranking or website availability list, the slice has failed even if all plumbing works.
