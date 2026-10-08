---
id: validation-n5-encounter-slices-v0-1
status: accepted
last-reviewed: 2026-09-22
canonical: false
---

# N5 encounter-story implementation slices

## Replan

N5 is being replanned around a broader primitive:

> **Encounter is the primitive. Meeting is one voluntary social form of encounter.**

The first implementation spike started from reciprocal Thread meetings. It exposed useful mechanisms but overfit the core path to invited social dialogue.

The accepted architecture is now:

```text
World occurrence
  -> Encounter Story
  -> Thread-specific noticing / experience
  -> optional journal
  -> selective consequence
```

This one seam should support social meetings, silent witnesses and environmental moments without separate engines.

## What from the spike survives

Retain unless the refactor exposes a concrete flaw:

- ensure-LivedNow and physical presence;
- Thread-specific situated-life place evidence resolved to shared place identity;
- meeting stance: `accept | decline | defer`;
- one n-ary objective story rather than pairwise meeting records;
- separate Thread-specific aftermath;
- existing memory reconstruction precedent: durable rich prompt/evidence lineage with replaceable generated media;
- selective autobiographical retention / `not_remembered`;
- journal authority distinct from memory;
- private R2 journal book at `journals/<threadId>/journal.md`;
- rich Admin journal rendering;
- additive `fibre-thread-objects` bucket;
- existing presentation/media R2 layout unchanged and not migrated.

## What must be reworked

- `lived-reciprocal-meeting.mjs` currently owns behavior that belongs in a general encounter seam.
- `lived-meeting-cognition.mjs` mixes voluntary participation with story progression.
- current group orchestration assumes everyone present is an invited participant;
- social dialogue is still treated as the normal encounter shape;
- no explicit bounded noticing step exists for incidental/environmental occurrence;
- non-person subjects are not yet first-class encounter subjects;
- private experience persistence records provenance/role but not yet the actual Thread-specific noticed experience;
- Encounter Story does not yet carry the durable rich visualization prompt needed for reproducible still/video reconstruction;
- `actor | witness` is useful derived inspection, but should not become the semantic authority;
- old N5 tests target the superseded dyadic store API;
- current `main` is therefore a design spike, not deployment-ready.

Do not restore green by recreating the old dyadic API just to satisfy those tests.

## Slice E0 — Reconcile the spike — CLOSED

**Goal:** return to one coherent implementation vocabulary before extending behavior.

Completed:

- Encounter Story / Thread Experience now name the general persistence seam;
- social meeting is a wrapper over that seam rather than the persistence authority;
- meeting cognition owns participation only; social story progression is separate;
- superseded dyadic meeting persistence/orchestration and tests were removed rather than compatibility-wrapped;
- persisted `actor | witness` authority was removed;
- journal/R2/place/stance work that survived the replan was retained;
- the admin-disabled process test now explicitly removes inherited `FIBRE_ADMIN_TOKEN`;
- full repository CI validation, all tests and Cloudflare dry-runs are green.

The durable Encounter Story visualization prompt is intentionally implemented in E1, where the Encounter Story itself becomes a complete admitted general encounter record.

E0 adds no new lived capability; it establishes one coherent base for E1.

## Slice E1 — Encounter Story + noticing + Thread Experience + visualization prompt — CLOSED

**Goal:** prove the general lived causal seam and make every admitted Encounter Story reproducibly visualizable without requiring a render.

Implemented causal path:

```text
explicit bounded World occurrence
  -> exact LivedNow
  -> objective Encounter Story
       + Thread presence
       + durable rich visualization prompt/evidence lineage
  -> Thread-owned attention appraisal
       noticed | not_noticed
  -> if noticed: Thread Experience in first-person natural language
  -> optional journal
  -> selective memory / not_remembered
```

The environmental seam takes only a stable `occurrenceRef` plus natural-language observable description. It does not create a weather engine, sensory simulator or object ontology.

Encounter Story now persists:

```text
story
threadPresence[]
visualizationPrompt
visualizationPromptDigest
visualizationSourceReferences[]
depictedThreadRefs[]
```

The visualization prompt is deterministic, evidence-bound and media-neutral. It contains explicit scene, observable progression, visual direction, unspecified-detail rules and truth constraints so the same authority can later ground a representative still or a short video. Rendering remains optional.

If no canonical visual identity is bound, the prompt explicitly refuses to invent an identifiable Thread appearance. E4 will connect optional rendering and admitted identity references.

Attention is durably recorded so retries cannot turn a previously unnoticed occurrence into a later noticed one. `not_noticed` creates no Thread Experience. `noticed` atomically creates a Thread Experience with the immediate first-person experience text, and journal/memory cognition receives that personal experience rather than only the objective story.

### E1 organism proof

The accepted proof uses a Thread already walking through a park because of ordinary LivedNow:

- a bee landing on a flower is introduced as an unscheduled World occurrence;
- the objective story is admitted independently of whether the Thread notices it;
- the bee enters attention and becomes a personal calming/attention-shifting experience;
- that experience reaches ordinary selective autobiographical retention;
- a separate cloud occurrence in the same lived setting is admitted but passes `not_noticed`;
- the unnoticed cloud creates no Thread Experience, journal aftermath or memory;
- the encounter visualization is rich and reconstructable but does not invent an unbound likeness.

