---
id: human-appearance
status: accepted
last-reviewed: 2026-09-30
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


## Versioned calibration dependencies

The physical-genome schema version and the population-calibration version are different authorities.

`PHYSICAL_GENOME_VERSION` changes only when the physical-genome schema or inheritance algorithm changes. A better Moroccan, Korean or Samoan calibration must not force unrelated Threads through a global physical-genome migration.

Every reference-population node therefore carries its own monotonic integer `version`:

```text
afr_north@1
  -> afr_north.morocco@1
```

A physical lineage may also carry a stable `populationId` distinct from its human-readable `population` label. For example:

```json
{
  "populationId": "morocco",
  "population": "Moroccan family",
  "share": 1,
  "referencePopulation": "afr_north.morocco"
}
```

The stable ID is migration identity. The display label remains provenance. Fibre must not reconstruct `populationId` later from birthplace, nationality, name, language, culture or portrait pixels.

When World creates or migrates a physical genome from lineage evidence it snapshots the exact effective calibration dependency chain it consumed. A Moroccan lineage may therefore record:

```text
west_asia@1 -> afr_north@1 -> afr_north.morocco@1
```

A later approved refinement may advance only:

```text
afr_north.morocco@1 -> afr_north.morocco@3
```

An existing Thread that consumed the earlier chain becomes `migration_required`. An unrelated Korean Thread remains healthy because its dependency chain did not change.

Calibration migration is **direct to current authority**. It is not an SQL-style ordered replay. A Thread at Morocco v1 migrates once to the currently approved Morocco v3; v2 is historical calibration evidence and is never executed as an intermediate transformation.

Parent calibration changes propagate only through dependency chains that actually inherit that parent. This lets Fibre refine a broad parent prior without globally rewriting physical genomes that do not depend on it.

## Population Lab coverage and approval lifecycle

Population Lab is the shared calibration engine used by both CLI and Admin. Admin does not own a second coverage implementation.

The lifecycle is:

```text
current Thread ancestry + location
        |
        v
Population Lab coverage scan
        |
        +-- fallback / broad / missing coverage holes
        +-- stale calibration dependency candidates
        |
        v
bounded experiment / research evidence
        |
        v
reviewed calibration candidate
        |
        v
approved versioned calibration
        |
        v
affected-Thread dependency diff
        |
        v
explicit targeted migration
```

Experiments and research are evidence only. They do not change Thread authority or the production calibration registry. **Approval** is the authority hinge: only an approved calibration becomes current for new physical genomes and creates migration requirements for existing dependent Threads.

Coverage geography is descriptive demand context only. A map point means Fibre currently has a Thread/family lineage represented at that birthplace. Geography never selects or infers ancestry.

### Human visual review

A completed visual experiment may receive one immutable human review artifact. The review scores every A/B pair from 1–5 on three renderer-fidelity dimensions:

- **geometry fidelity** — B preserves the structural relationships established by A;
- **identity continuity** — B remains recognizably the same individual rather than drifting to a nearby face;
- **surface realism** — skin, hair, age and texture become believable without overriding geometry.

The overall review disposition is `supports_candidate`, `reject` or `inconclusive`.

These scores evaluate the **renderer transition**, not whether a population calibration is ethnically or demographically correct. A renderer can faithfully render a poor calibration. No demographic classifier or portrait-based ancestry inference participates in review.

A rejected report remains immutable evidence. Re-running creates a new experiment identity from the same source/calibration and deterministic cohort seed; it never overwrites or silently retries the rejected run.

### From evidence to approved calibration

A good renderer-fidelity report is necessary evidence, but it is not sufficient to promote a calibration. Promotion requires an explicit proposed model:

```text
coverage hole / stable populationId
    -> research + numerical evidence
    -> proposed calibration parameters
    -> shadow candidate experiment in Population Lab
    -> human visual review of the candidate
    -> calibration candidate artifact
    -> explicit human approval
    -> source-registry admission
    -> local node version N -> N+1 (or new node @1)
```

