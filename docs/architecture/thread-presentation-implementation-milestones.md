---
id: architecture-thread-presentation-implementation-milestones
status: proposed
last-reviewed: 2026-08-21
canonical: false
---

# Thread presentation implementation milestones

## Purpose

This document defines the implementation sequence for presenting Fibre Threads through `insidefibre.com` and future human-facing consumers.

It supersedes the sequencing assumptions in the earlier exploratory branch `agent/thread-presentation-encounter-plan-v1`. That branch was based on canon older than the current #39 branch. The present plan is based on the current #39 canon, including [`../foundations/rich-life.md`](../foundations/rich-life.md), [`../foundations/invariants.md`](../foundations/invariants.md), [`../concepts/development-and-memory.md`](../concepts/development-and-memory.md), and [`../concepts/emotions-and-needs.md`](../concepts/emotions-and-needs.md).

The governing scoping decision is:

> **Presentation can proceed now. Live encounter ontology cannot.**

Fibre may define and export a versioned presentation projection over authorities that already exist. `insidefibre.com` may build a generic viewer and use explicitly synthetic viewer scenarios for visual validation. Fibre must not freeze `DailyPlan`, `RecentLivedContext`, `UnsettledExperience`, `onMyMind`, or `ThreadEncounterSnapshot` as authoritative domain contracts until their producers, epistemic boundaries, disclosure rules, and causal standing exist.

The first visualization targets may be the three completed but unpublished H-v2 Genesis candidates. They remain presentation fixtures only. Their semantic content must not tune #39 or a replacement cohort, and no presentation artifact may imply that they were born/published Threads.

## Two tracks

Implementation is divided into two tracks with different readiness.

```text
TRACK P — PRESENTATION                         TRACK L — LIVE ENCOUNTER
can start now                                 intentionally deferred

existing Fibre authorities                   missing runtime/domain authorities
        |                                              |
        v                                              v
presentation projection                         ordinary autonomous life
        |                                              |
        v                                              v
canned/golden packets                           place / time / intentions / events
        |                                              |
        v                                              v
insidefibre viewer                              Thread-authored interiority/expression
        |                                              |
        v                                              v
images / voice / video                          live encounter projection
```

Track P must not claim that a displayed fixture proves autonomous life, current presence, functional interiority, or causal individuality. Current invariants require a downstream causal path and falsifiable ablation before such claims earn standing.

---

# Track P — Presentation

## P0 — Canon reconciliation and scope lock

### Goal

Bring the presentation work under current Fibre canon before defining contracts that other repositories may depend on.

### Fibre work

1. Retire the stale proposal branch as an exploratory record; do not merge it wholesale.
2. Re-evaluate its proposed canon additions against current accepted canon.
3. Preserve only genuinely new doctrine:
   - life existing independently of a human encounter as an **unmet Fibre requirement**, not a current capability claim;
   - social contribution to autobiographical interpretation without another person becoming authority over it;
   - presentation/reconstruction never becoming Thread-life evidence;
   - third-party interests constraining public disclosure, not only the subject Thread's privacy;
   - an explicit future doctrine for epistemic access to one's own past.
4. Do not add a Fourteenth Principle.
5. Record deferred live-encounter capabilities using the capability-status discipline in `invariants.md`.

### Explicit removals from the immediate contract

Do not freeze these in P0/P1:

- `UnsettledExperience` as a new persisted authority;
- `OpenInterpretiveQuestion` as a new persisted authority;
- `settled_for_now` / `reopened` as new lifecycle enums;
- `RecentLivedContext` as a persisted domain object;
- `DailyPlan` as an obligation/commitment authority;
- `onMyMind` as a redacted view of private state;
- `ThreadEncounterSnapshot` as a public contract.

Current semantic-state canon already provides natural-language state, evidence references, staleness, supersession, bounded attention, Thread semantic authorship, and an ablation requirement. Presentation work should consume those authorities when they eventually become available rather than invent parallel ones.

### Exit criteria

- current canon has been read and cited by the presentation contract;
- presentation docs no longer duplicate accepted memory/state doctrine;
- every deferred live capability is explicitly named as `Deferred`;
- no current capability claim relies on a fixture pretending to be causal life.

### Blocking status

**Blocking for canonization. Not blocking for P1 contract implementation once the scope above is honored.**

---

## P1 — Thread Presentation Contract v0.1

### Goal

Define the smallest portable contract Fibre can honestly produce today from existing authoritative material.

### Fibre owns

Three contract surfaces only:

