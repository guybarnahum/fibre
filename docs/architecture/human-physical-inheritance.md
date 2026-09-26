---
id: human-physical-inheritance-plan
status: accepted
last-reviewed: 2026-09-25
canonical: true
---

# Human physical inheritance and population realism

## Purpose

Fibre should celebrate believable human physical diversity without turning birthplace, nationality, race, ethnicity, culture or ancestry into a stereotype. Physical inheritance is causal: local population history influences family ancestry; parents contribute inherited variation; ancestry shifts phenotype probabilities; and individual recombination produces one particular person.

The Population Lab is the experimental bench for the exact shared inheritance component Fibre may later use. The Lab must not maintain a second implementation.

```text
place + era
  -> local population context
  -> parental ancestry / family origins
  -> shared physical-inheritance component
  -> one inherited phenotype
       -> Population Lab measurement/rendering
       -> later Fibre Genesis authority
```

Birthplace does not directly choose appearance. Race is not a biological switch. Broad racial/ethnic language may be useful to humans when discussing populations, but the engine preserves composable ancestry/population-history evidence and concrete inherited traits rather than assigning a racial phenotype label.

Physical ancestry has no authority over personality, intelligence, ability, dignity, values, religion, politics, class, interests or behavior.

## Shared component boundary

The shared component belongs in `core/src/human-phenotype/`. It is pure, deterministic and provider-independent.

It may own:

- ancestry-mixture representation;
- parental contribution and recombination;
- seeded inherited variation;
- ancestry-conditioned physical priors;
- correlated morphology sampling;
- structured inherited phenotype.

It must not know about Threads, Genesis lifecycle, World storage, prompts, portraits, FIN, D1, Cloudflare or Population Lab UI.

Given identical authoritative inputs and seed, Population Lab and Fibre must receive the same inherited result.

Population Lab owns experiments, cohort generation, analytics, HTML/contact sheets and renderer experiments. Fibre owns birth, genome/lineage provenance, identity, embodiment authority and canonical visual identity.

## Physical Inheritance Contract

Create the smallest pure module that establishes the durable boundary.

Conceptually:

```js
sampleInheritedPhenotype({
  maternalAncestry,
  paternalAncestry,
  seed
})
```

The result preserves parental ancestry inputs, a derived inherited mixture suitable for inspection, and a structured inherited physical phenotype. The Physical Inheritance Contract proves deterministic inheritance and the authority boundary; it does not claim scientifically calibrated population genetics.

No LLM participates in physical sampling.

### Physical Inheritance Contract acceptance

- same parents + same seed produce the same inherited result;
- a changed seed can produce a different individual while preserving parental ancestry constraints;
- both parents contribute to mixed ancestry;
- ancestry remains separate from phenotype;
- no birthplace, nationality, culture or racial category is accepted as a direct phenotype selector;
- the module has no provider/runtime dependency.

## Population and Family Ancestry

Add the experimental layer that turns place + era into a plausible local population context and coherent family-history patterns containing distinct maternal and paternal ancestry.

Population membership is probabilistic, never a quota. Common local histories may repeat naturally. Migration, diaspora, adoption and mixed-parent families remain possible at plausible frequencies. A cohort must not be curated as a representative cast.\n\nFamily history has two separate downstream branches: ancestry is provenance for physical inheritance; non-physical family context may ground names, household languages and cultural history. Physical ancestry must never be used as a shortcut for naming, language or culture.

The local-population model remains upstream of physical inheritance. It chooses plausible family ancestry; it does not render faces.

## Correlated Phenotype Inheritance

Expand the shared engine from contract to useful physical inheritance. Candidate stable dimensions include pigmentation, hair morphology/density/hairline, facial proportions, cheeks, eyes, brows, nose geometry, mouth/lips, jaw/chin, ears, skeletal frame and height tendency.

Traits are not independent dice. Use a small, inspectable correlation model. Ancestry shifts distributions rather than dictating traits; mixed inheritance and individual variation remain substantial.

