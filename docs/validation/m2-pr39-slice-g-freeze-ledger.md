---
id: m2-pr39-slice-g-freeze-ledger
status: in_progress
last-reviewed: 2026-08-20
canonical: false
---

# Milestone #39 — Slice G fresh cohort + protocol freeze ledger

## Purpose

Slice G creates the **test before the people**.

The Pre-G seam is COMPLETE and Stage 9 is CLEAR. This ledger existed before any final-cohort WorldSpec, genome assignment, familiarity result or life-generation call.

The governing rule is stronger than ordinary reproducibility:

> **No final-cohort life may be generated until the complete G protocol is frozen and the blocking Gate-G review is CLEAR.**

This is a freeze ledger, not a result-shopping document. Any field still marked `PENDING` must become exact before Gate G, and no value may be chosen by inspecting final-cohort life output because no such output is authorized yet.

## G0 — protocol shell frozen

### Cohort size and origin composition

```text
final Threads             5
origin composition        3 de_novo + 2 synthetic_lineage
entry stage               young_adult for all five
entry age                 22 for all five
common bornAt             2004-08-20T00:00:00Z
chronology end             2026-08-20T00:00:00Z
final life generation     forbidden before Gate G CLEAR
quality regeneration      forbidden after first integrity-valid H cohort
```

### Repository artifact home

```text
artifacts/validation/m2-pr39/g/
  protocol/
  worlds/
  genomes/
  cohort/
  results/
```

Storage meaning:

- `worlds/` contains frozen WorldSpec experiment inputs; superseded candidates/finals remain historical evidence;
- `genomes/` contains frozen cohort and synthetic-parent genome artifacts after G2;
- `protocol/` contains machine-readable assignment/configuration/rater/verdict freezes;
- `cohort/` remains empty until Gate G CLEAR, then may contain frozen exports/snapshots of generated experimental Threads;
- `results/` contains G/H machine-readable outputs and diagnostic evidence.

These Git artifacts are experiment inputs/snapshots/evidence, not live World/Thread authority. Runtime semantic state still passes through Fibre's normal world/domain stores.

Reusable examples remain `fixtures/`; human-readable protocols/reviews/verdicts remain `docs/validation/`. See [`../architecture/storage-model.md`](../architecture/storage-model.md) and [`../../artifacts/validation/README.md`](../../artifacts/validation/README.md).

### World/genome separation

Frozen ordering:

```text
1. author candidate WorldSpecs with no cohort-genome visibility
2. run predeclared cold familiarity handling
3. preserve/re-version rejected or later-invalidated worlds; never silently rewrite
4. freeze five accepted final WorldSpecs
5. only then create/freeze/assign cohort and synthetic-parent genomes
6. never backfill WorldSpec household/culture/geography facts from loci
```

Before genomes exist, a genuine World-authoring defect may be corrected only by preserving the prior experiment and versioning new candidates/results. Once genomes have been seen, a final WorldSpec is burned for replacement. Neither path permits tuning for personality or expected H performance.

### Freshness

All accepted final WorldSpecs must be new to the final cohort:

- not used in C, D, E or E2 development;
- not used to tune EventStructurePool v2;
- not used in a prior provider-generation experiment;
- not renamed/adapted from a burned development world;
- no named source work, character or human biography used as a hidden template.

Factual structural/place-specific public knowledge is allowed with source witnesses. Source instances do not enter Genesis as biography templates.

### World specificity and variation

Worlds vary primarily in factual lived affordances:

```text
era / concrete geography
economy and material circumstances
household/family shape
language environment
mobility
institutions/community
intellectual environment
origin mode
```

Current authoring is governed by [`../architecture/world-context-specificity-v1.md`](../architecture/world-context-specificity-v1.md):

> **A World must be particular enough to produce a particular past without writing a particular personality.**

Concrete geography/culture may constrain available experiences but may not directly encode:

```text
finished personality
required moral/political conclusion
religious or ethnic self-identification
competence, dignity or willingness
future profession or benchmark
required formative event
required adversity/trauma
minimum book/person/place/intellectual quota
maturity ladder
adult behavior policy
```

