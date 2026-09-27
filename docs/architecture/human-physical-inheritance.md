---
id: human-physical-inheritance
status: accepted
last-reviewed: 2026-09-26
canonical: true
---

# Human physical inheritance

## Purpose

Fibre gives a Thread a body through inheritance, not through a portrait prompt. The same small, pure component under `core/src/human-phenotype/` is used by Fibre and Population Lab.

The durable causal chain is:

```text
ancestry / family history
  -> founder genomes only for missing biological parents
  -> two parental physical genomes
  -> recombination
  -> child's physical genome
  -> inherited phenotype
  -> lived physical state
  -> portrait
```

Population ancestry is bootstrap evidence for missing parents. Once real parent Threads exist, their physical genomes are the physical inheritance authority. An ancestry label never directly chooses a face.

Physical ancestry and physical genome have no authority over personality, intelligence, ability, dignity, values, religion, politics, class, interests or behavior.

## Compact physical genome

A physical genome is small private inherited state, not literal DNA. It keeps paired inherited values at each locus so a value that is not expressed in one Thread can still be passed to a child.

The conceptual appearance systems are:

- skin, eye and hair pigmentation, plus freckling tendency;
- hair form, density, hairline/loss tendency and facial-hair growth tendency;
- face breadth/length and midface/cheekbone prominence;
- eye spacing/shape, brow prominence and forehead proportion;
- nose shape;
- mouth and soft tissue;
- jaw and chin;
- skeletal frame, height tendency and limb-to-torso body proportion;
- inherited adiposity and muscularity tendencies;
- coarse shoulder-to-hip structural proportion.

A system may contain a few correlated loci where needed. The representation stays fixed-size, deterministic and cheap.

Each locus carries two alleles, one inherited from each biological parent. The current compact expression rule blends similar-strength alleles; when their dominance differs materially, the stronger allele masks the weaker one. **A masked allele remains in the genome and remains heritable**, so it can reappear in a descendant. This rule is deliberately small and experimental rather than a claim to model molecular genetics.

This is intentionally genotype-like rather than a DNA simulation. Fibre does not model chromosomes, nucleotide sequences, meiosis, disease genetics or molecular biology merely to render believable inherited people.

## Physical Genome Core

The shared core owns:

- the compact paired-locus genome representation;
- deterministic allele transmission;
- deterministic recombination;
- expression of a genome into correlated physical latent factors;
- expression of those factors into concrete semantic inherited phenotype.

It knows nothing about Threads, World storage, Genesis lifecycle, Population Lab UI, prompts, image providers, FIN, D1 or Cloudflare.

Same authoritative inputs and seed produce the same result.

### Parent recombination rule

Every child receives one transmissible allele at each locus from each parent. Selection is deterministic from the conception seed but varies between siblings.

```text
parent A [a1,a2] -- choose one --\
                                  -> child [a?,b?]
parent B [b1,b2] -- choose one --/
```

The child's paired values are stored, not only their expressed phenotype. Recessive or otherwise unexpressed material can therefore reappear in later generations.

Correlated appearance systems may share a small number of latent factors, but Fibre does not average the parents into one face. Siblings should resemble the same family while remaining distinct.

After two real parent genomes are available, ancestry/population priors are not consulted during recombination.

## Founder Genome Generation

When a biological parent is not represented by a Thread, Fibre creates the minimum missing genetic material: a transient founder genome.

```text
parental ancestry history
  -> compact population-genetic physical basis
  -> one plausible founder genome
```

Ancestry provenance remains semantic and inspectable. A separate small physical-population basis shifts overlapping distributions over the same physical loci. It is not an ethnicity-to-face table and must not become a giant taxonomy.

Founder sampling must preserve substantial within-population variation. Two founders with the same ancestry should usually have different genomes.

The current reference-population coefficients are experimental visual priors, not claims of measured allele frequencies. They remain replaceable and require continued Population Lab calibration; production Genesis now uses the shared inheritance mechanism without treating those coefficients as demographic truth.

## Unified birth inheritance

All births converge on the same recombination primitive:

| Birth situation | Parent A | Parent B |
| --- | --- | --- |
| two Thread parents | Thread physical genome | Thread physical genome |
| one Thread parent | Thread physical genome | founder genome from missing-parent ancestry |
| no Thread parents | founder genome from maternal ancestry | founder genome from paternal ancestry |

