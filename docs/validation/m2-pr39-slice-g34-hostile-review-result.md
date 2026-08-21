---
id: m2-pr39-slice-g34-hostile-review-result
status: accepted
last-reviewed: 2026-08-21
canonical: false
---

# Milestone #39 — G3/G4 hostile-review amendment result

External hostile review returned `CLEAR WITH AMENDMENTS` and identified three required pre-life corrections. The original G3-v1 and G4-v1 verified freezes remain preserved unchanged; additive v2 packets close the findings.

## Maintainer verification

At local head:

```text
54f2dcfff35430c741d44cba5993d0be797a9edd
```

the maintainer reported:

```text
active tests                              573 / 573 pass
G3/G4 amendment verifier                  VERIFIED
primary contrast                          between_thread_at_fixed_call_ordinal
G3-v2 digest                              sha256:aef6eea69cf55cc60e730a3529fd0e7d090261cd6535b256df6cbd3734174fae
G4-v2 digest                              sha256:50c2f5bcbb1a3470a685f75257fd004c516ca04a67a3b21b367dbf73e58ade20
Pass-B admission blob                     b6400e98ce83f809f0e06f95f3d5ab79eebbbb2d
Pass-B retry prompt                       sha256:db100c6568b8195323afa3533c35c8ef26c75cd4adf5b7336b19e46628a62ea9
entry justification                       frozen to G4-v1 coverage boundary
```

No model calls occur in the amendment verifier.

## Closed findings

### S1 — analysis discretion

G3-v2 changes no production call, horizon, treatment position, exposure surface or cell arithmetic. It preregisters the primary genome-propagation comparison as between-Thread comparison at fixed Pass-B call ordinal, with ordinal 3 / horizon 6 and ordinal 6 / horizon 10 analyzed separately. Between-stratum comparisons are permanently classified as horizon-confounded and descriptive only.

### S2 — content-level genome leakage

`services/world-kernel/src/genesis-pass-b-admission.mjs` is now the canonical final-cohort Pass-B admission path. A remembered `life_plus_genome` output containing any normalized contiguous four-token sequence from an exposed locus is mechanically rejected. Exactly one mechanical retry is allowed from the same frozen cognition input; the rejected memory is withheld and the retry prompt is explicitly anti-enrichment. A second failure preserves failure and HOLDs rather than resampling.

### S2 — durable entry provenance

G4-v2 freezes `manifest.entry.justification` exactly to the already-frozen G4-v1 coverage-boundary sentence distinguishing sparse sampling from empty history before age 6 and between age 18 and Fibre entry at 22.

## Preserved S3 interpretation notes

1. Report realized Pass-A mechanical record-retry counts because record-validity survivorship remains possible; never gate on them.
2. G3's historical `q=0.70` memory-formation planning value is stale after corrected N2 and is planning history only, not a prediction or target.
3. H genome-specific interpretation remains bounded by G2's five measured pairs; pair `(3,4)` carries its measured-low/inconclusive ceiling.

## Exit

```text
G3-v1    PRESERVED / VERIFIED
G3-v2    COMPLETE / CLEAR
G4-v1    PRESERVED / VERIFIED
G4-v2    COMPLETE / CLEAR
G5       NEXT / AUTHORIZED TO FREEZE EVALUATION ONLY
H        FORBIDDEN until full Gate G CLEAR
```

No final-cohort life existed at amendment freeze or verification time.