This proves that life can grow from what happens **while following plans**, and that objective World occurrence remains distinct from lived attention.

Full active and complete test suites, repository validation and all Cloudflare deployment dry-runs are green.


## Slice E2 — Social meeting as a gated encounter — CLOSED

**Goal:** reuse the general seam for voluntary social encounter.

Implemented path:

```text
independent LivedNow
  -> compatible presence/context
  -> initiator decides whether to make a concrete outward request
  -> each invitee: accept | decline | defer
  -> if every required participant accepts:
       one objective Encounter Story
       -> each active participant is durably noticed
       -> distinct first-person Thread Experience
       -> ordinary journal / memory aftermath
```

E2 proves:

- the meeting wrapper reconciles each life independently before doing anything social;
- incompatible physical/mediated presence creates no Encounter Story and does not teleport or silently replan anyone;
- physical compatibility requires the same explicitly admitted live `wpl_*` authority; equal reusable Genesis/Thread-context place IDs do not count as co-presence;
- the initiator may choose not to initiate at all; when she does initiate, her outward request is the first observable beat if the meeting forms;
- a compatible invitee may decline or defer that concrete request, and that stops the voluntary encounter before history exists;
- relationship, memory and interior state are supplied independently to initiation/stance cognition without becoming a mechanical score;
- the recipient weighs the concrete ask against current life and the totality of supplied relationship/history; civility is a contextual social pressure to respond, never an acceptance rule;
- accepted participants reuse the E1 attention/experience authority, with participation making attention deterministically `noticed` rather than adding a redundant attention cognition call;
- one shared Encounter Story may already produce different private Thread Experiences before journal or memory.

No calendar or invitation subsystem was added. The request is one bounded Thread-authored social ask inside the already-current scene.

Full repository CI validation is green.

## Slice E3 — N-ary story + silent witness — CLOSED

**Goal:** prove one shared story can affect more than the speakers.

Implemented path:

```text
A + B independently current
  -> compatible voluntary meeting
  -> A and B accept
  -> one objective Encounter Story
       + A presence
       + B presence
       + explicitly known, independently current C presence
  -> A/B participation => durably noticed
  -> C receives no stance and no story turn
  -> C uses the E1 attention authority
       noticed | not_noticed
       -> if noticed: C Thread Experience
       -> ordinary private journal / selective memory aftermath
```

E3 deliberately did not add a witness subsystem. Its original proof used explicit witness IDs only as temporary scaffolding. **E6 subsequently removed that scaffolding:** incidental witness candidates are now derived from authoritative co-presence for each accepted Encounter Story. Encounter Story remains the single n-ary authority, and every admitted Thread must independently have compatible World-owned presence.

Witnesses:

- are not invitees and do not receive `accept | decline | defer`;
- are excluded from social story cognition and therefore cannot be fabricated as speakers;
- are included in the one objective `threadPresence` only when their own World-owned current situation establishes co-presence;
- reuse E1 `noticed | not_noticed` attention;
- receive Thread Experience and ordinary journal/memory aftermath only when noticed.

No relationship state is mechanically changed by encounter admission or attention.

### E3 organism proof

The accepted proof places Mina, Noor and Sela independently at the same **explicit admitted live World place**. Mina speaks rudely to Noor; Noor answers; Sela is at the next table and never speaks.

The proof establishes:

- exactly one Encounter Story carries all three genuine presences;
- only Mina and Noor receive meeting stance and social story cognition;
- Sela has no objective story beat;
- Sela notices the exchange through the general attention authority;
- all three private experiences cite the same objective story while diverging in lived meaning;
- Sela can privately journal the incident and selectively retain autobiographical memory despite never being addressed.

Full repository CI validation and all deployment dry-runs are green.

This is the core proof that shared event != shared meaning.

The shared Encounter Story has one objective visualization prompt. A later memory reconstruction for A, B or C is separately derived from that Thread's retained memory and may legitimately look different.

## Slice E4 — Journal book + optional encounter rendering + Admin acceptance — CLOSED

**Goal:** make private lived reflection inspectable without making it memory authority, and prove the E1 Encounter Story visualization lineage can be inspected and optionally rendered through existing generated-asset machinery.

Implemented without adding a second authority:

```text
World Encounter Story + Thread attention + World journal-entry provenance
                    |
                    +-> Admin read-only inspection
                    |
private R2 journal book ------------------------^

Encounter Story.visualizationPrompt
  + depicted Thread refs
  + each Thread's canonical visual identity
  + age(Thread.birthDate, encounter.occurredAt)
       -> ordinary experience asset slot
       -> existing generated-asset demand/job machinery
```

Admin now presents the stable Thread-specific journal title/aesthetic and free-form book while also exposing the underlying World journal-entry records separately. The UI names the distinction explicitly: the R2 book is presentation of private journal authority; neither the book nor a journal record implies autobiographical retention.