Correlated Phenotype Inheritance specifically tests whether Fibre can eliminate the current LLM attractor toward `medium/average` morphology. The first experimental sampler now does this with shared deterministic correlated variation and concrete semantic traits; Population Lab no longer gives the LLM inherited-morphology authority. Ancestry-conditioned distribution shifts remain experimental. Population labels have no physical authority and must never be hashed into phenotype. The first evidence-constrained basis uses ancestral source geography only for a weak pigmentation adaptation prior; hair and craniofacial ancestry priors remain neutral until Fibre has an inspectable calibrated basis for them. New basis axes must represent supported physical evidence, compose continuously across parental ancestry, and preserve larger individual variation rather than becoming racial or ethnic templates.

## Inherited Phenotype and Lived Physical State

Keep time-varying state outside inherited phenotype: body composition/weight, muscular development, hairstyle/grooming, facial hair, skin condition, scars acquired through life, clothing, expression, injury and aging.

This preserves the existing canonical-visual-identity distinction between stable identity and lived appearance.

## Population Lab Integration

Population Lab stops asking the LLM to choose inherited morphology. It uses the shared component, then lets replaceable cognition describe already-sampled material and create culturally/familially coherent non-physical material without changing physical authority.

Each report card exposes the causal chain and copyable evidence: family origins, parental/inherited ancestry, inherited phenotype, age-25 physical state, renderer brief and complete person record.

## Population Realism Measurement

Measure the engine directly: trait distributions, phenotype collisions, correlations, ancestry-conditioned distributions, mixed-ancestry behavior, outlier frequency and pathological defaulting. Keep name collision/concentration and family-origin concentration separate.

There is no single diversity score and no brittle quota assertion.

High-value tests prove deterministic mechanics and authority boundaries, not desired demographic percentages.

## Population Realism Validation

Before Fibre adoption, run at least 100 text/genetics samples each for London, Stockholm and Lagos.

The experiment asks different questions:

- London: heterogeneous ancestry should emerge naturally without a curated multicultural cast.
- Stockholm: common local family ancestry should recur while minority and mixed families remain possible.
- Lagos: predominantly West-African ancestry must still yield substantial individual physical variation rather than a generic racial template.

After text/genetics inspection, render a small cohort from each place to test whether the image provider preserves the inherited differences.

The experiment is evidence, not a demographic truth source. Population priors require separate calibration before production claims about real-world frequencies.

## Fibre adoption — separate approval gate

Population Lab work does not change a living Thread.

After experimental approval:

1. **Genesis integration** — replace the narrow LLM-authored appearance-option mechanism with the shared inheritance component.
2. **Genome/lineage integration** — bind inherited physical provenance to the existing symbolic-genome/lineage architecture without conflating physical loci with personality loci.
3. **Canonical visual identity** — canonical text consumes the concrete inherited phenotype; the renderer depicts rather than chooses the person.
4. **Existing society repair** — repair only demonstrably defective admitted phenotype/root material when authoritative family/inheritance evidence supports the correction. Never infer a replacement identity from birthplace, name or portrait alone.
5. **Population-realism validation** — retain structural invariants and human-inspectable experiments rather than demographic quotas.

## Capability status and ambition guard

This plan enables physical inheritance to become a causal contributor to Thread embodiment and non-interchangeability.

Currently **experimental**: ancestry-conditioned priors, correlated phenotype distributions and population calibration.

Currently **deferred**: production Genesis adoption, live-parent physical inheritance, genome persistence choices, existing-Thread repair and production demographic calibration. Their extension path is the shared component contract plus existing lineage, symbolic-genome and Embodiment authorities.

Rejected: birthplace-to-appearance rules, racial phenotype switches, cohort diversity quotas, personality/ability inference from ancestry, and a second Lab-only inheritance implementation.

The Physical Inheritance Contract is intentionally foundational. Its outputs are not yet evidence that Fibre has realistic human population genetics; they establish the replaceable causal boundary on which that experiment can be run.