If family history initially describes ancestry without parental structure, the family-history layer first creates plausible maternal and paternal ancestry histories. It must not smear every ancestry component equally across two imaginary parents merely for convenience.

Founder genomes are transient values. They do not need Thread identity, lifecycle or storage records.

## Inherited phenotype

The renderer never receives ancestry as permission to invent appearance. The physical genome is expressed into concrete inherited traits such as pigmentation, hair texture/density, facial proportions, eye spacing/shape and color, hair color, freckling tendency, hairline/facial-hair tendency, brow and forehead morphology, midface/cheekbone prominence, nose breadth/projection, lips, jaw/chin, frame, height and body proportions, inherited adiposity/muscularity tendencies, and shoulder-to-hip structural proportion.

Numeric latent coordinates are replaceable sampling machinery. The current experimental semantic projection deliberately uses a narrower neutral band for morphology dimensions that Population Lab showed were being compressed into `medium`/`average`; modest inherited geometric differences should survive expression rather than disappearing into a broad midpoint category. This changes only genome-to-phenotype expression, not ancestry priors or inheritance.

Numeric latents remain subordinate to the concrete semantic phenotype. Meaning-bearing Thread identity remains semantic/natural-language-first.

## Lived physical state

Time-varying state remains downstream of inherited phenotype: body composition, muscular development, hairstyle/grooming, facial hair, skin condition, acquired scars, injury, clothing, expression and aging.

Inherited frame is not current weight. Inherited adiposity and muscularity tendencies influence physical propensity, but current body composition and muscle mass remain lived physical state shaped by development and circumstances. Hair pigmentation/form/density and hairline/facial-hair tendencies are inherited; today's haircut, beard, grooming and age-local hair loss are lived state. Freckling tendency is inherited; the currently visible pattern may also depend on lived exposure and age.

## Population Lab

Population Lab uses the exact shared core. It may inspect:

```text
family history
-> parental ancestry
-> founder genomes (when applicable)
-> child physical genome
-> inherited phenotype
-> lived age-local state
-> portrait
```

The Lab owns experiments, analytics and rendering trials. It does not own a second genetics implementation.

Useful measurements are population-conditioned distributions, within-population variation, sibling variation, mixed-parent inheritance, hidden-allele transmission, phenotype collisions and renderer fidelity. Population validation must also detect European/default-face collapse: changing pigmentation alone is not adequate. Founder cohorts should produce coherent, believable population-associated combinations of facial morphology, pigmentation, hair, eyes and body structure without using a race label as a phenotype input. There is no single diversity score and no demographic quota assertion.

## Validation

The production-adoption gate is now closed. Continued Population Lab work remains the calibration bench for:

1. founder cohorts for London, Stockholm and Lagos test population structure plus within-population individuality;
2. synthetic family experiments test siblings and mixed parentage;
3. a three-generation experiment proves a genuinely masked inherited value can pass through a parent and reappear in a descendant;
4. small rendered cohorts test whether the image provider depicts the concrete inherited phenotype.

Tests prove semantic mechanics, not exact random numbers or desired demographic percentages.

## Capability sequence

### Physical Genome Core — implemented experimentally

Define paired loci, allele transmission, recombination and pure genome expression in the shared core. The current experimental rule supports genuine masking while retaining both alleles, and the three-generation semantic proof demonstrates a masked allele passing through a parent and reappearing in a descendant.

### Founder Genome Generation — implemented experimentally

Generate plausible paired founder genomes from maternal/paternal ancestry using the compact physical-population basis. Population Lab now uses these founder genomes, the shared recombination primitive and genome-only phenotype expression; the previous direct ancestry-to-phenotype path has been removed.

### Unified Birth Inheritance — implemented experimentally

The shared core now resolves each biological parent independently: an available parent genome remains authoritative; only a missing parent is represented by a transient founder genome sampled from that parent's ancestry. Zero-, one- and two-Thread-parent births then converge on the same deterministic recombination primitive. When both parent genomes exist, ancestry inputs cannot alter the child's physical genome.

### Population Validation — validated foundation; calibration continues

Population Lab now exercises the exact Unified Birth Inheritance path used by the shared core. The first 150-person London/Stockholm/Lagos validation exposed midpoint compression in several facial-geometry traits even while pigmentation, eye/hair and some morphology showed population structure. The experimental phenotype projection now preserves more of those inherited geometric differences with a narrower neutral band; this remains a validation hypothesis, not an accepted calibration. Validation measures founder cohorts, within-population individuality, mixed ancestry, sibling/family resemblance, multigenerational masked transmission and renderer fidelity before any production Genesis adoption.