Admin also exposes, per Encounter Story:

- the objective story and genuine Thread presence;
- the E1 objective visualization prompt;
- prompt digest and source-reference lineage;
- depicted Thread refs;
- this Thread's own `noticed | not_noticed` attention / Thread Experience.

Optional encounter rendering is now a small planner over the same E1 lineage. It does not create a new render authority or store. It produces the existing `experience` presentation-asset slot shape for either image or video. When a Thread is objectively depicted, the planner requires that Thread's own canonical visual reference and derives target age from the encounter timestamp. Missing required visual identity defers the render rather than inventing a likeness. Video planning additionally refuses to invent identity-specific voice.

Generated encounter media remains replaceable representation. The planner's constraints explicitly prohibit treating it as World evidence, Thread Experience, journal, memory, relationship state or identity authority.

Social Encounter Stories now bind `depictedThreadRefs` from actual observable story actors rather than all co-present Threads, so a silent witness is not visually inserted merely because she was nearby.

### E4 organism proof

The focused E4 proofs establish:

- Admin can receive one objective Encounter Story, its visualization lineage, this Thread's attention and World journal-entry provenance while the Thread has zero autobiographical memories;
- the same Thread retains her stable private journal presentation independently of memory;
- one objective social Encounter Story can plan both a still and a video from the same durable prompt;
- Mina and Noor carry separate canonical visual references and chronology-derived ages into that render demand;
- private witness interpretation does not enter the objective render brief;
- the still becomes a normal generated-asset job through existing presentation-demand machinery;
- omitting Noor's canonical visual reference defers the render instead of inventing her appearance.

The first implementation commit exposed one prohibited private cross-owner Asset Generator import. The repository dependency gate caught it immediately; the planner was simplified to own only its intentional `image | video` choice and delegate ordinary asset validation to the existing demand seam. The replacement full CI run is green.

No existing presentation R2 objects were migrated. No encounter render is required for Encounter Story completion, and E4 does not require a live provider-generated image/video; that remains optional staging evidence.

## Slice E6 — Autonomous encounter production/discovery — CURRENT

**Goal:** remove the remaining caller orchestration from environmental and silent-witness encounters without changing the accepted Encounter Story / attention / aftermath ontology.

The general encounter seam is already proven for:

- environmental occurrence;
- voluntary social participation;
- n-ary shared story;
- silent witness;
- `noticed | not_noticed`;
- subjective Journal;
- selective Memory / `not_remembered`.

The missing capability is narrower:

```text
environmental:
caller currently supplies occurrence text
  -> E6: World authors bounded occurrence from current scene

silent witness:
caller currently supplies witnessThreadIds
  -> E6: World derives candidate witnesses from authoritative co-presence
```

E6 is intentionally scheduled **after developmental-exploration X4 acceptance and before X5+ rich-Person/social-discovery work**.

That ordering prevents a subtle architectural bias: if Fibre can autonomously discover people but cannot autonomously discover ordinary World events, developmental exploration will become disproportionately social simply because social opportunities are easier for runtime code to produce.

### E6a — bounded environmental occurrence production

At a meaningful LivedNow boundary, Fibre may produce zero or one bounded textual occurrence from existing World/place/current-scene meaning.

The trigger supplies Thread/time/current scene. It does not supply the event prose or a label such as `interesting`.

Any admitted occurrence becomes an ordinary objective Encounter Story and then uses the existing attention / Experience / Journal / Memory path.

Do not add periodic simulation, an event quota, a universal event bus, or repeated model sampling until something salient appears.

### E6b — incidental witness discovery

For any admitted Encounter Story, inspect authoritative CurrentSituations for genuinely compatible co-presence.

Derived candidates are not invitees, speakers or participants. Each independently receives the existing attention appraisal:

```text
co-present candidate
  -> noticed | not_noticed
  -> if noticed: Thread Experience
       -> optional Journal
       -> selective Memory
```

The caller does not choose witness IDs.

### Implemented shape

E6a now removes caller-authored environmental prose from the production seam:

```text
caller: threadId + time
  -> ensure LivedNow
  -> exterior current scene only
  -> one bounded World occurrence-generation call
       -> one observable occurrence text
  -> ordinary Encounter Story
  -> existing noticed | not_noticed
  -> existing Experience / Journal / Memory aftermath
```

The occurrence author receives no Thread-private identity, memories, traits, needs or developmental pressure. It sees only the exterior CurrentSituation and admitted place meaning. Encounter Story remains the first durable World-event authority; no occurrence table or generic event bus was added.

E6b removes `witnessThreadIds` from the social service and private write API. For each accepted story, already-current compatible co-present Threads other than the two speakers become incidental witness candidates automatically. They are not invitees, speakers or participants in the voluntary request; each independently receives the existing attention appraisal and aftermath only if noticed.

### Acceptance

The focused E6a proof requires a caller that supplies only Thread/time while World authors a bounded environmental occurrence, proves retry reuses the admitted story rather than resampling it, and preserves `not_noticed` as a legal attention outcome. Ordinary scenes need not invoke occurrence production at all, so E6 creates no encounter quota.

