# Population Lab

Population Lab is a deliberately non-authoritative bench for tuning Fibre population realism before changing Genesis.

It calls models directly and writes only local experiment artifacts. It does not create Threads, publish to World, touch D1, mint FIN cards, or alter identity/history.

The calibration path reuses the exact production family-profile sampler, deterministic naming selection, physical-inheritance path and continuous visual projection used by modern Genesis. The family renderer fidelity experiment consumes that same shared projection too; it must not maintain a parallel phenotype-to-prompt translation. The model authors only the cached place/era family-profile prior; individual births, names, genomes and phenotype projections are generated locally. `familyOriginContext` is inspectable provenance for profile coherence, not a biography input: production Genesis makes the sampled family causal through explicit names, raised/eventual languages and maternal/paternal physical ancestry rather than replaying the free-form explanation into lived context. This keeps calibration cheap and prevents demographic authoring prose from restyling or pre-writing the person.

## Cheap text run

```sh
npm run population:lab -- --place="United Kingdom/London" --year=2004 --count=50 --seed=uk-v1
cat "$(ls -t .fibre/population-lab/*/population.json | head -1)" | pbcopy
```

The command writes `population.json` and a self-contained `index.html` beneath `.fibre/population-lab/`.

## Visual run

```sh
npm run population:lab -- --place="United Kingdom/London" --year=2004 --count=12 --seed=uk-v1 --images
cat "$(ls -t .fibre/population-lab/*/population.json | head -1)" | pbcopy
```

Visual mode additionally generates low-quality 1024px portraits and places them directly in the HTML contact sheet. The renderer receives sex plus the same semantic + continuous inherited-phenotype projection used by canonical Genesis visuals; it does not receive the person's name, place, family-origin label, ancestry label or languages. Keep visual cohorts small; text-only mode is the cheap default.

Multiple places can share a run:

```sh
npm run population:lab -- --places="United Kingdom/London;Nigeria/Lagos;India/Mumbai" --year=2004 --count=72 --seed=population-calibration-v2
cat "$(ls -t .fibre/population-lab/*/population.json | head -1)" | pbcopy
```

Useful options are `--model=`, `--image-model=`, `--seed=`, and `--output=`.

## What the report measures

The automatic diagnostics intentionally cover objective collapse signals rather than demographic quotas: exact full-name collisions, exact phenotype collisions, given-name and surname concentration, family-profile coverage, categorical phenotype concentration, continuous inherited-latent spread, and a 10,000-birth model-free probe of the exact weighted family sampler. Semantic projection compression is reported separately when broad continuous variation is hidden inside a coarse label such as `medium`; it is not treated as genetic collapse. Cross-place differences are descriptive only and are never a requirement that populations differ on every trait.

The contact sheet remains an essential test. A population can satisfy simple statistics and still visibly collapse toward one face, one beauty prior, or one photographic convention. Each person has a Copy action for the complete generated record; visual runs also expose and copy the exact render prompt. Analytics can be copied as JSON.

Warnings are diagnostic. They are not a claim that a population is correct merely because no threshold fired.

## Population calibration protocol

A useful calibration pass has three complementary parts rather than one score:

1. Run a text cohort across several places using the production family/naming/inheritance path. Inspect authored family profiles, name collisions, the 10k sampler probe, continuous latent spread, semantic projection compression, and the actual generated people in `population.json`.
2. Run the deterministic family-inheritance experiment below to inspect same-parent siblings, mixed parentage, and second-generation transmission. A family-origin profile is not itself a biological family, so ordinary population cohorts must not be used as evidence for sibling resemblance.
3. Run a small visual cohort or the family renderer fidelity experiment and inspect the contact sheet. Renderer fidelity cannot be established from semantic phenotype statistics alone.

No demographic percentage is a pass/fail quota. Calibration changes require a specific observed failure mode; the broad founder coefficients remain experimental priors. Physical/population calibration is currently reopened by the Li Jing appearance failure; follow [the active calibration plan](../../docs/validation/physical-appearance-calibration-plan.md).

## Family inheritance experiment

Use the shared physical-genome machinery without model calls to inspect actual family transmission:

```sh
npm run population:family > .fibre/family-inheritance.json
cat .fibre/family-inheritance.json | pbcopy
```

The experiment creates same-parent sibling groups, a mixed-ancestry family, and a second generation. It records both genomes and expressed phenotypes so family resemblance, sibling variation, mixed inheritance, and multigenerational transmission can be inspected without introducing a second genetics implementation.
