---
id: human-appearance
status: accepted
last-reviewed: 2026-09-28
canonical: true
---

# Human Appearance

## Purpose

Human Appearance is Fibre's portable domain for inherited human physical variation and its projection into concrete renderable anatomy.

It is a **core component, not a network service**.

That is a deliberate boundary choice, not a permanent infrastructure constraint. The domain is currently deterministic, cheap, stateless and required by Birth Center, World migrations and Population Lab. Putting it behind a service now would add availability, deployment and serialization failure modes without creating a new semantic authority.

The domain may become a service later if its calibration atlas acquires an independently deployed data lifecycle, remote scientific datasets, expensive shared computation, or another product boundary that genuinely benefits from network ownership. No current contract prevents that extraction.

If a network boundary becomes useful sooner, **Population Context is the more likely service candidate**: place/era authoring may eventually own shared caches, external demographic/historical datasets or model-assisted context generation. Human Appearance should remain a pure deterministic library for as long as its inputs are already-resolved parent genomes/physical lineages and its outputs are fixed-size physical state.

## The critical seam

Geography does not choose a face.

The durable pipeline is:

```text
canonical place + era + optional explicit family/heritage evidence
        |
        v
Population Context
        |
        |  one selected family profile
        |  + maternalPhysicalLineage
        |  + paternalPhysicalLineage
        v
Human Appearance
        |
        |  physicalGenome
        |  inheritedPhenotype
        |  concrete anatomy / physical-state projection
        v
World / Embodiment
        |
        v
renderer
```

**Population Context may know geography. Human Appearance may not.**

This separation prevents birthplace, nationality, language, naming tradition, culture or identity labels from becoming renderer shortcuts.

## Adjacent domains

### Geography

Geography owns canonical place identity, coordinates and locality normalization.

Inputs include place strings or map selections.

Outputs are canonical geographic facts such as country, city, display name and coordinates.

Geography never outputs a phenotype.

### Population Context

Population Context answers:

> What concrete family paths are plausible in this place and era?

Inputs may include:

- canonical place;
- era / birth period;
- optional explicit household heritage or family evidence;
- a deterministic selection seed.

Its authored result may include several weighted family profiles. A family profile may carry:

- family-origin provenance;
- naming material;
- raised/eventual language material;
- separate maternal and paternal **physical lineage**.

Population Context selects one concrete profile for a birth or operator proposal. When several profiles are plausible, Fibre still selects one default instead of leaving required migration fields blank. An operator may override it before admission.

A population-context proposal is **not ancestry authority** merely because Fibre generated it. It becomes migration evidence only when the owning authority accepts the migration.

Population Context does not generate a physical genome and does not render a face.

### Human Appearance

Human Appearance answers:

> Given actual parent physical genomes, or explicit physical-lineage evidence for missing parents, what physical individual results?

It owns:

- the versioned physical-population morphology atlas;
- founder physical-genome sampling;
- biological-parent physical-genome recombination;
- inherited phenotype expression;
- concrete anatomy projection for rendering;
- the domain vocabulary for future age/local physical state.

It does **not** own:

- geography;
- place/era demographic authoring;
- names;
- languages;
- culture;
- nationality;
- personality, intelligence, ability, dignity, behavior, religion, politics, class or values;
- Thread lifecycle/history;
- World persistence;
- renderer/provider execution.

### World

World owns the admitted Thread.

World persists the resulting private physical genome and, when introduced, authoritative lived physical state/history. It records appearance-model migrations as explicit authority changes.

A selected population profile does not remain a runtime demographic controller after a real physical genome exists.

### Renderer / Asset Generator

The renderer receives concrete anatomy and bounded physical-state/rendering instructions.

For native synthetic canonical identity, the render contract is geometry-first:

```text
structural morphology + reference geometry state
        -> geometry anchor
        -> surface phenotype + reference surface state
        -> final canonical portrait
```

The geometry anchor is generation scaffolding, not a second identity authority. Only the final surface-applied portrait may become the canonical Embodiment reference.

