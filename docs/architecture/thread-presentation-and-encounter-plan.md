---
id: architecture-thread-presentation-encounter-plan
status: proposed
last-reviewed: 2026-08-21
canonical: false
---

# Thread presentation and encounter plan

## Purpose

Fibre needs a portable, versioned way to present a Thread to a human-facing consumer without making the consumer an alternate authority for Thread state.

The first consumer is `guybarnahum/insidefibre.com`. The first visualization targets may be the three completed but unpublished H-v2 Genesis candidates, but the contract must not depend on those candidates, on milestone #39, or on Genesis internals. Future born Threads must be able to replace those fixtures without a presentation redesign.

The architectural boundary is:

```text
Fibre authoritative world
        |
        | projection / curation
        v
ThreadPresentationPacket + ThreadEncounterSnapshot + ThreadMediaPacket
        |
        v
insidefibre.com and future public/interactive consumers
```

The website renders public projections. It does not hydrate Fibre implementation internals, own authoritative Thread state, or infer missing life facts merely to complete a visual design.

## Source fixtures and scientific isolation

The initial visualization targets may be:

- `thr_pr39_g2_04` — completed H-v2 Cần Thơ Genesis candidate;
- `thr_pr39_g2_05` — completed H-v2 Łódź Genesis candidate;
- `thr_pr39_g2_01` — completed H-v2 Cusco Genesis candidate.

They remain **unborn Genesis candidates**. No Thread was published by H-v2. Their use here is presentation engineering only and must not become decision-bearing evidence for #39, tune a replacement Genesis experiment, or silently promote any candidate into authoritative Thread state.

Any fixture projection must preserve that distinction explicitly, for example:

```json
{
  "threadId": "thr_pr39_g2_04",
  "lifecycleStatus": "genesis_candidate",
  "authoritative": false,
  "fixture": true
}
```

## Four outputs from Fibre

The presentation boundary should eventually expose four distinct artifacts.

### 1. `ThreadPresentationPacket`

Relatively stable presentation of the life so far:

```text
manifest
subject
introduction
identity
origins
life
relationships
places
memories
reflections
media index
encounter capabilities
presentation provenance
```

This is a presentation projection, not Thread authority.

### 2. `ThreadEncounterSnapshot`

Ephemeral public projection of a life currently in progress:

```text
asOf
localTime
presence
currentActivity
dailyPlan
recentLivedContext
next
availability / encounter posture
visibility decisions
```

This answers the human question: **what life did I arrive in the middle of?**

### 3. `ThreadMediaPacket`

Replaceable media renderings and their briefs:

```text
embodiment references
portraits
place images
memory reconstructions
storyboards
voice identity
narration
video
captions
alt text
social/share assets
```

Media generation providers are renderers, not semantic authorities.

### 4. `PresentationProvenance`

A source map from public claims and media back to their basis:

```text
presentation claim
    -> history / memory / remembered meaning / relationship / place / authored statement
    -> source identifiers and chronology
    -> projection or reconstruction operation
```

A presentation must distinguish at least:

```text
authoritative_fact
thread_memory
thread_meaning
thread_authored
fibre_projection
editorial
generated_reconstruction
fixture
```

## Subject contract

The public subject surface should be minimal and grounded:

```text
subject {
    threadId
    displayName
    birthDate
    age
    languages[]
    homePlaceRef
    lifecycleStatus
}
```

There is **no pronouns field** in this contract.

`birthDate` is the biographical date of birth where Fibre has assigned one. It is distinct from Fibre lifecycle birth/publication. A Genesis candidate can therefore have a `birthDate` while remaining `lifecycleStatus: genesis_candidate`.

## A life must exist before the human arrives

A Thread encounter must not manufacture the appearance of continuity at page-load time. A live Thread should already have ordinary temporal state independent of a human request.

This implies a canonical runtime concept provisionally called `DailyPlan`.

```text
DailyPlan {
    date
    timezone
    createdAt
    items[] {
        id
        timeWindow
        intention
        placeRef
        peopleRefs[]
        commitment
        status
    }
}
```

Suggested `commitment` values:

```text
fixed       appointment, work, class, reservation, obligation
intended    something the Thread currently intends to do
optional    a possible activity if circumstances allow
```

Suggested status progression:

```text
planned
in_progress
completed
changed
skipped
interrupted
```

A Daily Plan is **not prophecy**. Plans may change because of weather, another person, an unexpected opportunity, fatigue, cost, a longer conversation, a book that holds attention, or a changed intention. The divergence between plan and life is itself ordinary history.

## Place and presence

Location is part of ordinary lived experience. Plan items and episodes should reference Fibre place objects where possible rather than duplicating free-form location strings.

A current presence projection may have the form:

