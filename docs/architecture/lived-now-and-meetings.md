---
id: architecture-lived-now-and-meetings-v0-1
status: accepted
last-reviewed: 2026-10-12
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

## World-owned wakefulness for real-time encounters (source implementation, operator proof pending)

New Thread-authored personal Flight Plan stops carry a small factual `wakefulness: awake | asleep | unknown` alongside ordinary, meaning-bearing `activity` text. This is not availability, consent, the Thread's social preference, or an inferred bedtime. When World enacts a stop, its `CurrentSituation` carries the same bounded fact; transit and unstructured gaps remain `unknown`. **Historic persisted Plan/Situation JSON omitting the field remains byte-for-byte intact for digest integrity**; only the effective enacted projection defaults to `unknown`. No activity-text regex, nighttime assumption, retroactive genetics, per-minute scheduler, or separate sleep state database.

An ordinary interruptive public Visitor approach against a verified `asleep` enacted situation yields `outcome: unavailable`, `reason: asleep`, tied to the existing `situationId` and an idempotent request receipt. It performs **zero participation or speech inference**, emits no invented outward refusal, and creates no accepted Encounter Story or private notice. An `awake` or `unknown` situation still uses the ordinary independent appraisal path; unknown never falsely asserts sleep. A later authentic World transition to wakefulness permits a *new* approach at the later present. Waking a sleeper in response to urgency is a distinct deferred World mechanism, not an implied capability of this slice. Voluntary `decline` and `defer` remain different outcomes from `unavailable`.

The Core World and public Presentation mapping are implemented in source on `main`; **Guy's focused/full local validation, staging deployment and naturally enacted new typed-plan proof remain open**. Current Sophie staging sleep was recorded in a plan written *before* this field existed: her existing `activity: "Sleep."` is **not** retroactively upgraded to `asleep`. The website-owner chat must render `unavailable` without claiming that Sophie spoke; no website code is owned by this slice.

## Terms

### Flight Plan

A Thread-owned bounded itinerary for roughly the next half-day/day: where and how the Thread expects, wants or needs to be present, what it expects or intends to do, with whom, and why.

For a Thread participating in continuous LivedNow, this is a **rolling lived-life expectation**: ordinarily there should be admitted personal plan coverage across the current half-day/day horizon. Compute does not need to remain active to maintain that illusion of continuity; missing elapsed plan coverage may be realized retrospectively during catch-up, and current/future coverage may be renewed when the Thread is thawed or otherwise needs a present.

A Flight Plan is intention, not World truth. Retrospective plan realization therefore records what the Thread is admitted to have intended during the elapsed interval; World history separately records what was enacted.

**E7.5 event-driven continuous life:** after World establishes a genuine CurrentSituation, it derives the next boundary directly from the admitted personal/care Flight Plan stops or renewal horizon. One indexed per-Thread frontier drives the existing `InfraDriver.scheduler` World reconciliation alarm; an eligible wake calls the *same* LivedNow authority at actual wall-clock time, preserving required-care constraints and bounded N2 catch-up. After a successful advancement the next boundary replaces the old one; no all-Thread scan, periodic wall-clock tick, extra planner or repeated synthesis of unchanged life. Unknown/ungrounded plan renewal blocks rather than fabricating lived history. Repeated transient failures are capped at three attempts and remain inspectable. A Thread newly published through Genesis now earns **one durable first-life obligation in that same atomic birth transaction**. The existing World reconciliation alarm delivers it to the ordinary `LivedNow.ensure` authority. Its first plan is authored at the time the first lived present is actually established, never retroactively at birth after an unobserved delay. Once established, its own Plan boundaries maintain ongoing life. Missing grounded presence blocks first life; transient admission errors have at most three attempts, and outcomes remain inspectable. Old births do not acquire this new obligation through schema installation.

