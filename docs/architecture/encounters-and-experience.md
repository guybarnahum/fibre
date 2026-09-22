---
id: architecture-encounters-and-experience-v0-1
status: accepted
last-reviewed: 2026-09-21
canonical: false
---

# Encounter stories and Thread experience

## Purpose

Define the general lived-experience primitive behind meetings, witnesses, environmental moments and later consequences.

The key correction is:

> **A meeting is not the primitive. An encounter is.**

A Thread's life is not only made from scheduled social conversations. A Thread may be affected by another person, a group, an animal, a place, weather, music, an accident, a flower, a bee, a cloud, or any other part of the World that actually enters the Thread's lived attention.

Fibre therefore separates:

```text
World occurrence
  -> bounded objective encounter story
  -> Thread-specific experience / noticing
  -> private reflection
  -> selective consequence
```

This distinction is foundational. Shared facts must remain shared; meaning remains personal.

## Core terms

### World occurrence

Something objectively happens in the Fibre World.

Examples:

- rain begins while a Thread is walking;
- a bee lands on a flower nearby;
- Thread A speaks sharply to Thread B;
- several Threads sit together while one tells a story;
- a song begins playing in a café;
- a Thread reaches a place and sees something unexpected.

A World occurrence does not imply that every nearby Thread noticed it or was changed by it.

### Encounter story

A bounded objective account of what occurred in a Thread's lived environment.

The encounter story owns **observable facts**, not private interpretation.

It may contain:

- one Thread and an environmental subject;
- a Thread and a Person;
- two Threads;
- several Threads;
- silent witnesses;
- non-person subjects such as an animal, object, place or weather phenomenon.

The story should use durable World/Thread references when they already exist, but Fibre must not invent a universal object ontology merely so every flower, cloud or bee has an ID. Natural-language observable content remains valid when no durable entity authority exists.

A story may include ordered observable beats when order matters:

```text
A says ...
B replies ...
C stays quiet
rain begins
a bee lands on the flower
```

Silence is not an observable beat that must be fabricated. It is enough that a Thread was present and later may or may not have noticed what occurred.

### Thread experience

A private, participant-specific account of what entered one Thread's lived attention from an encounter story.

**Co-presence is not the same as experience.**

A Thread may:

- act or speak;
- be addressed or affected directly;
- witness what happens to someone else;
- notice only one small part of a larger story;
- fail to notice the occurrence at all.

The experience layer is where Fibre asks what this particular Thread noticed and what it felt like or meant *now*. It must not rewrite the objective story.

A silent witness can therefore have a meaningful experience even though she never speaks:

```text
objective story:
  A is rude to B while C is present

A experience:
  "I snapped at B."

B experience:
  "A embarrassed / hurt / angered me."

C experience:
  "I watched A treat B badly."
```

C may later trust A less, feel protective toward B, journal the incident, remember it, or do none of those things. The consequence must come through C's own experience and owning authorities, not because the shared story mechanically updates relationships.

### Meeting

A meeting is a **voluntary social encounter**.

It adds a participation decision before the encounter occurs:

```text
compatible co-presence
  -> establish exact LivedNow
  -> initiator-owned overture / invitation
       initiate | not_initiate
  -> each invitee's Thread-owned participation stance
       accept | decline | defer
  -> if participation requirements are satisfied:
       encounter story
       -> participant-specific experience
       -> consequence
```

Meeting stance is therefore a special-case gate around encounter creation. It is not required for environmental encounters or involuntary witnessed occurrences.

A Thread cannot decline the fact that rain started or that another person behaved rudely nearby. The Thread can, however, fail to notice it, ignore it, leave, respond, or later interpret it differently.

### Journal

A journal is a Thread's private contemporaneous writing about lived experience.

It is intentionally subjective. It may contain:

- feelings;
- ambivalence;
- sensory detail;
- moral judgment;
- embarrassment;
- attraction;
- irritation;
- tenderness;
- stray associations;
- uncertainty;
- contradictions.

Two Threads may write very different accounts of the same encounter story without either journal changing the objective story.

The journal is **not** objective history and **not** autobiographical memory.

### Memory

Autobiographical memory is a later selective retention outcome grounded in admitted Thread experience.

The valid path is:

```text
encounter story
  -> Thread experience
  -> optional journal
  -> retention appraisal
  -> retained memory | not_remembered
```

Journal entry does not imply memory. An experience may be remembered without being journaled. A journal may survive as an artifact even when the event never becomes durable autobiographical memory.

## General causal model

```text
LivedNow / World
  -> occurrence
  -> encounter story
       -> Thread A notices / experiences
            -> journal?
            -> memory?
            -> feeling / need?
            -> relationship consequence?
            -> intention / Flight Plan consequence?
       -> Thread B notices / experiences differently
            -> ...
       -> Thread C does not notice
            -> no private experience consequence
```

