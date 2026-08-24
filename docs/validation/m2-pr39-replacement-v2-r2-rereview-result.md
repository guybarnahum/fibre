---
id: m2-pr39-replacement-v2-r2-rereview-result
status: clear_authority_recorded
verdict: CLEAR
reviewed-head: e6d3bf0ace5d5549d222a768618a5f427497a7bc
execution-candidate: ad7044d57ef6360295d6e26bca4338684eb394d3
binding-commit: a0441bd3d56c789b0a50e9e3377229ab9165d7e0
binding-digest: sha256:2482f9a9e7d83d23ff3bf7241c6bea83feff02c6c3f50c6726e2d479962e6159
clear-witness-commit: bbab28c32f65355a8784707f5a165ffe021528b4
provider-calls-by-review: 0
publication-authorized: false
last-reviewed: 2026-08-23
---

# PR #39 replacement-v2 — corrected R2 hostile execution re-review result

## Verdict

```text
VERDICT: CLEAR
```

The corrected hostile R2 re-review independently verified the execution/binding/docs seams, reproduced the binding digest, 715/715 tests, repository and World-seed validation, all five R1-cleared envelope digests, and the pre-CLEAR zero-call boundary. The review made zero provider/model calls, created zero replacement-v2 life artifacts, made zero commits, and left no review fixture witness behind.

The review standard remained Fibre's adversarial standard: whether the implementation truthfully advances the #39 scientific/person-history claim, not whether a malicious operator can defeat Git or the host filesystem.

## Corrected claims C1-C7

All seven previously blocking/corrected claims were verified closed:

1. **C1 — executable source identity.** Bound source files are hashed from the working tree with `git hash-object`, and candidate-to-worktree drift spans all three execution roots. Ordinary unstaged/staged mutations and mutations to unenumerated execution-root modules fail closed.
2. **C2 — sparse-history authority.** Replacement Pass B aliases the canonical `GENESIS_SPARSE_HISTORY_NOTICE`; protocol, executing constant and runtime prompt guard no longer compare a replacement meaning to itself.
3. **C3 — treatment schedule authority.** Executing horizons/modes are compared to `redesign-v2.json` and diagnostic authority. Genome treatment remains exactly ordinals 3 and 6 with horizons 8 and 14.
4. **C4 — Pass-A situated context.** Across all 70 slot/window cognition surfaces, the model sees exactly the frozen World place and collapsed instant; alternate World places are absent from cognition.
5. **C5 — no compiler ordinal in cognition.** Deep scans found zero `ordinal` keys across all 70 Pass-A cognition surfaces.
6. **C6 — independent reliability budgets.** Malformed form repairs consume form-repair allowance only; record-validity retries consume record-retry allowance only.
7. **C7 — durable one-shot standing.** The attempt guard lives outside `final-cohort-v1/`; deleting the candidate output root after an attempt is claimed refuses before adapter construction and cannot resurrect another first attempt.

No frozen World, genome, World/genome assignment, historical window, coverage bound, envelope digest, EventStructure authority, runtime parameter, Pass-B horizon/mode, treated ordinal, or D3 threshold changed in response to the review.

## Scientific standing

The corrected R2 CLEAR authorizes exactly the next scientific act:

- record a binding-digest/candidate-head CLEAR witness; then
- perform **one fresh replacement-v2 candidate-generation attempt** under the reviewed runtime and frozen five-slot plan.

It does not authorize diagnostics/adjudication, publication, a second attempt, quality-driven regeneration, provider/model substitution, or Whole-Person standing.

The canonical R2 CLEAR witness is:

`artifacts/validation/m2-pr39/replacement-v2/protocol/r2-execution-clear-v1.json`

recorded in commit:

`bbab28c32f65355a8784707f5a165ffe021528b4`

The witness binds:

- candidate `ad7044d57ef6360295d6e26bca4338684eb394d3`;
- binding digest `sha256:2482f9a9e7d83d23ff3bf7241c6bea83feff02c6c3f50c6726e2d479962e6159`;
- one candidate attempt;
- provider `openai` / model `gpt-5.1-2025-11-13` and the frozen runtime parameters;
- publication authorization `false`.

## Publication standing

Publication remains **NOT AUTHORIZED**. Candidate generation remains structurally separate from birth publication and the future CLEAR witness explicitly carries `publicationAuthorized:false`.

### Required future publication gate: observableAction ↔ placeRef consistency

The review found an honest residual in C4. Fibre can structurally ensure that Pass-A cognition contains only one authoritative World place, but open-ended natural-language `observableAction` can still invent a location not represented by that `placeRef`.

Therefore, before any candidate episode is admitted into canonical situated life, the publication/admission boundary must explicitly compare the admitted `observableAction` against that episode's `placeRef` for locational consistency. This obligation is carried in the R2 CLEAR witness as `r2_n13_observable_action_place_consistency` and must not be assumed satisfied by candidate generation.

## Residual disclosures

The re-review promoted none of the residual items to blocker. The previously disclosed N1/N4/N5/N7/N8/N9/N10/N11 remain, and the review added N12-N18:

- **N12** — 35 source paths are individually content-pinned while the observed 42-module closure includes 18 modules covered by root-wide `git diff` only; deliberately marking an unpinned module `assume-unchanged` can make Git misreport it. Classified as explicit Git tampering, not an ordinary-worktree implementation blocker.
- **N13** — invented-location prose can conflict with `placeRef`; carried as the explicit publication-gate obligation above.
- **N14** — a crash between durable attempt-guard creation and start-witness creation can permanently consume the one-shot attempt without generating cognition. This is fail-closed and requires human re-freeze rather than automatic regeneration.
- **N15** — terminal-failure and completed-result checks occur after adapter construction, although no provider invocation occurs.
- **N16** — persistent form-repairable failure can terminate after exhausting form repairs without consuming the record-retry allowance. Conservative/fail-closed but not a full five-version spend.
- **N17** — deleting a bound source fails closed at module resolution rather than at the authority diagnostic.
- **N18** — preflight anchors sparse-history constants, while the prompt-embedding check remains in the runtime guard; removing the notice from a re-frozen prompt fails before provider invocation rather than in preflight.

These are disclosures, not authority to make stronger claims. N13 is the only one that creates an explicit later publication obligation.

## Review assumptions frozen into CLEAR

The CLEAR carries forward:

- exact binding digest and candidate head;
- five frozen Worlds and genomes and their assignment;
- fourteen windows and unchanged coverage bounds;
- the five R1-cleared envelope digests;
- horizons `[4,6,8,10,12,14]`;
- formation modes `L L T L L T`;
- treated ordinals `[3,6]`;
- primary horizons `[8,14]`;
- D3 rule: both treated ordinals at least 4/5, at least one 5/5;
- one-shot durable guard outside the candidate output root;
- candidate generation only;
- publication, diagnostics, second attempt, regeneration and Whole-Person authority all false.

## Next gate

Before spending the one authorized candidate attempt, verify the newly recorded CLEAR witness with the existing execution-authority function in a **zero-provider-call** invocation. Do not use the old `genesis:replacement-r2-preflight` for this transition: that command is intentionally a pre-CLEAR preflight and is expected to reject once the genuine CLEAR witness exists.

After the authority verifier reports `CLEAR_TO_GENERATE_REPLACEMENT_CANDIDATE`, the already-reviewed runner may be invoked directly without changing any execution source or `package.json`. That invocation is the one authorized candidate-generation attempt. Publication remains closed.
