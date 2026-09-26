# Population Lab

Population Lab is a deliberately non-authoritative bench for tuning Fibre population realism before changing Genesis.

It calls models directly and writes only local experiment artifacts. It does not create Threads, publish to World, touch D1, mint FIN cards, or alter identity/history.

## Cheap text run

```sh
npm run population:lab -- --place="United Kingdom/London" --count=50 --seed=uk-v1
```

The command writes `population.json` and a self-contained `index.html` beneath `.fibre/population-lab/`.

## Visual run

```sh
npm run population:lab -- --place="United Kingdom/London" --count=12 --seed=uk-v1 --images
```

Visual mode additionally generates low-quality 1024px portraits and places them directly in the HTML contact sheet. Keep visual cohorts small; text-only mode is the cheap default.

Multiple places can share a run:

```sh
npm run population:lab -- --places="United Kingdom/London;Nigeria/Lagos;Japan/Tokyo;Brazil/Sao Paulo" --count=100
```

Useful options are `--model=`, `--image-model=`, `--seed=`, and `--output=`.

## What the report measures

The automatic diagnostics intentionally cover objective collapse signals rather than demographic quotas: exact full-name collisions, exact phenotype collisions, given-name and surname concentration, and concentration/uniqueness for the authored phenotype domains.

The contact sheet remains an essential test. A population can satisfy simple statistics and still visibly collapse toward one face, one beauty prior, or one photographic convention. Each person has a Copy action for the complete generated record; visual runs also expose and copy the exact render prompt. Analytics can be copied as JSON.

Warnings are diagnostic. They are not a claim that a population is correct merely because no threshold fired.
