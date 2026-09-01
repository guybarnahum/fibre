---
id: architecture-temporal-world-reuse
status: proposed
last-reviewed: 2026-09-01
canonical: false
---

# Reusable places and temporal Worlds

## Purpose

Record an important M2 data-model optimization so Genesis does not repeatedly research and regenerate the same external place/world substrate for every new Thread.

The current `WorldSpec` shape is useful for Genesis but mixes several kinds of information that have different reuse and authority lifetimes: durable place facts, time-varying external-world facts, and Thread-specific household/life circumstances.

This note records the accepted direction. Exact schemas, storage tables, migration and admission contracts remain to be designed during the M2 data-model pass rather than interrupting the current cloud-runtime Slice G work.

## Direction

Split the current conceptual `WorldSpec` into three layers:

```text
PlaceSpec
    -> Temporal WorldSlice(s)
    -> ThreadWorldContext
    -> Genesis / lived experiences
```

### `PlaceSpec` — reusable place substrate

Represents stable or slowly changing facts about a real or synthetic place. Examples include:

- geographic identity and boundaries;
- climate and physical setting;
- long-lived neighborhoods, landmarks and transport topology;
- languages commonly encountered;
- enduring institutions and cultural/geographic characteristics;
- stable place affordances that do not depend on one Thread.

A `PlaceSpec` is reusable across many Threads and many time periods. It must not contain facts that merely happened to be true for a previous Thread's household or generated biography.

### `WorldSlice` — place plus time

Represents the external circumstances of a place over a bounded historical interval. Examples include:

- technology and communications availability;
- transport services and infrastructure;
- schools and institutions that exist in the interval;
- economic/material conditions;
- laws and public policy relevant to ordinary life;
- media/information environment;
- major public events and social conditions;
- time-local affordances that differ from earlier or later periods.

World change is temporal and append-only/versioned. Fibre should not mutate one timeless place record from "2010" into "2020" and thereby make earlier lives silently inherit later facts.

A Thread's Genesis history resolves the `WorldSlice` valid for the date of the experience. Change boundaries need not be fixed calendar buckets; later work may use factual validity intervals when more precise boundaries are useful.

### `ThreadWorldContext` — individual situated life

Represents circumstances specific to one Thread rather than the shared external world. Examples include:

- household shape;
- caregivers and family relations;
- exact home and school selection;
- personal material circumstances;
- particular access to technology and institutions;
- friends, mentors and recurring participants;
- Thread-specific place affordances;
- specific generated/lived events.

These values must not be copied from another Thread merely because both Threads live in the same city.

## Reuse rule

When Genesis needs a setting already represented in Fibre:

1. Resolve an existing `PlaceSpec` when the same place identity is appropriate.
2. Reuse existing `WorldSlice` records whose validity intervals cover the Thread's historical period.
3. Create new `WorldSlice` records only for missing time periods or materially changed external circumstances.
4. Create a new `ThreadWorldContext` for the Thread.
5. Generate Thread-specific experiences against the resolved shared place/time substrate.

Conceptually:

```text
                 place_fes_ma
                     |
        +------------+-------------+
        |                          |
 world_fes_2010_2015       world_fes_2016_2020
        |                          |
   +----+----+                +----+----+
   |         |                |         |
Thread A  Thread B         Thread C  Thread D
```

The Threads share an external reality where appropriate without becoming interchangeable biographies.

## Important non-reuse rule

A previous Thread's generated historical events are not promoted into shared World facts merely because they occurred in the same place.

For example, if Thread A met a particular vendor in Fes in 2014, Thread B does not automatically inherit that encounter. A future shared-society model may allow live Threads and shared entities to genuinely coexist and create common world events, but that requires an explicit shared-world authority rather than accidental reuse of one Thread's biography.

## Authority boundary

This optimization must preserve the existing Fibre rule that World authorities own factual/admitted world state and Thread authorities own the individual's biography, memory, meaning, identity and relationships.

Reusable place/time records constrain what was possible and available. They do not prescribe character, values, beliefs, politics, competence, profession, or narrative significance.

A model may use `PlaceSpec` and `WorldSlice` as factual context when developing a life, but model output does not become external-world authority without the normal Fibre validation/admission boundary.

## Why this matters

The optimization should provide all of the following:

- avoid repeated research/provider cost for the same place and historical period;
- improve consistency between Threads who inhabit the same external reality;
- prevent later facts from leaking backward into earlier lives;
- make location/time provenance inspectable and reusable;
- reduce monolithic `WorldSpec` duplication;
- keep Thread-specific households and experiences non-interchangeable;
- preserve an extension path to a genuinely shared Fibre society in which multiple Threads can inhabit the same world concurrently.

## Relationship to current M2 work

This is a **data-model optimization to carry into the M2 data-model pass**. It does not alter the active #41 M2 Standing Gate criteria and it is not evidence toward Whole-Person standing by itself.

The current Genesis `WorldSpec` remains the working contract until a dedicated migration replaces it. Existing Worlds and Genesis evidence remain valid under their recorded schema/version and provenance.

## Deferred design work

Before implementation, freeze:

- stable identity rules for `PlaceSpec` and `WorldSlice`;
- temporal validity and overlap rules;
- authoring/source provenance and correction semantics;
- storage/index strategy and migration from current `genesis_world_specs`;
- how `ThreadWorldContext` references situated-life/place authorities already established by #38;
- cache/reuse selection rules and conflict handling;
- how historical Genesis and later live Experiences resolve the same place/time substrate;
- whether shared live entities/events require a separate future shared-world event authority.

Capability status: **Deferred optimization with preserved architecture direction**. The optimization must remain visible until implemented or explicitly superseded.
