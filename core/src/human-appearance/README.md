# Extending Human Appearance data

This directory is Fibre's public boundary for inherited human appearance.

Use this guide when adding or improving population morphology data. The goal is global realism **without** turning geography, race, ethnicity, nationality, or culture into face templates.

The architecture contract is [Human Appearance](../../../docs/architecture/human-appearance.md).

## Keep the domains separate

```text
place + era
    |
    v
Population Context
    |
    | selected maternalPhysicalLineage
    | selected paternalPhysicalLineage
    v
Human Appearance
    |
    | founder sampling / real parent genomes / recombination
    v
physical genome
    |
    v
concrete inherited anatomy
    |
    v
renderer
```

Population Context may know geography and family history.

Human Appearance may consume only:

- a real biological parent's physical genome; or
- explicit parental physical-lineage evidence when that parent genome is unavailable;
- deterministic inheritance seeds;
- sex where it affects visible biological expression.

Human Appearance must not consume birthplace, nationality, language, name, culture, religion, class, personality, intelligence, behavior, or politics.

The renderer receives concrete anatomy and physical state, never a population label as permission to choose a face.

## Files

Runtime morphology priors:

```text
core/src/human-phenotype/reference-populations.mjs
```

Offline source/confidence metadata:

```text
core/src/human-appearance/calibration-evidence.mjs
```

Population/family selection:

```text
core/src/population-context/
```

Calibration experiments:

```text
tools/population-lab/
```

Long-form evidence notes:

```text
docs/validation/
```

The provenance sidecar is deliberately not imported by founder sampling or rendering. Research can become richer without adding runtime cost.

## What a reference-population node means

A reference-population node is a **distribution calibration point**, not a categorical face.

A node normally inherits one parent, but a population with well-supported mixed population history may instead use a small **calibration basis**:

```js
"oceania.polynesia": {
  basis: [
    { referencePopulation: "east_asia", share: .79 },
    { referencePopulation: "oceania", share: .21 }
  ],
  variation: {
    familyFactorMultiplier: 1.12,
    structuralResidualMultiplier: .90
  },
  values: {
    faceBreadth: .38,
    faceLength: .10,
    chinProjection: .20
  }
}
```

Its effective prior is:

```text
weighted calibration basis
+ direct evidence-supported locus overrides
```

A calibration-basis weight may be informed by population-history/genomic evidence, but it is **not** a claim that visible phenotype is a linear ancestry mixture. Record the basis separately in `calibration-evidence.mjs` with its own confidence and sources. Direct anatomical claims still require their own per-locus evidence.

Use a calibration basis only when a single existing parent is demonstrably a poor prior. Do not create arbitrary blends to make portraits look better.

A more specific child may intentionally have no overrides:

```js
"oceania.polynesia.native_hawaiian": {
  parent: "oceania.polynesia",
  values: {}
}
```

That is useful. It preserves specific physical-lineage evidence while honestly shrinking to the nearest calibrated ancestor.

**Never invent coefficients merely so neighboring groups look different.**

## Population labels and overlapping evidence

Do not assume one scientific cohort maps one-to-one onto one Fibre population node.

Human populations overlap historically and biologically. Research cohorts may be defined by:

- ancestry;
- self-identified ethnicity;
- island or region;
- language/community;
- archaeological population;
- national sampling frame;
- mixed criteria.

Those are evidence descriptors, not automatically Fibre taxonomy.

A single source may support several overlapping Fibre nodes. Several sources may support one Fibre node.

Example:

```text
Māori 3D facial cohort  ───────────┐
                                   ├─> oceania.polynesia : faceBreadth
multi-island Polynesian GM cohort ─┘

Māori 3D facial cohort ──────────────> oceania.polynesia.maori
                                       (if a child-specific mapping is later justified)

historic Hawaiian craniofacial cohort -> oceania.polynesia.native_hawaiian
                                         (only for claims that cohort actually supports)
```

Do not average incompatible or differently defined cohorts merely because all are sometimes described using the same racial or ethnic umbrella.