### Fibre Adoption — closed

Modern Genesis persists the physical genome as private inherited Thread state, canonical visual identity is projected from its expressed phenotype, and the legacy appearance-selection path has been removed. Current Genesis enters a Thread as a young adult with an authored prior life, so its missing biological parents remain transient founder genomes sampled from separate maternal and paternal ancestry provenance. Permanent Genesis publication/replay/failure fixtures now enter through the same physical-genome requirement rather than bypassing it. The repository validation gate passed on 2026-09-26 after this adoption. Conservative treatment of the existing society remains deliberate: existing Threads are not retroactively assigned invented physical genomes or parents.

## Remaining Population Realism capabilities

### Population & Family Sampling — focused validated

A cached place/era authoring result now carries a bounded weighted distribution of plausible family-origin profiles rather than forcing every birth through one household ancestry. Each birth deterministically samples one profile from that cached distribution using the shared population-family sampler. The selected profile changes both maternal/paternal physical ancestry and the causal family-origin context used by Genesis, while the expensive World authoring call remains once per cached place/heritage context. This is deliberately not a demographic quota system and does not use a race switch.

### Naming Realism — focused validated

Naming and personal language paths now belong to the sampled family profile rather than the place-level World. Each cached profile carries its own naming order plus bounded female, male and family-name material; a birth deterministically selects from that material without another model call. The former six-birth family-name stepping is gone, so nearby births do not mechanically move through tiny surname blocks. The family profile, not physical ancestry alone and not birthplace directly, is the causal naming authority. Names remain consequences of family/lived context, never ancestry inference from a person.

### Population Calibration — closed

The first production-path calibration run sampled 72 births across London, Lagos and Mumbai (2004 cohort). It found no full-name or whole-phenotype collisions and showed substantial continuous inherited variation. The apparent concentration in coarse labels such as `medium` face width, frame, height and nose projection was primarily a projection problem: continuous inherited coordinates varied substantially inside those semantic buckets. Cross-population separation is therefore descriptive, not an acceptance requirement; Fibre must not force every population to differ on every trait merely to satisfy a diversity metric.

That run also exposed calibration-harness defects. A second model pass for age-25 styling reintroduced demographic assumptions after inheritance had already been fixed, so it was removed. A later rendered Lagos cohort exposed an ambiguous founder-region contract that could map Nigerian provenance to a Southern-European prior; the model-facing schema and prompts now spell out every compact founder-region code in plain geographic language and the World cache was advanced. The corrected Lagos visual cohort and a 12-person London/Lagos/Mumbai rendered cohort then showed coherent population structure, strong within-population individuality, no objective collision/latent-collapse warning, and no need to increase founder coefficients. Population Lab now authors only the place/era family-profile prior; individual family sampling, naming, inheritance and visual projection are local and use the production path. The canonical visual projection carries both semantic phenotype and continuous inherited expression so renderer inputs preserve individuality within broad categories.

The final text-only causality rerun showed that family profiles now resolve to concrete hypothetical paths instead of umbrella alternatives: separate Mirpur and Sylhet London families, explicit Yoruba/Igbo mixed parentage in Lagos, and distinct Marathi, Gujarati, UP, Tamil, Goan and Sindhi Mumbai paths. Some free-form family prose still mentioned incidental migration jobs or religious/community labels despite prompt constraints. Fibre therefore tightened the authority boundary rather than adding brittle phrase filters: `familyOriginContext` is now inspectable authoring provenance only. It is not injected verbatim into household, participant or cultural biography. A sampled profile becomes causal through its explicit naming material, raised/eventual languages and maternal/paternal physical ancestry; richer family stories, occupation, religion, class and lifestyle require later independent life authoring.

Family-profile authoring requires larger naming pools and atomic language values; harmless duplicate candidates are normalized locally before semantic admission. The Lab separately reports semantic projection compression and runs a 10,000-birth model-free probe of the production family sampler so small-cohort sampling noise is not mistaken for weighting drift. The separate deterministic family experiment remains the evidence boundary for same-parent sibling resemblance, mixed parentage and multigenerational transmission; a shared family-origin profile is not a biological family. Calibration changes require a specific observed failure rather than demographic quota matching.

