---
id: m2-pr39-gate-g2-review-request-round3
status: ready_for_external_review
last-reviewed: 2026-08-22
canonical: false
---

# Milestone #39 — third blocking Gate-G(2) review request

## Requested verdict

Return exactly one top-level verdict:

```text
CLEAR
HOLD
REDESIGN
```

This is the **third blocking pre-life Gate-G(2) review**.

Rounds 1 and 2 both returned `HOLD`, not `REDESIGN`. Round 1 accepted the replacement science and identified B1-B5 closure defects. Round 2 independently accepted B2-B5 as closed and found one remaining blocker, C1: inherited G3/G4/G5/G6 authority was not load-bearing on the authorized executable preflight path.

This request is deliberately narrow: **is C1 now genuinely closed at the executable boundary, with no alternate execution path that can bypass the reviewed authority?**

This review authorizes **zero provider calls** and zero replacement life generation. Only a recorded Gate-G(2) `CLEAR` witness after this review may authorize exactly one replacement final-life attempt.

Review actual repository code and artifacts, not this summary alone.

## Exact locally verified execution candidate

The maintainer locally verified this exact execution candidate:

```text
6b6a2f8e0292193cf0db9f30ea0a1528f233dad2
```

Any commits after that candidate must be documentation/review-state only. Verify this yourself before issuing `CLEAR`.

Maintainer verification at the exact candidate:

```text
node --disable-warning=ExperimentalWarning \
  tools/genesis/genesis-replacement-final-cohort-core.mjs --preflight

  genesis-replacement-final-cohort-core.mjs is import-only; use tools/genesis/genesis-replacement-final-cohort.mjs
  exit 2

npm run genesis:replacement-gate-g2-closure

  PR39 REPLACEMENT GATE-G(2) HOLD CLOSURE: CLEAR B1-B5+C1 — ZERO CALL
  C1 inherited G3/G4/G5/G6/G4-v3 authority bound at executable preflight: yes
  B2 G4-v3 explicit at replacement Pass-A call site: yes
  B3 five-edge CLEAR rule + null/error/tie closure: yes
  B4 aligned genome-authoring design/non-comparability disclosed: yes
  B5 mapping described without derangement claim; fixed points: 2,4,5
  historical G4-v2 Pass-B admission source/hash: preserved exactly
  Pass-B input helper blob: 0bca252aa20e3af375ad977fc3e2fd22dc76d9f1
  final-life cognition: NOT AUTHORIZED
  verifier made zero provider calls

npm run genesis:replacement-preflight

  PR39 REPLACEMENT FINAL COHORT PREFLIGHT: CLEAR_PACKET_GATE_G2_HOLD
  execution binding digest: sha256:dcf2c3f7e173ef51d61404c184521f5ec65d7c15f8cc99dea20787d15ba04c58
  inherited authority: CLEAR_INHERITED_AUTHORITY_BOUND — ZERO CALL
  generation core blob: d64436483661339d6a7b1b353d78cdab7ce5e423
  G3 production: sha256:3d4885d4c8f717622e466e65e7869526193eccd611967609f7809dfb4b1068a6
  G3 analysis: sha256:aef6eea69cf55cc60e730a3529fd0e7d090261cd6535b256df6cbd3734174fae
  G4 base: sha256:1a41d68aa0bf8c689c84843771cfce07ca0afa44a9b7093ad944f058a93c368d
  G4-v3 prompt: sha256:dbf454d80c0557bd983bcbf6969e09cea576b54fe1afd06d293111106e231ee0
  G5: sha256:4520357cab14bcdc883c6b3966401c98d17a1424e47f26e8c04002728d799ed5
  G6: sha256:1cfaa3148599236526d5495b14cc0ef2468d5488aa37be38b3fec9c49e21afcc
  Pass-B input helper blob: 0bca252aa20e3af375ad977fc3e2fd22dc76d9f1
  post-generation uncertainty scan required: true
  Gate-G(2): MISSING_GATE_G2_CLEAR_WITNESS
  final-life cognition: NOT AUTHORIZED
  runtime: openai/gpt-5.1-2025-11-13
  output root: artifacts/validation/m2-pr39/replacement-v1/final-cohort-v1 [absent]
  preflight made zero provider calls and wrote no replacement life artifacts

npm test
  704 tests · 704 passed · 0 failed

npm run validate
  Repository validation passed.
  World seed validation passed.

git status --short
  ?? artifacts/validation/m2-pr39/h/recovery-v1/
```