The shadow candidate experiment applies proposed parameter overrides only inside Population Lab. It must not mutate the current reference-population registry. This is how Fibre can visually and numerically evaluate a refinement before it becomes authority.

A3.2 v0.1 uses an operator-assisted research boundary: the proposal contains explicit changed axes/variation, a rationale, and one-or-more provenance references. That proposal is stored in the immutable shadow experiment manifest and evaluated with the exact baseline cohort seed. A later provider-neutral research adapter may author the same proposal contract; it does not need a different evaluation path and must never infer physical calibration from geography, nationality, religion, culture, names or generated portraits.

A supporting human review may freeze the shadow run into immutable calibration-candidate evidence. That freeze still has no authority.

A3.3 separates **human approval evidence** from **runtime registry mutation**. Admin approval binds the exact candidate and visual review to the authenticated human reviewer and records the projected affected Thread set from current World coverage. The approval artifact contains the exact source-admission payload, but the browser does not rewrite Human Appearance.

The canonical registry is Git-owned. A deterministic source-admission command consumes the immutable approval artifact, verifies that its base calibration is still current and that it advances exactly one local version, then appends the reviewed refinement to the source-controlled admission overlay. Deployment of that source change is what makes the calibration current. Registry metadata retains the admission provenance.

This preserves the core authority rule in both directions: an experiment cannot silently become calibration authority, and source calibration cannot be advanced from an unapproved candidate. New births use the admitted version after deploy; existing Threads are affected only through the dependency diff and explicit World migration.

### Canonical reference-population ID grammar

The current atlas contains mixed historical naming such as `afr_north`, `west_asia`, `east_asia` and `middle_east`. Do not extend that inconsistency.

The canonical target grammar is dotted, broad-to-specific:

```text
<macro-region>.<subregion>[.<lineage-or-population>...]
```

Examples:

```text
africa.north.morocco
asia.east.han_chinese
asia.west.arabia
oceania.polynesia.samoan
```

Use full macro-region names and direction second: `asia.west`, not `asia_west` or `west_asia`. Avoid geopolitical umbrella terms such as `middle_east` in new calibration IDs.

The path is a **calibration hierarchy**, not a claim derived from nationality or religion. Its parent must be the nearest evidence-supported morphology prior. A durable ancestry identity remains separate:

```json
{
  "populationId": "yemeni_jewish",
  "population": "Yemeni Jewish family",
  "referencePopulation": "asia.west.arabia"
}
```

If reviewed evidence later supports a distinct Yemeni-Jewish calibration, admission may introduce a node such as `asia.west.arabia.yemeni_jewish@1` (or another parent if the evidence supports a different prior), and the same stable `populationId` then resolves to that more-specific node. Fibre must not create the node merely because a Thread was born in Yemen, has a Jewish name, speaks Hebrew, or carries a cultural label.

Existing mixed IDs should be normalized in one explicit taxonomy migration rather than through a permanent alias/backward-compatibility layer. Because reference-population IDs are part of stored calibration dependency chains, that normalization is an appearance dependency migration, not a cosmetic rename.


## Versioned calibration dependencies and targeted migration

Each reference-population node carries an explicit monotonic integer calibration version:

```text
afr_north.morocco@1
afr_north.morocco@2
afr_north.morocco@3
```

The version belongs to that calibration node, not to the entire physical-genome schema. Refining Moroccan calibration must not make Korean, Japanese or unrelated Threads stale.

Durable physical ancestry therefore separates:

- `populationId` — stable family/population identity used for calibration resolution;
- `population` — human-readable provenance;
- `referencePopulation` — the calibration node used at the time;
- the effective dependency chain consumed by the Thread, including every inherited calibration node and version.

For example:

```text
populationId = morocco
resolved calibration = afr_north.morocco
dependency chain = west_asia@1 -> afr_north@1 -> afr_north.morocco@2
```