The focused E6b proof requires a genuinely co-present C to become a silent witness of A/B's story without the caller naming C, while C receives no social stance or story turn.

Zero generated encounters remain valid across ordinary life because the producer is not a tick and is not invoked for every scene; zero noticed witnesses remains valid for any admitted story. Acceptance proves autonomous production/discovery, not encounter frequency.

E6 local semantics remain pending operator validation, and live evidence uses a dedicated bounded probe rather than the broader N5 encounter acceptance harness.

Run:

```bash
npm run encounter-autonomy:probe -- --env staging
```

The live probe:

- cheaply reads existing Observatory state without population-wide `LivedNow.ensure`;
- attempts E6b only when **three Threads are already genuinely co-present**;
- if no such scene exists, records `blocked_by_world_state` rather than waking or replanning unrelated Threads;
- leaves independently live-proven E6a untouched while E6b remains unproven; it reports environmental `not_run` instead of making an unnecessary paid model call;
- only when E6b is proven does the combined probe re-prove E6a on one current Thread by supplying `threadId` and checking durable objective occurrence + selective attention;
- reports the next already-admitted three-Thread shared-`wpl_*` plan overlap when one exists, so a later rerun can catch a natural witness opportunity;
- never samples repeatedly to force a meeting or witness.

A probe may therefore finish successfully with `complete:false`. That means the probe itself succeeded while current World state did not expose a live E6b opportunity; it is not permission to mark E6 fully accepted.

**2026-10-08 operator staging check:** Guy validated `420984590bf0e82dbda3f4ebd0fab0fb1f8c0a49` with 11/11 focused E6 tests green, then ran the witness-first `encounter-autonomy:probe -- --env staging`. The bounded scan found 28 current Threads, zero three-way co-present groups, and no upcoming three-way shared-plan window in the scanned current plans. Witness result: `blocked_by_world_state`; environmental: `not_run` (the earlier E6a live proof remains valid); probe `complete:false` in 8.3 seconds. Evidence: local `.fibre/encounter-autonomy/staging/encounter-autonomy-muzqqfs9/evidence.json`. This validates efficient no-op behavior, **not** live E6b witnessing. No World life, plan, or counterparties should be artificially changed to satisfy the probe.

E6 remains pending live witness evidence.

---

## Slice E7 — Shared place-scoped environmental occurrences — ACTIVE

**Goal:** one observable environmental happening belongs to the World, never to the particular Thread that triggered its authoring. E7 extends E6a, not the encounter ontology.

### E7.1 — One shared objective happening, distinct lived attention

For an already-admitted shared physical World place (`wpl_*`):

```text
one bounded environment encounter request: Thread + exact lived time
  -> World ensures that Thread's real LivedNow
  -> authentic shared World place + existing CurrentSituation witnesses at that time
  -> World occurrence author sees place/time, not any observer's identity or activity
  -> one Encounter Story with actual co-present Thread situations
  -> each present Thread independently noticed | not_noticed
  -> only noticed Experience enters existing delayed consolidation
```

The existing E6a one-Thread path remains for transit or non-shared physical locations. E7 does not conflate reusable Genesis place IDs with live physical co-presence, and it does not use a shared mediated context as evidence that a physical rainstorm occurred around every member.

One triggered episode appraises the requesting Thread and at most three additional already-current witnesses. That is a model-compute burst bound, not a target for encounters or attention; the objective story may include more genuinely co-present Threads. Their optional later observation must reuse the same immutable event and their own attention authority.

The existing Encounter Story store now atomically reuses an already-admitted single-beat environmental occurrence for the **exact same shared World-place reference and occurrence timestamp**, even if concurrent producers propose different descriptions. It uses an indexed occurrence-time query over the existing story/source evidence; no separate occurrence table, event bus or weather state was introduced. A Thread absent from the original admitted event's presence set cannot retroactively add itself to that event.

**Focused acceptance proof:** two genuinely co-present Threads share the same place/time-scoped objective event; one notices and forms Experience, the other does not; an unrelated Thread at another location is absent; the second Thread's independent invocation does not generate a second rainstorm; a competing newly proposed description cannot rewrite the admitted event. Retry may not duplicate attention or consolidation.

**E7.1 local focused validation passed (Guy, 2026-10-08).** Production/staging evidence of two naturally co-present Threads at an admitted `wpl_*` remains pending. A lack of co-presence is `blocked_by_world_state`, not grounds to teleport Threads or weaken the acceptance proof.

### E7.2 — One earned World continuation — IMPLEMENTED / VALIDATION PENDING

Once an admitted shared-place E7.1 environmental occurrence exists, it may earn **one** later World follow-up. The implementation currently uses a fixed 30-minute delay as a provisional scheduling policy, not a claim about weather duration or a required rate of environmental change.

```text
shared objective occurrence at place/time
  -> one durable future opportunity (same World authority)
  -> existing InfraDriver World alarm (no separate timer)
  -> prior objective occurrence + place + elapsed lived time
  -> replaceable World cognition: changed | no_change
       no_change -> completed work, no new World event
       changed   -> one new objective Encounter Story
                    with continuationOfEncounterRef
  -> quiescent (no further chained alarms)
```

