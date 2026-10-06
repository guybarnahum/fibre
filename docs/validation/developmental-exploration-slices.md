---
id: validation-developmental-exploration-slices
status: accepted
last-reviewed: 2026-10-06
canonical: true
---

# Developmental exploration implementation slices

## Status

**Accepted execution roadmap. X0-X4 are closed; E6 autonomous encounter production/discovery is current before X5+.**

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

## Standing implementation rules

These slices inherit Fibre's normal implementation discipline, with extra emphasis because motivation can easily become over-engineered:

- **reuse before invention** — prefer one new causal edge between accepted authorities over a new subsystem;
- **no legacy preservation by default** — delete or reshape obsolete exploratory scaffolding rather than compatibility-wrap it;
- **one cognition path** — developmental planning goes through shared Interior Cognition, never a parallel persona prompt;
- **one planning authority** — personal Flight Plan remains the ordinary-life intention authority;
- **one consequence stack** — Encounter Story / Thread Experience / memory / semantic state remain the developmental return path;
- **bounded runtime** — no whole-population waking, no minute-by-minute simulation, no repeated model sampling to force interesting outcomes;
- **no quota behavior** — tests and runtime must not target a meeting/acceptance percentage;
- **semantic tests only** — prefer one differential causal proof over many plumbing assertions;
- **short failures** — test messages should say what Fibre property broke, for example `exploration did not bend planning` or `unremembered encounter bent later life`;
- **no incidental contracts** — do not assert prompt wording, capitalization, helper order, field ordering, CSS, or exact prose unless that wording is itself the authority;
- **stop when the causal loop works** — do not implement X5-X7 machinery while X1-X4 already prove the core developmental mechanism.

A slice is not improved by adding more code. It is improved when the smallest change makes a previously inert Thread-owned difference change later life.

## Execution order

```text
X0  prove and record the current causal gap
X1  let grounded exploration interoception reach Flight Planning
X2  give planning meaningful World opportunity texture
X3  prove self-directed exploration can bend ordinary Flight Plan
X4  prove lived outcome bends later exploration/planning
E6  autonomous environmental-event + incidental-witness production/discovery prerequisite
X5  add bounded rich Person presence
X6  derive discoverable socially porous life without pre-consent
X7  live mixed frozen/live demonstration
```

X1-X4 are the **core developmental loop**.

E6 belongs to the general Encounter architecture rather than the X numbering, but it is a **required bridge before X5-X7** so autonomous developmental opportunity does not become social-biased.

X5-X7 are the **human encounter / discoverability extension**.

Do not implement X5 merely to make the current N6 demo easier. N6 public encounter acceptance remains a separate capability and should not require a new human-profile subsystem.

With X4 accepted, implement the bounded E6 encounter-autonomy gap first:

- environmental occurrence text must be World-authored from existing scene/place context rather than caller-authored;
- incidental witnesses must be derived from authoritative co-presence rather than caller-selected;
- both reuse the existing attention / Experience / Journal / Memory stack;
- zero occurrence / zero noticed witness remains legal;
- no ticking, encounter quota, event bus or sample-until-interesting loop.

---

# X0 — causal gap baseline — ACCEPTED

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

## Accepted evidence

See [X0 developmental exploration causal-gap baseline](developmental-exploration-x0-baseline.md).

The baseline confirms:

- sustained enacted sameness already creates a grounded exploration RegulationFrame;
- that frame is currently consumed by natural social salience;
- generic interoception can already project an exploration drive;
- ordinary LivedNow regulation does not currently merge this sameness-derived exploration frame into semantic interpretation;
- `lived_planning` receives neither the frame nor its projected interoception;
- retained semantic/memory meaning can already influence planning, so X1 should add only the missing current grounded interoceptive edge.

## Stop condition

Do not add production behavior in X0.

---

# X1 — grounded exploration reaches ordinary Flight Planning — ACCEPTED

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

## Implemented shape

X1 now reuses the existing stack exactly as proposed:

```text
explorationRegulationForLivedContinuity(...)
  -> existing projectInteroception(...)
  -> optional bounded interoception on existing lived_planning externalContext
  -> existing runInteriorCognition(...)
  -> existing personal Flight Plan
```

There is still:

- one planning model call;
- no exploration service;
- no new persistence;
- no mechanically minted semantic state;
- no meeting/acceptance bias;
- no new planning authority.

The LivedNow planning path supplies this capsule only when authoritative enacted history establishes a contiguous same-scene run long enough to ground the existing exploration rule.

Private interoceptive evidence remains planning context and does not enter `plan.sourceReferences`.

### Current acceptance proof

One differential test holds Thread, horizon, places and developed-self authorities constant and changes only the grounded exploration interoception.

It requires:

- the existing planning cognition to receive that signal;
- the same existing planning call to be capable of choosing a materially different plan;
- zero semantic-state minting;
- the grounding situation refs to stay out of World plan evidence.

This is a causal-wiring proof, not yet X3's claim that live model behavior has been quality-accepted.

## Stop condition

One existing planning concern consumes grounded interoception. No new store/service.

---

# X2 — planning sees meaningful World opportunities — ACCEPTED

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

## Implemented shape

X2 removes caller-authored place meaning from the planning seam.

Callers now provide only:

```text
availablePlaceRefs[]
```

The existing planning authority resolves each ref from:

- current Situated Life place episodes; or
- admitted live-World places.

The model-facing `availablePlaces` projection is then built inside Fibre from those authorities.

For situated places it can include:

```text
ref
displayName
placeKind      <- existing episode kind
location       <- existing country / region / locality facts when present
```

For live-World places it can include:

```text
ref
displayName
placeKind
description    <- admitted World description
```

No new place store, recommendation service, affordance score or model call was added.

### Current acceptance proof

One authority test gives a Thread two admitted situated places with materially different meanings and also supplies a contradictory caller-authored decoration.

The planning cognition must see the situated records' real meaning and must not see the caller decoration.

## Stop condition

Planning can distinguish meaningful offered opportunities from World evidence without a recommendation subsystem.

---

# X3 — exploration bends an ordinary Flight Plan — ACCEPTED

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

## Implemented live diagnostic

X3 adds no new production planning mechanism. X1 + X2 are the mechanism.

The existing `lived-planning:validate` diagnostic now has an X3 mode:

```bash
npm run developmental-exploration:x3:validate -- --env staging
```

It:

1. cheaply inspects up to 50 real staging Threads through the existing private observatory, stopping as soon as three eligible candidates are found;
2. reads existing enacted life without waking/replanning Threads merely for the diagnostic;
3. reports compact skip-reason counts before spending any model calls;
4. uses the real previous/current enacted situations;
5. admits only Threads whose situations already satisfy the existing exploration-grounding rule;
6. requires at least two authoritative planning opportunities;
7. constructs one baseline and one exploration planning call using the same Thread, horizon, places, history and commitments;
8. uses the exact reasoning integration selected for staging World `livedNow`;
9. persists neither counterfactual plan;
10. performs no resampling if the two plans happen to be the same;
11. makes at most six model calls total: two calls for each of at most three eligible Threads;
12. writes paired plan evidence under `.fibre/developmental-exploration/x3/<run>/evidence.json`.

The diagnostic requires the current private World observatory contract (`v0.8`) and records the deployed World Git SHA as evidence.

### X3 grounding correction discovered on staging

The first live scan found zero eligible Threads across 41 lives: 23 failed only because the immediately previous snapshot was less than 20 minutes old, 6 had changed activity and 12 lacked comparable at-place continuity.

That exposed a real semantic bug in the original grounding implementation. Fibre is event/request driven, so repeated authoritative snapshots may be 5-10 minutes apart even when the Thread has remained in the same scene for much longer. Requiring one adjacent snapshot pair to span 20 minutes therefore creates false negatives.

The corrected production rule is:

