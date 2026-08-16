---
id: validation-m2-pr39-slice-b-genome-control-result
status: accepted
last-reviewed: 2026-08-15
canonical: true
---

# #39 Slice B symbolic-genome specificity control — live results

## Scope

This is the predeclared Slice-B capability ceiling for the hand-authored symbolic-genome exemplars. It is an instrument/concept check only.

It is **not** Genesis personhood evidence, an admission gate, Whole-Person causal standing, or M2 score movement.

Control version: `genesis-genome-specificity-control-v3`

Seed: `slice-b-positive-control-v3`

Implementation head used for both completed runs:

```text
f07820a929670f58fc50e45bcaed112ec5f0c980
```

The raw artifacts are generated evidence and are not promoted into canonical source text; this document records the concise results and interpretation.

## Run 1 — first complete live result

Generator:

```text
provider  openai
model     gpt-5.1-2025-11-13
calls     48
```

Blind rater:

```text
provider  openai
model     gpt-5.1-2025-11-13
calls     24
```

Operational execution:

```text
72 / 72 calls completed
all calls completed on invocation attempt 1
operational retries 0
```

Result:

```text
correct                  20 / 24
accuracy                  83.33%
chance                    50%
exact one-sided p         0.000771939754486084
Genome A left             10 / 12
Genome A right            10 / 12
```

The four incorrect classifications were `s09`, `s21`, `s22`, and `s23`. Two occurred with Genome A on the left and two with Genome A on the right. The exact seeded candidate-position control therefore shows no aggregate fixed-side advantage in this run.

Artifact SHA-256:

```text
5c68386d784693d61535ba323070bf3e811104a02c6c8bbdaf0c1777c666d1a0
```

### Predeclared reading

Before live execution, `20–24 / 24` was frozen as:

> **strong directly-visible ceiling signal**

Therefore the preserved reading is:

> The hand-authored exemplar loci carry a strong directly visible semantic signal. This establishes that the Slice-B textual-locus instrument is capable, in principle, of producing distinguishable semantic output.

Do not tune the exemplars to chase a higher score.

### Interpretation bound

Generator and rater were the **same provider and model**. The control records this explicitly:

```text
sameProviderAndModelAsGenerator = true
```

Self-recognition cannot be excluded. This bounds Run 1 and prevents treating 20/24 as provider-independent evidence.

## Run 2 — cross-provider replication

After Google billing/rate capacity was enabled, the exact same frozen control version, seed, genomes, situations, prompts, schemas, scoring rule, and candidate-position policy were rerun without tuning.

Generator:

```text
provider  google
model     gemini-3.6-flash
calls     48
```

Blind rater:

```text
provider  openai
model     gpt-5.1-2025-11-13
calls     24
```

Operational execution:

```text
72 / 72 calls completed
all calls completed on invocation attempt 1
operational retries 0
```

Result:

```text
correct                  19 / 24
accuracy                  79.17%
chance                    50%
exact one-sided p         0.003305375576019287
Genome A left             10 / 12
Genome A right             9 / 12
```

The five incorrect classifications were `s11`, `s12`, `s14`, `s20`, and `s23`. Two occurred with Genome A on the left and three with Genome A on the right. There is no fixed-side pattern sufficient to explain the result.

Artifact SHA-256:

```text
114f80c7d0eb5cd71c6428b2840b5312c9ce27215bf93500c16c4a1c3f2bd65e
```

The control records:

```text
sameProviderAndModelAsGenerator = false
```

The generator and rater therefore have different provider/model identities, reducing direct self-recognition risk.

### Predeclared reading

Before either completed live run, `17–19 / 24` was frozen as:

> **detectable moderate ceiling**

Therefore the preserved reading for the cross-provider replication is:

> The hand-authored exemplar loci carry a detectable directly visible semantic signal under a cross-provider generator/rater split.

This independently supports the core Slice-B instrument claim without the same-model interpretation bound from Run 1. It does not convert the control into personhood evidence or an admission gate.

## Operational non-result before Run 2

An earlier attempt using Google as generator terminated on the provider's free-tier request quota before a complete 24-trial result existed. It produced no Slice-B result and was not used to tune the genomes, situations, scoring rule, seed, candidate-position policy, or predeclared reading.

## Slice-B conclusion

The Slice-B positive-control obligation is satisfied, and now has a cross-provider replication:

```text
durable symbolic-genome substrate       implemented
trial-independent control               implemented
exact 12/12 candidate-position balance  implemented
predeclared reading                     frozen before run
first complete live result              strong (20/24), same-model bounded
cross-provider replication              detectable moderate (19/24)
```

The combined evidence is stronger than Run 1 alone: the directly visible textual loci remain discriminable when generation moves to Gemini and blind rating remains on OpenAI.

This closes Slice B's live evidence item.

It does **not** close the later obligations:

- Slice E synthetic-ancestor lineage binding;
- Slice G specificity ceiling over the actual frozen Genesis-produced cohort genomes;
- Slice H genome propagation through lived history/memory;
- #40 causal consumption;
- #41 standing.

Per the #39 review cadence, Slice B is reviewed together with Slice C rather than at a separate blocking gate.