The model does not see a particular Thread's genome, private memories, goals, scene activity or personal sensations. The World validates and persists the candidate decision before attempting to materialize a changed occurrence. A retry reuses that durable decision; the admitted occurrence is still deduplicated by exact place/time through E7.1. The due timestamp is the intended *lived* event opportunity; `completedAt` records when the follow-up was actually reconciled.

The follow-up can be **World history with zero Thread witnesses**. An unattended change of weather is still an objective event, but it does not generate invented attention, personal Experience, Journal or Memory. Its absence from a person's autobiography is not evidence that the event never happened. Physical presence or recipient notice must be proven by the normal World/perception authorities before any later subjective consequence can be claimed.

The durable `world_environment_followups` rows are bounded scheduler/decision bookkeeping, **not** a second World occurrence authority. Initial objective events and later changed objective events are Encounter Stories, not synthetic conversation messages. An idle World makes zero provider calls. One admitted initial shared occurrence earns at most one additional provider consideration and cannot recursively schedule a weather loop. Existing Local and Cloudflare World reconcilers consume the same domain process.

**Focused acceptance:** one rain event earns one due opportunity; early World wakes do zero cognition; `changed` admits a second causally linked objective event without inventing participants; `no_change` admits no event; a storage failure after deciding retries without reauthoring; an unrelated World wake preserves the due alarm; completed work returns to quiescence. Local semantic tests and the full slice validation remain pending Guy's CLI evidence.

**Deployment acceptance still deferred:** show an actual staging shared-place E7.1 occurrence, one delayed E7.2 follow-up, and retained due-time/retry evidence without forcing co-presence or declaring world-wide weather realism.

### E7.3 — Natural shared-place acceptance — NOT STARTED

When the World supplies natural overlap, demonstrate multiple independently different attention/Experience outcomes for one E7.1 occurrence. E7.2's unattended follow-up must remain World truth, not retroactively claimed personal experience. The future step for a later present Thread to *notice a recent unattended event* requires an explicit bounded World-at-place perception window, not fabricated historical presence.

### Explicitly deferred

- A continuously evolving external weather system or meteorological feed (deferred, no current authority).
- Independently seeding new place-events without a prior admitted environmental occurrence (deferred: E7.2 only earns one delayed follow-up after an E7.1 event).
- Scalable background attention fanout across very crowded places (deferred; the currently admitted presence set is larger than the bounded immediate cognition cohort).
- Physically fine-grained sight/hearing/occlusion within the same World place (deferred; co-presence only establishes *potential* observability, not guaranteed noticing).
- In-progress live-conversation exposure of third-party speech fragments (separate N7/E6 integration proof).
- Longer-lived environmental state, cross-event causal simulation and repeated weather progression beyond E7.2's single linked follow-up (deferred).

No global ticking, quota of interesting events, simulation framework, event-interest score, new memory subsystem, or mandatory Journal/Memory production.

---

## Slice E5 — Natural lived encounter acceptance — CURRENT

E5 remains the roadmap label, but its forcing model has changed.

The previous acceptance path over-centered this sequence:

```text
find/coerce shared presence
  -> ask whether Threads enter Commons
  -> ask whether one initiates
  -> require an accepted meeting
```

Staging correctly rejected that simplification. A late-night cohort mostly sleeping or winding down chose to stay out. Earlier cohorts also showed that shared presence can coexist with genuine `not_initiate`. Fibre must preserve those outcomes rather than make the prompts more sociable.

The accepted architecture is now [Situated perception and salience](../architecture/situated-perception-and-salience.md):

```text
ordinary World circumstances
  -> LivedNow / CurrentSituation
  -> Situated Percept
  -> regulation + cheap salience
  -> Interior Cognition when material
  -> ordinary action / no action
  -> Encounter Story when something observably happens
  -> Thread-specific experience and consequence
```

Commons remains one legitimate mediated place, not an acceptance mechanism.

### Pivot slices

#### W0 — Reciprocal outward social history — VALIDATED

Persist only actual outward Thread-to-Thread requests and observable `accept | decline | defer` responses.

Private `not_initiate` creates no shared record.

The record exists so later perception/cognition can know facts such as “I asked her yesterday and she declined” or “she approached me recently and I accepted.” It is never a momentum score.

**Stop condition:** focused tests and `npm run slice:validate` are green; both participants resolve the same observable request/response; private hesitation leaves no shared record.

#### W1 — Situated Percept -> social initiation — VALIDATED

Add one compact `situated-percept.mjs`-level projection inside the existing World Kernel. Do not add a service hierarchy or durable percept store.

For the first consumer, derive only what Fibre already authoritatively knows:

- exact current situation;
- physical/mediated setting and known place identity/texture;
- the Thread's current activity;
- genuinely co-present counterpart identity and observable current activity;
- bounded recent reciprocal social history;
- prior admitted Encounter Story refs/facts where useful.

Replace the ad-hoc social exterior packet rather than compatibility-wrapping it.