World snapshots that effective dependency chain whenever physical appearance authority is migrated. A current registry is compared with the stored snapshot.

Migration is required when the effective dependency set changes. That includes:

- the same node receiving a newer local version;
- a stable `populationId` resolving to a newly introduced more-specific node;
- an inherited parent calibration changing in a way that changes the effective chain;
- a physical-genome model version changing.

Calibration migrations are **not ordered replay migrations**. If a Thread consumed `afr_north.morocco@1` and the approved current calibration is `@3`, Fibre recalculates once from the same durable ancestry and deterministic physical seed directly against `@3`. Version `@2` is model history, not an executable intermediate step.

A calibration candidate has no authority. The lifecycle is:

```text
Population Lab coverage hole
    -> experiment
    -> research evidence
    -> calibration candidate
    -> human approval / reviewed model admission
    -> current versioned calibration registry
    -> dependency diff
    -> affected Threads become Appearance migration candidates
    -> explicit targeted migration
    -> normal Embodiment / Presentation / FID convergence
```

Approval is the hinge. Experiments and research may produce evidence and proposals, but they cannot silently change how Threads look. Once a calibration is approved, new births use it immediately and only existing Threads whose stored appearance dependencies changed are migration candidates.

Birthplace, name, language and culture never participate in dependency matching. A stable admitted `populationId` or other durable physical-lineage evidence is required. Old evidence without that identity is a data/coverage hole to repair explicitly, not permission to guess ancestry.

## Versioned calibration dependencies and targeted migration

The physical-population atlas evolves independently of the physical-genome schema.

`PHYSICAL_GENOME_VERSION` changes only when the genome/inheritance representation or algorithm changes broadly. A refinement to one calibrated population must not make unrelated Threads stale merely because the repository changed.

Each reference-population node therefore carries a **local monotonic integer calibration version**:

```text
afr_north.morocco@1
afr_north.morocco@2
...
```

A child depends on the full effective parent chain that supplied its calibration. Human Appearance exposes that chain explicitly, for example:

```text
west_asia@1 -> afr_north@1 -> afr_north.morocco@2
```

Durable physical ancestry separates a stable machine identity from human presentation:

```json
{
  "populationId": "morocco",
  "population": "Moroccan family",
  "share": 1,
  "referencePopulation": "afr_north.morocco"
}
```

`populationId` is the stable ancestry identity used to resolve a current calibration node. `population` is display/provenance text. Fibre must never reconstruct `populationId` later from a Thread's name, language, portrait, nationality or birthplace. Place may author a reviewed default before ancestry admission; it is not runtime ancestry inference.

Whenever World creates or migrates a physical genome from lineage evidence, it snapshots the exact effective calibration dependencies consumed by that genome. Diagnosis compares that stored dependency set with today's resolved dependency set.

A Thread requires appearance migration when either:

1. its physical-genome schema/model version is outdated; or
2. its effective calibration dependency set has changed.

The second case is targeted. If `afr_north.morocco` advances from version 1 to version 3, a Moroccan Thread that consumed version 1 becomes migration-required while an unchanged Korean Thread remains healthy.

Calibration migration is **direct-to-current**, not an ordered SQL-style replay:

```text
stored afr_north.morocco@1
current afr_north.morocco@3

one recalculation: @1 -> @3
```

Version 2 is historical model evidence, not an executable migration step. The Thread is recomputed once from its durable ancestry and deterministic conception/founder seed using the current approved calibration. Historical genomes, Embodiments, roots and migration events remain evidence.

Population Lab may produce experiments, research artifacts and calibration candidates. None of those become appearance authority by themselves. **Approval** is the authority hinge: an approved calibration enters the current versioned reference registry. At that point Fibre can deterministically compute the affected existing Threads from their stored dependency snapshots. Migration remains an explicit World authority change; approval does not silently rewrite people.

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
