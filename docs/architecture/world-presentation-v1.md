---
id: architecture-world-presentation-v1
status: accepted
last-reviewed: 2026-08-20
canonical: true
---

# World Presentation v1

## Purpose

A Fibre World needs two different kinds of description:

1. **world authority** — factual state that may constrain Genesis and later world behavior;
2. **presentation metadata** — human-friendly copy and visual grounding used by websites, editors and asset-generation systems.

These must not be the same authority.

`GenesisWorldSpec` remains factual world authority. `WorldPresentation` is a companion, derived, non-cognitive presentation record.

> **WorldPresentation describes how a World is shown. It does not decide who a Thread becomes.**

## Hard authority boundary

A `WorldPresentation`:

- may be derived from an admitted/frozen WorldSpec;
- may provide display names, short/long descriptions and rich environmental visual metadata;
- may reference generated or curated world assets;
- may be revised for product/editorial quality without rewriting historical world facts;
- is **not** an input to Genesis Pass A, Pass B or Pass C;
- is not included in WorldSpec digests or Genesis authorship authority;
- is not evidence for Thread identity, memory, meaning, character, needs, beliefs or future behavior;
- may not infer personality, ideology, profession, destiny, formative significance or benchmark-relevant behavior from geography, culture or material conditions.

If presentation text conflicts with the authoritative WorldSpec, the WorldSpec wins and the presentation must be corrected.

## V1 record

V1 is **one presentation record per World**, stored independently so a World owns its own human-facing copy, visual grounding and asset references.

```text
contractVersion
scope
authority = derived_non_cognitive_presentation
derivationPolicy
worldSpecRef
displayName
shortDescription
longDescription
visualProfile {
  overallCharacter
  geographyAndClimate
  builtEnvironment
  streetsAndPublicRealm
  interiors
  materialsAndTextures
  lightAndAtmosphere
  vegetationAndLandscape
  mobilityAndVehicles
  signageAndLanguage
  clothingAndEverydayObjects
  technologyAndInfrastructure
  publicInstitutions
  visualAnchors[]
  avoid[]
}
assetShotIdeas[]
assetRefs[]
```

Presentation records are not cohort bundles. A catalog/API may aggregate multiple `WorldPresentation` records at read time, but the durable artifact/persistence unit is the individual World.

## Visual-data discipline

Visual metadata should be rich enough that an image/3D/scene-generation layer does not have to invent the basic environment from a one-line summary.

A good `visualProfile` answers:

- what kind of geography/climate is visible;
- what buildings and public infrastructure are ordinary;
- what streets, transit and public spaces look like;
- what household/institution interiors plausibly contain;
- what materials, textures, weather and lighting recur;
- what vegetation/landscape is appropriate;
- what mobility modes and everyday vehicles are normal;
- what languages/signage may appear;
- what clothing/everyday objects fit the time and setting;
- what technology/infrastructure level is ordinary;
- which visual anchors make the World recognizable across assets;
- what visual shortcuts/stereotypes must be avoided.

The record should describe **environmental truth**, not write a provider-specific image prompt. Provider/model prompt composition belongs to the asset-generation layer.

## Asset references

Generated/curated assets should be referenced through stable Fibre object IDs, not provider URLs or `r2://` / `s3://` strings embedded into semantic records.

Conceptually:

```text
WorldPresentation.assetRefs[]
        -> Fibre object metadata authority
        -> R2/S3/local object adapter
```

Examples include:

- hero/environment image;
- neighborhood/street scene;
- home exterior/interior;
- school/library/community institution;
- market/transit/public-space scene;
- maps or diagrams;
- later ambient audio/video/3D scene assets.

An asset must preserve provenance: generated reconstruction, curated reference, captured image or other source class must remain distinguishable.

## Website/editor use

A website may use:

```text
displayName
shortDescription
longDescription
hero asset
visual anchors
```

without exposing raw WorldSpec internals.

The Thread Editor may show both layers explicitly:

```text
World facts          authoritative
Presentation         derived / non-cognitive
Assets               referenced media
```

This makes it possible to improve presentation while preserving the historical/scientific WorldSpec.

## Slice G

The five #39 G1 Worlds keep their authoritative WorldSpecs under:

```text
artifacts/validation/m2-pr39/g/worlds/
```

Their companion presentation metadata lives one file per World under:

```text
artifacts/validation/m2-pr39/g/worlds/presentation/
  world-g1-01.presentation.json
  world-g1-02.presentation.json
  world-g1-03.presentation.json
  world-g1-04.presentation.json
  world-g1-05.presentation.json
```

Each is derived from the corresponding already-authored genome-blind G1 world facts and must never be fed back into the Genesis cohort-generation path.

Because presentation is non-cognitive, adding or improving it does not alter the G1 WorldSpec freeze, familiarity result or world digest. It also must not be used to rescue or regenerate a weak final Thread.

## Future production persistence

Production Fibre should expose a bounded per-World presentation service/table/document and a separate object-asset authority. A catalog is a derived read projection, not the storage unit.

The durable conceptual relationship is:

```text
World / WorldSpec facts
        |
        +--> WorldPresentation (derived human/visual surface)
                    |
                    +--> World asset refs

Thread cognition never receives WorldPresentation by default.
```

This preserves the core rule:

> **The world may be richly visible without presentation prose becoming hidden character authoring.**
