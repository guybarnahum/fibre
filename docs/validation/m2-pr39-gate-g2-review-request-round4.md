---
id: m2-pr39-gate-g2-review-request-round4
status: ready_for_external_review
last-reviewed: 2026-08-22
canonical: false
---

# Milestone #39 — fourth blocking Gate-G(2) review request

## Requested verdict

Return exactly one top-level verdict:

```text
CLEAR
HOLD
REDESIGN
```

This is the **fourth and deliberately narrow pre-life Gate-G(2) review**.

Rounds 1–3 all returned `HOLD`, not `REDESIGN`. Round 3 accepted C1 as closed on the authorized operator path and found one remaining blocker, C2: an imported `genesis-replacement-final-cohort-core.mjs` could bypass inherited-authority verification even though direct core CLI execution was disabled.

The C2 correction moves inherited-authority verification into a shared module and makes the core's own exported preflight invoke that same verifier before it can report Gate-G(2) authorization.

This review authorizes **zero provider calls** and zero replacement life generation.

## Exact locally verified execution candidate

```text
a8815064d5c8ac292d4cce41d41f94042c22b653
```

Any commits after this candidate must be documentation/review-state only. Verify that before issuing `CLEAR`.

Maintainer verification at the exact candidate:

```text
core direct CLI --preflight
  refused as import-only
  exit 2

npm run genesis:replacement-gate-g2-closure
  PR39 REPLACEMENT GATE-G(2) HOLD CLOSURE: CLEAR B1-B5+C1+C2 — ZERO CALL
  C1 inherited G3/G4/G5/G6/G4-v3 authority bound at executable preflight: yes
  C2 core import path invokes the same inherited-authority gate: yes
  wrapper blob: 5b67674e36b43766f416e0a1aab9a0b8e41dbc36
  core blob: a8acd1b1dd47ef427397056cee2958cea7ae0b7c
  final-life cognition: NOT AUTHORIZED

npm run genesis:replacement-preflight
  CLEAR_PACKET_GATE_G2_HOLD
  execution binding digest: sha256:67e4346bcfbad6e1b701b093a800b7694f589522b5ff58a3c06d91f1d9bd3a17
  inherited authority: CLEAR_INHERITED_AUTHORITY_BOUND — ZERO CALL
  Gate-G(2): MISSING_GATE_G2_CLEAR_WITNESS
  output root: absent

npm test
  705 tests · 705 passed · 0 failed

npm run validate
  Repository validation passed.
  World seed validation passed.
```

The maintainer also tried a `node --input-type=module -e` import probe. It failed before reaching the replacement core because inherited `genesis-g3-treatment-freeze.mjs` evaluates `pathToFileURL(process.argv[1])`, and `process.argv[1]` is undefined under `node -e`. That is a harness incompatibility, not a C2 result. Use a **real scratch `.mjs` file** for import-path attacks, matching round 3.

## Round-3 accepted authority

Do not reopen settled science absent contradictory evidence:

- C1 operator-path inherited-authority binding: closed.
- 18/18 inherited-authority mutations refused before provider calls.
- G4-v3 explicit 2/2/5 Pass-A reliability: closed.
- five-edge G5/G6 reconciliation and pair-3-4 retirement: closed.
- aligned genome-authoring disclosure/non-comparability: closed.
- mapping fixed points `[2,4,5]` disclosed; no rerandomization.
- strict/satisfiable `reviewedHead` semantics: closed.
- direct core CLI refusal: closed.
- no scientific/model-visible invariant changed.

The only blocking question is whether **any imported core path can still reach authorization or generation without the same inherited-authority gate**.

## C2 correction to inspect

### Shared authority module

```text
tools/genesis/genesis-replacement-inherited-authority.mjs
```

It now owns `verifyReplacementInheritedAuthorityBinding()` and verifies the same inherited G3/G4/G4-v3/G5/G6, helper-source, carve-out, residual integrity and post-CLEAR authority previously enforced by the wrapper.

It pins both execution files:

```text
wrapper blob: 5b67674e36b43766f416e0a1aab9a0b8e41dbc36
core blob:    a8acd1b1dd47ef427397056cee2958cea7ae0b7c
```

### Wrapper

```text
tools/genesis/genesis-replacement-final-cohort.mjs
```

The wrapper imports the shared verifier and uses it for operator-facing preflight/run.

### Core

```text
tools/genesis/genesis-replacement-final-cohort-core.mjs
```

The exported core preflight now calls `verifyReplacementInheritedAuthorityBinding()` before performing its packet/Gate-G(2) authorization logic. `runReplacementFinalCohort()` still begins by calling that core preflight with `requireGateClear: true`, so import-based generation must traverse the shared inherited-authority gate.

Direct CLI execution remains refused with exit 2.

## Required hostile tests