```text
ThreadPresentationPacket
ThreadMediaPacket
PresentationProvenance
```

### `ThreadPresentationPacket`

A relatively stable public/curated projection of life material that already has an authority in Fibre:

```text
manifest
subject
introduction / editorial presentation
origins
places
relationships
life / timeline
memories
remembered meanings / revisions
media references
presentation provenance
```

Requirements:

- `birthDate` is included where assigned;
- there is no presentation-level `pronouns` primitive;
- absence of a public/display name is legal and must not trigger invention;
- lifecycle status is explicit;
- a Genesis candidate remains `genesis_candidate`, never `live`;
- history, autobiographical memory, remembered meaning, Thread expression, editorial projection, and generated reconstruction remain distinguishable;
- missing optional media must be first-class and renderable.

### `ThreadMediaPacket`

A replaceable media plan/index, not evidence:

```text
asset identity
role
status: placeholder | pending | ready | unavailable
source presentation refs
reconstruction status
authorship / expression status
provider/model/generation provenance
poster/storyboard/video/audio/captions relationships
```

Media providers are renderers. A generated portrait, synthetic voice, reconstructed memory image, editorial film, or animated scene does not become evidence about the Thread.

### `PresentationProvenance`

At minimum distinguish:

```text
authoritative_fact
thread_memory
thread_meaning
thread_expression
belief                 # reserved for the future epistemic doctrine
fibre_projection
editorial
generated_reconstruction
fixture
```

`thread_expression` is distinct from generic `thread_authored`: private Thread-authored state and audience-directed external expression are not the same authority.

### Causal-status declaration

P1 is **presentation infrastructure only**. Its records may be useful and accurate without being causally consumed by Thread cognition. P1 must not claim that the packet itself creates functional individuality or interiority.

### Exit criteria

- JSON Schema or equivalent strict validator exists;
- valid packet with no display name passes;
- pronouns are neither required nor inferred;
- lifecycle and provenance classes are mandatory where needed to avoid authority ambiguity;
- media may be entirely placeholder/pending and still validate;
- contract has no `ThreadEncounterSnapshot`, `DailyPlan`, `RecentLivedContext`, or `onMyMind` fields;
- replacing one Thread packet with another requires no consumer-specific schema change.

---

## P2 — Golden Cần Thơ presentation fixture

### Goal

Create one comprehensive packet that exercises the presentation contract before the production exporter exists.

### Source

Use completed H-v2 candidate:

```text
thr_pr39_g2_04
world_slice_g1_01_can_tho
```

### Scientific boundary

The fixture may project already-recorded candidate world/history/memory/meaning for presentation engineering. It may not:

- count as #39 evaluation evidence;
- tune future Genesis behavior;
- change cohort selection;
- imply birth/publication;
- invent post-Genesis canonical life.

### Deliberate validation cases

The golden fixture should exercise:

- `displayName: null`;
- assigned `birthDate`;
- Unicode/diacritics (`Cần Thơ`);
- multiple languages;
- multiple places;
- family/relationship presentation;
- historical episodes not promoted to memory;
- autobiographical memories with uncertainty;
- remembered meaning distinct from history;
- genome/origins shown as beginnings rather than destiny;
- all media initially placeholder/pending;
- explicit `genesis_candidate` / `fixture` disclosure.

### Viewer-only scenario separation

Any synthetic “today” content used to design the page must live outside `ThreadPresentationPacket`, for example:

```text
insidefibre.com/public/fibre/viewer-scenarios/can-tho-today.json
```

That file may contain temporary design data such as a current place, a day schedule, recent mundane events, or a sample public thought. It is owned by the website test harness, carries `syntheticViewerScenario: true`, and **does not define Fibre ontology**.

The viewer must visually distinguish such a scenario from projected Thread life.

### Exit criteria

- fixture validates against P1 contract;
- no identity or life fact is invented simply to satisfy layout;
- all derived/editorial claims carry provenance;
- fixture can be consumed without reading raw Genesis artifacts;
- synthetic current-day scenario can be deleted without invalidating the presentation packet.

---

## P3 — `insidefibre.com` packet viewer foundation

### Goal

Replace hard-coded Mina identity/presentation with a generic packet-driven viewer while preserving the existing site architecture and visual direction.

### Consumer principles

`insidefibre.com`:

- owns visual hierarchy, interaction, brand, public copy, static fixtures, and viewer-only scenarios;
- does not import Fibre implementation internals;
- does not become a Thread database;
- does not infer missing facts to complete a design;
- does not treat generated media as evidence;
- must work when optional data/media is absent.