### Convergent pair

Frozen pair:

```text
world_slice_g1_02_lodz
world_slice_g1_04_accra
```

Protocol-only broad question:

> **How to respond when formal procedures and observed everyday practice diverge.**

That question may not be passed to Pass A, Pass B, Pass C, record repair, genome generation or cohort publication. The Worlds only make partial convergence plausible through materially different routes; they do not prescribe a conclusion.

## G1 — final WorldSpecs

Status: **COMPLETE / CLEAR.**

Closure: [`m2-pr39-slice-g1-result.md`](m2-pr39-slice-g1-result.md).

Specificity correction: [`m2-pr39-slice-g1-geographic-specificity-correction.md`](m2-pr39-slice-g1-geographic-specificity-correction.md).

Historical v1 freeze: [`m2-pr39-slice-g1-world-candidate-freeze.md`](m2-pr39-slice-g1-world-candidate-freeze.md).

### G1-v1 — preserved finding

The first five generic city-archetype Worlds all passed the predeclared cold familiarity screen at `density=4/4`, but human review found them too geographically/culturally interchangeable. The familiarity result remains valid for what it measured; the World-authoring specificity was insufficient.

All v1 candidates, finals, result and generic presentations remain preserved as historical evidence. They were not rewritten.

### G1-v2 — accepted current authority

The defect was found before any G2 genome existed. The corrected genome-blind Worlds preserved the original cohort age/origin/comparative structure but made actual local context load-bearing:

```text
slot 1  Cần Thơ, Vietnam                  de_novo
slot 2  Łódź, Poland                      synthetic_lineage
slot 3  Cusco, Peru                       de_novo
slot 4  Accra, Ghana                      de_novo
slot 5  Greater Sudbury, Ontario, Canada  synthetic_lineage
```

Frozen candidate/protocol authority:

```text
artifacts/validation/m2-pr39/g/protocol/g1-world-candidate-freeze-v2.json
artifacts/validation/m2-pr39/g/worlds/candidates-v2/
```

The unchanged cold familiarity instrument was run exactly once against v2 using `openai/gpt-5.1-2025-11-13` and the original predeclared HOLD rule:

```text
densityScore <= 1
OR
at least two coverage-domain scores <= 1
```

Maintainer result:

```text
Cần Thơ          4/4
Łódź             4/4
Cusco            4/4
Accra            4/4
Greater Sudbury  4/4
```

Result artifact:

```text
artifacts/validation/m2-pr39/g/results/g1-world-familiarity-v2.json
```

Exact accepted finals and digests:

```text
world-g1-01-v2.json  sha256:6e88b0bd8aba69894ae5583603a841d139687d57cea9bfb8c05086e1be118c7d
world-g1-02-v2.json  sha256:291aa0255fa9d70c4dc30f26c442606d4e03245bcb1b843a889ddc082f081a0a
world-g1-03-v2.json  sha256:bbf23626457d9f93ff2cf70c129c4d549f998a228bd67852450879b1e70f6290
world-g1-04-v2.json  sha256:02e52c82398b87cfcecee31651d81dbb223d00e2da8a7410c4553bd0514547db
world-g1-05-v2.json  sha256:a2ce5453912040c78561bafaceb21d1cded8f05f84aaf9bc10e831d4288098d0
```

Exact generated bytes were preserved at:

```text
b7153417cfd083a0623c476c352675f775f616a2
Freeze geographically specific G1 worlds
```

The maintainer reported `556/556` tests green immediately before the v2 familiarity execution. Later progress/presentation/documentation changes are newer and are not retroactively claimed as part of that tested code head.

### Presentation follow-through

Current canonical per-World presentations:

```text
artifacts/validation/m2-pr39/g/worlds/presentation/
  world-g1-01.presentation.json
  world-g1-02.presentation.json
  world-g1-03.presentation.json
  world-g1-04.presentation.json
  world-g1-05.presentation.json
```