An existing dormant Thread without an established current plan is **not** silently assigned synthetic life merely to schedule work. A later externally requested real `ensure` may establish its first present or re-arm its frontier. Incremental activation of older Threads remains a separate explicit decision. This applies via the provider-neutral World InfraDriver to local, Cloudflare and any future backend implementing the same state and scheduler ports.

### CurrentSituation

The World-owned enacted truth for the Thread at a particular time: at a physical place or in transit between physical places, possibly also participating in a mediated context, doing something, with relevant participants and evidence.

A lived Thread is never physically nowhere. Every CurrentSituation therefore carries one of:

- `place(placeRef)`;
- `transit(fromPlaceRef, toPlaceRef, progress)`.

Mediated presence is additional context, not a replacement for physical presence. Public Presentation may coarsen or withhold exact place details, but World must always know the underlying physical presence.

Operator maps are projections of this authority, not a new place authority. A Threads world map uses CurrentSituation and its resolved place reference whenever enacted presence exists, and independently projects whether temporary cognition is running from the live thaw/runtime lease. Population inspection stays set-wise and observational: it must not issue per-Thread reads, invoke cognition, or establish LivedNow merely to draw the map.

The map's natural visual grammar is deliberately small: **motion means cognition is running; solid means situated-life evidence exists; hollow/dashed means LivedNow has not yet been established**. An active Thread therefore throbs only while a live thaw runtime exists. A computationally frozen Thread with a CurrentSituation is a static situated marker; the situation timestamp remains visible because dormancy does not prove the Thread is still physically there now. A living Thread without CurrentSituation may be plotted at canonical birthplace only as an explicitly marked **awaiting LivedNow** placeholder. An active runtime without a situation is an inspectable anomaly, not invented presence. Retired Threads are excluded from the living map by default.

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

The proposed [Developmental exploration](developmental-exploration.md) extension addresses a different question: why a Thread may choose a life that creates richer opportunities before any visitor arrives. Exploration may make socially porous life more likely, but it never pre-authorizes a concrete meeting request.


## Efficient current life without erasing history

World keeps **immutable enacted CurrentSituation history** and a small, authoritative **current frontier**: one latest situation per Thread, advanced transactionally in the same write that admits the next historical situation. A one-time indexed migration derives that frontier from existing lived history; it does not rebuild the projection on each ordinary read. Reading the current World scales with the present population rather than all situations ever enacted. Historical as-of queries can still resolve the appropriate earlier situation from indexed immutable records.

The same current frontier supports bounded physical-venue discovery, while environmental shared-observer discovery asks the indexed **venue authority**, not the entire population. General `/meet` discovery retains its broader current-World semantics, reading the frontier rather than reconstructing lifetimes. Due boundaries and social/environmental/contact opportunity queues remain their existing event-driven authorities.

The internal Observatory is a **recent inspection**, not a lifetime export: encounters, memories, social interactions, journal entries, consolidation and contact activity have explicit small windows. Recent shared Encounter Stories include participant presence, actual enacted situation (where available), individual attention/Experience, and World follow-up from a joined read. A small indexed story timeline preserves newest-first participant browsing without sorting every historical story. Full historical inspection remains a separately requested future capability, not silently included here.

These are storage and diagnostic efficiency improvements, **not evidence that a Thread chose, remembered, visited, or met anyone**. SQL billing and staging impact require separately measured evidence.

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

**Future efficiency and scale:** A horizon-boundary wake should renew intentional future life without accidentally paying to author a negligible retrospective interval. The suspected boundary-gap inference cost requires measurement, not a shortcut around real multi-day catch-up. See the separate proposed plans for [World cost accounting](world-cost-accounting.md), [World compute optimization](world-compute-optimization.md) and [World reconciliation scaling](world-reconciliation-scaling.md). They preserve independent Thread agency and one authoritative shared World event; none is part of today's accepted life semantics.

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

### Optional paid visitor work is separate from ordinary meeting

Fibre also has an accepted capability for bounded paid visitor-work commitments. A Thread may choose to accept scheduled work, that commitment may shape the Flight Plan, and compensation may follow fulfilled work.

