---
id: m2-pr39-gate-g2-review-result
status: hold_pre_life_closure_closed_locally_pending_rereview
last-reviewed: 2026-08-22
canonical: false
---

# Milestone #39 — first blocking Gate-G(2) review result

## Verdict

```text
HOLD
```

The replacement scientific design survived the hostile review. The G5/G6 five-edge reconciliation was judged legitimate and non-adaptive. The HOLD was a **pre-life closure HOLD**: the reviewed packet was incomplete and contained several execution/disclosure ambiguities.

No replacement provider call, childhood episode, memory, meaning or birth was authorized by this result.

Reviewed head:

```text
8c8d1c1d7208b4f31a3bea359d103563ce0d29e2
```

Reviewer-reported verification at that head:

```text
699 tests · 699 passed · 0 failed
Repository validation passed.
World seed validation passed.
replacement reconciliation verifier CLEAR — ZERO CALL
```

The hostile review made zero provider calls and reported that it did not use semantic content from the three completed H-v2 lives to justify any replacement-protocol change.

## Blocking findings

### B1 — complete replacement execution packet missing

The reviewed `replacement-v1` packet had fresh G1/G2 material and the G5/G6 reconciliation, but no concrete replacement G3 treatment instance, G4/execution binding, output root or executable replacement cohort runner.

**Required posture:** freeze the complete execution surface before re-review.

### B2 — G4-v3 reliability not bound to the cohort call site

The historical H runner calls `generateRichPassAEpisode()` without an explicit `generationPolicy`, so the runtime deliberately falls back to the legacy shared three-generated-version budget.

**Required posture:** replacement Pass A must explicitly pass `GENESIS_PASS_A_RELIABILITY_POLICY_V3`, with independent `2 form / 2 record / 5 total` bounds.

### B3 — old pair-3-4 G6 carve-out still reachable

The first reconciliation made all five fresh G2-detectable edges part of D3, but the inherited frozen G6 `clearRule` still allowed an old pair-3-4 null/error limitation path.

**Required posture:** replacement-effective CLEAR semantics must retire the pair-3-4 carve-out and define null/error/tie/unanalyzable measured edges as **not correct**.

### B4 — replacement genome authoring template was not disclosed

The replacement loci use a more consistently aligned semantic dimension by ordinal than the original cohort. This does not invalidate the fresh replacement G2 ceiling, but means its numerical scores are not directly comparable to the old cohort.

**Required posture:** disclose the aligned authoring dimensions and condition eventual D3 interpretation on that design. Do not rewrite frozen genomes.

### B5 — assignment was called a derangement but realized three fixed points

The deterministic content-independent mapping is:

```text
1 <- 3
2 <- 2  fixed point
3 <- 1
4 <- 4  fixed point
5 <- 5  fixed point
```

**Required posture:** retire the false derangement claim, disclose fixed points `[2,4,5]`, and do not rerandomize after observing the mapping.

## Reconciliation judgment retained

The reviewer explicitly accepted the main G5/G6 seam:

- G5 was already a five-edge instrument;
- the old pair-3-4 exemption existed only because the old cohort's G2 ceiling was weak there;
- the replacement freeze prohibited importing old empirical pair detectability before the fresh G2 result existed;
- with all five fresh edges detectable, `>=4/5` at both primary ordinals plus `5/5` at least once is the band-structural image of the old `>=3/4` plus `4/4` rule;
- the illustrative independence reference becomes stricter (`0.0107421875` vs `0.03515625`).

That scientific interpretation remains replacement authority unless the second pre-life review rejects the corrected packet.

## Closure work after the HOLD

B1-B5 were addressed without rewriting the five replacement Worlds, genomes, World↔genome mapping, fresh G2 result, inherited treatment schedule or accepted D3 threshold structure.

Key correction artifacts:

```text
artifacts/validation/m2-pr39/replacement-v1/protocol/rg2-authoring-assignment-disclosure-amendment-v1.json
artifacts/validation/m2-pr39/replacement-v1/protocol/rg3-pass-b-treatment-instance-v1.json
artifacts/validation/m2-pr39/replacement-v1/protocol/rg4-cognition-execution-binding-v1.json
artifacts/validation/m2-pr39/replacement-v1/protocol/rg5-g6-closure-amendment-v2.json
artifacts/validation/m2-pr39/replacement-v1/protocol/replacement-execution-binding-v1.json
tools/genesis/genesis-replacement-final-cohort.mjs
tools/genesis/genesis-replacement-gate-g2-closure-verify.mjs
```

Locally verified corrected execution candidate:

```text
6f4dc0f4ff306e03ff43cc89593efc424274b85c
```

Maintainer verification at that exact head:

```text
replacement Gate-G(2) closure verifier: CLEAR B1-B5 — ZERO CALL
replacement final-cohort preflight: CLEAR_PACKET_GATE_G2_HOLD
final-life cognition: NOT AUTHORIZED
703 tests · 703 passed · 0 failed
Repository validation passed.
World seed validation passed.
only untracked path: artifacts/validation/m2-pr39/h/recovery-v1/
```

## Important correction to a nonblocking hardening

The first review suggested extending the existing four-token Pass-B genome-copy boundary from `rememberedContent` to `uncertainty[*]`. This was **nonblocking**.

During closure work, that hardening was briefly implemented in the shared historical Pass-B admission module. Local tests correctly detected that this changed the exact G4-v2 source/blob and retry-prompt hash that historical H-v2 verification intentionally pins.

The optional hardening was therefore **retracted before second review**. Historical G4-v2 authority is preserved exactly.

Current standing:

```text
historical scanned field: rememberedContent
uncertainty[*] extension: NOT APPLIED
uncertainty leakage surface: explicitly disclosed
```

Canonical note:

```text
artifacts/validation/m2-pr39/replacement-v1/protocol/rg4-pass-b-genome-copy-closure-amendment-v1.json
status: not_applied_preserved_review_note

artifacts/validation/m2-pr39/replacement-v1/protocol/rg4-residual-gate-g2-disclosures-v1.json
```

This keeps the historical evidence reproducible rather than silently changing frozen cognition machinery to pick up a nonblocking improvement.

## Other retained nonblocking disclosures

- Pass A is structurally genome-blind, but free-text World fields are not mechanically proven free from every semantic paraphrase of a genome disposition.
- Later Pass-B calls can see prior memory formation-mode/call metadata; the exposed life-only stratum remains descriptive-only/horizon-confounded.
- Replacement durability claim is process-restart replay of committed invocations only; no host-crash/power-loss fsync guarantee is claimed.
- Historical recovery-core executable technical debt remains outside the replacement runner and does not reopen the recorded recovery HOLD.

## Authorization state

Until a **second blocking Gate-G(2) review returns CLEAR**:

```text
replacement Pass-A cognition: forbidden
replacement Pass-B cognition: forbidden
replacement Pass-C cognition: forbidden
replacement publishBirth(): forbidden
replacement G2 rerun: forbidden
replacement genome rewrite: forbidden
replacement assignment rerandomization: forbidden
final-life cognition authorized: false
```

The five replacement Threads remain unborn in the #39 sense.

## Next gate

Second hostile review request:

```text
docs/validation/m2-pr39-gate-g2-review-request-round2.md
```

A second Gate-G(2) `CLEAR` may authorize exactly one replacement final-life attempt. It does not itself grant #39 scientific success, Whole-Person standing or causal standing.