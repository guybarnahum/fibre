---
id: m2-pr39-gate-g2-review-result-round4
status: clear_final_life_execution_authorized_once
last-reviewed: 2026-08-23
canonical: false
---

# Milestone #39 — fourth blocking Gate-G(2) review result

## Verdict

```text
CLEAR
```

Gate-G(2) is CLEAR. The fourth hostile review found no remaining blocking pre-life integrity defect and no REDESIGN trigger.

Reviewed head:

```text
ac92bab3711bb2fc8b4980c6173d6262ba3dfcf7
```

Exact locally verified execution candidate:

```text
a8815064d5c8ac292d4cce41d41f94042c22b653
```

Execution binding digest:

```text
sha256:67e4346bcfbad6e1b701b093a800b7694f589522b5ff58a3c06d91f1d9bd3a17
```

Gate-G(2) CLEAR witness commit:

```text
ef70eedd3b4a0c02b1f4be6a97ae36d0f8afa9a2
```

Witness path:

```text
artifacts/validation/m2-pr39/replacement-v1/protocol/gate-g2-clear-v1.json
```

## What round 4 established

### C2 — imported-core authority bypass: CLOSED

Inherited-authority verification is now load-bearing at the generation-function boundary, not only at the operator wrapper.

The shared verifier lives in:

```text
tools/genesis/genesis-replacement-inherited-authority.mjs
```

Both the wrapper and the core's exported preflight use that verifier. `runReplacementFinalCohort()` begins with the gated core preflight before model-adapter construction or output-root creation.

The reviewer reproduced the exact round-3 bypass with a real scratch `.mjs`, a syntactically valid fabricated CLEAR witness and a mutated G4-v1 model ID. The operator wrapper preflight, imported core preflight and imported `runReplacementFinalCohort()` all refused with the same inherited-authority error before any provider call. The provider-fetch tripwire remained at zero and the output root remained absent.

### Tamper coverage

Thirteen of fourteen tested tamper cases rejected identically on wrapper and imported-core routes, including wrapper/core blob drift, G3/G4/G4-v3/G5/G6 authority drift, pair-3-4 retirement drift, residual uncertainty-scan drift, Pass-B helper drift and execution-binding wrapper-pin drift.

The sole nonblocking residual is that the shared authority module is not itself blob-pinned. The reviewer explicitly accepted this as nonblocking; semantic gutting of that module was caught by the wrapper preflight, closure verifier and tests. Do not harden this before the authorized one-shot attempt because changing `tools/genesis` after review would invalidate the reviewed execution boundary.

### Scientific invariants unchanged

Round 4 again verified no change to:

- the five replacement Worlds;
- source/child/synthetic-parent genomes;
- World↔genome assignment `1<-3 2<-2 3<-1 4<-4 5<-5`;
- fresh G2 results `22,24,24,22,23`;
- G3 treatment schedule `L L T L L T` at horizons `4/5/6/7/8/10`;
- provider/model `openai/gpt-5.1-2025-11-13`;
- model-visible prompts/schemas;
- replacement five-edge D3 rule `both >=4/5; at least one 5/5`;
- H/H-v2 evidence.

At review completion the five replacement Threads were still unborn, the replacement output root was absent, and the review made zero provider calls.

## Authorization

Gate-G(2) CLEAR authorizes exactly one replacement final-life generation attempt after a bound CLEAR witness is committed as a descendant of the reviewed head.

That witness is now committed at `ef70eedd3b4a0c02b1f4be6a97ae36d0f8afa9a2` and binds:

```text
reviewedHead: ac92bab3711bb2fc8b4980c6173d6262ba3dfcf7
executionBindingDigest: sha256:67e4346bcfbad6e1b701b093a800b7694f589522b5ff58a3c06d91f1d9bd3a17
replacementFinalLifeGenerationAuthorized: true
wholeCandidateAttemptCap: 1
qualityDrivenRegenerationAuthorized: false
```

The authorized command is:

```text
npm run genesis:replacement-generate
```

No second cohort or second attempt after a terminal result/failure is authorized. No provider/model change, genome rewrite, reassignment, treatment move, threshold change or quality-driven regeneration is authorized.

## Obligations after the attempt

Before any G5/G6 inference:

1. run the bound read-only post-generation `uncertainty[*]` verbatim-genome scan;
2. if a confirmed leak is found, invalidate the affected inference with `REDESIGN_AFFECTED_INFERENCE_NO_REGENERATION` rather than regenerating;
3. treat any publication-phase failure as terminal HOLD, even if some Threads were already published;
4. build the replacement diagnostic runner against `rg5-g6-closure-amendment-v2.json`, not the original G6 authority.

## Standing

This CLEAR is an execution authorization, not #39 scientific success. It confers no Whole-Person or causal standing. The first mechanically valid cohort must be frozen even if weak, boring, stereotyped or disappointing.
