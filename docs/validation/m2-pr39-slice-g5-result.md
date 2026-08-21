---
id: m2-pr39-slice-g5-result
status: accepted
last-reviewed: 2026-08-21
canonical: false
---

# Milestone #39 — Slice G5 diagnostics freeze result

## Verdict

**G5 COMPLETE / CLEAR.**

G5 froze the final-cohort evaluation design before any final-cohort life existed. It is evaluation-only and does not alter Worlds, genomes, treatment, cognition, retry policy, publication, or final-life generation.

## Maintainer verification

At local head:

```text
de864de22deb6c15ebbd5513eb5edf06aa8f4765
```

the maintainer reported:

```text
active tests                 578 / 578 pass
G5 diagnostics verifier      VERIFIED
primary rater                google/gemini-3.6-flash
D1 primary condition         normalized
D3 primary ordinals          3, 6
D3 primary horizons          6, 10
D2 minimum meanings          8
```

Exact evaluation surface authority:

```text
artifacts/validation/m2-pr39/g/protocol/g5-evaluation-surfaces-v1.json
canonical digest  sha256:cedd203dbf45a933d2b3af5227931e7722db1d33ca43849933aac584c02e0712
Git blob          320c6bac5a462ffe8cc998514b6024ebaf9f0915
```

Exact diagnostics protocol authority:

```text
artifacts/validation/m2-pr39/g/protocol/g5-diagnostics-freeze-v1.json
canonical digest  sha256:4520357cab14bcdc883c6b3966401c98d17a1424e47f26e8c04002728d799ed5
Git blob          7c6a856d0650b3468bc988a4f5cbd2d96c7551c5
```

## Preserved first verifier failure

The first local G5 verification attempt produced `577/578` because the verifier contained an incorrectly precomputed canonical-JSON digest constant for the G5 diagnostics protocol.

The protocol file itself had not changed; its exact Git blob remained `7c6a856d0650b3468bc988a4f5cbd2d96c7551c5`.

The correction therefore changed no G5 scientific rule. The verifier was changed to make the exact protocol Git blob the frozen byte authority and to compute/report the canonical JSON digest from those verified bytes.

The successful second run established the canonical digest above. The failed first run remains documented in `docs/validation/m2-pr39-slice-g5-verifier-bookkeeping-finding.md`.

## Frozen interpretation surface

G5 freezes:

- normalized D1 life attribution as the primary particular-life diagnostic;
- raw D1 as shortcut-sensitivity characterization;
- separately blinded D2 event/meaning valence with Spearman + leave-one-Thread-out stability;
- G3-v2 fixed-ordinal D3 genome-propagation comparisons at ordinals 3 and 6, with only the five measured G2 edges receiving ceiling-aware interpretation;
- clean genome-blind ordinals 1 and 2 as D3 negative controls;
- D4 life-funnel characterization with no quota;
- D5 self-account-overreach characterization, where unexplained historical residue is allowed and perfect self-explanation may be a warning;
- deterministic SHA-256 ordering and fixed normalizer/rater providers before H.

No diagnostic result exists yet because the five final lives do not exist.

## Exit

```text
G1       COMPLETE / CLEAR
G2       COMPLETE / CLEAR — five-pair textual ceiling
G3-v2    COMPLETE / CLEAR
G4-v2    COMPLETE / CLEAR
G5       COMPLETE / CLEAR
G6       NEXT — freeze exact verdict rule + blocking Gate-G packet
H        FORBIDDEN until G6 and blocking Gate-G are CLEAR
```