The sole untracked path is preserved H-v2 recovery evidence. It is not replacement material.

## Prior review authority

Round-2 result:

```text
docs/validation/m2-pr39-gate-g2-review-result-round2.md
```

Round-2 reviewed head:

```text
e6ab8c0b8636c1d8d17741e6cba7233b067d6304
```

Round 2 explicitly judged:

- B2 G4-v3 selection: CLOSED;
- B3 five-edge G6 semantics: CLOSED;
- B4 authoring-template disclosure: CLOSED;
- B5 mapping disclosure: CLOSED;
- `uncertainty[*]` generation-time hardening: nonblocking and correctly not applied;
- sole blocker: C1 executable inherited-authority binding.

Do not reopen settled scientific choices without a new material scientific defect. Do attack whether the C1 correction actually enforces them.

## What changed for C1

The authorized entrypoint remains:

```text
tools/genesis/genesis-replacement-final-cohort.mjs
```

The generation implementation is separated into:

```text
tools/genesis/genesis-replacement-final-cohort-core.mjs
```

The core is **import-only**. Direct CLI execution must exit nonzero and must not run preflight or generation. Its exact pinned Git blob at the candidate is:

```text
d64436483661339d6a7b1b353d78cdab7ce5e423
```

The outer authorized entrypoint must, before delegating, make these inherited authorities load-bearing:

1. G3 production freeze and G3 analysis freeze, by declared digest.
2. G4-v1 base freeze through the existing G4 verifier.
3. G4-v2 entry amendment through the existing G3/G4 review verifier.
4. G4-v3 reliability amendment and live prompt hashes through the existing reliability verifier/witness.
5. G5 diagnostics freeze.
6. G6 verdict freeze.
7. Actual G4 runtime/history fields consumed by generation, cross-checked against the replacement G4 binding.
8. The inherited Pass-B input helper source in `tools/genesis/genesis-h-final-cohort.mjs`, exact blob:

```text
0bca252aa20e3af375ad977fc3e2fd22dc76d9f1
```

9. Exact replacement pair-3-4 carve-out retirement content.
10. The residual `uncertainty[*]` read-only post-generation/pre-diagnostic scan obligation.
11. The exact generation-core path/blob.
12. The future post-CLEAR source/protocol drift boundary.

## Mutation tests to perform

Please perform scratch-clone/read-only hostile mutations without provider calls. At minimum, verify that the **authorized** `--preflight` fails nonzero if you change each of these independently and restore afterward:

- G4-v1 `commonRuntime.modelId`;
- G4-v1 sampling/runtime field such as temperature or reasoning effort;
- G4-v1 `eventStructurePool.structuresPerWindow`;
- G4-v1 entry `bornAt`, `ageAtEntry` or `chronologyEndsAt`;
- G3 production freeze content;
- G3 analysis freeze content;
- G4-v3 reliability protocol or live prompt/witness hash authority;
- G5 freeze content;
- G6 freeze content;
- `tools/genesis/genesis-h-final-cohort.mjs` in a way that changes its Git blob;
- `tools/genesis/genesis-replacement-final-cohort-core.mjs` in a way that changes its Git blob;
- one of the required pair-3-4 retirement strings;
- the required residual uncertainty-scan obligation.

The test passes only if the same executable path an operator would later use refuses before provider invocation.

## Alternate-path / bypass attack

Please explicitly search for a path that could execute replacement final-life cognition without first running the outer inherited-authority gate.

Attack at least:

- direct execution of `genesis-replacement-final-cohort-core.mjs`;
- importing/exporting `runReplacementFinalCohort` from the core from another CLI;
- another npm script or tool calling the core directly;
- environment-variable, CLI or alternate binding-path override;
- an old H/H-v2 runner being usable with replacement IDs/material;
- process restart/resume bypassing the outer check;
- a future CLEAR witness making the core executable by itself;
- any post-CLEAR code/protocol drift not covered by the drift boundary.

A mere convention that operators should use the wrapper is not sufficient. If an alternate runnable repository surface bypasses the gate, return `HOLD` and name the smallest fix.

## Future CLEAR witness / drift attack

The future witness path is frozen by the replacement execution binding. Verify that a future `CLEAR` cannot authorize a vacuous drift baseline:

