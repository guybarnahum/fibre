---
id: m2-pr39-slice-ef-gate-f-result
status: accepted
last-reviewed: 2026-08-20
canonical: false
---

# Milestone #39 — combined Slice E+F Gate F result

## Verdict

**CLEAR**

Gate F closes. Milestone #39 may proceed to Slice G after the Pre-G seam is complete.

Hostile-review head: `f960e8851ac0eeb2d03b1830740e813beeb10184`

That head retains the successful N2 evidence artifact in commit `f960e8851ac0eeb2d03b1830740e813beeb10184` (`Retain successful N2 Gate F evidence`). The repository blob for the exact retained JSON is `a46fdc5fa8695080071a34ec0838003ac7b429f2`.

Hostile-review verification at that head:

- full repository tests: **569/569 pass**;
- repository/world-seed validation: green;
- N2 reviewed preflight digest is byte-identical to the pre-execution reviewed freeze;
- both N2 source artifact SHA-256 values match the frozen preflight;
- all four pre-execution review recommendations were folded in before first E2-V2 model use with `criteriaChangedByReviewRecommendations: false`;
- the three original Slice-F source-integrity attacks still reject.

No separate SHA-256 for the N2 result file is asserted here. Its exact bytes are pinned by the retained Git commit and blob above.

## Frozen N2 evidence

Preflight artifact:

`artifacts/validation/m2-pr39/e2/fibre-m2-pr39-slice-e2-n2-preflight-v1.json`

Result artifact:

`artifacts/validation/m2-pr39/e2/fibre-m2-pr39-slice-e2-n2-v1.json`

Frozen reviewed preflight digest:

`sha256:714f0b6579ec670c58a5e26661604f28d0ab8673c375cd8361c9e65b05f7050f`

Frozen source byte SHA-256 values:

```text
E2-V1  e6f59d1e62e7856914598b8f10424f778bef0ed6256ad771385af67f2e4cc720
E2-V2  77329efbbf85777e359393787fe05e41119a24a560adec8a49ed9902cc80d890
```

N2 was the first downstream-fertility instrument pairing the corrected A0 generator with contract-conformant constitutive Pass-B memory formation. It was frozen before execution at 18 trials over six A0 lives, two fresh/development worlds and horizons 6/8/10.

The two predeclared criteria were:

```text
Criterion A
  remembered >= 10/18

Criterion B
  among remembered trials,
  exact one-sided binomial blind source attribution p <= 0.05

Both required.
```

Observed:

```text
memory formation        18/18       Criterion A PASS
blind attribution       18/18       minimum at m=18: 13
exact chance tail                    0.000003814697265625
Criterion B                          PASS
Gate-F downstream fertility          PASS
```

The predeclared same-life/same-horizon framing comparison was:

```text
old epistemic Pass B        6/9 remembered
new constitutive Pass B     9/9 remembered
delta                       +3/9
one-sided sign test         p = 0.125
gate use                    none
```

This is directional corroboration of the semantics correction, not independent proof.

## Memory selectivity finding

The trial-level `remembered` outcome means that at least one memory formed; it does **not** mean the visible history was remembered wholesale.

The hostile review correctly identified citation share as the more appropriate selectivity measure and correctly computed the aggregate values. Pre-G Stage 2 subsequently derived the breakdown mechanically from the sealed artifact and corrected one arithmetic error in the review's horizon-6 row.

Authoritative machine-derived characterization:

```text
cited episodes
  total 27
  mean  1.50
  min   1
  max   3

share of visible horizon
  mean 0.19074074074074074
  min  0.10
  max  0.50

horizon 6 (n=6)
  mean cited 1.3333333333333333
  mean share 0.2222222222222222
  share min/max 0.16666666666666666 / 0.50

horizon 8 (n=6)
  mean cited 1.3333333333333333
  mean share 0.16666666666666666
  share min/max 0.125 / 0.25

horizon 10 (n=6)
  mean cited 1.8333333333333333
  mean share 0.18333333333333332
  share min/max 0.10 / 0.30
```

