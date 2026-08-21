---
id: m2-pr39-slice-g5-freeze-pin-correction
status: pending_maintainer_verification
last-reviewed: 2026-08-21
canonical: false
---

# Milestone #39 — G5 freeze-pin correction

## Finding

The first maintainer verification of the frozen G5 diagnostics packet at local head:

```text
f211a2f351b556d3c2221edfb1cce3be4875376a
```

reported:

```text
active tests  577 pass / 1 fail
failure       G5 diagnostics protocol digest drifted
```

`npm run genesis:g5-verify` failed at the same check.

Inspection showed that the machine-readable G5 protocol itself had **not changed** after freeze. Its exact Git blob remained:

```text
artifacts/validation/m2-pr39/g/protocol/g5-diagnostics-freeze-v1.json
Git blob  7c6a856d0650b3468bc988a4f5cbd2d96c7551c5
```

The defect was a manually precomputed canonical-JSON digest constant in the verifier, not drift in the scientific protocol.

## Correction

The protocol bytes are not rewritten.

`tools/genesis/genesis-g5-diagnostics-freeze.mjs` now pins the exact frozen protocol by Git blob SHA:

```text
7c6a856d0650b3468bc988a4f5cbd2d96c7551c5
```

and computes/prints the canonical JSON digest from those verified bytes during execution.

This is stronger than trusting the erroneous handwritten digest constant: any byte change in the frozen protocol fails before G6.

The previously documented canonical digest `sha256:6beb0ba5...` must not be treated as authority. It is superseded by this correction and will be replaced with the verifier-produced digest after the maintainer rerun.

## Scientific effect

None.

The correction changes no G5 diagnostic, threshold, rater, prompt, schema, randomization, minimum sample size, G3/G4 binding, or interpretation rule. No final-cohort life exists.

## Required verification

```bash
npm test
npm run genesis:g5-verify
```

Expected behavior:

- exact G5 protocol Git blob verifies;
- verifier prints the actual canonical protocol digest;
- no model calls occur.

G6 remains blocked until this verification is green and the emitted canonical digest is recorded.
