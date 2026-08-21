---
id: m2-pr39-slice-g6-verdict-freeze
status: frozen_pending_verification
last-reviewed: 2026-08-21
canonical: false
---

# Milestone #39 — Slice G6 verdict freeze

## Purpose

G6 freezes the final **CLEAR / HOLD / REDESIGN** decision logic before any final-cohort life exists.

Machine-readable authority:

```text
artifacts/validation/m2-pr39/g/protocol/g6-verdict-freeze-v1.json
Git blob: 3f66b590eb357b97baa4bb7778a781e5ca82af32
```

The canonical JSON digest is computed by `npm run genesis:g6-verify` from those exact bytes and must be recorded after maintainer verification.

G6 binds the verified G5 protocol exactly:

```text
G5 canonical digest  sha256:4520357cab14bcdc883c6b3966401c98d17a1424e47f26e8c04002728d799ed5
G5 Git blob          7c6a856d0650b3468bc988a4f5cbd2d96c7551c5
```

## Governing distinction

> **A bad cohort is evidence. A broken experiment is a redesign.**

Therefore:

- weak attribution, weak genome propagation, suspicious sentiment coupling, or excessive self-coherence cause `HOLD`;
- confirmed protocol drift, hidden regeneration, forbidden leakage, post-output threshold selection, or other experiment-invalidating integrity failure causes `REDESIGN`;
- `REDESIGN` is never an escalation merely because several scientific results are poor.

Verdict precedence:

```text
REDESIGN > HOLD > CLEAR
```

No bad result may trigger silent regeneration or rewriting of frozen evidence.

## CLEAR requirements

All of these must hold:

1. blocking Gate G returned CLEAR before any final-life cognition;
2. no REDESIGN trigger occurred;
3. no operational HOLD occurred;
4. D1 normalized life attribution is at least `4/5`;
5. D3 direct genome propagation meets the ceiling-aware fixed-ordinal rule;
6. D3 clean genome-blind controls do not emit `NEGATIVE_CONTROL_FAILURE_SIGNAL`;
7. D2 does not show stable very-high positive sentiment coupling;
8. D5 has at most three `near_total_self_explanation` Threads.

CLEAR must still disclose every nonblocking warning/limitation and does not earn causal or Whole-Person standing.

## D1 — particular-life attribution

Primary normalized result:

```text
4–5 / 5   eligible for CLEAR
0–3 / 5   HOLD
```

Raw attribution remains descriptive shortcut sensitivity and cannot rescue a weak normalized result.

## D2 — sentiment coupling

G6 deliberately does **not** turn minimum meaning count into an admission quota.

If fewer than eight durable meaning records or fewer than three Threads are represented:

```text
INCONCLUSIVE_NONBLOCKING_NO_REGENERATION_NO_MEANING_QUOTA
```

D2 causes HOLD only for stable very-high positive coupling:

```text
cohort Spearman rho >= .75
AND
minimum leave-one-Thread-out rho >= .60
```

High but unstable coupling remains a mandatory warning rather than a blocking result.

## D3 — genome propagation

G3-v2 requires fixed-ordinal between-Thread interpretation at:

```text
ordinal 3 / history horizon 6
ordinal 6 / history horizon 10
```

G2 supplied a detectable textual ceiling for four edges:

```text
(1,2) (2,3) (4,5) (5,1)
```

Pair `(3,4)` was measured but inconclusive at G2, so it is always reported but is not a required H success.

At each fixed ordinal, apply the exact G5 matched-vs-swapped rank-point edge decision to the four G2-detectable edges.

CLEAR requires:

```text
ordinal 3   >= 3/4 correct core edges
ordinal 6   >= 3/4 correct core edges
and at least one ordinal = 4/4
```

If this rule is not met: `HOLD`.

Reference-only fair-independent arithmetic for that two-ordinal rule is `0.03515625`; no independence claim is made.

### Negative control

G5's exact negative-control failure signal is preserved:

```text
either clean ordinal = 5/5
OR
both clean ordinals >= 4/5
```

This statistical signal causes `HOLD` and investigation.

Only if investigation mechanically confirms a forbidden genome path into a supposedly blind call does the verdict become `REDESIGN`.

### life_only_exposed

This remains horizon-confounded and descriptive only. If the exposed cell is too small, report it as inconclusive; do not regenerate and do not block CLEAR merely to create a larger exposed cell.

## D4 — life funnel

Characterization only.

No event/memory/meaning/forgetting/ambivalence count or ratio is a quota or verdict threshold.

## D5 — self-account overreach

```text
0–2 near-total Threads   no cohort warning
3                       warning only
4–5                     HOLD
```

Insufficient material history is nonblocking; G6 does not create a hidden requirement for a minimum amount of dramatic/formative history.

## Repairs and retries

Within frozen caps:

- Pass-A mechanical repair counts are always reported but have no quality threshold;
- one successful Pass-B genome-copy mechanical retry is reported but does not itself HOLD;
- exhausting a frozen mechanical cap causes HOLD;
- exceeding a frozen cap or quality-driven regeneration is a protocol violation and causes REDESIGN.

The first mechanically integrity-valid five-Thread cohort must be frozen immediately and evaluated exactly once.

## Blocking Gate G

G6 itself does not authorize H.

After local G6 verification, Claude receives the complete G1–G6 packet and must return one of:

```text
CLEAR
HOLD
REDESIGN
```

No final-life cognition may occur until Gate G is CLEAR.

## Verification

Run:

```bash
npm test
npm run genesis:g6-verify
```

The verifier makes zero model calls. It verifies exact G5/G6 bytes, empty final-cohort boundary, verdict precedence, D1/D2/D3/D4/D5 thresholds, pair `(3,4)` nonblocking treatment, and Gate-G sequencing.

## Boundary

```text
G1       COMPLETE / CLEAR
G2       COMPLETE / CLEAR
G3-v2    COMPLETE / CLEAR
G4-v2    COMPLETE / CLEAR
G5       COMPLETE / CLEAR
G6       FROZEN — pending local verification
Gate G   BLOCKED on G6 verification
H        FORBIDDEN
```