Consequences must enter through their existing owning authorities. There is no monolithic "encounter result" that rewrites the person.

## Environmental encounters

A Thread should be able to acquire life from small unscheduled moments.

Example:

```text
Flight Plan: walk through park
  -> World: bee lands on a flower
  -> Thread notices it
  -> private experience: calm / curiosity / association
  -> perhaps journal
  -> perhaps retained memory
  -> perhaps later attention or intention changes
```

The Flight Plan creates opportunity by putting the Thread somewhere. It does not need to enumerate every future occurrence.

This is important for Fibre's ambition: life should accumulate from what happens **while following plans**, not only from executing the plans themselves.

## Social and group encounters

An encounter story is naturally n-ary.

Do not encode the durable fact as `A meets B`. Encode one shared story plus the Threads whose current situations ground their presence.

For a small group:

```text
one shared encounter story
  -> A experience
  -> B experience
  -> C experience
  -> ...
```

A Thread may be an actor in one beat and a witness for the rest. Fixed social roles are therefore optional derived descriptions, not the semantic authority.

For requested meetings, the social reason is not supplied by the caller: a Thread initiator first decides whether to make an actual outward overture from the life already underway. Each invitee then independently decides whether to participate in response to that concrete invitation. If the initiator does not initiate, or any required invitee declines/defers, no Encounter Story is created. Incidental witnesses are not fabricated as invitees merely because they are nearby.

Automatic incidental-witness discovery is a later extension of the same model: World can derive candidate witnesses from compatible LivedNow presence, then each Thread independently notices or does not notice the occurrence.

## Presence and place

Every lived Thread remains physically somewhere:

- at a place; or
- in transit between places.

Mediated context is additional, not a replacement for physical presence.

Physical co-presence can make an encounter possible, but it does not prove that every Thread noticed the same thing.

For social encounters, Fibre resolves each Thread's private situated-life place evidence to an explicit shared World place identity rather than requiring identical per-Thread evidence references.

A reusable Genesis `WorldSpec` place identifier is **not** sufficient shared-place authority. Genesis places describe one Thread's historical/world context and may be reused as authored substrate across births. Equal Genesis/template place IDs across Threads must therefore never manufacture physical co-presence. Current physical meeting compatibility requires a place episode admitted with `world_recorded` provenance for the same shared place identity, or an explicitly matching mediated context. Fibre Commons is the first bounded live convergence path for the latter: Threads independently choose whether to enter one World-known mediated common room while remaining physically where their own lives already put them.

## Attention / noticing

The next important missing primitive is bounded encounter attention.

Fibre should not create a private experience for every occurrence merely because the Thread was nearby. The Thread must have a credible opportunity to perceive the occurrence, and Thread-owned cognition should decide whether it entered attention strongly enough to become experience.

This should stay light:

```text
story + exact CurrentSituation + bounded interior context
  -> noticed | not_noticed
  -> if noticed: private experience
```

Do not build a sensory simulator. The purpose is to make lived attention causal, not to model photons, acoustics or every object in the environment.

For a voluntarily accepted direct meeting, a minimal experience may be implicit because the Thread deliberately entered the encounter. For incidental witnesses and environmental occurrences, noticing must not be assumed.

## Encounter visualization

Every admitted Encounter Story should be **visualizable by construction**, even when Fibre never renders media for it.

The durable companion is a rich, media-neutral reconstruction prompt bound to the encounter's admitted evidence:

```text
Encounter Story
  -> visualizationPrompt
  -> prompt digest + bound source references
  -> optional image / video / later media render
```

This follows the same truth pattern already accepted for autobiographical-memory reconstruction: the prompt-and-evidence lineage is durable; generated media is replaceable derived representation.

Unlike the memory-photo obligation, an encounter does **not** require a rendered asset to be complete. Rendering is optional. The prompt exists so Fibre can later reconstruct the scene faithfully if a product surface, Admin view, memory experience or future medium wants it.

### What the prompt represents

An encounter visualization prompt depicts the **objective Encounter Story**, not any one Thread's private interpretation.

It may richly describe only admitted observable context such as:

- physical place or transit context;
- time of day, weather, lighting or environmental conditions when known;
- present Threads/People and non-person subjects;
- chronology of observable beats;
- spoken words when the story records them;
- outward actions, posture and visibly observable expression;
- spatial relationships that are actually supported;
- uncertainty and details that must remain visually noncommittal.

It must not convert private experience into objective visual fact.