Each is derived only after the accepted v2 final exists, bound to its exact `worldSpecDigest`, and includes rich 2004–2026 temporal visual grounding for later asset generation. Presentation remains non-cognitive and outside G1 admission.

Superseded generic presentations are preserved under `presentation/v1/`.

G1 exit:

```text
[x] five concrete accepted final WorldSpec v2 records
[x] common exact age / chronology policy
[x] freshness + factual authorship/source witnesses
[x] predeclared cold familiarity policy/result
[x] exact final v2 digests
[x] convergent pair
[x] no cohort genome before final v2 freeze
[x] exact generated v2 artifacts preserved in Git
[x] current per-World presentations bound after final freeze
[x] v1 finding preserved rather than rewritten
```

## G2 — cohort genomes and specificity ceiling

Status: **NEXT / AUTHORIZED TO BEGIN.**

G2 must now, in this order:

1. create/freeze three de-novo Thread genomes;
2. create/freeze synthetic parent genomes and two deterministically recombined child genomes for the synthetic-lineage members;
3. preserve exact owner/source/mutation/recombination provenance;
4. assign each final genome to exactly one already-frozen G1-v2 World;
5. freeze the independent cohort-genome pair schedule before seeing any control output;
6. run the existing trial-independent, position-balanced genome-discrimination instrument;
7. preserve that cohort-genome result as H's specificity ceiling.

Frozen G2 artifacts belong under:

```text
artifacts/validation/m2-pr39/g/genomes/
artifacts/validation/m2-pr39/g/protocol/
artifacts/validation/m2-pr39/g/results/
```

The Slice-B hand-authored genome-control result remains instrument history; it is **not** H's denominator.

A weak cohort-genome ceiling is a real pre-H finding. It may HOLD G. It may not trigger silent genome rewriting after results are seen.

No final-cohort life generation is authorized by G2.

## G3 — Pass-B treatment assignment and cell arithmetic

Status: **PENDING; blocked on G2 and final call-schedule arithmetic.**

Freeze before H:

```text
life_plus_genome proportion       exact value in 30–40% range
exposure policy                   whole genome OR one fixed deterministic ordinal prefix
assignment                        content-independent
position stratification          exact deterministic rule if used
assignment seed/digest            exact
eligible Pass-B call count        exact expected count
life_only_unexposed               expected + minimum analyzable count
life_only_exposed                 expected + minimum analyzable count
life_plus_genome                  expected + minimum analyzable count
```

Assignment may depend on call ordinal/stable IDs and frozen seed. It may not depend on episode content, salience, meaning, world identity, genome text or observed outcome.

If arithmetic predicts an inadequate clean-control cell, change the **pre-execution design** before freeze. Never repair a sparse cell after H.

## G4 — cognition and mechanical-policy freeze

Status: **PENDING.**

Freeze exact values for:

```text
Pass-A provider/model
Pass-B provider/model
Pass-C provider/model
record-repair provider/model
prompt hashes
schema hashes
sampling configuration / seeds
Genesis policy version
EventStructurePool v2 digest
EventStructurePool v2 developmental ranges / sampling policy
entry policy
record-form repair cap
whole-candidate attempt cap
admission gate list
publication-validator-set witness
```

One common creative configuration is used across all five Threads.

Hard split:

```text
Pass A  genome blind
Pass B  only frozen direct genome treatment may expose genome
Pass C  genome blind + one-memory scoped
A/B/C   no Fibre-computed mechanical-condition values
A/B/C   no Fibre-authored semantic-need conclusions
```

No measured quality tendency becomes an admission gate via repair/retry survivorship.

## G5 — raters, diagnostics and interpretation freeze

Status: **PENDING.**

Independent raters must not see WorldSpecs, compiler prompts, build-time diagnostics or genomes except for the explicit genome-discrimination task.

Freeze provider/model and trial/presentation randomization for every diagnostic.

### D1 — life attribution

Two blind conditions:

```text
raw         remove names/professions/source labels
normalized  additionally neutralize prose style and obvious setting/world identifiers
```

