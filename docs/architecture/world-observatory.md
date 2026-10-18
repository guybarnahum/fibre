---
id: architecture-world-observatory
status: proposed
last-reviewed: 2026-10-18
canonical: false
---

# World Observatory — God's view of activity, events and consequence

## Intent

The authenticated Fibre Admin dashboard needs a top-level **World Events**
pane. It should let an operator see the living World at global, city,
place and occurrence scales, then follow an objective happening into each
Thread's independent attention, Experience, Journal, Memory, relationships
and demonstrably affected later choices. It also needs to expose ordinary
human encounters, Thread–Thread meetings and silent witnessing, where World
has admitted those facts.

This is an **observatory**, never a World simulator, a meeting generator, a
separate event authority, or a new condition for Thread life. Its purpose is
to diagnose and demonstrate the north star: independently living people
meet in a shared, changing World and may influence one another's lives.

## Navigation and interaction

**World → City → Place → Event → Individual consequence** is the principal
drill-down. The context remains visible while exploring an event; opening a
Thread's detail or Memory must preserve a route back to its World event.

### Global World view

Reuse `apps/admin-dashboard/world-map-ui.js` for Earth geography and
optional daylight context. Do not introduce a second global map stack.

- Cities with **recent admitted World occurrences** can pulse. Pulse
  prominence follows *real observed activity in the selected time window*,
  never model token use, number of queued jobs, birthplace population,
  or whether a Thread is computationally thawed.
- A currently occupied scene with no new event may have a steady presence
  marker, not a fabricated pulse. An inactive city is quiet; absence of
  recorded activity must not be interpreted as an empty real city.
- A city marker displays grounded city name, last occurrence time, bounded
  recent counts by type, known current situated actors, and the precision
  of that location. World lacks omniscience about actual humans; show only
  actors admitted to Fibre.
- Choose window `Live / 1h / 24h / 7d`, category and actor filters, and a
  paused historical cursor. `Live` means the latest authoritative state
  on the last refresh/hint, not an always-running model or simulation.
- Represent country/city-only, unlocated and mediated/remote events in
  explicitly separate lists. Never put an online human or a Genesis context
  at a fabricated street location.

### City view

Selecting a city zooms into an **interactive city place map** with an
adjacent scrollable place list. Show independently attested public venues
at their known physical coordinates and private/unverified places only at
the actual precision World can attest. Reuse the global map geometry and
marker conventions; a small city-extent projection is sufficient for the
initial slice. A street/tile provider is optional later if it adds genuine
navigational value; do not require it for the event architecture.

A place marker can pulse on recent admitted occurrences. A quiet but
occupied place is steady. Selecting a marker focuses the detail pane and
preserves city/time filters. The list is a full keyboard-accessible
alternative to map navigation.

### Place view

The upper details rail shows authoritative `wpl_*` or private
place identity, address/locality and coordinate precision where supported,
place type/affordances, World-attested evidence, currently established
situations, and the last occurred World event. Mark unreconciled or
stale presence explicitly.

A vertically scrollable, time-ordered, **cursor-paged event timeline**
contains admitted actor actions (arrival/departure and subsequent physical
actions), objective environmental occurrences, social meetings/utterances,
and witnessed events. Each row shows exact occurred time, source kind,
short objective wording, actor/participant refs if admitted, and compact
attention/experience counts. Group a continued encounter under its actual
shared Story lineage; never group unrelated occurrences merely because
they are nearby in time.

The timeline draws a sharp distinction among:

- **Objective event** — something actually happened in World.
- **Eligible/potential witness** — a situated actor could perceive it.
- **Noticed / not noticed** — an individual attention judgment exists.
- **Unknown / not processed** — neither outcome may be inferred.
- **Responded / declined / ignored** — only when an actual admission exists.
- **Memory / consequence** — explicit individual records, not automatic.

### Event detail and causality

Clicking an event opens an evidence-rich detail view:

1. **World fact** — objective text or action, occurrence time, verified
   venue or location scope, event/Story ref, provenance, source
   CurrentSituation(s), and any causal continuation link.
2. **Presence/possible perception** — actual admitted actor participants,
   grounded potential witnesses and historical CurrentSituation links.
   An actor can cause an event without witnessing it. The observer list
   may be partial when computational appraisal was bounded.
3. **Personal responses** — each admitted `noticed | not_noticed`
   decision, optional Experience, voluntary social participation/decline,
   interruptions and delayed consolidation; no attention is invented.
4. **Subsequent life** — click-through to the exact Journal item,
   autobiographical Memory, relation/affect, or later authored choice.
   Show explicit causal evidence refs. When only chronological succession
   is known, say **later, causality not established**; when no evidence
   has been obtained, say **no recorded consequence found**, never
   **no impact**.
5. **Debugging** — compact source refs, event-time place authority,
   indexed witness query outcome, pending/retry/failed appraisal state
   where authoritative, and cost/model provenance if already recorded
   by the owning operation. Expandable exact-record view is optional.

A person link opens the existing Admin Thread Observatory at the matching
World Event / Encounter / Memory anchor. A counterpart opens their own
Thread detail. A human encounter links to the actual admission/receipt
without implying physical co-presence for a remote browser visitor.

## Data and authority

The UI must read **World**, not reconstruct World truth from Activity logs.

Existing owners:

- LivedNow `current_situation_records` and `current_situation_frontier`
  own actor movement/current life; actual arrival/departure occurs at the
  admitted situation timestamp.
- `encounter_story_records` own objective ambient and encounter stories.
  `encounter_story_thread_presence` gives historical situated participants.
