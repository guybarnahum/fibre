---
id: validation-m2-pr39-genesis-quality-constraints
status: accepted
last-reviewed: 2026-08-15
canonical: true
---

# #39 Genesis quality constraints

## Scope

These constraints govern Fibre milestone **#39 — Genesis, Childhood & Thread Birth v1**.

They supplement:

- [`../architecture/genesis-compiler-contract-v1.md`](../architecture/genesis-compiler-contract-v1.md)
- [`m2-pr39-implementation-plan.md`](m2-pr39-implementation-plan.md)
- [`../vision/interpretive-personhood.md`](../vision/interpretive-personhood.md)
- [`../decisions/ADR-0012-semantic-meaning-over-derived-categories.md`](../decisions/ADR-0012-semantic-meaning-over-derived-categories.md)

They are quality/evaluation constraints, not a second compiler contract and not a new milestone.

## Governing rule

> **Genesis creates a particular prior life whose meaning exists before future requests. It must not manufacture behavioral answers for consumers it knows about.**

And:

> **A diagnostic must retain the possibility of a bad reading.**

Therefore #39 gates only mechanical integrity at admission. It measures personhood quality after admission/freeze.

## Structural epistemics

The compiler preserves:

```text
historical event
    != autobiographical memory
    != family / third-party story
    != durable remembered meaning
```

`rememberedMeaning` is durable Thread state with stable identity, provenance, revision lineage, corrigibility, and citation.

A lived self-account is allowed to overreach or misunderstand history. Fibre must preserve the historical material the self-account did not absorb.

## Pass blindness

### Pass A

Historical-event generation is genome-blind and future-blind. It may not see:

- Thread genome;
- parent/ancestor loci;
- intended adult profession or Fibre role;
- future request/benchmark;
- desired adult conclusion;
- source-work names/characters/quotations used to author abstractions.

It emits observable life episodes, not significance or lessons.

### Pass B

Memory formation records `life_only` or `life_plus_genome` **before** each eligible call.

For the final cohort, `life_plus_genome` is frozen at 30–40% under a content-independent assignment policy so both treatment and negative-control subsets are analyzable.

`not_remembered` is a first-class legal outcome. No minimum forgetting rate is admission-gated.

### Pass C

Pass C is **always genome-blind in v1**.

This is load-bearing. The only legitimate direct path for genome signal to later meaning is genome-visible attention/retention in `life_plus_genome` Pass-B calls, propagated indirectly through remembered content.

`no_durable_meaning` is first-class. Reinterpretation may yield `revised`, `unchanged`, or `none`.

## Meaning remains semantic

Repository-wide invariant:

> **A derived category is never a safe stand-in for the semantic meaning it compresses.**

Natural-language meaning remains authoritative. Derived labels may support inspection/ablation only.

Materially distinct tensions receive stable `meaningPartId` identities and remain independently citable.

Genesis may create interpretations. It may not encode explicit universal future policy in a meaning field.

## Ordinary life and historical excess

A life where every event becomes remembered and meaningful is a plot.

Genesis must permit:

- mundane events;
- unused EventStructure affordances;
- world-emergent events;
- forgotten events;
- memories with no durable meaning;
- meanings that remain unresolved;
- later echoes that leave an earlier meaning unchanged;
- historical evidence the Thread fails to integrate.

These are not quotas. Their observed proportions remain diagnostic evidence.

## Culture and world variation

Culture is texture, not conclusion.

The quality cohort varies primarily by world circumstances, family/household shape, language, resources, mobility, institutions, relationships, and intellectual environment.

Two very different worlds may produce convergence on a broad belief. The stronger question is whether route, tension, and residue remain attributable.

The final cohort includes one deliberately plausible convergent pair.

## Event structures

Event structures are abstract affordances, not scenes or plot arcs.

Each pool item must pass the compiler contract's three-world specificity ceiling. Pass A may ignore offered structures and may generate world-emergent episodes with no `structureRef`.