Attribution should depend on route, tension and residue rather than merely belief position. Freeze scoring, chance baseline, uncertainty and success/HOLD interpretation before H.

### D2 — sentiment coupling

Blindly rate historical-event sentiment and remembered-meaning valence separately. Freeze statistic and interpretation bands before H. Strong coupling is a warning, not an admission quota.

### D3 — genome propagation

Primary strata:

```text
life_only_unexposed
life_only_exposed
life_plus_genome
```

Freeze numerical thresholds, uncertainty and minimum cell sizes before H.

| H pattern | Reading |
| --- | --- |
| treatment above chance; clean unexposed at chance | intended direct propagation through attention |
| exposed above clean control and plausibly between/near treatment | informative propagation through prior memory history |
| all three at chance | genome inert even when visible; real result if G ceiling was strong |
| clean unexposed reproducibly above chance | negative-control failure; HOLD and explain |
| treatment and clean control near ceiling | over-determination or broken control |

### D4 — life funnel

Report per Thread:

```text
historical events                         N
remembered                                n1
durable meaning                           n2
multi-part ambivalent meaning             n3
```

Characterization only; not a quota.

### D5 — self-account overreach

Freeze a blinded method for asking whether durable history contains material the Thread's current remembered meanings cannot accommodate. Perfect self-explanation is not required and may itself be suspicious.

### Secondary characterization

Freeze reporting for:

- structures offered vs instantiated;
- structure-grounded vs world-emergent episodes;
- event counts by developmental window;
- caregiver/institution-mediated vs peer/interest/self-directed access where mechanically supported;
- conversational/social availability and use;
- world/place reach relative to WorldSpec affordances;
- recurring vs new participants and relationship continuity;
- motif/object repetition and narrative-inertia indicators;
- intellectual/source encounter availability and instantiation;
- reinterpretation eligible/run/skipped-by-cap;
- revised/unchanged/none over run reinterpretations;
- per-gate form-repair counts/rates;
- repair exhaustion and candidate-attempt failure profile;
- articulacy variance;
- generator monoculture indicators.

None becomes a hidden admission floor.

## G6 — verdict rule and blocking review

Status: **PENDING.**

Before H, freeze one exact `CLEAR | HOLD | REDESIGN` rule including:

- which primary diagnostic failures block closure;
- which negative-control failures mandate HOLD;
- what uncertainty counts as inconclusive;
- how a weak cohort-genome ceiling is handled;
- how high repair/retry pressure affects interpretation;
- when a failure is bounded-correctable (`HOLD`) versus architectural (`REDESIGN`).

Quality thresholds may fail. They may not trigger silent regeneration.

Then request the blocking hostile Gate-G review against the complete frozen packet.

## Gate-G packet must prove

1. development and final Worlds are disjoint;
2. final Worlds were authored/frozen without cohort-genome visibility;
3. familiarity handling happened before final World freeze and life generation;
4. current final Worlds are concretely situated rather than generic cultural archetypes;
5. EventStructurePool v2 is frozen and developmentally non-flat;
6. treatment/control arithmetic was checked in advance;
7. genome exposure is whole/fixed deterministic, never relevance-selected;
8. `life_only_unexposed` is a real sufficiently sized negative control;
9. independent raters and diagnostic transformations are frozen;
10. all numerical thresholds/uncertainty rules predate H;
11. repair/rejection rates remain visible;
12. no richness/personality tendency became an admission gate;
13. no final-cohort life has yet been generated.

## Current execution boundary

```text
Pre-G seam   COMPLETE
Stage 9      CLEAR
G0           FROZEN — protocol shell / sequencing / artifact home
G1-v1        PRESERVED — familiarity CLEAR; geographic specificity insufficient
G1-v2 / G1   COMPLETE / CLEAR — concrete finals, digests and presentations frozen
G2           NEXT — cohort genomes + specificity ceiling
G3-G6        BLOCKED on prior G steps
H            FORBIDDEN until Gate G CLEAR
```

Only G2 genome/provenance/control-freeze work is currently authorized. No final-cohort life-generation call is authorized.