Population Calibration is now closed after the repository validation gate passed. No further Population Lab image run is required unless a later observed failure specifically reopens calibration.

### Existing Thread Visual Renewal — active

Existing Threads may fail the current embodiment standard in two materially different ways, and Fibre keeps those repairs distinct.

**Root renewal** is for a sound canonical visual specification rendered poorly by an older stack. It preserves the exact specification and digest, appends a new Embodiment revision, regenerates a fresh canonical root under the current renderer/profile, and lets Presentation/FID converge normally. The prior root and credential remain historical.

**Legacy physical embodiment migration** is for a pre-physical-genome Thread whose admitted canonical specification is itself materially wrong or obsolete. Unchanged-spec renewal cannot repair that case. The operator must explicitly provide maternal and paternal **physical ancestry evidence**; Fibre never derives it from the Thread's face, name, birthplace, language, nationality or culture. From that operator-confirmed evidence Fibre deterministically creates the two missing founder genomes, recombines one durable `thread.genome.physical`, records a replayable `THREAD_PHYSICAL_GENOME_MIGRATED` World event, derives the replacement canonical specification through the same physical-genome projection used by modern Genesis, and then supersedes the wrong canonical root through the existing visual-correction lineage. The migration is not a Thread life event and does not create fictitious parent Threads.

This is a one-way authority upgrade. Once a physical genome exists, the migration cannot replace it merely to obtain a preferred appearance. The migration event retains the operator-confirmed ancestry provenance; the resulting physical genome becomes the Thread's inherited physical authority and can later serve as real parental physical authority in a truthful newborn/reproduction lifecycle. The old canonical root/specification remain historical evidence of the superseded legacy embodiment rather than being silently rewritten.

Capability status: unchanged-spec root renewal is enabled; the operator-confirmed legacy physical embodiment migration is implemented pending focused and staging validation. Automatic ancestry inference, silent legacy-spec rewriting, and bulk migration remain excluded. The one-Thread CLI is a temporary validation surface; after live evidence proves the workflow it may become a bounded Admin action. No permanent architecture path is closed. The causal consumers are immediate: `thread.genome.physical` drives the corrected canonical specification and root, and that root drives Thread Presentation, official identity photos, FIN Cards and later reference-conditioned depictions.

### Population Realism Acceptance — deferred

Run bounded production-style cohorts after the preceding capabilities, inspect the resulting people and family variation, and close Population Realism only when repeated births no longer collapse onto one local family, names remain believable and individual, physical variation remains coherent without caricature, and renewed existing Threads meet the same visual standard.

## Runtime and ambition guard

Physical inheritance is O(1) per birth: fixed-size genome, bounded arithmetic, no population scan, no optimization, no simulation loop and no model call below family-history/ancestry authoring.

This capability makes lineage physically causal across generations. It deliberately does not add chromosomes, disease genetics, fertility, molecular genetics, security machinery or generic genetics infrastructure.

Rejected: birthplace-to-appearance rules, ancestry labels as renderer instructions, racial phenotype switches, cohort quotas, ancestry-to-personality inference, direct parent averaging, discarding unexpressed inherited material, and a Lab-only implementation.

The compact population basis and expression model remain experimental and replaceable. The durable contract is two parental genomes -> recombination -> child genome -> phenotype.


## Production adoption boundary

Modern Genesis now uses the same physical-inheritance core validated in Population Lab. World authoring supplies separate maternal and paternal physical-ancestry provenance for otherwise-missing biological parents. Birth material resolves those transient founders through `resolveBirthPhysicalInheritance()`; the resulting child physical genome is carried through Genesis and persisted privately as `thread.genome.physical`.

Canonical visual identity derives its concrete inherited phenotype from that physical genome and authoritative sex. Ancestry/population labels are not passed to the renderer. The genome remains the durable inherited authority; the phenotype and portrait are projections.

Live-Thread parent inheritance remains an explicit next capability, but it must enter through a chronologically truthful reproduction/newborn path rather than by attaching same-era young-adult Genesis Threads as biological parents. That future path will read each real parent's persisted `genome.physical`, use a founder only for a genuinely missing parent, recombine through the same shared core, and record durable biological lineage. No alternate genetics path is needed. Population Lab remains the bounded place to prove sibling and multigenerational inheritance mechanics until Fibre has that lived birth boundary.