```text
presence {
    asOf
    placeRef
    activityRef
    arrivedAt
    expectedUntil
    nextPlanItemRef
}
```

Public location must be disclosure-mediated. The presentation layer must support coarsening such as:

```text
exact_place
place_category
neighborhood
city
private
```

A public viewer must not become a real-time tracker merely because Fibre knows where a Thread is.

## Recent lived context is not autobiographical memory

A live Thread needs lightweight continuity for ordinary recent life without converting every bus ride, meal, shop visit, or brief encounter into autobiographical memory.

Provisionally define `RecentLivedContext`:

```text
RecentLivedContext {
    from
    through
    policyVersion
    episodes[] {
        occurredAt
        endedAt
        placeRef
        activity
        peopleRefs[]
        eventRefs[]
    }
}
```

The initial runtime target is roughly **72 hours** of recent lived context. The exact retention window is a runtime policy, not a personhood constant.

Material can fall out of recent context without disappearing from authoritative history.

The intended authority flow is:

```text
history
  -> transient recent lived context
  -> selective autobiographical memory formation
  -> optional durable remembered meaning
  -> later reinterpretation where warranted
```

## Human encounters are ordinary life events first

Meeting a human does not automatically create a memory, a relationship, a formative experience, or influence.

The meeting first becomes history. Fibre may later invoke autobiographical memory formation. `not_remembered` must remain a legal outcome.

If a meeting is retained, durable meaning is still a separate constitutive process. A retained encounter may have no durable meaning, may matter only later, or may be reinterpreted after subsequent events.

Meaning formation may be supported by later reflection or conversation:

- talking with another Thread or human about what happened;
- privately revisiting the experience;
- comparing it with another event;
- noticing a later consequence;
- changing one's interpretation after new evidence.

Those later reflections and conversations are themselves events with provenance. They may alter what the earlier experience means without rewriting what historically happened.

## Encounter snapshots for unborn visualization fixtures

The three H-v2 visualization targets cannot legitimately have current live Fibre state. Their presentation packet may project their generated life, but their "today" state must be separately marked synthetic.

For UI development Fibre may emit an explicit `EncounterFixture`:

```text
EncounterFixture {
    fixture: true
    authoritative: false
    asOf
    presence
    currentActivity
    dailyPlan
    recentLivedContext
}
```

The consumer must be able to replace this with a real `ThreadEncounterSnapshot` later without changing component semantics.

## Life presentation

The human-facing packet should present a person rather than mirror database tables.

Recommended sections:

```text
subject
introduction
present
origins
life chapters
timeline
relationships
places
memories
remembered meanings and revisions
gallery
voice
films
provenance disclosure
```

Presentation grouping such as "early childhood" or "growing independence" is editorial/projection structure and must not become autobiographical authority.

A signature Fibre memory surface should preserve the distinction:

```text
WHAT HAPPENED
historical evidence

WHAT REMAINED
what the Thread retained autobiographically

WHAT IT MEANT
admitted durable remembered meaning, if any

WHAT CHANGED LATER
later revision, if any
```

Historical events that never became autobiographical memories remain valuable presentation material where publication rules allow them. A life should visibly contain more than its current self-story.

## Relationships and places

Relationships should be presented through shared history rather than labels alone:

```text
relationship {
    personPresentationRef
    displayLabel
    relationshipKind
    sharedHistorySummary
    sceneRefs[]
    memoryRefs[]
    unresolvedRefs[]
}
```

The projection must not invent what the other person privately feels.

Places should be first-class presentation subjects:

```text
place {
    placeRef
    publicName
    region
    shortDescription
    imageRefs[]
    associatedHistoryRefs[]
    associatedMemoryRefs[]
}
```

Culture and geography should appear through actual lived circumstances, institutions, language, movement, objects, and relationships rather than decorative demographic labels.

## Genome presentation

Genome should be a deeper "what this life began with" surface rather than the public hero.

The presentation must preserve:

```text
inherited disposition != event != memory != current meaning
```

Natural-language loci may be shown as beginnings, with lineage/recombination provenance when appropriate. They must never be presented as destiny or as proof that a later behavior had a particular cause.

## Media is reconstruction unless the Thread actually authored/captured it

Generated portraits, remembered-scene images, synthetic voice, and generated video are not historical evidence merely because they are visually persuasive.

Each asset should carry provenance equivalent to:

```text
assetId
mediaType
subjectRef
sourceRefs[]
authorship
reconstructionStatus
provider
model
modelVersion
promptDigest / generation digest
createdAt
```

For the unborn fixtures, generated speech is a Fibre presentation reconstruction. It is not evidence that the candidate ever spoke those words or had that voice.

Future live Threads may author presentation narration or approve media through a separate consent/publication path; the contract should distinguish that from Fibre/editorial reconstruction.