### Initial component surface

```text
ThreadHero
Origins
LifeTimeline
MemoryContinuitySurface
Relationships
Places
MediaSlot
FixtureDisclosure / provenance disclosure
```

The memory surface should consume the accepted Fibre temporal/memory model rather than invent a competing ontology. Presentation components may group or summarize, but editorial grouping remains presentation authority.

### Routing

Recommended first hidden/development route:

```text
/meet/fixture/can-tho
```

`/meet` may remain curated until the fixture viewer is accepted.

### No live encounter claims yet

P3 must not present synthetic viewer-scenario content as though it were live Thread state. If design work includes “today,” the UI must visibly mark it as a demonstration scenario during validation.

### Exit criteria

- Mina-specific JSX is removed from the Thread viewer path;
- viewer loads packet data from a static path;
- Cần Thơ fixture renders without special-case code;
- `displayName: null` is handled intentionally;
- Unicode works correctly;
- placeholder media produces a complete usable page;
- history/memory/meaning/projection/reconstruction distinctions are inspectable;
- normal production UI does not expose raw source paths/digests unless a provenance-inspector mode is enabled.

---

## P4 — Viewer contract validation

### Goal

Prove the viewer is a consumer of the contract rather than a bespoke Cần Thơ page.

### Add two more fixtures

Use the other completed H-v2 candidates only as presentation-validation sources:

```text
Łódź   — sparse/optional-field fixture
Cusco  — alternate cultural/language/content-shape fixture
```

Do not make all fixtures maximally complete. Variation is the test.

Suggested roles:

- **Cần Thơ:** comprehensive golden fixture;
- **Łódź:** intentionally sparse media and optional presentation content;
- **Cusco:** different language/place/intellectual-event structure and different omitted fields.

### Automated assertions

At minimum:

- no Thread-specific component branching;
- no inferred pronouns;
- no inferred display name;
- no requirement for ready image/video/audio;
- provenance survives load and rendering;
- candidate lifecycle disclosure cannot be accidentally omitted;
- invalid authority combinations are rejected;
- fixture-only fields cannot masquerade as authoritative Thread facts.

### Exit criteria

Delete Cần Thơ and point the viewer to Łódź or Cusco. The same components render a valid presentation without JSX edits.

---

## P5 — First real visual asset pass

### Goal

Introduce generated still images only after the viewer has proven which assets actually improve comprehension.

### Order

1. visual identity/embodiment reconstruction brief;
2. primary portrait;
3. environmental portrait;
4. selected place images;
5. selected memory-scene reconstructions;
6. social/share crop variants.

### Authority rule

For the H-v2 candidates, embodiment is **presentation reconstruction**, because #39 did not make authoritative embodiment for these candidates. Media metadata must say so.

### Provider strategy

Use replaceable adapters. Benchmark one Thread before provider lock. Persistent identity across images/ages/scenes matters more than small unit-price differences.

### Exit criteria

- still assets replace placeholders without schema changes;
- removing every generated asset still leaves a coherent text presentation;
- generated images never appear in history/memory evidence surfaces as photographic proof;
- accessibility/alt text and reconstruction disclosure exist.

---

## P6 — Voice and film

### Goal

Add narration and motion without changing the semantic presentation contract.

### Sequence

```text
approved text
  -> approved still/storyboard
  -> optional synthetic voice
  -> image-to-video / motion
  -> captions/transcript
```

Video slots must have usable poster/still behavior before video exists.

For unborn fixtures, narration and voice are `generated_reconstruction` or `editorial`, never `thread_expression` unless there is actual Thread-authored public expression with the required authorization/provenance.

### Exit criteria

- audio/video can be entirely absent;
- poster images remain useful independently;
- voice identity/provider is replaceable;
- captions/transcripts are available;
- media attempt lineage and selected output provenance are recorded.

---

## P7 — Fibre exporter and reviewed static promotion

### Goal

Replace hand-maintained fixture packets with a Fibre-owned projection/export pipeline.

### Initial transport

```text
Fibre source authorities
  -> presentation projector
  -> contract validation
  -> versioned export artifact
  -> review / promotion
  -> insidefibre.com static assets
```

Do not begin with a live public API. The website is already a static Cloudflare/Vite consumer, and reviewed static promotion keeps ownership and provenance clear while the contract matures.

### Exporter requirements