That is a **work/economy relationship layered on top of encounter**. It is not the definition of meeting someone on insidefibre.com.

The ordinary public meeting path is:

```text
Thread-authored Flight Plan
  -> World CurrentSituation
  -> visitor observes the bounded current scene
  -> visitor makes a concrete social request
  -> Thread appraises accept | decline | defer from current life
  -> accepted request may become an encounter
```

The visitor does not schedule, pay, or rearrange the Thread merely to approach them. If a future product surface explicitly offers paid scarce attention or professional availability, the existing work/compensation authority may be used deliberately for that product.

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


### Grounded geography and private residences — S0 staging admitted, social visits still open

S0 adds two complementary World authorities without manufacturing movement or co-presence:

- **Shared public venues:** `world_public_places` identifies one real venue by an independently attested source identity, exact publicly locatable address/coordinates, locality, country, IANA zone, affordances and source witness. A globally stable public `wpl_*` and matching physical `venue_*` identity can be resolved by different Threads. A bounded indexed country/locality lookup finds local public places without enumerating citizens or invoking cognition. Admission is a factual operator/World act; it is not a Thread visit or social opportunity.
- **Privately known physical places:** `world_private_place_locations` binds one Thread-owned situated `per:*` place to a particular grounded current location with its supported precision: an actual street address and coordinates only when evidenced, otherwise locality, time zone, descriptive meaning and source witness. It does **not** infer a home address from Genesis prose, birthplace, or city centroid, and it never makes a private residence a public meeting venue. Existing historical PlaceEpisodes and current situations are not rewritten.
- **God-view versus public presence:** the authenticated Admin can inspect World-attested current physical places, including privately known home descriptions and city-level map positions, even when public disclosure is `hidden`. City-centroid map coordinates are locality approximations, never evidence of the residence's precise position or another person's co-presence. Present and public consumers still observe `publicGranularity`; no Thread-authored disclosure choice exists yet.
- **Mind versus viewer:** ordinary private Flight Planning can receive the Thread's own exact situated location where admitted. When World publishes that CurrentSituation, the place's explicit `publicGranularity` controls whether Present hides geography (the default), shows country only, or shows verified `City, Country`; none exposes the private address, coordinates or detailed home description. Public granularity is operator-admitted World disclosure policy in S0, **not** evidence of Thread-authored consent; future Thread-owned disclosure choice is a separate path. No city or country is inferred when there is no admitted current-place evidence. A later public venue may be disclosed at its World-authorized precision. Existing exact-private World/Thread inspection remains distinct from a visitor projection.

The new authenticated World admission operations are `POST /internal/world-venues/admit-public` and `POST /internal/world-venues/locate-private`, alongside the earlier narrow Genesis-context venue binding. An operator-facing `npm run world-place -- --env staging admit-public --file <source.json>` submits independent place facts; `npm run world-place -- --env staging list --locality Tbilisi --country-code GE` makes a bounded read-only catalog query. One cited venue file is `data/world/places/tbilisi-national-library-building-iii.json`: National Library of Georgia, Building III at 7 Gudiashvili Street. Guy admitted this venue to staging on October 14, 2026 and verified it with a public place catalog read. The file is **not** automatically inserted into other environments, and no Thread visit is implied.

Private-location admission is **precision-aware**. When a CurrentSituation's Thread-owned PlaceEpisode establishes a home in a known city/district but not an exact address, `streetAddress`, `lat`, and `long` must be `null`; `specificPlace` retains its lived descriptive meaning, and the World admits only the supported locality/time zone with an attributable evidence reference. Exact coordinates require an attested address. On admission, the World checks the selected `per:*` is the Thread's actual enacted current place. The private Observatory exposes the admitted location; public Present obeys explicit `publicGranularity` and the bounded `world-social:probe` reports counts without storing addresses in its probe evidence. A location admission does not itself re-enact, replan, republish an existing scene, or produce a social opportunity.