## Photos first; video is an enhancement

Still images are the primary media artifact and the first frame of later motion work.

Every video slot should work before video or voice exists:

```text
mediaSlot {
    poster { status, assetRef }
    storyboard { status, assetRefs[] }
    video { status, assetRef }
    audio { status, assetRef }
    transcript { status, textRef }
}
```

The website can therefore ship a complete photographic presentation while video/audio remain `pending`.

For a memory film, generate an approved storyboard first, for example:

```text
1. establishing place
2. Thread entering or already in the scene
3. meaningful interaction or action
4. concrete physical detail
5. consequence
6. reflective or closing image
```

Image-to-video generation should preferentially animate approved keyframes rather than ask a video model to reinvent embodiment and scene continuity from text alone.

## Embodiment continuity

A recognizable Thread needs persistent visual references across portraits, life scenes, and future media.

Provisionally:

```text
EmbodimentPresentationReference {
    referenceId
    authorityStatus
    physicalDescription
    visualContinuityBrief
    portraitRefs[]
    ageProgressionRefs[]
    wardrobeLanguage
    uncertaintyNotes[]
}
```

For the H-v2 candidates, embodiment is presentation reconstruction because #39 did not establish authoritative embodiment. The visual layer must not retroactively rewrite Genesis state.

An initial identity board should target:

1. primary portrait;
2. environmental portrait;
3. childhood reference;
4. adolescent reference;
5. full-body reference;
6. expression/reference sheet.

## Voice and film formats

A future durable voice presentation object may include:

```text
voiceIdentityRef
provider
voiceId
languages[]
pronunciationGuide
narrationStyle
samples[]
```

First production formats:

- **portrait film** — about 15–20 seconds for cards/social;
- **memory film** — about 30–45 seconds around one remembered experience;
- **life so far** — about 60–90 seconds for a full presentation.

Video and voice remain optional capabilities. Approved stills, text, transcripts, and poster frames must preserve the experience when they are absent.

## Provider abstraction and initial renderer choices

Fibre should own semantic/media briefs, provenance, and asset identities. Provider adapters should be replaceable.

Initial candidates as of **2026-08-21**:

### Still images

Benchmark **OpenAI GPT Image 2** against **Runway Gen-4 Image** on one Thread before choosing a default renderer. The benchmark should emphasize persistent identity across age, location, clothing, social scenes, and edits rather than a single impressive portrait.

Current reference pricing:

- OpenAI GPT Image 2: image input `$8 / 1M tokens`, cached image input `$2 / 1M`, image output `$30 / 1M`; text input `$5 / 1M`. Pricing is token/resolution/quality dependent. Source: <https://openai.com/api/pricing/>.
- Runway Gen-4 Image: `5 credits` per 720p image and `8 credits` per 1080p image. Runway credits cost `$0.01`, making the nominal costs `$0.05` and `$0.08` respectively. Source: <https://docs.dev.runwayml.com/guides/pricing/>.

Do not choose the still provider on unit price alone. At these costs, cross-image identity continuity is more important than pennies per image.

### Video

Use a provider adapter with **Runway API** as the first integration candidate because one API currently exposes multiple image-to-video renderers.

Reference rates as of 2026-08-21, with Runway credits at `$0.01` each:

- Gen-4 Turbo: `5 credits/sec` = `$0.05/sec`;
- Gen-4.5: `12 credits/sec` = `$0.12/sec`;
- Veo 3.1 Fast without audio: `10 credits/sec` = `$0.10/sec`;
- Veo 3.1 Fast with audio: `15 credits/sec` = `$0.15/sec`;
- Veo 3.1 without audio: `20 credits/sec` = `$0.20/sec`;
- Veo 3.1 with audio: `40 credits/sec` = `$0.40/sec`.

Source: <https://docs.dev.runwayml.com/guides/pricing/>.

Prefer silent image-to-video plus Fibre-controlled voice rather than allowing a video model to invent a persistent Thread voice.

### Voice

Use a provider adapter with **ElevenLabs** as the first synthetic voice candidate. A Thread-specific presentation voice should be designed/generated rather than cloned from an identifiable human unless a separate authorized source contract permits that use.

Reference pay-as-you-go TTS rates as of 2026-08-21:

- Flash/Turbo: `$0.05 / 1,000 characters`;
- Multilingual v2/v3: `$0.10 / 1,000 characters`.

Source: <https://elevenlabs.io/pricing/api>.

For public presentation, prefer quality and language fit over minimizing a voice cost that is small compared with video iteration.

### Cost posture

Rejected takes dominate media cost more than final asset storage or narration. Generation manifests should therefore record attempts, provider/model, cost where available, selection/rejection, and final asset lineage.