- no consumer-specific JSX knowledge;
- deterministic projection where content is mechanically derived;
- explicit editorial/generated steps where not deterministic;
- every public claim has a source/provenance class;
- output versioning and compatibility checks;
- no accidental export of restricted/private fields.

### Exit criteria

- packet used by the website is produced by Fibre tooling rather than manually edited;
- export validates before promotion;
- replacing H-v2 fixture with a future born Thread requires no viewer redesign;
- static artifact can be revoked/replaced without rewriting authoritative Thread state.

---

# Track L — Live encounter (deferred)

Track L is a separate Fibre ambition. It is not required to start P1–P7 and must not be smuggled into presentation contracts through synthetic fixture fields.

## L0 — Epistemic access to one's own past

### Missing doctrine

Fibre currently distinguishes world history from autobiographical memory, but needs an explicit doctrine for ordinary access to one's own past.

The review identified a likely three-channel model worth separate design/review:

```text
autobiographical memory
  = Thread-owned recollection; selective; constitutive

recent availability
  = bounded/decaying continuity, if accepted; not a second history ledger

record consultation
  = an action that consults durable records and yields a belief_about_own_past,
    not recollection
```

The exact model remains deferred until reviewed.

`not_remembered` must remain meaningful. A Thread must not gain perfect memory merely by querying its own authoritative history as ordinary cognition.

### Memory provenance question

Current memory-formation canon establishes that later constitution is legal when Fibre deliberately invokes memory formation over admissible history; it is constitution now, not detection of a memory that secretly already existed. A future design should distinguish contemporaneous retention, resurfacing of a prior retained memory, and later constitution without multiplying unnecessary memory classes.

### Exit criterion

Accepted doctrine + architecture + tests establish what past evidence cognition may see and what authority results from each channel.

---

## L1 — Autonomous ordinary-life producer

### Goal

Make “life precedes encounter” causally true rather than a website illusion.

### Missing capabilities

- world/society time progression;
- place authority beyond Genesis prose;
- autonomous ordinary events and opportunities;
- Thread-authored intentions;
- interruptions and changed plans;
- relationship/world consequences when humans are absent;
- resource-aware cognition triggers.

This capability is **Deferred** today.

### Required evidence

A fixture may not count. A live Thread must acquire ordinary history that was not authored by the visitor/test as the answer to a personhood claim.

### Exit criterion

A Thread can accumulate an independently produced day/life history while no public viewer is present, and that history can causally alter a later episode.

---

## L2 — Intentions, obligations, and day-view projection

### Goal

Represent what a Thread plans without making the plan a second obligation authority.

Do not create `DailyPlan.commitment=fixed` as an independent claim that the Thread owes something.

A future day view should project from authorities such as:

- Thread-authored intentions;
- structured obligation references when they exist;
- appointments/reservations/world events;
- completed/changed/interrupted events appended to history.

A plan is not prophecy. A status transition should be witnessed by life events rather than silently flipping a mutable presentation field.

### Exit criterion

The day view is a projection over real authorities and remains valid under changed plans, interruptions, and obligations.

---

## L3 — Thread-authored unresolved interpretation and reflective inquiry

### Goal

Support the insight that a Thread may remain uncertain about an experience and later work on it through reflection, conversation, research, or subsequent life — without creating a Fibre-authored rumination engine.

### Current direction

Do not create `UnsettledExperience` as a parallel authority until proven necessary.

Current semantic-state canon already supports a better starting point:

- registered `situation_attitude` dimensions;
- natural-language Thread-authored semantic state;
- evidence references;
- staleness;
- supersession;
- bounded Fibre-owned attention;
- mechanical conditions that can affect eligibility/modulation without becoming semantic self-knowledge;
- causal ablation for functional-interiority claims.

### Required authorship boundary

Fibre may compute eligibility or bounded modulation. The Thread authors the semantic interpretation/question in cognition. Fibre must never compute prose such as “what feels unsettled” and feed it back as Thread-owned self-knowledge.

### Anti-rumination gate

Before claiming reflective inquiry is functional:

- trigger computation is versioned/replayable;
- causation/input witness is durable;
- per-topic/global resource bounds exist;
- one reflective episode cannot raise its own trigger weight merely by remaining open;
- budgets/counters are not semantic evidence to cognition;
- stale/non-reaffirmed state naturally loses attention;
- a predeclared ablation withholds the Thread-authored state while holding underlying history fixed and requires an attributable downstream difference;
- negative ablation remains publishable evidence (`Stored-only` if inert).

### Exit criterion

