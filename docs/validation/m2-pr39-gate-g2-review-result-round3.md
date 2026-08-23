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

The reviewer verified that the authorized `genesis-replacement-final-cohort.mjs --preflight` makes all twelve inherited authorities load-bearing before any provider call, including G3 production/analysis, G4-v1/v2/v3, G5/G6, consumed G4 runtime/history fields, the inherited Pass-B helper blob, exact pair-3-4 retirement semantics, residual `uncertainty[*]` scan obligation, generation-core path/blob and post-CLEAR drift boundary.

An 18-case hostile mutation battery refused all 18 mutations nonzero before provider calls, including under a fabricated CLEAR witness.

### Gate witness semantics: CLOSED

Future `reviewedHead` handling is strict and satisfiable: current HEAD, bogus commits and non-ancestors are rejected; a real strict ancestor with docs-only drift can authorize after a proper CLEAR witness is committed as a descendant.

### Direct core CLI: CLOSED

Direct execution of `genesis-replacement-final-cohort-core.mjs` refuses with exit 2. The core is import-only.

### Scientific invariants: unchanged

No replacement World, genome, synthetic parent, World↔genome assignment, G2 result, G3 schedule, provider/model, prompt/schema or five-edge D3 threshold changed. The five replacement Threads remained pre-life/unborn and the output root remained absent.

## Blocking finding C2 — imported core generation bypass

At the reviewed head, the core still exported `verifyReplacementFinalCohortPreflight` and `runReplacementFinalCohort`, but its local preflight did not invoke `verifyReplacementInheritedAuthorityBinding()`.

The reviewer demonstrated the bypass without provider calls: with a fabricated CLEAR witness and mutated G4-v1 model ID, the wrapper refused while a scratch importer calling the core preflight returned authorization under the mutated model.

This was an **execution-reachability enforcement gap**, not scientific contamination.

## Required C2 correction

The prescribed minimal fix was:

1. extract `verifyReplacementInheritedAuthorityBinding` into a dependency with no wrapper/core dependency;
2. invoke that shared verifier from the core's own exported preflight/run path as well as the operator wrapper;
3. re-pin the resulting core blob;
4. re-run zero-call closure/preflight, full tests and the hostile import/mutation battery.

No scientific or model-visible input may change.

## C2 correction implemented and locally verified

The correction is now implemented as:

```text
tools/genesis/genesis-replacement-inherited-authority.mjs
  owns the single inherited-authority verifier

tools/genesis/genesis-replacement-final-cohort.mjs
  operator wrapper calls the shared verifier

tools/genesis/genesis-replacement-final-cohort-core.mjs
  exported core preflight calls the same shared verifier before packet/gate authorization
```

The core changed by only three added lines relative to the round-3 reviewed head: one import, one authority-verifier call at preflight entry, and the resulting `inheritedAuthority` witness in the returned preflight object. Generation logic and model-visible inputs are otherwise unchanged.

Current pins:

```text
wrapper blob: 5b67674e36b43766f416e0a1aab9a0b8e41dbc36
core blob:    a8acd1b1dd47ef427397056cee2958cea7ae0b7c
```

The shared authority module pins both wrapper and core blobs. Closure tooling reports C2 separately, and the test suite directly imports the core preflight and requires the same inherited-authority result.

Exact locally verified C2 candidate:

```text
a8815064d5c8ac292d4cce41d41f94042c22b653
```

Maintainer verification at that candidate:

```text
node tools/genesis/genesis-replacement-final-cohort-core.mjs --preflight
  refused as import-only
  exit 2

npm run genesis:replacement-gate-g2-closure
  CLEAR B1-B5+C1+C2 — ZERO CALL
  C1 inherited authority bound: yes
  C2 core import path invokes same inherited-authority gate: yes
  wrapper blob 5b67674e36b43766f416e0a1aab9a0b8e41dbc36
  core blob a8acd1b1dd47ef427397056cee2958cea7ae0b7c
  final-life cognition NOT AUTHORIZED

npm run genesis:replacement-preflight
  CLEAR_PACKET_GATE_G2_HOLD
  execution binding digest sha256:67e4346bcfbad6e1b701b093a800b7694f589522b5ff58a3c06d91f1d9bd3a17
  inherited authority CLEAR_INHERITED_AUTHORITY_BOUND — ZERO CALL
  Gate-G(2) MISSING_GATE_G2_CLEAR_WITNESS
  output root absent

npm test
  705/705 passed

npm run validate
  repository validation passed
  world seed validation passed

git status --short
  ?? artifacts/validation/m2-pr39/h/recovery-v1/
```

### Note on the failed ad-hoc `node -e` import probe

An additional maintainer smoke command using `node --input-type=module -e` failed before reaching the replacement core because the inherited `genesis-g3-treatment-freeze.mjs` CLI guard evaluates `pathToFileURL(process.argv[1])` and `process.argv[1]` is undefined under `node -e`.

This is a harness incompatibility, not evidence against C2. The repository test suite directly imports `genesis-replacement-final-cohort-core.mjs` from a normal module and calls its exported preflight; that test passed in the 705/705 run. Round 4 must use a real scratch `.mjs` importer, matching the round-3 attack shape, rather than `node -e`. Do not modify the inherited G3 verifier merely to accommodate this ad-hoc harness.

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

The next action is a **fourth, narrow blocking Gate-G(2) review** against exact candidate `a8815064d5c8ac292d4cce41d41f94042c22b653`. The reviewer should reproduce the round-3 import bypass using a real scratch module, a fabricated CLEAR witness and a mutated inherited authority, and verify that both wrapper and imported core now refuse before any provider call.