**Implemented shape:** one ephemeral `situated-percept.mjs` projection now derives exterior setting, observer activity, co-present Thread identity/activity, bounded reciprocal request/response history, prior admitted Encounter Story facts and source references from existing authorities. Social initiation consumes this single percept plus its own remaining Flight Plan. The prior social-specific packet is removed rather than wrapped.

**High-value proof:** hold initiator, developed-self evidence and counterparty constant; change the counterparty's observable current activity and require an attributable change in the private social judgment. The proof also asserts that counterpart private state/genome never enters the percept.

This slice is intentionally one consumer. It proves the general percept seam without building a generalized simulation framework.

#### W2 — Direct social response uses the same mind — VALIDATED

The remaining legacy meeting-stance persona path is replaced by Interior Cognition using the same Situated Percept plus the concrete outward request.

Grounded politeness, hospitality, cultural/social expectations, relationship history and interruption cost can matter as **developed-person evidence**. There is no `politenessScore`, demographic rule or automatic acceptance. A direct request already warrants appraisal and therefore does not wait for the ordinary Salience Gate.

Raw-genome/persona injection and the stance-specific manual memory/relationship/semantic-state selectors are removed. The shared Interior Cognition selector is the one private-context authority. `defer` remains a private choice, while Fibre separately validates that a proposed time actually fits the current Flight Plan horizon.

**High-value proof:** hold the exact outward request, recipient and selected private evidence constant; change only a stable observable setting fact and require the recipient's stance to change. The proof also asserts that the requesting Thread's private interior never enters the recipient's Situated Percept.

#### W3 — Cheap general Salience Gate — VALIDATED

One small pure materiality function now sits before optional social-initiation cognition.

The first profile is intentionally non-numeric and consumes only grounded anchors already available or explicitly produced by World opportunity code:

```text
shared mediated context
planned/enacted participant presence
recent admitted observable interaction history
unexpected_observable
```

`unexpected_observable` is context-relative scene deviation, not a weirdness score. A producer may eventually ground it from facts such as unusual dress/body state, abrupt movement or another observable change **relative to the current setting**. The gate does not decide whether a hat is funny, nudity is sexual, or running is threatening; it only decides whether the unusual observable deserves cognition.

Output is only:

```text
background
salient
```

plus a bounded mechanical witness of the anchors/source refs. No semantic feeling, motive or choice is authored. No randomness exists in this version.

Critically:

```text
background != not_initiate
```

Background means the opportunity never warranted private social cognition. It creates no refusal and no shared social history.

**High-value organism proof:** real compatible ambient co-presence with no materiality anchor must return `background`, `initiation:null`, spend zero model calls, and create neither reciprocal interaction nor Encounter Story. Existing planned/mediated/recent-history paths prove that an anchored opportunity can continue into Interior Cognition. W4 must prove that World-produced observable anomaly/change cues are grounded rather than caller decoration.

#### W4 — Ordinary World opportunities from active LivedNow — VALIDATED

The first opportunity producer is deliberately tiny and lives inside the existing Situated Percept projection rather than a new simulator/service.

When authoritative current situations establish observable co-presence, `SituatedPercept` derives one actor-specific opportunity per observed Thread:

```text
actor_presence
  actorRef = one observed Thread
  subjectRefs = [that Thread]
  sourceReferences = observer + observed CurrentSituation refs
```

The social path consumes these derived opportunities; it does not author them itself.

This means:

```text
LivedNow / current situations
  -> Situated Percept
  -> ordinary co-presence opportunity
  -> Salience Gate
  -> background | Interior Cognition
```

Planned/enacted participant presence can make the opportunity salient. Compatible ambient co-presence with no materiality anchor remains a real opportunity but stays background and costs zero cognition.

This first W4 proof intentionally does **not** build nearby-entity discovery, a world object registry, environmental event generator, scene simulator or universal event bus.

It also does not emit `unexpected_observable` yet. Fibre currently has no authoritative general scene-fact record from which to prove that an unusual hat, nudity, abrupt running or another observable is anomalous **in this setting**. W3 preserves that cue as a consumer contract, but W4 refuses to fill it from caller labels or generated prose. A later World-observation extension can add it once the evidence is real.

**High-value organism proof:** a social encounter service receives only current lives/participants; the resulting salience witness names the co-present Thread and cites both current situation refs even though the wrapper never constructs the opportunity. The same derived opportunity can remain background with zero model calls when no salience anchor exists.

#### W5 — Grounded exploration / curiosity pressure — VALIDATED

The previously documented exploration / information / play family now exists in the regulator kernel as an `exploration` drive.

The first live evidence is deliberately narrow:

```text
previous authoritative CurrentSituation
current authoritative CurrentSituation
  + distinct observations
  + >= 20 minutes apart
  + same physical place
  + same mediated context
  + same enacted activity
  + same participant set
  -> low novelty
  -> exploration pressure
```

Neither time passage nor absence of social records is sufficient on its own. The implementation does not classify activities as “boring,” parse activity prose for keywords, infer loneliness, or create a social-contact deficit.

