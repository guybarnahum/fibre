---
id: m2-pr39-slice-g1-world-presentation
status: accepted
last-reviewed: 2026-08-20
canonical: false
---

# Milestone #39 — G1 World presentation companion

## Purpose

The G1 Worlds need a human-facing surface for the website/editor and enough grounded visual information to generate environment assets later.

That surface must not become a hidden Genesis-authoring channel.

Canonical presentation contract: [`../architecture/world-presentation-v1.md`](../architecture/world-presentation-v1.md).

Concrete-world authoring rule: [`../architecture/world-context-specificity-v1.md`](../architecture/world-context-specificity-v1.md).

## Per-World artifact rule

G1 uses one canonical presentation artifact per accepted World. A website or editor may aggregate them into a catalog at read time; the durable presentation artifact unit remains one World.

Current canonical presentations:

```text
artifacts/validation/m2-pr39/g/worlds/presentation/
  world-g1-01.presentation.json  Cần Thơ, Vietnam
  world-g1-02.presentation.json  Łódź, Poland
  world-g1-03.presentation.json  Cusco, Peru
  world-g1-04.presentation.json  Accra, Ghana
  world-g1-05.presentation.json  Greater Sudbury, Ontario, Canada
```

Each canonical record is bound to its accepted G1-v2 WorldSpec by:

```text
worldSpecRef
sourceWorldSpecPath
worldSpecDigest
```

The digest is the exact final digest recorded by `g1-world-familiarity-v2.json`, so presentation cannot silently drift to a different WorldSpec while retaining the same filename.

## Preserved G1-v1 presentations

The original generic presentation records participated in the G1-v1 authoring history and are preserved separately under:

```text
artifacts/validation/m2-pr39/g/worlds/presentation/v1/
  world-g1-01.presentation.json
  world-g1-02.presentation.json
  world-g1-03.presentation.json
  world-g1-04.presentation.json
  world-g1-05.presentation.json
```

They remain bound to the superseded generic WorldSpecs and are historical presentation evidence only. They are not current website/catalog authority.

## Rich visual surface

Each accepted v2 presentation includes:

- display name;
- short website description;
- longer human-readable description;
- geography/climate;
- built environment;
- streets and public realm;
- plausible household/institution interiors;
- materials/textures;
- light/atmosphere;
- vegetation/landscape;
- mobility/vehicles;
- signage/language cues;
- clothing/everyday objects;
- technology/infrastructure;
- public institutions;
- repeated visual anchors;
- explicit shortcuts/stereotypes to avoid;
- asset-shot ideas;
- future stable asset references.

Because the G1 chronology spans **2004–2026**, the current records also include `visualProfile.temporalLayers`:

```text
2004_2010
2011_2018
2019_2026
continuities
```

This lets a later asset-generation system render a childhood, adolescent or young-adult scene with period-appropriate phones, digital access, transit/signage and urban change without inventing a different World.

Temporal presentation describes ordinary environmental change; it does not assert that the Thread experienced any particular event.

## Derivation rule

A presentation is derived only from its referenced WorldSpec facts and bounded ordinary visual implications.

It must not add or infer:

```text
personality
moral/political position
religious or ethnic identity
future profession
adult behavior
formative significance
required adversity
benchmark behavior
```

Visual elaboration may make authoritative environmental facts easier to render, but it may not fabricate a locality, landmark, institution, historical episode, source biography or personality-coded aesthetic absent from the WorldSpec.

If an asset generator needs to guess the World's country or cultural substrate, the WorldSpec is insufficient; presentation is not allowed to paper over that defect.

## Scientific boundary

`WorldPresentation` is explicitly:

```text
derived
non-cognitive
non-authoritative for Genesis
outside WorldSpec digest
outside familiarity score
outside genome assignment
outside H attribution evidence
```

Presentation files may never be passed to Pass A, Pass B, Pass C, record repair, genome generation or any H rater.

If product copy is later improved, that does not reopen a frozen WorldSpec. If presentation conflicts with the source WorldSpec, correct presentation; do not rewrite the frozen World to fit presentation.

## Asset-generation boundary

The `visualProfile` is environmental grounding, not a provider-specific image prompt.

Later image/video/3D generation may compile the relevant World presentation plus the desired date/season/shot class into provider prompts. Generated assets should preserve provenance and enter Fibre through stable object references rather than provider URLs embedded into world semantics.

Recommended initial asset family per World:

```text
hero environment
neighborhood/street/transit
public institution
home interior/exterior
material/detail scene
seasonal/environmental variant
time-series/location continuity
```

Asset generation remains presentation work. It must not alter the Thread's generated life or become evidence that the Thread experienced an event unless a separate authoritative life record says so.

## G1 status

The presentation follow-through is complete. See [`m2-pr39-slice-g1-result.md`](m2-pr39-slice-g1-result.md).

```text
G1-v1 presentations  PRESERVED under presentation/v1/
G1-v2 presentations  CURRENT / bound to exact accepted WorldSpec digests
G1                   COMPLETE / CLEAR
G2                   NEXT
```
