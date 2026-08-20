---
id: m2-pr39-slice-g2-review-result
status: clear
last-reviewed: 2026-08-20
canonical: false
---

# Milestone #39 — Slice G2 hostile review result

## Verdict

**CLEAR — close G2 as a five-pair textual-distinguishability ceiling, and only for the five measured genome pairs.**

The external hostile review found no S1 blocking issue. Its material findings constrain H interpretation rather than invalidate G2.

Raw preserved result:

```text
p01  23/24  strong_ceiling_signal
p02  19/24  detectable_moderate_ceiling
p03  15/24  inconclusive_near_chance
p04  21/24  strong_ceiling_signal
p05  21/24  strong_ceiling_signal

detectable pairs  4/5
aggregate          99/120 = 82.5% descriptive only
```

Machine-readable post-result interpretation:

```text
artifacts/validation/m2-pr39/g/results/g2-five-pair-ceiling-interpretation-v1.json
```

## What G2 establishes

For the five measured edges, the frozen cohort genomes are **textually distinguishable in their effect on generated responses** under the frozen cross-provider instrument.

This is necessary for later genome-propagation interpretation. It does not establish that:

- genome has affected history, memory, meaning, judgment or behavior;
- the distinguishing signal is semantic rather than literal/surface-level;
- an unmeasured genome pair has any usable ceiling;
- 82.5% is a pooled inferential cohort specificity rate.

The G2 claim should therefore no longer be written unqualified as “the cohort-genome specificity ceiling.” Use **five-pair genome specificity ceiling** or **five-pair textual-distinguishability ceiling**.

## Five-pair scope

The measured cycle is:

```text
(1,2) (2,3) (3,4) (4,5) (5,1)
```

The unmeasured complement is itself a second five-cycle:

```text
(1,3) (1,4) (2,4) (2,5) (3,5)
```

G2 supplies no ceiling for those five unmeasured pairs.

### Decision for H

Do **not** run the complementary cycle merely to make the matrix complete before G3.

Instead:

> H may use G2 as a genome-specificity ceiling only for the five measured pairs. Unmeasured pairs may be inspected descriptively but may not receive a G2-normalized genome-specificity inference unless a separately frozen complementary-cycle experiment is run first.

This preserves the cheaper screening design and prevents specificity from being asserted across pairs where G2 has no evidence.

## p03 is a pair-specific warning, not a weak-genome finding

```text
p03  slots 3 vs 4  15/24  p = 0.153728...  inconclusive
```

Do not call slots 3 or 4 individually weak:

```text
slot 3  p02 = 19/24 detectable   p03 = 15/24 inconclusive
slot 4  p03 = 15/24 inconclusive p04 = 21/24 strong
```

Each endpoint is distinguishable on its other measured edge. The observed weakness therefore belongs to the **3/4 combination**.

H interpretation constraint:

> A null or weak Thread-3 / Thread-4 H result is uninformative about failure of lived-history or genome propagation because the direct-visibility ceiling for that pair was itself inconclusive.

Keep p03 exactly as observed. Do not rewrite either genome or repeat the same pair to chase significance.

## Coverage line

The frozen G2 rule requiring every genome to touch a detectable edge remains valid as a predeclared rule.

But in this particular run exactly one edge failed. On a five-cycle, full vertex coverage is then automatic. Therefore:

```text
“genome coverage 1,2,3,4,5”
```

must not be presented as a second independent empirical success.

The useful observed evidence is the per-genome edge profile:

```text
slot 1  p01=23  p05=21
slot 2  p01=23  p02=19
slot 3  p02=19  p03=15
slot 4  p03=15  p04=21
slot 5  p04=21  p05=21
```

That profile shows no single genome is inert as text.

## Frozen rule sanity check

Under the reference assumption that pair-detection events are independent at a chance rater:

```text
P(pair >=17/24)                     0.0319573283
P(at least 3 of 5 detectable)       0.0003109259
P(frozen CLEAR rule incl coverage)  0.0001580038
```

These values were independently recomputed after the result. They are **reference arithmetic only**; they are not a claim that empirical pair outcomes are independent.

The useful conclusion is narrow: the frozen CLEAR rule was not permissive under the chance reference model.

## Cross-provider bound

```text
generator  google/gemini-3.6-flash
rater      openai/gpt-5.1-2025-11-13
```

The split removes the same-model self-recognition bound from the earlier Slice-B same-model run.

Shared language/training priors remain a residual possible cue source. That bounds interpretation but does not invalidate the ceiling.

## Lexical-overlap follow-up

The hostile review correctly noted that the current instrument cannot distinguish semantic-route specificity from responsiveness to visible textual propositions.

A no-model-call post-hoc diagnostic is therefore added:

```text
tools/genesis/genesis-g2-lexical-overlap.mjs
npm run genesis:g2-lexical-overlap
```

It compares exact normalized tokens distinctive to Genome A versus Genome B with the two generated responses on each trial, then reports:

- literal-token classifier accuracy excluding ties;
- exact-token cue margin per trial;
- correlation between literal cue margin and blind-rater correctness;
- binary non-tie association.

This diagnostic is **observational and non-gating** because it was defined after G2 results were visible. It cannot upgrade G2 from textual distinguishability to semantic specificity. It can only bound how much of the observed ceiling appears explainable by exact lexical reuse.

## Resolution of hostile-review items

```text
B1 required     RESOLVED — five-pair scope and H restriction recorded
B2 required     RESOLVED — p03 pair-specific H constraint machine-recorded
B3 recommended  IMPLEMENTED — lexical-overlap diagnostic; result pending local execution
B4 recommended  RESOLVED — per-genome edge profile replaces coverage-as-achievement framing
```

## Boundary

```text
G1                 COMPLETE / CLEAR
G2 raw result       COMPLETE / CLEAR
G2 hostile review  CLEAR with bounded interpretation
lexical check       PENDING observational execution; no model calls
G3                 may begin after the cheap lexical result is preserved
H                   still FORBIDDEN until full Gate G CLEAR
```

The lexical check is deliberately completed before G3 for cleanliness, even though it is not a new G2 admission gate.
