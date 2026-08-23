---
id: m2-pr39-gate-g2-review-result-round3
status: hold_core_import_authority_bypass
last-reviewed: 2026-08-22
canonical: false
---

# Milestone #39 — third blocking Gate-G(2) review result

## Verdict

```text
HOLD
```

The third hostile review found **no REDESIGN trigger** and explicitly accepted C1 as closed on the authorized operator path. The sole blocker was a new execution-reachability seam created by the wrapper/core split: the import-only core still exported `runReplacementFinalCohort()` and its own preflight did not invoke the inherited-authority gate.

No replacement provider call, childhood episode, memory, meaning or birth was authorized by this HOLD.

Reviewed head:

```text
2d1d06ffd3289289b2689f49fb0f06c69c18227d
```

Exact locally verified execution candidate entering the review:

```text
6b6a2f8e0292193cf0db9f30ea0a1528f233dad2
```

The reviewer independently verified that the commits after that candidate were documentation-only.

## What round 3 accepted

### C1 — executable inherited-authority binding: CLOSED

The reviewer verified that the authorized `genesis-replacement-final-cohort.mjs --preflight` makes all twelve inherited authorities load-bearing before any provider call, including:

- G3 production and analysis freezes;
- G4-v1 base freeze;
- G4-v2 entry amendment;
- G4-v3 amendment and live prompt hashes;
- G5 diagnostics freeze;
- G6 verdict freeze;
- actual G4 provider/model/sampling/history fields consumed by generation;
- inherited Pass-B input helper source blob;
- exact pair-3-4 carve-out retirement strings;
- residual `uncertainty[*]` post-generation scan obligation;
- generation-core path/blob;
- post-CLEAR drift boundary.

The reviewer ran an 18-case hostile mutation battery against the authorized preflight. All 18 mutations refused nonzero before any provider call, including mutations to G3, G4, G4-v3, G5, G6, pinned helper/core blobs, pair-3-4 retirement text and the residual uncertainty-scan obligation.

### Gate witness semantics: CLOSED

The reviewer verified that future `reviewedHead` handling is strict and satisfiable:

- current HEAD is rejected as a vacuous baseline;
- bogus commit is rejected;
- non-ancestor commit is rejected;
- a real strict ancestor with docs-only drift can authorize once a proper CLEAR witness is committed as a descendant.

### Direct core CLI: CLOSED

Direct execution of `genesis-replacement-final-cohort-core.mjs` with no args, `--preflight` or `--help` refuses with exit 2. The core is import-only.

### Scientific invariants: unchanged

The reviewer again verified no change to replacement Worlds, genomes, synthetic parents, World↔genome assignment, G2 results, G3 schedule, provider/model, prompts/schemas or five-edge D3 thresholds. The five replacement Threads remained pre-life/unborn and the output root remained absent.

## Blocking finding C2 — imported core generation bypass

At the reviewed head, the core still exported:

```text
verifyReplacementFinalCohortPreflight
runReplacementFinalCohort
```

The core-local preflight checked the Gate-G(2) witness and replacement packet but did **not** invoke `verifyReplacementInheritedAuthorityBinding()`.

The reviewer demonstrated the bypass without making a provider call: with a fabricated CLEAR witness and a mutated G4-v1 model ID, the operator wrapper correctly refused with `G4-v1 frozen protocol digest drift`, while a scratch importer calling the core preflight returned:

```text
executionAuthorized: true
runtime.modelId: gpt-4o-mini-2024-07-18
inheritedAuthority checked: false
```

That meant a future importer could call the core generation function under drift even though no existing repository module did so.

This is an **execution-reachability enforcement gap**, not scientific contamination.

## Required C2 correction

The review prescribed the smallest non-adaptive fix:

1. Extract `verifyReplacementInheritedAuthorityBinding` into a module with no dependency on the wrapper or core.
2. Invoke that shared verifier from the core's own exported preflight/run path as well as the operator wrapper.
3. Re-pin the resulting core blob.
4. Re-run zero-call closure/preflight, full tests and the hostile mutation/import battery.

No World, genome, assignment, treatment schedule, threshold, provider/model, prompt/schema, generated life or observed outcome may change.

## Correction implemented after the HOLD — awaiting local verification

The C2 correction has been implemented without changing scientific/model-visible input:

```text
tools/genesis/genesis-replacement-inherited-authority.mjs
  owns the single shared inherited-authority verifier

tools/genesis/genesis-replacement-final-cohort.mjs
  operator wrapper calls the shared verifier

tools/genesis/genesis-replacement-final-cohort-core.mjs
  exported core preflight now calls the same shared verifier before packet/gate authorization
```

The core changed by only three added lines relative to the reviewed head: one import, one verifier call at preflight entry, and the resulting `inheritedAuthority` witness in the returned preflight object. Generation logic and model-visible inputs are otherwise unchanged.

Current re-pins:

```text
wrapper blob: 5b67674e36b43766f416e0a1aab9a0b8e41dbc36
core blob:    a8acd1b1dd47ef427397056cee2958cea7ae0b7c
```

The shared authority module now pins both the wrapper and core blobs, taking the round-3 nonblocking wrapper-pin hardening as well.

Closure tooling now reports C2 separately and tests directly import the core preflight to require the same inherited-authority result.

This correction is **not yet maintainer-verified locally**. Gate-G(2) therefore remains HOLD and no round-4 review request should be created until the exact correction head passes zero-call checks, full tests and repository validation.

## Nonblocking findings retained

- The core-local G5/G6 convenience check still has a weaker list-length assertion, but the shared authority gate checks the exact four pair-3-4 retirement strings before either wrapper or core preflight can authorize.
- The generation-time `uncertainty[*]` copy hardening remains intentionally not applied; the bound read-only post-generation/pre-diagnostic scan remains required.
- Publication remains atomic per Thread, not cohort-atomic, and is explicitly disclosed.
- Durability remains process-restart replay only; no host-crash/power-loss fsync guarantee is claimed.
- The replacement G5/G6 diagnostic runner remains future work and must bind replacement-effective G6 authority.

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

After local green, request a short fourth blocking Gate-G(2) review focused only on the imported-core path and shared authority module. A future CLEAR would authorize exactly one replacement final-life attempt and nothing stronger.