The existing World-place read authority now resolves admitted public `wpl_*` identities for future Flight Planning, and `listWorldPlaces` exposes a public place if (and only if) the Thread's already-enacted current situation references it. This enables later S1 choices and S2 perception without treating the whole catalog as personal history. New public-place discovery is indexed by locality; the existing social co-presence query still needs its S2 extension to find visitors using direct public-venue refs, not just earlier Genesis-context bindings.

 S0 stores and resolves factual geography; **S1** will expose bounded reachable venue choices to the ordinary Flight Planner and carry chosen public `wpl_*` references through planning, travel and enacted presence. **S2** completes real co-presence and spontaneous appraisal using that shared identity. A public venue appearing in a catalog does not establish anyone's location there.

**October 14 staging witness:** Guy ran 13 focused tests and 1,604 full tests successfully, deployed World kernel SHA `4243904008cd6340713936d954b935d23382440d`, admitted and independently listed the Tbilisi library, and admitted three distinct Threads' current Saburtalo residences at **locality precision** with `publicGranularity: hidden`, no invented private addresses and no exact coordinates. A subsequent bounded read-only social probe confirmed `privatelyLocatedThreadCount: 3`, `exactResidentialAddressCount: 0`, no current public-venue visits and no recorded social opportunities in its 40-Thread sample. The `no_attested_venues_in_sample` blocker is expected and does not invalidate S0. Nothing establishes a physical Thread visit or social contact. The next accepted discovery direction is the [Fibre City Guide](social-city-guide.md): a public editorial manifest of possible destinations, followed by Thread-owned memory or guide consultation, voluntary venue selection and World-enacted visits.

### Unprompted social consideration during lived arrival (deployed mechanism, natural acceptance open)

A genuinely enacted, awake or unknown-wakefulness *at-place* situation can earn **one** future social consideration when its World place has an independently attested physical-venue identity. This is queued for the existing World reconciliation alarm, not a new social clock or caller-written request. At the due boundary, World first checks that the exact original situation is still current and selects at most eight **already-enacted** people through indexed venue-bound current-life evidence (not merely recent arrivals; someone already reading in the café for hours remains discoverable). If nobody else is actually there, there is no social cognition.

An eligible initiator reuses the existing meeting service in a stricter, single-candidate mode. Situated Percept, social/exploration-driven salience, private initiation choice, the recipient's independent stance, Encounter Story, individual Experience and selective consolidation retain their existing ownership. A background opportunity or `not_initiate` must create no reciprocal social history. Decline/defer remain legitimate; an accepted conversation must not be prescribed, and the public `/meet` request path stays unchanged.

Each offered situation has one durable claim. If a model call or outward expression is interrupted, the attempt remains explicitly `interrupted` for inspection and is **not silently retried** because the other person may already have heard an overture. This is a deliberately conservative at-most-once trade-off, not an assertion that an interrupted attempt completed. The new social opportunity adds **no** population polling, global co-presence scan, invented shared location, or compulsory conversation. The query returns at most eight real, awake or unknown-wakefulness co-present candidates **after** resolving their latest enacted situation and excluding the arriving Thread; it no longer discards real long-stayers merely because more than 32 Threads have historical bindings to that venue. It remains a bounded, indexed venue read rather than a population-wide search. The choice of counterpart is still limited by its small returned candidate set; very crowded venue costs and social selection diversity remain unmeasured. Transit, Human-initiated contact and richer continuation remain separate work. Natural live staging evidence and measured provider costs are open.

Guy locally validated and deployed the initial autonomous opportunity source at `6ae2d0e` on October 13. The subsequent corrected venue query and read-only `world-social:probe` await their own local validation and staging deployment. The probe samples up to 40 discoverable Threads and reports actual opportunity records and the shared-place scene without issuing meeting requests or waking anyone to socialize; absence from that bounded scan cannot prove population-wide absence.

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
