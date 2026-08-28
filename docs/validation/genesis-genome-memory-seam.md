---
id: validation-genesis-genome-memory-seam
status: complete
last-reviewed: 2026-08-27
canonical: false
---

# Genesis genome causal characterization at the memory seam

## Question

This bridge slice asks one narrow causal question:

> Holding the lived history, World, remembering age, history horizon and Pass-B cognition boundary fixed, does changing only the symbolic genome context produce an attributable change in autobiographical memory selection?

The experiment does not test whether genome text is visible. Current `life_plus_genome` Pass-B cognition already receives the frozen whole-genome exposure. It tests whether that context has a downstream effect strong enough to resolve with a small controlled matched-history probe.

No personhood or M2 standing follows from the result. #40 still owns ordinary-cognition causal consumption.

## Existing task-matched positive control

The previously burned selective-memory correction is the positive control for the assay:

```text
plan    sha256:680e89b38246e19f411d94ee7d527e059ead86d2f60e0b9f2dfaaac4ab2d951b
prompt  sha256:3ba80ac180b5140bc3710a33c78ed6e14bc666979e60223ca44bcba32399f26a
result  6/6 fresh matched pairs separated strong residue from ordinary non-selection
replay  exact, zero provider attempts
```

This is task-matched because it used the same Pass-B memory-formation task and output contract. It shows that current Pass B can respond to a causally relevant difference in lived material. It is not genome evidence and is not rerun.

## Fresh differential

There are eight fresh matched historical opportunities. Each opportunity is evaluated once under each of two six-locus symbolic genomes:

```text
same subject
same World
same complete visible history
same rememberingAt
same ageAtRemembering
same history horizon
same prior memories (none)
same Pass-B runtime prompt/schema
different whole-genome context only
        -> admitted memory decision/content
```

The genomes use ordinary atomic symbolic dispositions of the kind already permitted by the symbolic-genome architecture. They do not contain instructions such as “remember X”, diagnostic labels, expected episode IDs or stronger cues added merely to force attribution.

Each history contains two predeclared anchor episodes of comparable autobiographical plausibility plus ordinary filler history. One anchor is prospectively associated with genome alpha and one with genome beta. The model never receives those associations.

## Counterbalancing

The eight matched opportunities are arranged so treatment placement is not tied to the #39 schedule:

```text
history horizons  4, 6, 8, 10   each used by two independent opportunities
provider order     alpha-first 4 / beta-first 4
anchor recency     alpha-more-recent 4 / beta-more-recent 4
ages               vary across opportunities; identical within each genome pair
prior memories     none, to isolate the direct memory seam
```

Within a pair the projected cognition packets must be byte-identical after replacing `genomeExposure` with `null`. The preflight fails if any treatment/control metadata leaks into cognition.

## Unit and outcome

The scientific unit is one fresh matched historical opportunity, not an individual provider response.

For each genome treatment, scoring looks only at the admitted `episodeRefs`:

- `expected`: the treatment-associated anchor is cited and the opposite anchor is not;
- `opposite`: the opposite anchor is cited and the treatment-associated anchor is not;
- `both`: both anchors are cited;
- `none`: Pass B returns `not_remembered`;
- `other`: a memory forms without selecting either anchor.

A pair is **directional** only when alpha uniquely selects its own anchor and beta uniquely selects its own anchor. A pair is **reverse** only when both uniquely select the opposite anchors. Other outcomes are not counted as directional evidence.

Different prose alone is not sufficient for the causal classification.

## Resolution boundary

The probe intentionally makes only a large-effect claim.

```text
Behaviorally/future-state causal
  directional pairs >= 7/8
  reverse pairs     <= 1/8

Context-only
  directional pairs <= 2/8
  reverse pairs     <= 2/8
  and the structural cognition exposure remains proven

Inconclusive
  everything between those boundaries
```

`7/8` corresponds to 87.5% directional concordance. Under a descriptive symmetric sign reference of `p=0.5`, `P(X >= 7 | n=8) = 9/256 ~= 0.035`. This is a sensitivity statement for these eight semantic contexts, not population inference and not a claim that deterministic model calls are independent replicates.

A result of 3–6 directional pairs is deliberately inconclusive: this experiment is not sized to resolve modest genome effects.

`Context-only` means exactly what the bridge vocabulary says: genome meaning reaches cognition, but this controlled probe demonstrates no required downstream difference at its declared resolution. It is not evidence that smaller effects do not exist.

`Inert` would require absence of a meaningful consumer/effect. The current direct Pass-B cognition surface already constitutes a genome-context consumer, so the live alternatives for this seam are causal, Context-only or inconclusive unless that architecture changes.

## Burned result

The prospectively frozen run completed without any mechanical genome-copy retry:

```text
plan                         sha256:57dc804985fce222c4ed0772ad8d7c7dc4f4dd4517ea22a1d91753f00f4d4fd8
fixture                      sha256:275b17e7b24ed24007356c422617349136bf62819a69390b4ea39bee6112a82d
runtime Pass-B prompt        sha256:3ba80ac180b5140bc3710a33c78ed6e14bc666979e60223ca44bcba32399f26a
schema                       sha256:846f94bdeef2d874498751205dffb548ea88cf55cb30c0cf0f9bdd7e17f4bf1a
model                        openai/gpt-5.1-2025-11-13
fresh matched units          8
scientific judgments         16
directional genome pairs     0/8
reverse pairs                0/8
pairs with different refs    3/8
provider attempts            16
mechanical retries           0
standing                     CONTEXT_ONLY
```

All 16 judgments returned `remembered`. Three matched pairs differed in admitted `episodeRefs`, so the model was not literally invariant to genome context, but none of those differences formed the predeclared genome-concordant directional pattern. The probe therefore does not demonstrate an attributable genome effect at its declared large-effect resolution.

Immediate provider-disabled replay reproduced all 16 judgments exactly:

```text
durable commits              0
durable replays              16
physical provider attempts   0
standing                     CONTEXT_ONLY
provider network             structurally disabled
```

The accepted interpretation is therefore:

> The symbolic genome reaches Pass-B cognition and is permitted to influence attention or retention, but this controlled differential did not demonstrate a required downstream memory-selection effect. At the current Genesis memory seam, genome standing is **Context-only**, not behaviorally/future-state causal and not inert.

This result does not establish absence of smaller genome effects. No runtime prompt, genome wording, history, threshold or treatment schedule is changed in response to the result.

## Execution discipline

The runner uses the Birth Center durable invocation journal.

- 16 fresh scientific judgments: eight histories × two genome contexts;
- zero scientific retries;
- the runtime genome-copy admission boundary remains active;
- at most one mechanical genome-copy retry may occur per trial;
- therefore 16 judgments can require at most 32 physical provider attempts;
- committed work resumes rather than regenerating;
- completed live results cannot be rerun for quality;
- replay disables provider networking structurally;
- physical provider attempts and durable model commits/replays are reported separately.

The mechanical genome-copy retry is not scientific resampling: it rejects a record that copied genome wording into autobiographical evidence and requests a replacement under the same frozen cognition input.

## Interpretation discipline

A disappointing result is retained.

After provider output is read, Fibre must not:

- strengthen or rewrite the genome loci to improve attribution;
- change anchor histories or their prospective associations;
- move the 7/8 threshold;
- add repeated temperature-zero calls and count them as independent evidence;
- convert a mixed/null result into evidence of absence;
- treat context visibility as behavioral causality.

The bridge records the `CONTEXT_ONLY` result and proceeds without tuning for a desired standing.
