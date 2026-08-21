---
id: m2-pr39-gate-g-review-result
status: clear
last-reviewed: 2026-08-21
canonical: false
---

# Milestone #39 — Blocking Gate G review result

## Verdict

```text
VERDICT: CLEAR
FINAL-LIFE GENERATION: AUTHORIZED
S1 FINDINGS: none
```

External hostile review was performed against branch `agent/pr39-genesis-childhood-birth-v1` at the pre-review documentation head:

```text
abcff37eacf82cd522e8276da20d33926b0cb754
```

The reviewer independently reran the active suite, checked the empty final-cohort boundary, followed the frozen packet into executable Genesis/admission/retry/publication/evaluation code, and recomputed the cited digests rather than copying them from the documentation.

Verified boundary:

```text
active tests                 582 / 582 pass
final cohort directory       absent
G6 canonical digest          sha256:1cfaa3148599236526d5495b14cc0ef2468d5488aa37be38b3fec9c49e21afcc
G6 Git blob                  3f66b590eb357b97baa4bb7778a781e5ca82af32
G5 diagnostics digest        sha256:4520357cab14bcdc883c6b3966401c98d17a1424e47f26e8c04002728d799ed5
G5 surfaces digest           sha256:cedd203dbf45a933d2b3af5227931e7722db1d33ca43849933aac584c02e0712
G5 Git blob                  7c6a856d0650b3468bc988a4f5cbd2d96c7551c5
G3-v1 canonical digest       sha256:3d4885d4c8f717622e466e65e7869526193eccd611967609f7809dfb4b1068a6
```

The review found no actionable post-outcome discretion in provider/model/rater choice, prompt/schema choice, randomization, candidate order, normalization, thresholds, primary comparison, exclusion, retries, regeneration, publication or verdict action.

## D3 judgment

The frozen four-edge/two-ordinal rule is accepted as defensible and non-permissive.

Core edges:

```text
(1,2) (2,3) (4,5) (5,1)
```

These form the path `3–2–1–5–4`. Genomes 3 and 4 each appear on exactly one core edge. Therefore the requirement that at least one treatment ordinal achieve `4/4` does structural work: at least one horizon must demonstrate a correct incident edge for every one of the five genomes. A bare `>=3/4` rule would not guarantee that coverage.

Pair `(3,4)` remains a measured-low G2 ceiling limitation rather than a required H success. Its exclusion removes one edge, not either genome: genome 3 and genome 4 were separately detectable on their other measured edges. Requiring H to succeed on `(3,4)` would demand downstream propagation where G2 never established a detectable direct ceiling.

Reference arithmetic was independently checked:

```text
P(one ordinal >=3/4)   0.3125
P(one ordinal =4/4)    0.0625
independent two-ordinal rule 9/256 = 0.03515625
correlation-free union bound on any 4/4 ordinal <= 0.125
```

No independence claim is made.

## S3 carry-forwards

### S3-1 — D3 power interpretation

Record before H, without altering any G6 threshold or frozen bytes:

> A D3 HOLD means direct genome propagation was **not demonstrated at this rule's power**. It does not establish that genome propagation is absent. Attenuation through memory formation is expected relative to G2's direct textual-distinguishability ceiling.

Reference-only power values under an independent-edge planning approximation:

```text
per-edge accuracy 0.70   P(rule passes) about 0.2553
per-edge accuracy 0.80   P(rule passes) about 0.5033
per-edge accuracy 0.875  P(rule passes) about 0.70
```

These are interpretation aids only. They are not targets, admission criteria, regeneration criteria or a substitute for the frozen D3 verdict rule. Independence is not asserted for H.

### S3-2 — pair (3,4) remains silent downstream

H will not establish or refute propagation on the G2-measured-low `(3,4)` edge. It must remain reported as a limitation; it must not be silently promoted into a success requirement after H.

### S3-3 — Pass-A record-retry survivorship

Mechanical record retries can still create bounded survivorship toward records easier to encode validly. This was already disclosed during development. H must report realized per-gate repair/retry counts and exhaustion/failure profile; those counts do not become a richness or quality quota.

## Gate boundary

Gate G is now satisfied:

```text
G1       COMPLETE / CLEAR
G2       COMPLETE / CLEAR
G3-v2    COMPLETE / CLEAR
G4-v2    COMPLETE / CLEAR
G5       COMPLETE / CLEAR
G6       COMPLETE / CLEAR
Gate G   COMPLETE / CLEAR
H        AUTHORIZED
```

Authorization means exactly what the frozen protocol says: generate the first mechanically integrity-valid five-Thread final cohort once, freeze it immediately, evaluate it under G5/G6, and preserve any weak or embarrassing scientific result. Quality-driven regeneration remains forbidden.

No causal or Whole-Person standing is earned by Gate G or by generation alone.