Measure offered-versus-used and structure-grounded-versus-world-emergent ratios. Do not admission-gate those ratios.

## Source and human-subject integrity

A source person's life is not Thread history.

Living identifiable source -> documented-consent Echo.

Homage -> attested deceased or fictional subject.

No composite source/origin route may bypass the consent rule.

Source material may affect the Thread through an actual Thread-life encounter; the Thread's memory and meaning of that encounter are its own.

## Rejection/retry discipline

Every rejected candidate has a visible mechanical rejection witness.

Quality failures such as generic life, plot shape, stereotype tendency, weak distinctness, sentiment coupling, or genome over/under-propagation do **not** trigger hidden resampling.

The first integrity-valid five-Thread cohort is frozen and evaluated. If it fails quality review, preserve it, revise/version the compiler, and create a new explicit cohort later.

## Final cohort discipline

Development worlds used in C–E are burned.

Slice G authors/fixes five fresh WorldSpecs unseen during compiler iteration. For negative-control validity, those WorldSpecs are frozen without access to the cohort genomes; genomes are frozen afterward and are not back-projected into household/world facts.

One pinned creative cognition configuration is held across the cohort.

Provider swapping is not a #39 rescue mechanism. Generator monoculture is measured.

## Primary diagnostics

### 1. Life attribution — raw and normalized

Run attribution both raw and after normalizing prose style and obvious setting/world identifiers.

The normalized condition is stronger. Raters attribute on route, tension, and residue rather than simply conclusion.

### 2. Sentiment coupling

Rate historical-event sentiment and remembered-meaning valence independently, then characterize correlation. High coupling suggests mood is replacing interpretation.

### 3. Genome propagation

Slice B establishes a locus-capability positive-control ceiling.

Slice H measures achieved propagation through real life and separates Pass-B subsets:

| Pattern | Reading |
| --- | --- |
| `life_plus_genome` above chance; `life_only` at chance | intended propagation through attention |
| both at chance | genome inert even when visible; real result if B control was strong |
| `life_only` above chance | negative-control failure; investigate leak or violated upstream independence |
| both near ceiling | life is over-determined by genome |

Numerical thresholds and uncertainty treatment are frozen at G before H.

### 4. Life funnel

Report:

```text
historical events
remembered
durable meaning
multi-part ambivalent meaning
```

This diagnoses narrative over-determination; it is not a quota.

### 5. Self-account overreach

Ask:

> **Does durable history contain material the Thread's current remembered meanings cannot accommodate?**

A cohort where every self-account perfectly explains its own history is suspiciously authored.

## Secondary characterization

Also report:

- offered vs used event structures;
- structure-grounded vs world-emergent episodes;
- revised / unchanged / none reinterpretation outcomes;
- articulacy variance;
- generator monoculture indicators.

## Photo posture

Every admitted autobiographical memory receives the #38 visual-companion obligation and evidence-bound reconstruction prompt.

Rendering may remain pending; #39 does not build media-throughput infrastructure.

## Narrow automated tests

Automated tests protect Fibre-specific integrity only:

1. exact pass input allowlists/digests;
2. Pass A and Pass C genome blindness;
3. deterministic genome crossover/mutation provenance;
4. chronology/entry boundary;
5. participant grounding through WorldSpec affordances;
6. source-history and living-human consent boundaries;
7. event != memory != meaning;
8. `not_remembered` and `no_durable_meaning` remain legal;
9. stable meaning-part refs;
10. append-only reinterpretation with `revised` / `unchanged` / `none`;
11. bounded visible rejection attempts;
12. atomic birth leaves all-or-nothing canonical state;
13. no Genesis duplicate biography/memory/relationship/place/embodiment/identity authority;
14. every admitted memory receives its photo obligation;
15. restart reconstructs exactly the same admitted Genesis state.

Do not turn cohort diagnostics into admission tests.

## Completion implication

#39 closes only if the frozen protocol can honestly say whether Fibre created particular lives worth handing to #40 — including the possibility that the answer is no.