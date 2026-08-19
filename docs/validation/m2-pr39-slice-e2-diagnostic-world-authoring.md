---
id: validation-m2-pr39-slice-e2-diagnostic-world-authoring
status: candidate
last-reviewed: 2026-08-19
canonical: false
---

# Milestone #39 — Slice E2 diagnostic-world authoring record

## Purpose

E2-D1 and E2-D2 are fresh throwaway diagnostic worlds for the H6-first Rich Life investigation.

They were authored after the E1 failure was known, so the author cannot be blind to that failure. This record makes the resulting authoring confound explicit rather than pretending it does not exist.

The executable fixtures are:

```text
tools/genesis-rich-life-e2-worlds.mjs
```

Neither world was authored with access to:

- a development genome or loci;
- a target adult personality;
- a future role or benchmark;
- Pass-B memory outcomes;
- Pass-C meaning outcomes;
- a named source person, biography or plot.

The worlds become permanently burned for G/H on their first model use, including H6-b rating use.

## Capacity controls held deliberately equal to E1

Because E1 failed with local cast/place monoculture, D1/D2 do **not** receive more obvious breadth capacity merely to make them look better.

All three worlds hold:

```text
places: 5
initial roster: 4
  subject
  caregiver
  caregiver
  sibling

afforded role vocabulary:
  caregiver
  sibling
  peer
  teacher
  neighbor
  librarian
  mentor
  shopkeeper

developmental span:
  age 6 through 17.999

default E2/A0 history density:
  10 strata / episodes
```

This does not make the worlds semantically equivalent. It prevents the simplest post-E1 confound: giving D1/D2 more people and more places and then crediting E2 mechanisms for the improvement.

## E1 baseline world

E1 is a late-20th/early-21st-century dense mixed-income urban district:

- stable rented apartment;
- two caregivers and younger sibling;
- English/Korean household context;
- public school;
- public library;
- community center;
- local commercial street;
- walking, cycling, buses;
- broad public intellectual access.

The completed E1 life nevertheless used the home for 9/10 events, one caregiver for 10/10, the sibling for 9/10, introduced nobody, and produced zero intellectual encounters.

E1 is not rerun as an anchor. Its completed artifact remains the original burned negative evidence.

## E2-D1

Executable identity:

```text
world_slice_e2_d1_burned_on_first_use
```

D1 intentionally changes **environmental mechanism**, not capacity count:

- era shifts earlier: childhood/adolescence 1988–2000;
- compact estuary/working-port district rather than dense generic urban neighborhood;
- household schedules vary because both caregivers work shifts;
- public movement depends on walking, bus and ferry schedules;
- market/repair commerce is more visible;
- municipal reading/meeting room combines books, notices, classes, meetings and performance rather than using a dedicated public library;
- English/Portuguese context;
- municipal transport and work schedules can change ordinary access without implying a developmental lesson.

The world still has exactly five places and the same four-person initial roster as E1.

## E2-D2

Executable identity:

```text
world_slice_e2_d2_burned_on_first_use
```

D2 changes a different environmental mechanism:

- childhood/adolescence 2009–2021;
- dispersed high-desert county-seat setting rather than a dense district;
- one caregiver periodically works multi-day shifts outside town;
- consolidated regional school reached by scheduled bus;
- peers and services are spatially dispersed;
- cooperative market and regional bus hub replace dense local commerce;
- one shared public hall hosts mobile library, clinic, extension, civic and youth uses;
- English/Spanish context;
- access depends more strongly on distance, regional schedules and weather.

D2 also retains exactly five places and the same four-person initial roster as E1.

## Known authoring confound

D1/D2 were authored after seeing that E1 underused its public world. Their descriptions therefore make the mechanics of public access and access interruption relatively explicit.

This is intentional enough to support the H6/H3 diagnostic question but is also a potential confound. We record it before any result:

> If fresh A0 lives use more of D1/D2 than E1, the difference may arise from WorldSpec semantics rather than an E2 mechanism.

Therefore E2 interpretation compares **A0 versus experimental arm inside the same D1/D2 world**. E1 is historical motivation, not the paired statistical/control cell.

## H6 static offer-width finding

Before any D1/D2 model call, the existing full-stratum eligibility rule yields the same age-dependent eligible-structure counts in E1, D1 and D2 because eligibility is currently based on developmental range rather than world semantics:

```text
stratum 01   9
stratum 02  12
stratum 03  14
stratum 04  15
stratum 05  16
stratum 06  13
stratum 07  18
stratum 08  15
stratum 09  13
stratum 10  11
```

Consequences:

- A0's nine offers already expose the entire eligible surface in stratum 01;
- a fixed >=12-offer A6 arm cannot exist across all ten strata without changing Pool-v2 or the developmental windows;
- the oldest stratum has only eleven eligible structures;
- offer-width can currently be manipulated only in the middle strata if Pool-v2 remains frozen.

This is H6 evidence, not permission to mutate the pool before diagnosis.

## Burn discipline

Before first model use:

```text
D1/D2 authored: yes
D1/D2 committed: yes
D1/D2 model-used: no
D1/D2 burned: no
```

At the first H6-b or life-generation model call, update the evidence artifact to mark the relevant world burned. It can never become a G/H final-cohort world afterward.
