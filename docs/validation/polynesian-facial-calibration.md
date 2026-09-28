---
id: polynesian-facial-calibration
status: active
last-reviewed: 2026-09-28
---

# Polynesian facial calibration

## Purpose

This note records the evidence behind Fibre's oceania.polynesia morphology calibration.

The target is not a stereotypically recognizable face. It is a plausible distribution of distinct Polynesian humans when a missing biological parent is instantiated from explicit Polynesian physical-lineage evidence.

Population labels never cross the rendering boundary.

## Current hierarchy

~~~text
oceania
  polynesia
    native_hawaiian
    samoan
    tongan
    maori
    other
  micronesia
  melanesia
~~~

The island-specific Polynesian children currently inherit the shared oceania.polynesia prior. This preserves lineage specificity without inventing island-specific morphology.

oceania.polynesia is a complete calibration root (parent:null) even though it remains taxonomically under Oceania. That is intentional: inheriting either the broad oceania morphology or an ancestry-weighted East-Asian/Oceanian blend produced false visual templates.

## What the visual experiments falsified

Three same-seed 48-person visual cohorts were useful because they exposed different model mistakes.

### Broad-Oceania fallback

The first Polynesian cohort inherited the broad oceania center too directly. It collapsed toward very deep pigmentation and uniformly curly hair and read visually as a generic African-descended/Melanesian-like template.

### Broad-Oceania plus patches

Conservative hair/pigmentation patches fixed the most obvious collapse, but the renderer still alternated between European-looking and African-descended-looking defaults. The morphology was not integrated enough.

### 79/21 ancestry-weighted whole-profile basis

The next experiment used a population-history-informed 79% east_asia / 21% oceania calibration blend plus direct Polynesian overrides.

It produced a much more coherent cohort but over-corrected toward East Asia. In the same-seed 12-person Polynesian subset:

- eye spacing was almost universally wide;
- eye opening was universally narrow;
- epicanthic expression was almost universally present;
- upper-eyelid exposure was universally low;
- the nasal bridge/projection also shifted toward the East-Asian parent.

This falsified ancestry-ratio morphology blending as a Fibre abstraction. Genomic ancestry remains useful population-history context, but it must not be converted mechanically into facial coefficients.

The blend mechanism was removed rather than merely reweighted.

## Current independent Polynesian center

The current oceania.polynesia prior is complete and explicit.

Evidence-backed center directions are:

- medium-brown pigmentation center;
- predominantly straight-to-low-waved dark hair;
- broad face;
- substantial facial height;
- slightly narrower-than-neutral eye opening without an East-Asian-template narrow eye;
- slight / low-frequency epicanthic expression;
- moderately broad nose;
- medium-to-low nasal bridge;
- broad / robust lower face;
- more anterior / prominent chin.

Unsupported axes are deliberately kept near neutral rather than borrowed from another population prior.

The normalized numbers are calibration coordinates, not anthropometric units.

## Source and confidence model

Confidence belongs to each source-to-Fibre-locus mapping, not to an ethnic label.

Reusable source records live in:

~~~text
core/src/human-appearance/calibration-evidence.mjs
~~~

### pigmentation — moderate

Sullivan's 1922 Tongan series records unexposed skin in medium-brown ranges.

This is direct descriptive measurement, but the historical color scale does not map mechanically to Fibre's normalized coordinate.

### hairForm — moderate

The same Tongan series records straight and low-waved hair as the two dominant forms. Together they make up the large majority of the observed sample.

This directly supports a straight-to-wavy center while retaining deeper waves/curls as within-population variation.

### faceBreadth — moderate

Supported by:

- Antoun et al. 2014 Māori 3D facial scans;
- Coltman et al. 2000 Polynesian/Māori cephalometry;
- Sullivan 1922 Tongan face-width measurements;
- Buck & Viđarsdóttir 2012 Polynesian geometric morphometrics.

