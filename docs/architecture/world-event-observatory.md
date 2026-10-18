---
id: architecture-world-event-observatory
status: accepted
last-reviewed: 2026-10-18
canonical: false
---

# World Observatory — the World's lived God-view

## Purpose

Admin must reveal Fibre's independently unfolding World, not merely execution
logs or a population directory. The observer should move from a pulsing
**city**, to its actual **places**, to an admitted **event timeline**, to
**potential and actual witnesses**, their individually recorded **Experience**
and Memory (if separately supported), and later consequences when evidence
really links them. Read-only inspection must never wake Threads, alter World,
call cognition or manufacture an ambient occurrence.

The Observatory is an operator surface, not a second World model. Its records
are projections from existing authoritative LivedNow CurrentSituations,
verified places, Encounter Stories, attention, Experience, and autobiographical
Memory. Activity Logs can be linked for debugging but never establish
World truth.

## Three visual scales

**World map:** Cities with *recent admitted occurrences* pulse softly. Pulse
frequency/intensity reflects evidenced activity inside a selected time window,
not population size, plans, speculative ambient opportunities or guarantees
that someone is awake. A city with current World population but no admitted
recent event is not called an active event center. A bounded source sample
must clearly label its coverage.

**City map:** Selecting a city zooms to its verified World public venues and
their relative real coordinates. Independently admitted places without events
remain visible but quiet. Venue names, independent geography and current
evidence are shown; unverified Genesis settings and city centroids never
masquerade as physical sites. Cities may also contain **private activity**,
whose city-level aggregate can be shown without exposing residential
coordinates or merging unrelated homes. Until that aggregation is implemented,
the map explicitly states verified-public-place coverage.

**Place view:** Selecting a place opens one chronological World-event timeline.
Entries distinguish real arrival/departure, physical/social action,
environmental occurrence and causal continuation. An event card can expand to
show actor/source, source Story/situation references, objectively associated
participants, potentially perceiving witnesses, each actual
`noticed | not_noticed | not_appraised` result, immediate Experience,
selective consolidation, Memory evidence and later causally traced effects.
An unresolved link says **not established**, never 'forgotten' or 'unaffected'.
A Thread entry deep-links to its existing Observatory; an experience or
memory link must only be enabled when its exact source identifier is known.

**Human interactions** belong on the same timeline when admitted by their
correct World/encounter authority. A remote browser visitor must not appear
as a person physically present in a park.

## Evidence distinctions

- **Occurrence happened:** World-enacted physical action or admitted Encounter
  Story. An ambient scheduling opportunity is not an event.
- **Could have perceived:** World-grounded event-time observer situation.
- **Actually noticed:** the individual's separately committed attention.
- **Experienced:** an admitted individual Experience; never inferred just
  from presence.
- **Remembered:** autobiographical Memory with a verified causal source.
  A consolidation or Journal is not necessarily memory.
- **Later effect:** a later World/Thread choice supported by explicit causal
  references, not a colorful inferred 'impact' summary.
- **Not observed in query:** bounded evidence gap, never a negative fact.

## Read architecture

Add a narrow authenticated Admin read endpoint delegated to the World Kernel.
The browser never receives the World private token. World composes a bounded
snapshot from existing indexed authoritative tables and returns place
identities/coordinates plus admitted recent events and witness references.
No repeated per-Thread Observatory fetch, no full-population `LivedNow.ensure`,
no globally running stream, no generic event bus, no new mutable event authority.
A selected place may later use a place-indexed cursor over the same sources
for deep history; promote such an index only when the measured query requires
it. Read source cost/coverage explicitly.

Initially: verified public venues, World-enacted arrival/departure history and
place-grounded Encounter Stories. Empty, ungrounded and remote-only stories are
not falsely pinned on the map. Unverified areas, private city-level aggregates,
individually linked Memory and demonstrated downstream consequences remain
visible as *evidence gaps* until their corresponding source is available.
No reconstruction of past knowledge from the current City Guide.

## Interaction and visual language

A restrained geographic map with heartbeat-like halos only for active event
centers; selecting city uses a geographic-scale inset, not a synthetic street
map. Place markers pulse only for admitted activity. The timeline shares
event identity across all witnesses, with their private lanes shown
separately. Filters: time range, occurrence kind, noticed/unnoticed, with
refresh on demand and optional lightweight polling only while the view is
visible. No inference calls for a monitoring effect.

## Development slices

1. **Authoritative World event read model.** Bounded verified-place activity
   and timeline projection, honest source counts/coverage; actor event-time
   and Encounter Story cross-links with separately evidenced attention.
2. **Admin map and drilldown.** Existing world SVG projection; city pulse,
   locally scaled verified-place map, chronological event cards and links to
   current Thread Observatory. No fabricated personal impact.
3. **Experience/Memory causality.** Add per-event exact Experience/Memory
   source links and defensible future-decision relations only where backed by
   authoritative edges.
4. **General World scene activity.** Extend the indexed projection to
   scene-owned ambient work, human/Thread actions, private city aggregates,
   long-range perception and sustained world-state changes as the runtime
   source refactor lands. No second dashboard-specific event system.

This is a critical observability companion to the World occurrence
replacement, not a detour from S1F → S2. The acceptance witness is one actual
shared-place occurrence, distinct Thread notices/experiences and any
evidenced later effect, inspectable through the same World map.