Make **zero provider calls**. Use a scratch clone or restore every mutation before finishing.

### R4-1 — baseline imported-core preflight

Create a real scratch `.mjs` importer on disk and import:

```js
import {
  verifyReplacementFinalCohortPreflight
} from "<repo>/tools/genesis/genesis-replacement-final-cohort-core.mjs";
```

With no Gate-G(2) witness, require:

```text
inheritedAuthority.status = CLEAR_INHERITED_AUTHORITY_BOUND
executionAuthorized = false
gateStatus = MISSING_GATE_G2_CLEAR_WITNESS
wrapperBlobSha = 5b67674e36b43766f416e0a1aab9a0b8e41dbc36
coreBlobSha = a8acd1b1dd47ef427397056cee2958cea7ae0b7c
```

### R4-2 — reproduce the exact round-3 bypass attack

1. Fabricate a syntactically valid Gate-G(2) CLEAR witness using a real strict-ancestor `reviewedHead` and the current execution binding digest.
2. Mutate `g4-cognition-freeze-v1.json` model ID exactly as in round 3.
3. Run the operator wrapper preflight.
4. From a real scratch `.mjs` importer, call the **core exported preflight**.

Both must refuse nonzero / throw on inherited-authority drift before any provider call. The imported core must **not** return `executionAuthorized: true` and must not expose the substituted model as authorized runtime.

### R4-3 — imported core generation function under drift

Under the same fabricated CLEAR witness + mutated inherited authority, import and call:

```js
runReplacementFinalCohort()
```

It must reject at inherited-authority verification before model-adapter construction/provider invocation. Verify zero provider calls and zero output-root creation.

This is safe because the authority mutation must force failure before generation. Restore the mutation and fabricated witness afterward.

### R4-4 — shared authority module tamper coverage

Attack at least these:

- wrapper blob drift;
- core blob drift;
- one G4-v1 field;
- one G3 production/analysis field;
- one G4-v3 authority field;
- G5 or G6 authority;
- one pair-3-4 retirement string;
- residual uncertainty-scan obligation.

Require both wrapper and imported core preflights to reject.

### R4-5 — alternate importer search

Search the repository for imports/exports of:

```text
genesis-replacement-final-cohort-core.mjs
runReplacementFinalCohort
verifyReplacementFinalCohortPreflight
```

Determine whether any execution-capable repository path can reach the core generation function without the shared authority module. Text-reading tests/verifiers do not count as execution paths.

### R4-6 — candidate-head / science immutability

Verify that the delta from the exact candidate `a8815064...` to review HEAD is documentation/review-state only.

Also verify no change since round 3 to:

- replacement Worlds;
- source/child genomes and synthetic parent genomes;
- World↔genome assignment;
- frozen G2 results;
- G3 treatment schedule `L L T L L T` at `4/5/6/7/8/10`;
- provider/model `openai/gpt-5.1-2025-11-13`;
- model-visible prompts/schemas;
- replacement D3 threshold `both >=4/5; at least one 5/5`;
- H/H-v2 evidence.

### R4-7 — no-life state

Confirm:

```text
replacement childhood episodes: 0
replacement memories:           0
replacement meanings:           0
published replacement lives:    0
replacement output root:        absent
final-life cognition authorized: false
provider calls by review:        0
```

## CLEAR standard

Return `CLEAR` only if:

1. C2 is closed at the **generation function boundary**, not merely wrapper convention;
2. the exact round-3 import bypass now fails before provider calls;
3. imported `runReplacementFinalCohort()` also fails under inherited-authority drift before output/model execution;
4. no alternate repository execution path bypasses the shared gate;
5. all scientific/model-visible invariants remain unchanged;
6. the five Threads remain pre-life/unborn;
7. no new blocking integrity defect is found.

A `CLEAR` authorizes only creation of a bound Gate-G(2) CLEAR witness followed by **one** replacement final-life attempt. It does not establish #39 success, Whole-Person standing, causal standing, or permission to quality-regenerate.

## HOLD / REDESIGN

Return `HOLD` for another correctable pre-life enforcement/integrity defect.

Return `REDESIGN` only for a defect that invalidates the replacement scientific design or requires changing consumed scientific/model-visible inputs, rerunning G2, rewriting genomes/assignment, changing thresholds, or adapting to generated-life outcomes.

## Response structure

After the top-level verdict, report:

1. C2 generation-boundary judgment.
2. Exact round-3 bypass reproduction result.
3. Imported generation-function result.
4. Mutation/tamper results.
5. Alternate execution-path search.
6. Candidate-head/scientific-invariant check.
7. Freshness/no-life-generation check.
8. Nonblocking findings/disclosures.
9. What the verdict authorizes.

Make zero provider calls and do not use semantic content from the three completed H-v2 lives to justify replacement-protocol changes.
