---
id: m2-pr39-slice-g1-world-presentation
status: accepted
last-reviewed: 2026-08-20
canonical: false
---

# Milestone #39 — G1 World presentation companion

## Purpose

The five G1 Worlds need a human-facing surface for the website/editor and enough grounded visual information to generate environment assets later.

That surface must not become a hidden Genesis-authoring channel.

Canonical presentation contract: [`../architecture/world-presentation-v1.md`](../architecture/world-presentation-v1.md).

## Artifact

The G1 companion bundle is:

```text
artifacts/validation/m2-pr39/g/worlds/presentation/g1-world-presentations-v1.json
```

It contains one presentation record for each G1 World:

```text
world_slice_g1_01_river_delta     River Delta District
world_slice_g1_02_inland_rail     Inland Rail City
world_slice_g1_03_highland_region Highland Regional City
world_slice_g1_04_tropical_coast  Tropical Coastal City
world_slice_g1_05_northern_lake   Northern Lake City
```

Each record includes:

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

## Derivation rule

The bundle is derived only from already-authored G1 WorldSpec facts.

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

Visual elaboration may make implicit environmental facts usable for asset generation—for example, a tropical coastal climate may imply humid light and rain conditions—but it may not fabricate specific real-city landmarks, national identity, a source biography or a personality-coded aesthetic.

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

The presentation bundle may never be passed to Pass A, Pass B, Pass C, record repair, genome generation or any H rater.

If product copy is later improved, that does not reopen the G1 WorldSpec freeze. If the presentation conflicts with a WorldSpec, correct presentation; do not rewrite the frozen world to fit the presentation.

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

## G1 status interaction

At the time this companion was authored, the maintainer had already reported the five frozen cold familiarity calls accepted at `density=4/4` each, and the local tool had emitted final WorldSpec/result files. Those exact generated files still require normal Git preservation before G1 is formally closed.

The presentation work does not substitute for that evidence-preservation step and does not authorize G2 genomes early.