The Salience Gate may consume active exploration pressure as one mechanical anchor. This lets an otherwise-background opportunity earn cognition because the organism is under grounded novelty-seeking pressure.

The first slice remains subsemantic. It does not require an interoception model call or persist `emotion:interest` / `need:novelty_growth`, though those registered dimensions remain available when later evidence justifies semantic interpretation.

**High-value organism proof:** hold the same ambient co-present opportunity and Thread context constant. Without grounded sustained sameness it remains background and costs zero cognition. With two qualifying prior/current LivedNow observations it becomes salient through `exploration_pressure`, reaches cognition, and may still choose `not_initiate` with no shared interaction record. Thus exploration changes attention without forcing social behavior.

The first proof does not claim the ambient opportunity itself is novel. It proves that low-novelty organismic state can widen attention. Opportunity-specific novelty/anomaly still requires authoritative World scene evidence.

Social-contact/privacy regulation remains deferred until Fibre has enough observation to distinguish solitude from missing data.

#### W6 — Bounded salience microvariation — EXPERIMENTAL / OPTIONAL

Only if deterministic salience proves unnaturally rigid, add small replayable variation near ambiguous thresholds.

The variation belongs to attention/materiality, not the final decision. Strong background and strong salient cases should not flip.

Seed from stable episode inputs so retry/replay is stable.

**High-value proof:** strong cases are invariant; genuinely near-threshold cases may vary across distinct episodes without changing on retry.

Delete this slice if it adds complexity without measurable Fibre-quality benefit.

#### W7a — Natural scene / co-presence discovery — VALIDATED

The caller may now select **only the initiating Thread**. It may not choose the nearby Threads that should enter social cognition.

The World/LivedNow path is:

```text
initiator
  -> ensure initiator LivedNow(at)
  -> list latest established CurrentSituation per Thread at <= at
  -> find physically/mediately compatible candidates
  -> ensure each candidate at the same at
  -> re-check compatibility
  -> Situated Percept
      -> actor_presence(Noor)
      -> actor_presence(Sela)
      -> ...
  -> independent salience/cognition per actor
```

Discovery is intentionally bounded to Threads that already have current-life evidence. It does not wake the entire population merely to search for possible co-presence.

A café may therefore create several independent opportunities in the same lived interval. The current social seam may admit more than one separate Encounter Story at the same `occurredAt`; it does not arbitrarily select a first actor or collapse everyone present into a single group meeting.

Group conversation remains a preserved extension path: several actor opportunities may later converge into one n-ary Encounter Story when an actual shared event does so. W7a does not add group-selection machinery pre-emptively.

E6 subsequently removed the explicit E3 witness scaffolding. Callers no longer choose incidental witnesses: after an Encounter Story forms, Fibre derives compatible co-present candidate witnesses and gives each the ordinary `noticed | not_noticed` attention path.

Human/person interaction uses the same future exterior seam:

```text
ambient person presence -> actor_presence
person directly addresses Thread -> direct_social_act -> appraisal
```

A human does not receive or expose Thread-private state. Direct address warrants cognition because it is an admitted outward act, but it never compels response. W7a does not implement the person-presence authority yet.

**High-value organism proof:** invoke social consideration with Mina's ID only while World-current state independently contains Noor and Sela in the same café. Fibre must discover both, create two separate actor opportunities, and be capable of admitting two separate Encounter Stories in the same lived interval. A Thread in another place or a reused Genesis-only place identity must not be discovered.

#### W7p — Shared live World-place + local-time authority — IMPLEMENTED; validate

The first live W7b run found no actor opportunities because Fibre had no production physical shared-place authority. Existing Genesis PlaceEpisodes are Thread-specific historical/situated evidence and must remain so. Equal Genesis/WorldSpec place IDs are reusable authored substrate, not proof that two live Threads occupy the same physical venue.

W7p introduces one explicit live authority:

```text
Genesis Civil Registry world_ref
+ immutable WorldSpec source material
+ historical-envelope placeKind/timeZone
        ↓ explicit admission policy
live_world_place_records
        ↓
wpl_* shared live venue ref
        ↓
Flight Plan may choose it
        ↓
CurrentSituation may enact it
        ↓
matching admitted wpl_* refs may establish physical co-presence
```

The first admission policy is deliberately conservative:

- admit only `library_or_learning`;
- do not admit `home`;
- do not yet admit broad `market_or_commerce`, school or transit places whose spatial granularity may not establish actual perceptual co-presence;
- never treat matching Genesis place IDs as physical truth.

The live-place record is immutable and versioned. Genesis WorldSpec/place identity is provenance for creating it, not the live co-presence authority itself. This is a small transition seam compatible with the longer-term `PlaceSpec -> WorldSlice -> ThreadWorldContext` architecture; it does not redefine reusable Genesis substrate as shared live reality.

Under `live-world-place-admission-v1`, Civil Registry membership in the same Genesis source World is the explicit admission input for one new live-world namespace. This is a versioned operational policy for the live society, not a historical inference. The resulting `lworld_*` / `wpl_*` identities are new authority records.