These sources consistently support a broad / large craniofacial skeleton.

### faceLength — low

Supported by Hawaiian and broader Polynesian craniofacial studies showing substantial facial height.

The mapping from skeletal/cephalometric facial height to Fibre's visible faceLength is indirect, so the shift remains small.

### eyeShape — low

The Tongan somatology series describes the common eye opening as somewhat less wide and slightly oblique relative to its European comparison.

This supports only a small negative eyeShape shift.

### epicanthicFold — low

The Tongan source describes a suggestion of an epicanthic fold in common types and summarizes the fold as low-frequency.

Fibre therefore centers on slight, not present/pronounced, expression.

### noseBreadth — moderate

Tongan nasal index/absolute-width measurements support a moderately broad nose. Polynesian/Māori cephalometry also reports a broad bony nasal aperture.

### nasalBridgeHeight — low

The Tongan series describes the bridge as predominantly medium or low in elevation.

The mapping into Fibre's bridge-height coordinate is qualitative, hence low confidence.

### jawBreadth — moderate

Supported by:

- Tongan bigonial measurements;
- larger/broader Polynesian craniofacial skeleton in Coltman et al.;
- large robust Polynesian mandible in Kean & Houghton.

### chinProjection — moderate

Māori 3D data reports a more anterior chin position, while Polynesian cephalometry reports larger, more prognathic mandibles.

## Coherent within-population variation

Buck & Viđarsdóttir found a coherent Polynesian craniofacial grouping relative to neighboring regions while also finding substantial diversity within Polynesian samples.

Fibre represents that using the existing compact founder factor model:

- familyFactorMultiplier: 1.12
- structuralResidualMultiplier: 0.90

These are model calibration choices, not measured biological effect sizes.

The intent is simply to make individual/family variation more coherent—whole facial systems vary together—rather than obtaining diversity mainly through unrelated slider noise.

No population-specific covariance matrix is introduced.

## Deliberately neutral / not directly calibrated

The current Polynesian center does not claim direct population-specific measurements for:

- eye spacing;
- upper-eyelid exposure;
- orbital depth;
- forehead proportion;
- brow prominence;
- midface prominence;
- zygomatic projection;
- nose projection;
- current body composition;
- muscular development;
- height;
- shoulder/hip proportion.

Those inherited coordinates remain near neutral unless a source justifies a future change.

Current body mass, grooming, skin condition and muscular development belong to reference/lived physical state, not population morphology.

## Visual reference material

Commercial/editorial photo sets can be useful to catch obvious cohort-level failure—for example a population collapsing toward a renderer's Black, White or East-Asian default.

They are not coefficient evidence. Subject selection, styling, lighting, geography, age, and modern admixture are uncontrolled.

A visual sanity failure should trigger a search for better anatomical evidence, not direct tuning against stock photographs.

## Overlapping populations

Evidence is allowed to overlap.

A Māori cohort may support a shared Polynesian axis and later a Māori-specific child axis. A Hawaiian skeletal study may support a shared direction while preserving native_hawaiian as a distinct lineage identifier. Tongan and Samoan historical measurements may support a parent distribution without implying those populations are identical.

Do not force overlapping biological evidence into mutually exclusive modern racial categories.

## Acceptance boundary

The calibration passes only if a fixed Population Lab cohort shows:

- a distinct Polynesian distribution without looking generically Black, White, or East-Asian;
- broad real-human variation within that distribution;
- plausible straight/wavy hair variation with curls remaining possible;
- medium/tan through deeper pigmentation variation without bimodal racial-template collapse;
- average-to-slightly-narrow eye morphology with low-frequency/slight epicanthic expression rather than an East-Asian-template eye complex;
- substantial face/lower-face structure;
- family resemblance and mixed-parent continuity;
- no population label reaching the renderer;
- ordinary-human physical state independent of population lineage.

Better direct modern 3D/anthropometric data should replace low-confidence historical mappings when available.