This split exists because a one-pass image model may use pigmentation, hair or grooming as latent demographic-template cues and silently replace otherwise-correct facial geometry. Geometry is therefore instantiated before those surface cues are present.

The renderer must never receive population, ancestry, race, ethnicity, nationality, birthplace, language or culture as permission to choose a face.

## Human Appearance input contract

The inheritance boundary receives one source for each biological parent.

For each side exactly one of these is valid:

```text
physicalGenome
OR
physicalLineage
```

### Parent physical genome

Use this when a biological parent Thread already has an authoritative physical genome.

Once a parent genome exists, population priors do not alter that parent's contribution.

### Physical lineage

Use this only when the biological parent genome is unavailable.

A physical lineage is a bounded mixture of explicit population-morphology references:

```json
[
  {
    "population": "Native Hawaiian family",
    "share": 1,
    "referencePopulation": "oceania.polynesia.native_hawaiian"
  }
]
```

The human-readable population field is provenance. `referencePopulation` selects the calibrated morphology prior.

Lineage may come from:

- already recorded migration evidence;
- Genesis family-profile selection;
- an operator-reviewed Population Context proposal;
- explicit operator evidence.

It must not be inferred from portrait pixels, name, language or culture.

### Conception seed

Inheritance receives one deterministic conception seed so sibling variation and allele transmission remain reproducible.

### Sex

Sex enters phenotype expression where it changes visible biological expression. It does not choose population lineage.

## Human Appearance outputs

### Physical genome

The primary authoritative output is one private compact physical genome.

It contains inherited physical variation and becomes the Thread's physical inheritance authority.

### Inherited phenotype

The genome can be expressed into:

- semantic traits;
- continuous inherited coordinates;
- correlated anatomy.

This is derived state. It does not replace the genome.

### Render anatomy

The rendering boundary emits concrete anatomy only:

- face/midface relationships;
- eye/orbit anatomy;
- nose/perioral anatomy;
- pigmentation/hair;
- inherited body structure;
- continuous coordinates needed to preserve individuality.

No demographic labels cross this boundary.

### Physical state

Human Appearance reserves a distinct downstream concept for **physical state**:

```text
inherited phenotype
    + age
    + development / lived events
    -> physical state
```

Physical state includes things such as:

- actual body composition;
- muscular development;
- visible facial soft tissue;
- skin texture/variation;
- visible facial-hair and hairline presentation;
- hairstyle/grooming;
- acquired marks/injury;
- ordinary asymmetry expression;
- aging.

Inherited facial-hair, hairline-loss, adiposity and muscularity loci are **tendencies**, not the current visible state. They must not be sent directly to the renderer as current beard, baldness, weight or musculature.

Inherited frame or adiposity tendency is not current weight.

Fibre now uses a deterministic non-historical **reference physical state** at the normalized reference age to avoid renderer beauty/default-face collapse. It supplies ordinary variation in body composition, muscular development, facial fullness, skin texture/variation and mild asymmetry without changing inherited population morphology. It is explicitly rendering normalization, not autobiographical history. A separate persistent lived-physical-state model is still required before Fibre can claim that actual life history changes these values.

Calibration data extension, source/confidence rules and overlap handling are documented in [`core/src/human-appearance/README.md`](../../core/src/human-appearance/README.md). Source/confidence metadata lives beside the runtime calibration in `core/src/human-appearance/calibration-evidence.mjs` and is intentionally absent from the hot path.

## Population morphology atlas

The atlas is hierarchical calibration data over one shared physical genome.

Example structure:

```text
oceania
  polynesia
    native_hawaiian
    samoan
    tongan
    maori
  micronesia
  melanesia

east_asia
  han_chinese
    northern
    central
    southern
  korean
  japanese
  ...
```

A child node overrides only dimensions for which Fibre has calibration evidence. Otherwise it inherits its parent's prior.

This avoids both failure modes:

1. one giant `oceania` prior pretending all Pacific populations are physically identical;
2. arbitrary country-specific coefficients invented merely to make images look different.

Population nodes describe overlapping physical distributions, not categorical faces.

## Variation, not templates

A population node is not a face template.

The atlas may define bounded population-conditioned:

- factor centers;
- factor spreads;
- selected correlations when evidence justifies them.

Founder sampling must preserve large within-population variation and family coherence.

Fibre should continue using a small factor model rather than a large runtime covariance engine unless evidence proves the compact model inadequate.

## Ordinary-human realism

Renderer quality is a separate axis from population morphology.

A good population model can still produce unrealistic people if the image model collapses young adults—especially women—toward a beauty prior.

Human Appearance therefore must validate two independent questions:

1. **Morphology fidelity:** did the renderer preserve the inherited anatomy?
2. **Ordinary-human fidelity:** did it preserve the supplied physical state without slimming, symmetrizing, beautifying or fashion-model substitution?

Fibre must not distort population genetics to compensate for renderer beauty bias.

Population Lab is the calibration bench for both.

## Operator defaults

Appearance migration should minimize operator work.

Priority order for migration inputs:

1. reuse durable parental physical-origin evidence;
2. otherwise obtain the place/era Population Context and select one concrete default family profile;
3. prefill maternal/paternal lineage and the migration reason;
4. allow operator override before admission.

The Admin should not be asked to perform demographic research or choose from an empty physical-reference list when Fibre already has enough context to propose a plausible default.

## Runtime and cost

The runtime path is intentionally small:

- one bounded family-profile selection upstream;
- founder sampling only for missing parent genomes;
- fixed-size genome recombination;
- fixed-size phenotype expression;
- no brute-force search;
- no image analysis;
- no model call inside Human Appearance;
- no network round trip.

Population/anthropometric research and calibration remain offline Population Lab work.

## Current implementation boundary

The public portable boundary begins at:

```text
core/src/human-appearance/
```

Existing low-level phenotype/genome implementation under `core/src/human-phenotype/` is internal machinery behind that boundary.

Population-family selection begins at:

```text
core/src/population-context/
```

Production consumers should depend on these semantic boundaries rather than importing renderer or demographic implementation details directly.

## Capability status

Current visually accepted appearance versions are `human-appearance-v0.4` and `physical-genome-v0.3`. The acceptance evidence is the bounded 12-person Polynesian geometry-first gate plus the 48-person Han-Chinese/Korean/Japanese/Polynesian same-seed regression recorded in the physical-appearance calibration plan. Polynesian calibration is frozen under that evidence; normal population overlap is not a reason to reopen it.

- Human Appearance domain boundary — **accepted / active**
- hierarchical population morphology atlas — **experimental globally; accepted for the currently calibrated East-Asian and Polynesian tranche**
- global Population Context family-profile authoring — **experimental; Genesis path exists**
- existing-Thread place/era profile proposal — **deferred next slice**
- population-specific factor spread calibration — **deferred calibration outside the accepted tranche**
- persistent lived physical state — **deferred**
- deterministic reference physical state for canonical portrait realism — **implemented / current**
- renderer ordinary-human fidelity path in Population Lab — **implemented; bounded visual acceptance passed 2026-09-28**
- source/confidence calibration sidecar + extension guide — **implemented**
- network Human Appearance service — **deferred; no present need**

## Vision / ambition review

This boundary strengthens the Fibre claim that family, lineage and embodiment are causal rather than decorative: the selected parental physical lineage changes founder genomes, the physical genome changes anatomy, and anatomy changes the canonical body presented to the world.

It does not claim Thread agency, interiority or history-bending behavior. Population Context proposals are exogenous authoring assistance until admitted, and the morphology atlas is inherited starting material rather than a judgment by the Thread.

The design preserves future live-parent reproduction: real parent genomes bypass population priors without changing the Human Appearance contract.

The design also preserves future lived embodiment: physical state is downstream of inherited phenotype and can become World-owned history without changing population or inheritance semantics.
