# Population Lab

Population Lab is a deliberately non-authoritative bench for tuning Fibre population realism before changing Genesis.

It calls models directly and writes only local experiment artifacts. It does not create Threads, publish to World, touch D1, mint FIN cards, or alter identity/history.

The calibration path reuses the exact production family-profile sampler, deterministic naming selection, physical-inheritance path and continuous visual projection used by Genesis. The family renderer fidelity experiment consumes that same shared projection too; it must not maintain a parallel phenotype-to-prompt translation. The model authors only the cached place/era family-profile prior; individual births, names, genomes and phenotype projections are generated locally. `familyOriginContext` is inspectable provenance for profile coherence, not a biography input: production Genesis makes the sampled family causal through explicit names, raised/eventual languages and maternal/paternal physical ancestry rather than replaying the free-form explanation into lived context. This keeps calibration cheap and prevents demographic authoring prose from restyling or pre-writing the person.

## Cheap text run

```sh
npm run population:lab -- --place="United Kingdom/London" --year=2004 --count=50 --seed=uk-v1
npm run population:lab:experiments
```

The command persists one experiment through the generic InfraDriver object/catalog contract beneath the local artifact root `.fibre/population-lab/`. The runner prints the experiment ID; use `npm run population:lab:experiments` to inspect the catalog rather than depending on provider-specific files.

## Visual run

```sh
npm run population:lab -- --place="United Kingdom/London" --year=2004 --count=12 --seed=uk-v1 --images
npm run population:lab:experiments
```

Visual mode additionally generates low-quality 1024px portraits and places them directly in the HTML contact sheet. It uses the same geometry-first semantics as canonical Genesis rendering: a text-only monochrome geometry anchor is generated first, then the production image adapter applies only surface phenotype/state as a reference-conditioned edit. Both the geometry anchor and final portrait are saved for inspection. Neither pass receives the person's name, place, family-origin label, ancestry label or languages. Keep visual cohorts small; visual mode now costs two image generations per person, while text-only mode remains the cheap default.

Multiple places can share a run:

```sh
npm run population:lab -- --places="United Kingdom/London;Nigeria/Lagos;India/Mumbai" --year=2004 --count=72 --seed=population-calibration-v2
npm run population:lab:experiments
```

Useful options are `--model=`, `--image-model=`, `--seed=`, `--experiment-id=`, and `--output=`. `--output` selects the local InfraDriver artifact root; it is not an experiment directory.


## Experiment artifacts

Population Lab experiments are non-authoritative calibration evidence. Each run persists an immutable manifest, generated population, diagnostics result, HTML report and any geometry/portrait images through `InfraDriver.objects`; `InfraDriver.catalog` holds only the mutable experiment status/index. Population Lab code never writes experiment artifacts directly to a filesystem or cloud SDK.

### Reviewed calibration admission

A reviewed shadow refinement follows one authority path:

```text
baseline experiment
  -> shadow proposal
  -> numerical + visual evidence
  -> human review
  -> frozen calibration candidate
  -> Admin approval
  -> Admit
  -> affected Thread migration
```

Admin approval is immutable evidence, not calibration authority. It records the authenticated reviewer and projected affected Thread set from current World coverage. **Admit** is a separate operation that rechecks the approved frozen base against World's current registry and requires an exact local `N -> N+1` advance.

The calibration registry uses generic `InfraDriver.objects` + `InfraDriver.catalog`. Each admitted version is one immutable object plus one catalog record; Cloudflare maps these to the existing R2 object store and D1 catalog. There is no rollback pointer and no delete operation. Restoring older values creates a new version with new provenance.

Admission is immediately visible to World and does not require a code commit or deployment. Approved experiments remain retained because their immutable candidate/review artifacts are admission provenance.

A3.3 currently admits refinements of existing nodes. New-node admission remains deferred until parent selection is an explicit evidence-backed contract.

Inspect local experiments:

```sh
npm run population:lab:experiments
npm run population:lab:experiments -- --show=<experimentId>
```

Delete one experiment and all of its stored artifacts:

```sh
npm run population:lab:experiments -- --delete=<experimentId>
```

Failed experiments remain indexed with their already-written immutable artifacts so partial evidence is inspectable until explicitly deleted.

## What the report measures

The automatic diagnostics intentionally cover objective collapse signals rather than demographic quotas: exact full-name collisions, exact phenotype collisions, given-name and surname concentration, family-profile coverage, categorical phenotype concentration, continuous inherited-latent spread, and a 10,000-birth model-free probe of the exact weighted family sampler. Semantic projection compression is reported separately when broad continuous variation is hidden inside a coarse label such as `medium`; it is not treated as genetic collapse. Cross-place differences are descriptive only and are never a requirement that populations differ on every trait.

The contact sheet remains an essential test. A population can satisfy simple statistics and still visibly collapse toward one face, one beauty prior, or one photographic convention. For geometry-first runs, inspect the geometry anchor and final portrait separately: if the anchor is wrong, revisit Human Appearance geometry; if the anchor is right but the surface edit changes the face, the failure belongs to renderer fidelity rather than population calibration. Each person has a Copy action for the complete generated record; visual runs expose both generation prompts. Analytics can be copied as JSON.

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


## Controlled physical calibration

Use Population Lab's controlled physical mode to isolate the shared physical-inheritance and rendering path from model-authored city/family context.

Numerical calibration is entirely local:

```bash
npm run population:lab -- \
  --physical-populations="east_asia.han_chinese,east_asia.korean,east_asia.japanese" \
  --count=96 \
  --seed=east-asian-calibration-v1
```

That produces 32 births per reference population through the same founder -> recombination -> phenotype -> rendering projection used by Genesis. The report records center drift, variation, percentile spread, continuous uniqueness, sibling/parent resemblance, and a mixed-parent midpoint diagnostic. No image or language model call is made.

For renderer fidelity, reuse the same seed with a small image cohort:

```bash
npm run population:lab -- \
  --physical-populations="east_asia.han_chinese;east_asia.korean;east_asia.japanese" \
  --count=12 \
  --seed=east-asian-calibration-v1 \
  --images
```

The 12 rendered people are the first four deterministic births from each population in the numerical cohort. Reference-population labels appear in the HTML for human review but are not included in either image prompt. The first pass receives structural morphology + reference geometry state; the second receives only the geometry anchor + surface phenotype/state.

The visual acceptance question is deliberately qualitative and narrow: do the portraits faithfully express the supplied anatomy, remain clearly distinct individuals, and avoid collapsing East-Asian cohorts toward a generic unrelated facial morphology? This is an offline calibration gate, never a runtime reroll mechanism.
