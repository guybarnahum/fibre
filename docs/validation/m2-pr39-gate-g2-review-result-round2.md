---
id: m2-pr39-gate-g2-review-result-round2
status: hold_inherited_authority_binding
last-reviewed: 2026-08-22
canonical: false
---

# Milestone #39 — second blocking Gate-G(2) review result

## Verdict

```text
HOLD
```

The second hostile Gate-G(2) review again found **no REDESIGN trigger**. It independently verified that the round-1 scientific conclusions remain intact, that B2-B5 are genuinely closed, and that the five replacement Threads remain pre-life/unborn.

The sole blocking finding is **C1: inherited execution authority is declared but not fully bound by the authorized replacement preflight**. The runner consumed several frozen G3/G4/G5/G6 inputs by path without calling the existing freeze verifiers or otherwise pinning every consumed authority at execution time.

No replacement provider call, childhood episode, memory, meaning or birth is authorized by this HOLD.

Reviewed head:

```text
e6ab8c0b8636c1d8d17741e6cba7233b067d6304
```

Locally verified execution candidate entering that review:

```text
6f4dc0f4ff306e03ff43cc89593efc424274b85c
```

The reviewer independently verified that `6f4dc0f..e6ab8c0` changed exactly three Markdown files and that the first closure had not changed implementation source or consumed replacement evidence.

## Settled findings

### B2 — G4-v3 call-site selection: CLOSED

The replacement Pass-A call site explicitly passes `GENESIS_PASS_A_RELIABILITY_POLICY_V3`. Effective bounds remain one initial version, up to two form repairs, up to two referential retries, hard total five generated versions. No silent legacy fallback is reachable on the replacement call path.

### B3 — five-edge replacement G6 semantics: CLOSED

Replacement D3 uses all five measured fresh-G2-detectable cycle edges. Both primary ordinals must be at least `4/5`, at least one must be `5/5`, and null/error/tie/unanalyzable measured edges are `not_correct`. The old pair-3-4 nonblocking carve-out has no replacement CLEAR path.

### B4 — aligned genome-authoring disclosure: CLOSED

The replacement six-locus material is explicitly disclosed as using a more consistently aligned per-ordinal dimension design than the old cohort. Fresh G2 remains valid for replacement edge eligibility, but its numerical scores are not directly comparable to the old cohort.

### B5 — assignment description: CLOSED

The deterministic mapping remains unchanged and is no longer called a derangement. Fixed points `[2,4,5]` are explicit. No rerandomization is allowed after observing the mapping.

## Blocking finding C1 — inherited authority was not bound at executable preflight

At the reviewed head, the replacement preflight directly read inherited files such as:

```text
artifacts/validation/m2-pr39/g/protocol/g3-pass-b-treatment-freeze-v1.json
artifacts/validation/m2-pr39/g/protocol/g3-pass-b-treatment-freeze-v2.json
artifacts/validation/m2-pr39/g/protocol/g4-cognition-freeze-v1.json
artifacts/validation/m2-pr39/g/protocol/g4-cognition-freeze-v2.json
artifacts/validation/m2-pr39/g/protocol/g4-pass-a-reliability-amendment-v3.json
artifacts/validation/m2-pr39/g/protocol/g4-v3-reliability-implementation-witness-v1.json
artifacts/validation/m2-pr39/g/protocol/g5-diagnostics-freeze-v1.json
artifacts/validation/m2-pr39/g/protocol/g6-verdict-freeze-v1.json
```

and imported `buildHPassBInput` / `buildNeutralHThreadSeed` from:

```text
tools/genesis/genesis-h-final-cohort.mjs
```

without making all of those frozen authorities load-bearing in the replacement preflight.

The reviewer demonstrated the defect by mutating the local G4-v1 model ID, structures-per-window and birth date in a scratch clone. The old replacement preflight still exited zero and reported the mutated model. The separate closure verifier did reject the mutation, proving that the necessary verification machinery already existed but was not on the authorized execution path.

This is an **enforcement gap, not contamination**. Current files and digests were reported correct.

## Required C1 correction

The smallest non-adaptive correction is zero-call and changes no model-visible scientific input:

1. Put the existing G3/G4/G4-v3/G5/G6 freeze verifiers on the replacement executable preflight path.
2. Cross-check the replacement G4 binding against the actual G4 base fields consumed at generation time, including provider/model/sampling, episode/window structure and entry chronology.
3. Verify the actual G3 production and analysis files against their declared digests.
4. Bind the inherited Pass-B input helper source used by the replacement runner.
5. Expand post-CLEAR drift detection to cover inherited `g/protocol` and `tools/genesis`, not only replacement-local protocol files.

No World, genome, assignment, treatment schedule, threshold, provider/model, prompt, generated life or observed final-life outcome may change as part of this correction.

## Nonblocking findings retained

- **Pass-B `uncertainty[*]` verbatim genome-copy coverage remains nonblocking.** The reviewer agreed that preserving the frozen historical Pass-B admission surface is correct. The appropriate remedy for this experiment is a read-only post-generation scan before diagnostics, not a generation-time fork or rewrite.
- **Pass-A semantic blindness remains procedural/provenance-based.** It cannot mechanically prove that all free-text World language is paraphrase-free.
- **Prior Pass-B formation/assignment labels remain model-visible.** This is disclosed rather than changed after the first H attempt.
- **`reviewedHead` should be hardened** so the future CLEAR witness cannot choose a vacuous drift baseline.
- **Publication is atomic per Thread, not across the five-Thread cohort.** All five generation bundles complete first, but a publication-phase failure can leave already-published Threads before terminal HOLD.
- **Replacement diagnostic execution is still later work.** A future G5/G6 runner must bind the replacement-effective `rg5-g6-closure-amendment-v2.json`, not silently fall back to old four-edge G6 semantics.
- Host-crash/power-loss fsync durability remains explicitly unclaimed.

## Freshness / no-life state

The reviewer independently reported that every named consumed replacement invariant remained byte-unchanged from the prior reviewed boundary and that no correction adapted to a final-life outcome.

Replacement state remains:

```text
childhood episodes generated: 0
memories generated:           0
meanings generated:            0
published replacement lives:  0
final-life cognition authorized: false
```

No semantic content from the three completed H-v2 lives was used to justify the review.

## Authorization state

While this HOLD stands:

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

The C1 correction may proceed because it is pre-life, zero-call authority binding. After the corrected executable packet is locally green, request a **third blocking Gate-G(2) review**. A future CLEAR would authorize exactly one replacement final-life attempt and would not itself establish #39 scientific success, Whole-Person standing or causal standing.