A modern racial label should never be treated as a biological boundary by itself.

## Source registry

Every calibration source used for coefficients should have one reusable entry in:

```text
calibration-evidence.mjs
```

Keep the entry compact:

```js
"source-id": {
  title: "...",
  year: 2024,
  cohort: "...",
  method: "...",
  doi: "...",     // when available
  pmid: "..."     // when available
}
```

Do not duplicate full citations on every locus. Claims reference source IDs.

Longer interpretation belongs in a validation note under `docs/validation/`.

## Confidence is per anatomical claim

Do **not** assign one confidence score to an entire population.

Confidence belongs to the mapping:

```text
source evidence
    -> anatomical interpretation
    -> Fibre locus
    -> coefficient direction/magnitude
```

Use:

- **high** — direct quantitative measurement maps cleanly to the Fibre locus, with strong sample/method and useful replication;
- **moderate** — direction is well supported, but magnitude, cohort scope, or Fibre-locus mapping remains approximate;
- **low** — evidence supports a plausible direction or hierarchy but mapping is indirect, historical, small-sample, or otherwise weak.

Example:

```js
"oceania.polynesia": {
  faceBreadth: {
    direction: "higher than parent",
    confidence: "moderate",
    sources: ["source-a", "source-b"],
    notes: "..."
  }
}
```

A low-confidence claim should normally produce either:

- no coefficient yet; or
- a deliberately small conservative shift.

Low confidence is **not** a reason to create dramatic visual separation.

## Prefer claim-level evidence

A source may support only one or two axes.

If a paper supports broader facial width and anterior chin position, it does not automatically justify changes to:

- nose width;
- pigmentation;
- body frame;
- muscularity;
- adiposity;
- eye anatomy;
- hair morphology.

Only change loci actually supported by evidence.

This is especially important for populations with strong visual stereotypes: do not encode the stereotype into unmeasured dimensions.

## Evidence quality

Prefer:

- 3D facial scans;
- craniofacial anthropometry;
- geometric morphometrics;
- large photo-anthropometric datasets with explicit measurements;
- replicated multi-cohort measurements;
- body/frame anthropometry only where inherited structure can reasonably be separated from current environment.

Commercial/editorial photo collections and image-search results may be useful **visual sanity checks** for obvious renderer collapse, but they are not coefficient evidence: subject selection, styling, lighting, geography and modern admixture are uncontrolled.

Treat cautiously:

- very small cohorts;
- forensic convenience samples;
- old skeletal samples;
- orthodontic or clinical populations;
- datasets with substantial cultural cranial modification;
- classifier accuracy without interpretable anatomy;
- PCA/latent dimensions that cannot be defensibly mapped into Fibre loci;
- qualitative statements without measurements.

A study can justify adding a hierarchy node without justifying any numeric override.

## Mapping evidence into Fibre loci

Current inherited loci include:

```text
pigmentation
eyePigmentation
hairPigmentation
frecklingTendency
hairForm
hairDensity
hairlineLossTendency
facialHairTendency

faceBreadth
faceLength
midfaceProminence
zygomaticProjection
eyeSpacing
eyeShape
epicanthicFold
upperEyelidExposure
orbitalDepth
foreheadProportion
brow

noseBreadth
noseProjection
nasalBridgeHeight
softTissue
jawBreadth
chinProjection

frame
height
bodyProportion
adiposityTendency
muscularityTendency
shoulderHipProportion
```

Values are compact normalized calibration coordinates in `[-1,+1]`.

They are not millimeters or percentages.

A paper reporting greater bizygomatic breadth may justify the **direction** of `faceBreadth`. It does not define the Fibre coefficient mechanically.

Magnitude should remain conservative and be checked against the global atlas and Population Lab.

## Body state is not population morphology

Be especially careful with:

- current body mass;
- facial fullness;
- muscular development;
- skin condition;
- grooming;
- hairstyle;
- acquired marks;
- aging.

Those belong primarily to physical state, not population priors.

