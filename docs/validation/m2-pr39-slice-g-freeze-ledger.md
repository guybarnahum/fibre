---
id: m2-pr39-slice-g-freeze-ledger
status: in_progress
last-reviewed: 2026-08-20
canonical: false
---

# Milestone #39 — Slice G fresh cohort + protocol freeze ledger

## Purpose

Slice G creates the **test before the people**.

The Pre-G seam is COMPLETE and Stage 9 is CLEAR. This ledger is the first Slice-G artifact. It exists before any final-cohort WorldSpec, genome assignment, familiarity result, or life-generation call.

The governing rule is stronger than ordinary reproducibility:

> **No final-cohort life may be generated until the complete G protocol is frozen and the blocking Gate-G review is CLEAR.**

This document is therefore a freeze ledger, not a result record. Any field marked `PENDING` must become exact and immutable before Gate G. No PENDING value may be resolved by looking at final-cohort life output because no such output may exist yet.

## G0 — protocol shell frozen now

The following decisions are frozen before final-world authoring begins.

### Cohort size and origin composition

```text
final Threads             5
origin composition        3 de_novo + 2 synthetic_lineage
entry stage               young_adult for all five
entry-age policy          one common exact age, to be fixed before world freeze
final life generation     forbidden before Gate G CLEAR
quality regeneration      forbidden after first integrity-valid H cohort
```

The common exact entry age remains `PENDING` only because the chronology schedule has not yet been frozen. It must be fixed before the five WorldSpecs become final.

### Repository artifact home

Slice G's frozen machine-readable experiment artifacts live under:

```text
artifacts/validation/m2-pr39/g/
  protocol/
  worlds/
  genomes/
  cohort/
  results/
```

The storage meaning is fixed:

- `worlds/` contains the five frozen final WorldSpec JSON records after G1;
- `genomes/` contains frozen cohort and synthetic-parent genome artifacts after G2;
- `protocol/` contains machine-readable assignment/configuration/rater/verdict freezes as they become exact;
- `cohort/` remains empty until Gate G is CLEAR, then may contain frozen exports/snapshots of the generated experimental Threads;
- `results/` contains later G/H machine-readable outputs and diagnostic evidence.

These Git artifacts are experimental inputs, snapshots and evidence. They are **not** the live Thread/World persistence authority. During execution, WorldSpecs, genomes and Threads still pass through the normal Fibre stores and domain admission contracts.

Reusable synthetic examples that are not part of this frozen experiment remain under `fixtures/`; human-readable protocol/review/verdict records remain under `docs/validation/`.

The canonical distinction is documented in [`../architecture/storage-model.md`](../architecture/storage-model.md) and the practical artifact convention in [`../../artifacts/validation/README.md`](../../artifacts/validation/README.md).

### World/genome separation

Frozen ordering:

```text
1. author candidate WorldSpecs with no cohort-genome visibility
2. run the predeclared cold familiarity handling on candidate worlds
3. replace a materially under-represented candidate only under that predeclared familiarity rule
4. freeze the five final WorldSpecs
5. only then create/freeze/assign cohort genomes and synthetic-parent genomes
6. never backfill WorldSpec household/culture/geography facts from loci
```

A final WorldSpec is burned for replacement once genomes have been seen. If a later defect is discovered, preserve the failed protocol/cohort and version a new experiment rather than silently rewriting G.

### Freshness

All five final WorldSpecs must be new to the final cohort:

- not used in C, D, E or E2 development;
- not used to tune EventStructurePool v2;
- not used in a prior provider-generation experiment;
- not adapted by changing names on a burned development world;
- no named source work, source character or human biography is used as the hidden template.

World authorship may use factual structural knowledge, but source instances never enter Genesis cognition.

### World variation

The five worlds must vary primarily in factual lived affordances:

```text
era / geography
economy and material circumstances
household/family shape
language environment
mobility
institutions/community
intellectual environment
origin mode
```

They must not directly encode:

```text
finished personality
required moral/political conclusion
future profession or benchmark
required formative event
required adversity/trauma
minimum book/person/place/intellectual quota
maturity ladder
adult behavior policy
```

### Convergent pair

Exactly one predeclared pair of the five worlds will be designated the **convergent pair** before life generation.

The two worlds must make convergence on at least one broad belief or judgment *plausible* through materially different routes, while not specifying that conclusion in the WorldSpecs.

H will judge whether the pair can converge while remaining attributable through route, tension and residue.

The pair IDs remain `PENDING` until the five world candidates exist; designation must occur before genomes are exposed to the world-design step.

## G1 — final WorldSpecs

Status: **PENDING**.

Deliverables:

```text
five canonical WorldSpec JSON records
one common exact entry age / chronology policy
freshness witness for each world
factual source/abstraction authorship witness
cold familiarity probe policy + result for each candidate
final world digests
convergent-pair designation
```

The five final WorldSpec JSON records are frozen under `artifacts/validation/m2-pr39/g/worlds/`.