```text
current enacted situation
  -> walk backward through authoritative previous CurrentSituations
  -> continue only while place + mediated context + activity + participants are unchanged
  -> stop immediately on a scene change
  -> exploration is grounded once the contiguous enacted run spans >= 20 minutes
```

This uses actual World history, not Flight Plan intention, and requires no periodic ticking. The walk is bounded and only occurs when exploration context is requested.

The existing social-salience proof now exercises several short identical snapshots whose cumulative run exceeds 20 minutes. Flight Planning and social salience consume the same cumulative-history regulator, and the private observatory exposes that same derived production continuity/interoception for X3 diagnosis.

The observatory also exposes the immediately previous enacted situation as operator inspection evidence. This does not change World life or planning authority.

### Accepted staging evidence

X3 closed on staging with two real Threads that became eligible through ordinary cheap currentization of already-covered life:

- **Irakli Maisuradze** — the baseline kept a conventional late-night wind-down sequence; the exploration condition moved a bounded mildly challenging reading/work episode earlier while still protecting sleep.
- **Faith Achieng Odhiambo** — the baseline moved directly from a small outstanding task toward sleep; the exploration condition inserted a brief unfamiliar reading/computer-practice episode while still protecting the preferred sleep window.

Both pairs:

- used the same Thread, horizon, model, World opportunity set and developed-self authorities;
- differed only by the grounded exploration interoception;
- stayed in the same physical place;
- did not require social activity;
- produced materially different valid Flight Plans;
- used one baseline and one exploration call only;
- persisted neither counterfactual plan;
- used no prompt retuning, resampling, caller-authored novelty or acceptance quota.

This also answers the X3 review question: the existing one-call `lived_planning` concern is expressive enough for the first developmental-exploration proof. Do **not** add a separate durable developmental-intention authority on X3 evidence.

### Acceptance remains human-reviewed

There is deliberately no automatic `changedCount >= N` gate.

A materially different plan is evidence only when the difference is plausibly connected to the grounded exploration signal and remains consistent with the Thread's developed self and real opportunities.

No difference is also legitimate for a particular Thread.

## Stop condition

At least one meaningful behavioral path exists from grounded exploration pressure to an admitted ordinary Flight Plan. **Accepted in staging with two independent real-model examples.**

---

# X4 — experience closes the developmental loop — ACCEPTED

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

## Implemented proof

X4 adds no new production authority.

The existing planning differential test now composes the accepted authorities end to end through the real private-aftermath path:

```text
one objective Encounter Story
  -> Thread-specific Experience
  -> optional subjective Journal
      -> may disagree with objective truth
      -> may be null when nothing felt worth writing
  -> existing selective autobiographical retention
      -> retained autobiographical meaning
      -> not_remembered
  -> existing Interior Cognition evidence selection
  -> existing lived_planning
```

One neutral exploratory workshop Encounter Story is shared by three otherwise equivalent Threads.

Their private aftermath differs:

- one journal interprets the encounter as unexpectedly enriching and retains an enriching autobiographical meaning;
- one journal interprets the same neutral event as patronizing/intrusive and retains an aversive autobiographical meaning;
- one writes no journal entry and returns `not_remembered`.

The journal is explicitly **not** a second World-history authority. The aversive journal may contain a subjective interpretation absent from the objective Encounter Story.

The later World planning context and offered places are identical.

The proof requires:

- the same objective story can produce different private journal truths;
- a trivial/unimportant experience can legally produce no journal entry;
- enriching retained meaning can bend later life toward another bounded unfamiliar opportunity;
- aversive retained meaning can bend later life toward protected quiet;
- `not_remembered` leaves objective Encounter Story / Thread Experience history intact but contributes no memory evidence to later planning;
- neither Journal nor Encounter Story / Experience refs may bypass autobiographical-memory authority and enter `lived_planning` directly.

No reward score, exploration-memory type, new semantic-state writer, planner or model call was added.

X4 is accepted after the focused aftermath/planning proofs and full `npm run slice:validate` passed on 2026-10-06.

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
