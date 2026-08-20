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

G1 uses one presentation artifact per World. A website or editor may aggregate them into a catalog at read time; the durable presentation artifact unit remains one World.

Each presentation includes:

- exact `worldSpecRef`;
- display name;
- short website description;
- longer human-readable description;
- overall visual character;
- geography/climate;
- built environment;
- street/public realm;
- interiors;
- materials/textures;
- light/atmosphere;
- vegetation/landscape;
- mobility/vehicles;
- signage/languages;
- clothing/everyday objects;
- technology/infrastructure;
- public institutions;
- repeated visual anchors;
- explicit visual shortcuts/stereotypes to avoid;
- several asset-shot ideas;
- future stable asset references.

## Current v1 presentation artifacts

```text
artifacts/validation/m2-pr39/g/worlds/presentation/
  world-g1-01.presentation.json
  world-g1-02.presentation.json
  world-g1-03.presentation.json
  world-g1-04.presentation.json
  world-g1-05.presentation.json
```

These five files remain bound to the preserved **G1-v1 generic WorldSpecs**:

```text
world_slice_g1_01_river_delta
world_slice_g1_02_inland_rail
world_slice_g1_03_highland_region
world_slice_g1_04_tropical_coast
world_slice_g1_05_northern_lake
```

They must not be silently repointed to the G1-v2 concrete Worlds.

## G1-v2 presentation rule

Human review found that G1-v1 was too geographically interchangeable. G1-v2 is now being corrected at the **WorldSpec** layer first, using Cần Thơ, Łódź, Cusco, Accra and Greater Sudbury as concrete settings.

Do not use presentation prose to paper over missing WorldSpec facts.

After the v2 familiarity rerun clears and the exact final `world-g1-0X-v2.json` files/digests are preserved, create a new per-World v2 presentation artifact for each accepted v2 World. Those records should derive architecture, signage, climate, transport, institutions and other visual anchors from the concrete WorldSpec and may then drive image/video/3D asset generation.

## Derivation rule

A presentation is derived only from its referenced WorldSpec facts.

It must not add or infer:

```text
personality
moral/political position
future profession
adult behavior
formative significance
required adversity
benchmark behavior
```

Visual elaboration may make authoritative environmental facts easier to render, but it may not invent a country, locality, landmark, institutional fact, national identity, source biography or personality-coded aesthetic absent from the WorldSpec.

If the asset generator needs to guess the World's country or local culture, fix the WorldSpec first.

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

If product copy is later improved, that does not reopen a frozen WorldSpec. If a presentation conflicts with a WorldSpec, correct presentation; do not rewrite the frozen world to fit presentation.

## Asset-generation boundary

The `visualProfile` is environmental grounding, not a provider-specific image prompt.

Later asset generation may compile it into prompts for image/video/3D providers. Generated assets should preserve provenance and enter Fibre through stable object references rather than provider URLs embedded into world semantics.

Recommended initial asset family per World:

```text
hero environment
neighborhood/street/transit
public institution
home interior/exterior
material/detail scene
```

Asset generation remains presentation work. It must not alter the Thread's generated life or be used as evidence that the Thread actually experienced an event unless a separate authoritative life record says so.