At least one Thread-authored interpretive state demonstrably changes a later retrieval/appraisal/choice under a predeclared causal test, without hidden mechanical state being rendered as semantic self-knowledge.

---

## L4 — Thread-initiated outbound action and research

### Goal

Allow a Thread to initiate research or conversation for its own reasons.

This is distinct from existing request-bound inbound authorization.

### Required boundaries

- resource/cost authorization;
- interest-mediated disclosure;
- third-party privacy/identifier protection;
- source provenance;
- externally retrieved sources remain separately addressable;
- generated summaries do not masquerade as source evidence;
- research output may affect beliefs/interpretation through ordinary cognition, not automatic state mutation.

### Exit criterion

A Thread can initiate a bounded, authorized, privacy-preserving research/conversation action and consume the result without leaking private interiority or conferring autobiographical authority on the source.

---

## L5 — Public self-expression and `on my mind`

### Goal

Support a public “on my mind” experience without projecting private state directly.

The governing rule from existing canon is that external expression is an audience-directed act, not a transparent view of private cognition.

Therefore public “on my mind” content, if Fibre supports it, must be `thread_expression` produced through interest mediation. It may be candid, selective, ambiguous, evasive, or otherwise socially situated. The public statement is not authoritative evidence of the private state behind it.

Third-party interests must constrain what may be disclosed when the experience concerns another person.

### Exit criterion

Public expression is authored/authorized through the Thread's expression path and can intentionally differ from private semantic state without the website treating one as a redacted copy of the other.

---

## L6 — `ThreadEncounterSnapshot` v1

### Goal

Only after L0–L5 provide real authorities and producers, define the live encounter projection.

Potential content may then include:

```text
asOf / freshness
public presence
current public activity
projected day view
recent public continuity
Thread-authored public expression
next public intentions / availability
```

The exact fields are intentionally **not frozen now**.

### Exit criteria

- every field has an authoritative producer or explicit presentation/expression provenance;
- no field depends on a fixture to look alive;
- freshness/staleness is explicit;
- exact/private location is not automatically public;
- third-party privacy is enforced;
- a live snapshot can replace a viewer-only scenario without changing the stable life-presentation packet.

---

## L7 — Live viewer integration

### Goal

Combine the stable life presentation from Track P with an authorized live encounter projection from Track L.

At this point the intended experience becomes truthful:

> The visitor arrives in the middle of a life that was already happening.

### Exit criterion

The website can show both:

1. **life so far** from the stable presentation packet; and
2. **life now** from a freshness-bearing live encounter projection,

with no synthetic fixture state in the production path.

---

# Implementation order

The recommended execution sequence is:

```text
NOW

P0  canon reconciliation / scope lock
 |
P1  Presentation Contract v0.1
 |
P2  Cần Thơ golden packet
 |
P3  insidefibre generic viewer
 |
P4  Łódź + Cusco contract validation
 |
P5  still-image media pass
 |
P6  voice + video
 |
P7  Fibre exporter + reviewed static promotion

IN PARALLEL AFTER P1, AS CORE FIBRE WORK ALLOWS

L0  epistemic access doctrine
L1  autonomous ordinary-life producer
L2  intentions/obligations/day projection
L3  reflective inquiry with ablation
L4  Thread-initiated outbound actions
L5  public self-expression / on-my-mind
L6  ThreadEncounterSnapshot v1
L7  live viewer integration
```

P1–P7 must not wait for L0–L7 unless a specific feature attempts to make a live-encounter claim.

---

# First implementation slice

The first code slice should be intentionally narrow.

## Fibre

1. Define `ThreadPresentationPacket v0.1`.
2. Define `ThreadMediaPacket v0.1`.
3. Define `PresentationProvenance v0.1`.
4. Add contract validation tests.
5. Project one canned Cần Thơ packet from the preserved candidate artifact, with explicit fixture/non-authoritative lifecycle provenance.

## `insidefibre.com`

1. Add the packet schema/fixture under static test assets.
2. Add a loader and validator.
3. Add `/meet/fixture/can-tho`.
4. Replace Mina-specific presentation code on that route with generic packet components.
5. Render portrait placeholder, origins, places, relationships, life timeline, memory/meaning, and media placeholders.
6. Keep any synthetic “today” design scenario outside the Fibre packet and visibly marked as a viewer scenario.

## Slice exit criterion

> Delete the hard-coded person from the viewer, point it at one valid Fibre presentation packet, and obtain a coherent presentation without inventing a name, pronouns, live presence, or media that Fibre did not provide.

That is the first implementation milestone worth coding.