No cohort genome may be authored or assigned before G1 is frozen.

## G2 — cohort genomes and specificity ceiling

Status: **PENDING; blocked on G1**.

After the worlds are frozen genome-blind:

- create/freeze three de-novo Thread genomes;
- create/freeze synthetic parent genomes and two recombined child genomes for the synthetic-lineage members;
- preserve exact owner/source/mutation/recombination provenance;
- assign each final genome to exactly one already-frozen world;
- freeze the independent cohort-genome pair schedule before seeing control outputs;
- run the existing trial-independent, position-balanced genome-discrimination instrument;
- preserve the cohort-genome result as H's specificity ceiling.

Frozen G2 genome artifacts belong under `artifacts/validation/m2-pr39/g/genomes/`.

The Slice-B hand-authored genome-control result remains instrument history; it is not H's denominator.

A weak G genome ceiling is a real pre-H finding. It may HOLD G; it may not trigger silent genome rewriting after results are seen.

## G3 — Pass-B treatment assignment and cell arithmetic

Status: **PENDING; blocked on the final history/memory call schedule**.

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

The assignment may depend on call ordinal/stable IDs and a frozen seed. It may not depend on episode content, salience, meaning, world identity, genome text, or observed outcomes.

If arithmetic predicts an inadequate `life_only_unexposed` cell, change the **pre-execution assignment design** before freeze. Never repair the cell after observing H.

## G4 — cognition and mechanical-policy freeze

Status: **PENDING**.

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

The freeze must preserve:

```text
Pass A  genome blind
Pass B  only frozen direct genome treatment may expose genome
Pass C  genome blind + one-memory scoped
A/B/C   no Fibre-computed mechanical-condition values
A/B/C   no Fibre-authored semantic-need conclusions
```

No measured quality tendency becomes an admission gate through repair/retry survivorship.

## G5 — raters, diagnostics and interpretation freeze

Status: **PENDING**.

Independent raters must not see WorldSpecs, compiler prompts, build-time diagnostics or genomes except in the explicit genome-discrimination task.

Freeze the exact rater provider/model and trial/presentation randomization for each diagnostic.

### D1 — life attribution

Run two blind conditions:

```text
raw         remove names/professions/source labels
normalized  additionally neutralize prose style and obvious setting/world identifiers
```

Attribution is based on route, tension and residue rather than merely belief position.

Freeze exact scoring, chance baseline, uncertainty treatment and success/HOLD interpretation before H.

### D2 — sentiment coupling

Blindly rate historical-event sentiment and remembered-meaning valence separately. Freeze the statistic and interpretation bands before H.

Strong coupling is a warning that mood may be masquerading as interpretation; it is not itself a semantic admission gate.

### D3 — genome propagation

Primary strata:

```text
life_only_unexposed
life_only_exposed
life_plus_genome
```

Freeze numerical thresholds, uncertainty treatment and minimum cell sizes before H.

The predeclared qualitative readings remain:

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

This is characterization, not a quota.

### D5 — self-account overreach

Freeze a blinded method for asking whether durable history contains material the Thread's current remembered meanings cannot accommodate.

A cohort of perfectly self-explaining people is suspicious; imperfect self-understanding is allowed and must remain visible.

### Secondary characterizations

Freeze exact reporting for:

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

Status: **PENDING**.

Before H, freeze one exact `CLEAR | HOLD | REDESIGN` rule including:

- which primary diagnostic failures block closure;
- which negative-control failures are mandatory HOLDs;
- what uncertainty counts as inconclusive;
- how a weak cohort-genome ceiling is handled;
- how high repair/retry pressure affects interpretation;
- when a failure is bounded-correctable (`HOLD`) versus architectural (`REDESIGN`).

Quality thresholds may fail. They may not trigger silent regeneration.

Then request the blocking hostile Gate-G review against the complete frozen packet.

## Gate-G packet must prove

Before asking for CLEAR, the packet must make it possible to verify:

1. development and final worlds are disjoint;
2. final worlds were authored/frozen without cohort-genome visibility;
3. familiarity handling happened before final world freeze and before life generation;
4. EventStructurePool v2 is frozen and developmentally non-flat;
5. treatment/control cell arithmetic was checked in advance;
6. genome exposure is whole/fixed deterministic, never relevance-selected;
7. `life_only_unexposed` is a real sufficiently sized negative control;
8. independent raters and diagnostic transformations are frozen;
9. all numerical thresholds/uncertainty rules predate H;
10. repair/rejection rates will remain visible;
11. no richness/personality tendency became an admission gate;
12. no final-cohort life has yet been generated.

## Current execution boundary

```text
Pre-G seam   COMPLETE
Stage 9      CLEAR
G0           FROZEN — protocol shell / sequencing / artifact home
G1           NEXT — author five fresh genome-blind world candidates
G2–G6        BLOCKED on prior G steps
H            FORBIDDEN until Gate G CLEAR
```

No provider/model call and no final-cohort life generation is authorized by this G0 record alone.