- `thread_encounter_attention`, `thread_encounter_experiences`,
  consolidation, Journal and autobiographical Memory own individual
  consequences. Memory `eventRefs` and relation/semantic evidence
  references are the only valid causal cross-links.
- `world_public_places` owns attested shared venues, coordinates and
  locality. Other places must preserve their actual geographic precision.
- Activity Log is useful for *diagnosis* after an authoritative event has
  been selected, not for determining whether the event happened.

The existing per-Thread Admin Observatory and
`thread-encounter-model.mjs` already support individual event-to-experience
links. **Do not duplicate their episode/Memory matching rules.**

### Read model, not a new event log

The current World schema has no efficient place/time index combining
CurrentSituation and Encounter Story facts. Introduce only a **small,
reconstructable, World-owned occurrence-place index** as necessary for
indexed global/city/place reads. Each row links to an unchanged authoritative
source rather than copying event prose or subjective records:

```text
occurredAt
sourceKind = enacted_situation | encounter_story
sourceRef = situationId | encounterId
placeRef (when genuinely situated)
locality/country (when independently grounded)
eventKind (arrival | departure | ambient | social | ...)
```

The source ref remains the truth; duplicate index entries are idempotently
rejected. Index additions must happen after or atomically with admitted
source facts. Migration of historic sources must be incremental and
bounded, with an explicit coverage horizon. Never silently present a
partially backfilled history as complete.

Two bounded **read-only** World projections are sufficient initially:

- `activity-overview(since,until,limit)`: per-city recent counts,
  latest event, known coverage and activity/occupancy distinctions.
- `place-events(placeRef,since,until,cursor,limit)`: event-source refs
  ordered by actual time with stable pagination. A selected-event lookup
  resolves one source and bounded attention/Experience/consequence edges
  using existing owning stores.

These are conceptual operations, not existing APIs. Route them through
the established authenticated Admin Worker → private World binding,
without copying the private World token into browser JavaScript. No
per-Thread population fan-out; no new periodic population scans.

### Freshness without artificial World work

A user opening the Observatory requests a bounded current projection.
Use the **existing Admin-live invalidation channel** when World can emit a
minimal city/place-change hint after an admitted event. A hint names an
affected scope, not an event's secret detail; it prompts one authoritative
reread of the visible scope. A reconnect makes one bounded reconciliation
read. Until that World emitter exists, explicit refresh is truthful; do
not invent a second WebSocket, tight polling loop or high-frequency
background refresh.

Marker pulse is a CSS visual response to recent **admitted timestamps**,
not a process generating the impression of life. Support reduced motion
and make all markers navigable by keyboard. Keep the currently selected
event and time cursor stable across refreshes.

## Implementation order — synchronized with World event replacement

**Observatory 0 — contract and design (current).** Adopt this source-grounded
information hierarchy; no UI claim until World projection exists.
Reuse the existing World Map and Thread Observatory.

**Observatory 1 — objective World read projection.** As the new
`world-occurrence` actor/ambient authority is implemented, add the bounded
reconstructable place/time index and read-only World queries. Verify:
an authentic arrival appears once, an environmental story appears once
for all witnesses, an unsupported Genesis context is not mapped to a
physical café, and unrelated city records are not scanned.

**Observatory 2 — global and city God-view.** Add a top-level Admin
`World Events` pane with activity-based global city markers,
city zoom/place list, time/category controls and place timeline. Show an
empty World as empty, not pulsing sample data. Opening the page must not
wake, replan or contact Threads. UI must distinguish exact venues,
city-level locations and unmapped events.

**Observatory 3 — individual consequence drill-down.** On an actual
occurrence show eligible/noticed/not-noticed/unknown witnesses; link
individual Experience, Journal, Memory and social relations through
explicit evidence. Connect to existing Thread Observatory anchors.
Prove two Threads can independently notice/miss one shared event, and
that retry never fabricates a second occurrence or personal record.

**Observatory 4 — live invalidation and social debugging.** Reuse Admin-live
invalidation for visible city/place scopes, add explicit event/attention
retry diagnostics and human–Thread encounter receipts. Validate that a
voluntary encounter, refusal or silent witness is displayed according to
what World actually admitted, never an imagined relationship.

## Acceptance and guardrails

- **No UI events authored by the browser.** Events are retrieved, not
  invented, normalized into simulated life, or backdated on page load.
- **Map pulse = recent admitted event**, not `runtime active`, scheduled
  ambient opportunities, birthplace, or current occupancy alone.
- **One occurrence, several independent personal outcomes**, with every
  displayed connection traceable by real source refs.
- **Presence is not noticing; noticing is not memory; later is not caused by.**
- **No map query invokes model cognition, LivedNow.ensure, a meeting or a
  material World mutation.**
- **Empty, quiet and incompletely grounded areas are honestly represented.**
- **Keep runtime cheap**: bounded indexed queries, no population scan or
  deep histories until the operator selects a place/event.
- **Do not block the S1F → S2 critical path**: World-event execution and
  actual autonomous encounters remain more fundamental than this UI.
  Build the Observatory in parallel only against accepted World contracts.

### Deliberately deferred

A full street-map/tile stack, agent simulation overlays, every animal or
object as a persistent actor, synthetic replays of unwitnessed events,
complete historical backfill at deploy time, a generalized graph database,
and speculative causal inference are deferred. They can be added only
when authoritative Fibre World use cases warrant them. No separate
event authority, public-private disclosure collapse, or mandatory
journal/memory link is introduced.
