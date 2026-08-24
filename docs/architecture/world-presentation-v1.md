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

If presentation conflicts with the authoritative WorldSpec, the WorldSpec wins and the presentation must be corrected.

## V1 record

V1 is **one presentation record per World**, stored independently so a World owns its own human-facing copy, visual grounding and asset references.

For a presentation derived from a frozen WorldSpec, exact source binding is required:

```text
contractVersion
presentationRevision
scope
authority = derived_non_cognitive_presentation
derivationPolicy
worldSpecRef
sourceWorldSpecPath
worldSpecDigest
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
  temporalLayers {
    <period>...
    continuities
  }
  avoid[]
}
assetShotIdeas[]
assetRefs[]
```

`presentationRevision` identifies the presentation derivation/version. `sourceWorldSpecPath` is an artifact locator where applicable; it is not production domain authority. `worldSpecDigest` binds the presentation to the exact factual WorldSpec from which it was derived.

A presentation generated before a WorldSpec is frozen may omit the final digest only while explicitly marked draft/provisional; it must not be treated as current public presentation authority after a frozen source exists.

Presentation records are not cohort bundles. A catalog/API may aggregate multiple `WorldPresentation` records at read time, but the durable artifact/persistence unit is the individual World.

## Visual-data discipline

Visual metadata should be rich enough that an image/3D/scene-generation layer does not have to invent the basic environment from a one-line summary.

A good `visualProfile` answers:

- what geography/climate is visible;
- what buildings and public infrastructure are ordinary;
- what streets, transit and public spaces look like;
- what household/institution interiors plausibly contain;
- what materials, textures, weather and lighting recur;
- what vegetation/landscape is appropriate;
- what mobility modes and everyday vehicles are normal;
- what languages/signage may appear;
- what clothing/everyday objects fit the setting;
- what technology/infrastructure level is ordinary;
- which visual anchors make the World recognizable across assets;
- what changes across the World's chronology;
- what remains visually continuous across that chronology;
- what visual shortcuts/stereotypes must be avoided.

The record should describe **environmental truth**, not write a provider-specific image prompt. Provider/model prompt composition belongs to the asset-generation layer.

## Temporal visual grounding

When a World spans materially different periods, `temporalLayers` should make asset generation time-aware.

For example, a 2004–2026 World may need to distinguish:

```text
early chronology  feature phones / more analog public information
middle chronology smartphones and expanding digital access
late chronology   contemporary digital services and infrastructure
continuities      geography, institutions, built fabric and ordinary local rhythms that persist
```

This is presentation metadata about ordinary environmental change. It may not invent a Thread event, memory, formative episode or life outcome.

The asset-generation layer should combine the relevant temporal layer with the requested scene/date rather than treating the latest visual profile as timeless.

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
- seasonal or chronology-specific variants;
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

## Supersession and history

A presentation may be superseded when its source WorldSpec is superseded or when presentation quality improves.

Do not silently repoint a presentation that participated in a frozen experiment. Preserve the old record as historical presentation evidence, then create/update the current presentation with a new source binding.

The current presentation's `worldSpecRef` and `worldSpecDigest` must resolve to the same factual World.

## Current development fixtures

WorldPresentation is a reusable product/runtime concept, not a Slice-G
artifact convention.

The current comprehensive golden presentation fixture is self-contained under:

    fixtures/thread-presentation/can-tho/

Current #39 development WorldSpecs live under:

    fixtures/genesis/pr39/worlds/

Historical G/H cohort directories are preserved by Git history rather than
kept as active architecture.

Presentation must never be fed back into Genesis cognition. Improving display
copy, visual grounding or media planning may not alter authoritative WorldSpec
facts, rescue a weak generated life, or become identity/character evidence.

When presentation participates in a current exact-byte compatibility claim,
retain only the smallest stable fixture or persisted record needed by that
claim.

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

In production, a stable World identifier plus a source-version/digest binding should replace Git artifact paths as the durable reference mechanism.

This preserves the core rule:

> **The world may be richly visible without presentation prose becoming hidden character authoring.**