Human Appearance now has a deterministic normalized reference physical state for canonical rendering, and Fibre will later have lived physical state driven by actual life history.

Do not use ethnic-group prevalence of obesity, fitness, grooming, skin condition, or lifestyle as inherited appearance coefficients.

## Adding a new population node

A good sequence is:

1. Identify the nearest defensible parent node.
2. Add the specific child identifier even if it initially has `values:{}`.
3. Register credible sources separately.
4. For each proposed Fibre locus, record sources, direction, confidence, and interpretation.
5. Add only the coefficient overrides justified by those claims.
6. Keep all other dimensions inherited from the parent.
7. Add the identifier to Population Context authoring vocabulary when appropriate.
8. Run Population Lab numerical calibration.
9. Render a small fixed cohort for human inspection.
10. Add or update the corresponding `docs/validation/` evidence note.

Do not start by tuning portraits until they “look ethnic enough.”

## When to create a child node

Create a child node when at least one is true:

- Fibre needs to preserve meaningful physical-lineage evidence more specifically than its current parent;
- credible morphology evidence supports distinct calibration;
- Population Context already authors that concrete family lineage and collapsing it would lose evidence.

Do not create one just because a modern country exists.

Prefer meaningful population/lineage structure over political borders.

## Within-population variation matters

Population centers must never become templates.

The runtime uses a compact correlated founder-factor model. A population node may optionally tune only three multipliers:

- `familyFactorMultiplier` — strength of coherent person/family morphology;
- `structuralResidualMultiplier` — independent facial-locus noise;
- `generalResidualMultiplier` — independent non-structural noise.

Prefer changing the balance between coherent factors and residual noise over adding a population-specific covariance matrix. A variation override is a modeling choice, not an anatomical fact, so keep it small, document why it exists, and validate the resulting cohort.

Any new calibration must preserve:

- substantial within-population variation;
- overlap between neighboring populations;
- parent/child resemblance;
- sibling variation;
- mixed-parent inheritance;
- deterministic replay.

If a population becomes visually uniform after calibration, or diversity appears mainly as incoherent feature combinations, the calibration is wrong even if its mean looks plausible.

## Population Lab acceptance

Use the same production Human Appearance path.

At minimum validate:

- all effective priors resolve every locus;
- founder distributions stay near intended centers;
- continuous variation does not collapse;
- siblings are more similar than unrelated people without becoming clones;
- mixed-parent cohorts behave continuously;
- population labels never enter renderer text.

For visual calibration, use a small fixed cohort rather than brute-force rerolls.

Inspect two independent questions:

1. **morphology fidelity** — did the renderer preserve the inherited anatomy?
2. **ordinary-human fidelity** — did it preserve body state, skin texture, asymmetry, and ordinary variation rather than beautifying or homogenizing people?

Do not mutate population genetics to compensate for renderer beauty bias.

## Versioning

A calibration change that materially changes new founder genomes is an appearance-model change.

Bump the physical-genome model version and let existing Threads migrate explicitly using their durable parental physical-lineage evidence.

Do not silently reinterpret an already admitted physical genome under a changed atlas.

## Runtime rule

Research richness must not become runtime cost.

The production path should remain:

```text
bounded lineage selection upstream
+ O(1) founder sampling for missing parents
+ O(1) fixed-size recombination
+ O(1) phenotype/state projection
```

No image classifiers.
No brute-force search.
No runtime literature lookup.
No population-model LLM call inside Human Appearance.
No reroll-until-pretty loop.

## Definition of done for a calibration contribution

A useful contribution leaves:

- a meaningful hierarchy node;
- source registry entries;
- per-locus confidence and source mappings;
- conservative coefficient overrides only where justified;
- an evidence note when interpretation is non-trivial;
- Population Lab evidence that individual/family variation remains healthy;
- no demographic labels crossing into rendering.

The test is not “does this population look stereotypically recognizable?”

The test is:

> Does explicit parental physical lineage causally produce a plausible distribution of distinct humans while preserving uncertainty, overlap, family inheritance, and ordinary human variation?