- `reviewedHead` must resolve to a real Git commit;
- it must strictly predate the witness/current executing HEAD;
- it must be an ancestor of current HEAD;
- changes after the reviewed head in relevant service source, all `tools/genesis`, inherited `g/protocol`, or replacement protocol must block execution except the bound gate witness itself.

If the current design would require an impossible or self-referential witness commit sequence, return `HOLD` and explain it precisely.

## Scientific invariants that must remain unchanged

Verify that the C1 correction and direct-core hardening did **not** rewrite or regenerate:

- any replacement World;
- any replacement genome or synthetic parent genome;
- World↔genome assignment;
- fresh G2 results;
- G3 treatment positions (`L L T L L T`, horizons `4/5/6/7/8/10`);
- provider/model used for final-life cognition;
- model-visible prompts or schemas;
- accepted five-edge D3 threshold;
- H-v2/recovery semantic content into replacement evidence.

No replacement final-life outcome exists to adapt to.

## Residual obligations that remain nonblocking unless you find a new reason

### Pass-B `uncertainty[*]`

Generation-time hardening is intentionally not applied because it would fork/change frozen historical Pass-B authority. Replacement binding instead requires a read-only post-generation, pre-diagnostic scan using the existing `findVerbatimGenomeNgram` authority. A confirmed leak invalidates the affected inference and cannot trigger regeneration.

### Publication atomicity

Publication is atomic per Thread, not cohort-atomic. All five generation bundles complete before publication begins, but a publication-phase failure may leave already-published Threads plus terminal HOLD. Do not infer cohort-level transactional atomicity.

### Durability

The claim remains process-restart replay of committed invocation identities only. Host-crash/power-loss fsync durability is not claimed.

### Diagnostics

A later replacement G5/G6 diagnostic runner still needs to bind replacement-effective five-edge authority. That is post-generation diagnostic implementation, not authorization to weaken Gate-G(2).

## Freshness / no-life state

The required state at this review is still:

```text
replacement childhood episodes: 0
replacement memories:           0
replacement meanings:            0
published replacement lives:     0
final-life cognition authorized: false
replacement output root: absent
```

Do not inspect semantic content from the three completed H-v2 lives to justify a replacement-protocol change.

## Required questions

Please answer explicitly:

1. Does `genesis-replacement-final-cohort.mjs --preflight` now verify every inherited authority that the eventual execution actually consumes?
2. Do hostile mutations of those authorities fail on that executable path before any provider call?
3. Is the generation core truly non-runnable as an alternate CLI surface?
4. Is there any other reachable repository path that can call the core generation function without the outer authority gate?
5. Are the G4-v3 call-site semantics and 2/2/5 budgets still unchanged from round 2?
6. Does the outer gate bind the exact Pass-B input helper source, not merely its imported function name?
7. Are G5/G6 and the five-edge pair-3-4 retirement semantics still bound without reopening the old carve-out?
8. Is the future `reviewedHead`/post-CLEAR drift logic both strict enough and operationally satisfiable?
9. Did the direct-core hardening change only execution reachability, not model-visible scientific input?
10. Are all five replacement Threads still genuinely pre-life/unborn?
11. If CLEAR, does the repository authorize exactly one replacement final-life attempt and nothing stronger?

## Verdict meanings

### CLEAR

Use only if C1 is closed on the actual executable path, hostile mutations fail before provider calls, no alternate runnable bypass exists, and the correction remains non-adaptive/pre-life.

`CLEAR` authorizes **exactly one replacement final-life attempt** through the reviewed authorized runner after a bound CLEAR witness is recorded. It does not establish #39 scientific success, Whole-Person standing or causal standing.

### HOLD

Use if a remaining executable authority/bypass ambiguity can be fixed without changing the scientific question. Name the smallest correction and whether it changes model-visible input.

No replacement life cognition may occur while HOLD.

### REDESIGN

Use only for material scientific invalidity, contamination, adaptive pass-shopping, or another defect that cannot be repaired as bounded pre-life enforcement.

## Requested response format

```text
VERDICT: CLEAR | HOLD | REDESIGN

C1 executable-authority judgment
- ...

Mutation-test results
- ...

Alternate-path / bypass judgment
- ...

Post-CLEAR witness/drift judgment
- ...

Scientific-invariant check
- ...

Nonblocking findings / required disclosures
- ...

Freshness / no-life-generation check
- ...

What this verdict authorizes
- ...
```

Cite concrete files/functions for every blocking claim. Make zero provider calls.