The review's printed horizon-6 value (`1.00` cited / `0.167` share) was inconsistent with both the retained artifact and the review's own aggregate `1.50` cited-episode mean. The machine-derived values above are authoritative for the numerical breakdown. The sealed N2 artifact, frozen criteria and Gate-F verdict are unchanged.

The supported interpretation remains that every trial formed some memory while each memory retained only a selective fraction of the visible history. N2 shows roughly one-fifth citation share overall and no monotonic increase in citation share as larger horizons become visible. It does **not** establish a perfectly flat retention share at each horizon.

For future #39 diagnostics, **citation share of the visible history is the preferred memory-selectivity characterization**; remembered/not-remembered remains a separate funnel outcome.

## What Gate F establishes

### Origin/source integrity

Fibre enforces unusual-origin/source boundaries at representation/publication rather than relying on labels or review convention. In particular, the hostile reviewer reran the original attacks and confirmed rejection of:

```text
living named source as Echo without consent authority
living person relabeled as Homage
fork from a nonexistent Thread
```

### Rich-Life downstream fertility

Corrected A0 histories can form selective autobiography and durable meaning whose downstream content remains attributable to the particular life that produced it. N2 achieved 18/18 blind source attribution across two worlds and six lives, including the deliberately unselected repetitive E2-V2 life.

The result supports the Rich-Life distinction that **particularity is not breadth**. A life can look narrow under within-life structure counts and still leave a non-interchangeable autobiographical fingerprint.

## What Gate F does not establish

Gate F does **not** claim:

- that these histories have already caused stable adult values, personality, judgment or future behavior;
- Whole-Person causal standing or M2 score movement;
- publication-grade population inference from six development lives/two worlds;
- that every autobiographical memory must have durable meaning;
- that a high remembered-trial rate is itself a quality target.

#40 owns causal consumption; #41 owns standing.

## Evidence preservation

The positive Gate-F result does not supersede or erase the failed development evidence that made the final result interpretable. Retain the burned/frozen artifacts and their result records, including:

- the E1 narrative-monoculture result;
- H6 participation evidence;
- A2/A2b development evidence;
- E2-V1 fresh-world falsification of seeded contingency;
- N1-v2 evidence produced by the later-retired A2b family;
- the failed N1-on-A0 6/9 conservative run and its flawed-instrument diagnosis;
- the E2-V2 zero-model-call preflight failure record;
- E2-V2 A0 source evidence;
- N2 frozen preflight and successful result.

Do not rerun, tune, or reinterpret a burned experiment merely because a later instrument succeeded.

## Carry-forwards into the Pre-G seam

These are **not Gate-F blockers**. They must be handled before the Slice-G cohort/protocol freeze unless explicitly reclassified by review.

1. **Pass-C doctrine audit.** `no_durable_meaning` is mechanically and doctrinally first-class but has never appeared in the downstream live evidence (37/37 remembered cases produced durable meaning). Read the Pass-C prompt against the constitutive contract before freezing G; correct detection-vs-formation wording if needed for doctrine, not to obtain a desired rate.
2. **Memory-selectivity instrumentation.** Carry citation share of visible history as the primary selectivity characterization rather than using trial-level remembered rate as a proxy for over-retention.
3. **Slice-F canonical delegation.** Publication currently duplicates some origin/source assertions instead of delegating to their canonical assertion functions; remove the semantic drift class or otherwise make the three known mutation gaps load-bearing.
4. **N2 evidence scope.** N2 remains development evidence. Do not cite it at H as population inference.
5. **Earlier C/D pre-G obligations remain open.** Resolve the long-Thread-ID/#37 claim-predicate byte-budget preflight and historical-memory read-policy drift before G freeze.

## Standing

```text
Gate C  CLEAR
Gate D  CLEAR
Gate F  CLEAR

Next boundary:
  Pre-G seam
  then Slice G fresh cohort + protocol freeze
```

No Slice-G cohort output is required or authorized by this closure record.