For example, if B privately felt humiliated when A spoke sharply, an objective encounter reconstruction may depict A's recorded words and observable behavior, but must not depict B as visibly humiliated unless that outward expression is itself admitted encounter evidence.

### Identity and chronology

If a Thread is depicted, the render must use that Thread's admitted canonical visual-identity reference and chronology-derived age at the encounter time.

For a multi-Thread encounter, each depicted Thread carries her own visual-identity reference. One Thread's reference must never be reused as another person's appearance.

Non-person/environmental encounters require no person reference unless a Thread is actually depicted.

Current identity, hairstyle, clothing, relationship state or later embodiment must not be projected backward unless it was already bound to the encounter visualization evidence.

### Image and video from the same source

The prompt should be **media-neutral rich scene direction**, not an image-only sentence.

It should contain enough temporal structure that:

- an image renderer can choose a representative supported moment;
- a video renderer can follow the ordered encounter beats;
- a future renderer can create another representation from the same admitted scene without changing encounter truth.

Provider-specific shot syntax, duration, aspect ratio, camera motion or codec settings belong to the generation job, not the semantic encounter record.

For video, observable dialogue may be represented only from admitted story text. Fibre must not invent identity-specific voices. If an authorized voice reference does not exist, the renderer should remain silent/ambient or otherwise avoid claiming a canonical voice.

### Richness without invention

The visualization prompt should be vivid enough to reconstruct a convincing scene, but richness must come from combining admitted evidence rather than filling factual gaps.

A useful shape is:

```text
Scene:
  rich natural-language account of the setting and encounter

People / subjects:
  bound appearance and age evidence for depicted Threads
  supported non-person subjects

Temporal progression:
  ordered observable beats

Visual emphasis:
  suggested representative moments or composition derived from the story

Uncertain / unspecified:
  facts the renderer must not make precise

Constraints:
  reconstruction, not documentary evidence
  do not invent hidden participants, motives, emotions or later facts
```

The `visualizationPrompt` itself is derived reconstruction authority, not World-event authority. The Encounter Story remains the authority for what happened.

### Objective encounter versus subjective memory

Fibre must preserve two distinct reconstruction classes:

```text
Encounter Story
  -> objective encounter visualization
     "what Fibre's World says observably happened"

Thread Experience / retained Memory
  -> subjective memory reconstruction
     "what this Thread later remembers"
```

Those can legitimately produce different visuals.

A witness may remember A as looming or the room as oppressive even when those details are not objective Encounter Story facts. Such a reconstruction belongs to the Thread's memory lineage, not the shared encounter visualization.

Generated encounter media must never be fed back as evidence for the Encounter Story, Thread Experience, identity, relationship or memory. It is representation.

## Journal artifact

World remains authoritative for encounter stories, Thread experiences, journal-entry provenance and memory.

R2 stores the Thread-readable/admin-readable journal artifact:

```text
fibre-thread-objects
  journals/<threadId>/journal.md
```

The document is a free-form private "book" with a stable Thread-specific title and aesthetic preference. Admin may render it richly.

The R2 book is downstream presentation of journal authority. It is not itself history or memory.

Existing presentation/media R2 objects remain in the existing immutable object-ref layout and are not migrated.

## What the current implementation spike taught us

The first N5 implementation correctly exposed several reusable pieces:

- independent ensure-LivedNow for social participants;
- place compatibility across Thread-specific situated-life evidence;
- Thread-owned `accept | decline | defer` meeting stance;
- one shared objective record with separate private aftermath;
- n-ary story persistence direction;
- witness-specific experience direction;
- subjective journal separated from selective memory;
- private journal book in R2 and Admin presentation.

But the spike overfit the central orchestration to **meeting**.

Specifically:

- it assumed the encounter begins from an invitation;
- it treated all present Threads as meeting participants who must accept;
- it treated social dialogue as the default story shape;
- it did not yet have a general noticing step;
- it did not yet support a Thread encountering a non-person subject without inventing a social participant;
- some persistence/API names still encode `meeting` or `reciprocal` where the domain concept is now encounter story / Thread experience.

Those are redesign findings, not reasons to discard the useful pieces.

## Implementation rule

Build the smallest general encounter seam that can prove all three of these without separate engines:

1. a Thread notices a small environmental occurrence such as a bee on a flower;
2. a voluntary Thread-to-Thread meeting can be accepted or declined;
3. a third Thread can silently witness a social encounter and be affected differently.

If one mechanism can honestly support those three cases, it is general enough for the next Fibre slice.

Do not build:

- a universal event bus;
- a physical/sensory simulator;
- a generic entity ontology;
- a conversation framework;
- a social-score system;
- automatic memory;
- a journal-to-personality update shortcut.

The goal is a causal lived loop, not infrastructure completeness.