The same World authority supplies the historical-envelope IANA time zone to Flight Planning as a structured `localHorizon`. Local civil time is factual context; it does not mechanically create activity, boredom, sociability or motive.

**High-value proof:** a real Genesis-published Thread admits a public live venue but not its home; the shared venue appears in ordinary Flight Planning with local civil-time context; the Thread independently chooses it and LivedNow later enacts the `wpl_*` ref without rewriting historical PlaceEpisodes. Social organism tests use `wpl_*` as the positive co-presence path while a matching Genesis-only place remains a negative case.

#### W7b — Natural lived encounter staging proof — BLOCKED ON W7p; then rerun

Replace the social-first forcing assumption with a lived-world acceptance run during credible active periods.

The runner may choose Threads/times to observe, but may not author their scene, private motive, opportunity, salience result or social decision.

The staging runner may choose Threads/times to **inspect**, but it may not choose their social counterparties, author the opportunity, force Commons entry, assign a witness, alter salience, or weaken a private/social refusal.

The implemented harness now calls `/internal/social-meeting` with only `initiatorThreadId` and evaluates the returned World-discovered actor attempts.

Acceptance requires:

1. at least one non-harness-authored `actor_presence` opportunity discovered from ordinary World/LivedNow state;
2. at least one background opportunity or explicit voluntary refusal, proving selective attention/agency;
3. at least one salient opportunity that reaches Interior Cognition;
4. at least one natural `not_initiate | decline | defer`;
5. at least one naturally accepted Encounter Story with both participant Thread Experiences durable;
6. at least two distinct private journals from that accepted story;
7. asymmetric `retained | not_remembered` autobiographical memory across the participants;
8. durable observatory agreement for the story/experience/journal/memory outcomes;
9. stable Admin journal presentation and one generated still bound to the admitted Encounter Story visualization lineage.

The evidence contract also records whether any inspected scene naturally produced multiple separate encounters in the same lived interval, but that is observational evidence rather than a mandatory staging outcome because W7a already proves the capability structurally.

Live W7b does **not** nominate a silent witness. E3 remains the controlled witness-asymmetry proof until witness discovery itself becomes endogenous; caller-supplied witness membership would contradict the natural-scene acceptance goal.

A naturally accepted social story remains required live evidence, but Fibre must not manufacture motive or weaken refusal to obtain it.

### Engineering constraint for the pivot

Keep the implementation light and replace superseded shapes rather than retaining compatibility layers.

The intended new code surface is approximately:

```text
situated-percept.mjs    exterior projection
salience-gate.mjs       cheap mechanical materiality
interior-cognition.mjs  existing private mind
```

plus the smallest World/LivedNow opportunity integration required by W4.

No generic perception framework, social simulator, universal event bus, high-frequency organism loop, new conversation store, or second World authority.

## High-value tests only

Keep the test set intentionally small.

The required organism-level proofs are:

1. **Environmental noticing** — an unscheduled World occurrence can become one Thread's experience and selective consequence.
2. **Voluntary meeting** — compatible presence does not force a social encounter.
3. **Witness asymmetry** — one shared story can affect a silent witness differently from the actors.
4. **Journal != memory** — a journal can exist without autobiographical retention and vice versa where warranted.
5. **Visualization truth** — the encounter reconstruction prompt contains only admitted objective scene evidence while a Thread's memory reconstruction remains separately subjective.
6. **Continuity** — a retained consequence can bend later cognition; not-noticed/not-remembered content does not leak into recollection.

Avoid tests of HTTP status codes, helper shapes, exact prompt wording, R2 prefix mechanics or CSS unless the boundary itself is the semantic capability under proof. Do not drive causal fixture outcomes by parsing incidental prose or capitalization; prefer stable lived/domain facts such as setting mode, admitted interaction outcome, authority, presence or durable references unless natural language itself is the capability being tested.

## Explicit non-goals

Do not build:

- a universal event bus;
- a full physical/sensory simulator;
- a global object ontology;
- a conversation/session framework;
- automatic bystander simulation across the whole World;
- a social-score system;
- automatic memory;
- personality updates after every occurrence;
- a second current-life authority;
- migration of existing presentation R2 assets;
- an encounter render completion obligation;
- provider-specific video orchestration in World state.

## Review questions

Before implementation resumes:

1. Is Encounter Story the right objective authority, or should it be named simply Encounter?
2. Should Thread Experience persist the Thread's noticed subjective account as natural language, or store only provenance and let journal/memory be the first textual interpretation?
3. When several actor opportunities become mutually involved in one event, what minimal rule should compose them into a single n-ary Encounter Story rather than separate encounters?
4. For incidental witnesses, should the first proof use explicitly known co-presence rather than automatic World-wide witness discovery? The proposed answer is yes.
5. What authoritative person-presence/action record should let human visitors enter the same Situated Percept opportunity model without giving humans fictitious Thread-private state?
6. Should environmental occurrence synthesis initially be part of LivedNow/catch-up cognition or a separate bounded World occurrence seam? The proposed first slice keeps it explicit and bounded, then integrates with LivedNow once the causal model is proven.
