---
id: m2-pr39-slice-g34-hostile-review-amendments
status: frozen_pending_verification
last-reviewed: 2026-08-21
canonical: false
---

# Milestone #39 — G3/G4 hostile-review amendments

## Verdict received

External hostile review at `53c2610` returned:

```text
CLEAR WITH AMENDMENTS
```

It verified the G3/G4 source pins, publication-validator witness, retry discipline, rosters, Pass-B constitutive semantics, Pass-C scope/blindness and pre-life sequencing. It identified three bounded defects that must be closed before G5/final-life work.

No final-cohort life and no G5 artifact existed when the findings were received.

The original verified freezes remain immutable:

```text
G3-v1  sha256:3d4885d4c8f717622e466e65e7869526193eccd611967609f7809dfb4b1068a6
G4-v1  sha256:1a41d68aa0bf8c689c84843771cfce07ca0afa44a9b7093ad944f058a93c368d
```

The review is resolved by additive v2 amendment packets; v1 is not rewritten.

## Amendment 1 — pre-register the primary G3 comparison

Current authority:

```text
artifacts/validation/m2-pr39/g/protocol/g3-pass-b-treatment-freeze-v2.json
sha256:aef6eea69cf55cc60e730a3529fd0e7d090261cd6535b256df6cbd3734174fae
```

G3-v2 changes **no production schedule**:

```text
horizons  4  5  6  7  8  10
mode      L  L  T  L  L  T
calls     30 total / 10 treatment / 33.3%
```

It closes the analysis discretion that v1 left open.

Frozen primary comparison:

```text
between_thread_at_fixed_call_ordinal
ordinal 3 / horizon 6   analysed separately
ordinal 6 / horizon 10  analysed separately
```

At a fixed ordinal the visible-history depth is the same across the five Threads while the independently frozen cohort genome differs by Thread.

Between-stratum comparisons are now explicitly:

```text
horizon_confounded_descriptive_only
```

because clean, treatment and exposed strata occupy disjoint history horizons. No within-Thread treatment-vs-control causal claim may be made from those strata.

G3-v2 also records that the historical `q=0.70` memory-rate planning value is stale/conservative after corrected N2 produced 18/18 remembered. It remains planning history only; it is not a prediction, gate or regeneration target.

## Amendment 2 — make genome-copy exclusion mechanical

New canonical Pass-B admission authority:

```text
services/world-kernel/src/genesis-pass-b-admission.mjs
```

New mechanical gate:

```text
pass_b_genome_verbatim_ngram
```

For `life_plus_genome` + `remembered` only, Fibre normalizes `rememberedContent` and every exposed locus using Unicode NFKC, lowercase Unicode letter/number tokens, then rejects a memory containing any contiguous **4-token** locus sequence.

This closes the content-level leak path that structural Pass-C allowlists cannot detect: exposed genome wording may not ride inside an otherwise legitimate `rememberedContent` field into genome-blind Pass C.

### Bounded retry

This gate may receive **one mechanical retry only**:

```text
maximum generated Pass-B versions  2
rejected memory shown to retry      no
same frozen cognition input         yes
not_remembered remains legal        yes
```

The retry prompt receives the fact of the mechanical gate, not the rejected record, and explicitly forbids enrichment/quality improvement. General Pass-B model repair remains false.

If the retry repeats the gate failure:

```text
PRESERVE_FAILURE
HOLD
NO FURTHER PASS-B RETRY
NO QUALITY REGENERATION
```

Active regression covers normalized n-gram detection, treatment rejection, bounded retry, and rejected-content withholding.

## Amendment 3 — freeze durable entry justification

Current G4 amendment authority:

```text
artifacts/validation/m2-pr39/g/protocol/g4-cognition-freeze-v2.json
sha256:50c2f5bcbb1a3470a685f75257fd004c516ca04a67a3b21b367dbf73e58ade20
```

The previously unfrozen required `manifest.entry.justification` is now exactly:

> The ten generated Pass-A episodes are a sparse childhood-through-adolescence history sample, not a claim that nothing occurred before age 6 or from age 18 to Fibre entry at 22.

That is byte-for-byte the already-frozen G4-v1 `historicalPlan.coverageBoundary` text. No new life fact is introduced.

The durable Genesis entry therefore distinguishes **unsampled history** from **empty history** rather than leaving that distinction only in experiment documentation.

## G4-v2 inheritance

Except for the three review amendments, G4-v2 inherits G4-v1 unchanged:

- provider/model and sampling;
- Pass-A/B/C main prompts and schemas;
- EventStructurePool v2 and all 50 offer schedules;
- ten historical windows;
- five factual initial rosters;
- Pass-C deterministic reinterpretation policy;
- Pass-A repair/retry discipline;
- whole-candidate attempt cap = 1;
- publication validator witness;
- no quality-driven regeneration.

G4-v2 binds the exact G3-v2 amendment digest.

## S3 carry-forwards

The review also identified three bounded interpretation notes that do not alter production:

1. Pass-A mechanical record retries can create record-validity survivorship. Preserve and report realised retry counts; never gate on them.
2. G3's `0.70` planning memory rate is stale after N2 and must not be interpreted as a prediction.
3. Whole-genome treatment uses the same surface G2 measured. H genome-specific interpretation remains bounded to the five measured G2 pairs, with `(3,4)` carrying its inconclusive ceiling.

## Verification required

Run before G5:

```bash
npm test
npm run genesis:g34-amendments-verify
```

The amendment verifier makes zero model calls. It proves:

- exact G3-v1 and G4-v1 digests are preserved;
- G3-v2 changes no production schedule;
- the primary contrast and horizon-confound rule are frozen;
- G4-v2 binds exact G3-v2;
- the Pass-B guard constants, retry cap and retry prompt hash match executable code;
- the Pass-B admission module matches its frozen Git blob;
- the durable entry justification exactly equals G4-v1's coverage boundary and passes the live Genesis entry contract.

## Boundary

```text
G1       COMPLETE / CLEAR
G2       COMPLETE / CLEAR — bounded five-pair textual-distinguishability ceiling
G3-v1    PRESERVED / VERIFIED production freeze
G3-v2    FROZEN — analysis amendment pending local verification
G4-v1    PRESERVED / VERIFIED cognition freeze
G4-v2    FROZEN — integrity amendments pending local verification
G5       BLOCKED until amendment verification is green
H        FORBIDDEN until full Gate G CLEAR
```