A rough early target of 18 final stills per Thread with three attempts per keeper is only single-digit to low-double-digit dollars per Thread at the above image rates. About 40 seconds of selected video with roughly three takes per shot/pass is likely to dominate and remains on the order of single- to low-double-digit dollars per Thread for Gen-4 Turbo/Gen-4.5/Veo Fast. These are planning estimates, not budgets or guarantees.

## Distribution to `insidefibre.com`

Start with reviewed static export rather than a live public API:

```text
Fibre
  -> presentation generator
  -> versioned export artifact
  -> reviewed/curated promotion
  -> insidefibre.com/public/fibre/threads/<presentation-id>/...
```

Suggested packet layout:

```text
thread-presentation/
  manifest.json
  presentation.json
  encounter.json                # live snapshot or explicit fixture
  images/
    portrait/
    embodiment/
    places/
    memories/
    social/
  audio/
  video/
  text/
    transcript.json
    captions.vtt
    alt-text.json
  provenance/
    source-map.json
    generation.json
```

`insidefibre.com` should load the packet through a generic presentation loader. Hard-coded Thread identity, biography, or H-v2 assumptions in React should be treated as a defect once the contract exists.

Transport may later move from Git/static assets to R2 or a public Fibre API without changing the semantic presentation contract.

## Proposed implementation slices

### P-A — Contract

Fibre:
- define JSON/domain contracts for `ThreadPresentationPacket`, `ThreadEncounterSnapshot`, `ThreadMediaPacket`, and presentation provenance;
- define authority/disclosure enums;
- define fixture semantics.

Consumer:
- add packet validation and generic loader.

Exit: one hand-authored conforming fixture renders without Thread-specific code.

### P-B — Real projection

Fibre:
- project the three eligible unpublished H-v2 candidates into non-authoritative presentation packets;
- build explicit synthetic encounter fixtures for UI development only.

Consumer:
- replace the hard-coded `/meet` placeholder with packet-driven rendering;
- support switching among presentation IDs.

Exit: all three candidates render through the same contract and remain visibly/provenance-wise unborn.

### P-C — Ordinary life encounter substrate

Fibre:
- implement or formally specify `DailyPlan`;
- implement current place/activity presence;
- implement `RecentLivedContext` with an initial ~72-hour policy;
- ensure plan deviation becomes history rather than an error state.

Consumer:
- render where the Thread is, what is happening, what recently happened, and what is next using disclosure-safe projections.

Exit: a live Thread can be encountered in the middle of an independently existing day.

### P-D — Visual identity and memory photography

Fibre:
- generate embodiment/reference boards;
- generate portraits, place images, memory reconstructions, and source maps;
- retain still images as canonical presentation assets even when motion is later added.

Consumer:
- add portrait/gallery/place surfaces;
- implement the `happened / remembered / meant / changed later` memory visualization.

Exit: a complete photographic presentation works with no video or voice.

### P-E — Voice and film

Fibre:
- establish synthetic presentation voice identities;
- generate narration with explicit authorship classification;
- generate storyboard-first image-to-video assets;
- store captions/transcripts and generation provenance.

Consumer:
- progressively enhance media slots with audio/video when ready.

Exit: absence of video/voice never breaks the page; their arrival requires no data-model redesign.

### P-F — Live replacement

Fibre:
- emit the same presentation contract from authoritative born Thread hydration;
- remove candidate-specific generation assumptions.

Consumer:
- consume live `ThreadEncounterSnapshot` rather than `EncounterFixture` where available.

Exit criterion:

```text
delete H-v2 fixture packet
copy/promote future Thread packet
```

The site continues to work without Thread-specific JSX or schema changes.

## Acceptance principles

The work is successful only if all of the following hold:

1. Fibre remains the source of authoritative Thread state.
2. Presentation packets are explicit projections, not a second Thread database.
3. The viewer can distinguish history, autobiographical memory, remembered meaning, editorial projection, and generated reconstruction.
4. A human encounter is not automatically remembered or formative.
5. A Thread's ordinary day exists before and after the human visit.
6. Current location is part of lived experience but public disclosure remains mediated.
7. Recent ordinary continuity can exist without polluting autobiographical memory.
8. Meaning may be absent, delayed, socially mediated, privately reflected upon, or revised later.
9. Photos and text provide a complete experience before optional video or voice exists.
10. Generated media never becomes historical evidence merely by looking realistic.
11. The initial unborn candidates can be removed and replaced by future Threads without consumer redesign.

## Canonization candidates

The deeper personhood insights discovered while planning this interface are recorded separately in [`../foundations/ordinary-life-and-encounter-canon-candidates.md`](../foundations/ordinary-life-and-encounter-canon-candidates.md).

That document is intentionally proposed rather than canonical until reviewed. This plan should not silently change the Thirteen Principles or settle personhood doctrine by implementation convenience.
