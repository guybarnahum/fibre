---
id: m2-pr39-slice-h-preflight-result
status: clear
last-reviewed: 2026-08-21
canonical: false
---

# Milestone #39 — Slice H final-cohort preflight result

## Verdict

**CLEAR TO EXECUTE H — zero-call preflight passed.**

The maintainer verified the final H execution boundary locally before any final-cohort cognition existed.

## Verification

```text
active tests               586/586
H preflight                 CLEAR
provider calls              0
Gate-G reviewed head        abcff37eacf82cd522e8276da20d33926b0cb754
runtime                     openai/gpt-5.1-2025-11-13
EventStructurePool digest   sha256:1437891b2cbe2d8082283619b3f9e38e6cbce3eb2a323e989e27ce1a1dd33733
H output root               artifacts/validation/m2-pr39/h/cohort-v1 [absent]
```

The preflight resolved all five frozen World↔genome bindings and the common production plan:

```text
slot 1  thr_pr39_g2_04  de_novo            world_slice_g1_01_can_tho          genome_6480e89a07bbe2698d0f5caad95976aa7ff2ea63
slot 2  thr_pr39_g2_05  synthetic_lineage  world_slice_g1_02_lodz             genome_78ff3bedb98576e59c7f4608fd3793fdf33e4dcc
slot 3  thr_pr39_g2_01  de_novo            world_slice_g1_03_cusco            genome_b74429231486bc34950cfa9d9abb0881807c74b4
slot 4  thr_pr39_g2_03  de_novo            world_slice_g1_04_accra            genome_a920ffbc71cc00f8c869139e548f18ba642f05de
slot 5  thr_pr39_g2_02  synthetic_lineage  world_slice_g1_05_greater_sudbury  genome_c70b58d8c5b127b546ed3610566ac0ca6913f247

Pass A  10 episodes / Thread
Pass B  horizons 4/5/6/7/8/10
modes   L L T L L T
```

## Digest-domain correction immediately before CLEAR

The first H preflight failed before any provider call because the H verifier compared G1/G2's plain canonical WorldSpec digest with Genesis storage's typed `world_spec` record digest. These are intentionally different digest domains.

The H verifier was corrected to use the same plain canonical WorldSpec digest convention frozen by G1/G2. No WorldSpec, genome, G1–G6 protocol, Gate-G evidence, model input or scientific threshold changed. A regression test now explicitly protects that distinction.

## Irreversible boundary

The next command is the first final-cohort cognition execution:

```text
npm run genesis:h-generate
```

That command is one-shot. It may produce either:

```text
FIRST_INTEGRITY_VALID_FIVE_THREAD_COHORT_FROZEN
```

or a preserved failure/HOLD artifact.

A weak, odd, sparse or scientifically disappointing first cohort may not be regenerated for quality. A failed first attempt may not be rerun with a new seed, provider, model, treatment schedule or changed threshold.
