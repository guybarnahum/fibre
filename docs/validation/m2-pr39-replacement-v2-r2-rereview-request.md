---
id: m2-pr39-replacement-v2-r2-rereview-request
status: ready_for_external_rereview
prior-verdict: HOLD
execution-candidate: ad7044d57ef6360295d6e26bca4338684eb394d3
binding-commit: a0441bd3d56c789b0a50e9e3377229ab9165d7e0
locally-verified-docs-head: ccc8d15e22bc38b5ea545084ab6bdab292b83995
r2-binding-digest: sha256:2482f9a9e7d83d23ff3bf7241c6bea83feff02c6c3f50c6726e2d479962e6159
local-tests: 715/715
provider-calls: 0
publication-authorized: false
last-reviewed: 2026-08-23
---

# PR #39 replacement-v2 — corrected R2 hostile execution re-review request

## Requested verdict

Return exactly one top-level verdict:

`VERDICT: CLEAR`

or

`VERDICT: HOLD`

or

`VERDICT: REDESIGN`

This is a **narrow corrected R2 re-review** following the prior `VERDICT: HOLD` recorded in `m2-pr39-replacement-v2-r2-review-result.md`.

Use **CLEAR** only if the seven corrected Fibre/scientific claims below actually hold and no residual review item becomes load-bearing.

Use **HOLD** for a remaining local execution/integrity defect that can be corrected without changing the R1-cleared experiment.

Use **REDESIGN** only if the architecture or experimental question itself is no longer interpretable or capable of satisfying #39.

This review must make **zero provider/model calls**, must not create an R2 CLEAR witness, and must not create replacement-v2 life artifacts.

## Fibre meaning of hostile review

Hostile here does **not** mean a cybersecurity penetration exercise. Treat the implementation adversarially against Fibre's vision and the truth of the #39 experiment.

The central question is whether Fibre can truthfully say that the frozen protocol, executing code and evidence would author one coherent Thread past under the preregistered genome intervention, with no hidden tuning or second attempt.

A defect is blocking when it can change that scientific/person-history claim while the execution surface still reports authority.

## Exact corrected boundary

Execution-source correction candidate:

`ad7044d57ef6360295d6e26bca4338684eb394d3`

Binding-only commit:

`a0441bd3d56c789b0a50e9e3377229ab9165d7e0`

Locally verified documentation head:

`ccc8d15e22bc38b5ea545084ab6bdab292b83995`

Binding digest:

`sha256:2482f9a9e7d83d23ff3bf7241c6bea83feff02c6c3f50c6726e2d479962e6159`

First verify the review seams yourself:

```bash
git diff --name-status ad7044d57ef6360295d6e26bca4338684eb394d3..a0441bd3d56c789b0a50e9e3377229ab9165d7e0
git diff --name-status a0441bd3d56c789b0a50e9e3377229ab9165d7e0..HEAD
```

The first range must contain only `artifacts/validation/m2-pr39/replacement-v2/protocol/r2-execution-binding-v1.json`.

The second range may contain documentation only. No execution-source change after `ad7044d` is acceptable for this re-review.

## Maintainer local verification already reproduced

At `ccc8d15e22bc38b5ea545084ab6bdab292b83995` the maintainer reproduced:

- 166 active test files;
- **715 tests / 715 passed / 0 failed**;
- `npm run validate` → repository validation passed and World seed validation passed;
- `genesis:replacement-r2-preflight` → `CLEAR_R2_IMPLEMENTATION_PRE_REVIEW_ZERO_CALL`;
- exact binding digest `sha256:2482f9a9e7d83d23ff3bf7241c6bea83feff02c6c3f50c6726e2d479962e6159`;
- all five R1-cleared envelope digests unchanged;
- Pass-B horizons `4/6/8/10/12/14`, treated ordinals `3/6`, sparse-history authority bound;
- R2 CLEAR witness → `MISSING_R2_CLEAR_WITNESS`;
- cognition → **NOT AUTHORIZED**;
- publication → **NOT AUTHORIZED**;
- zero provider calls and no replacement-v2 life artifacts;
- only the two intentionally preserved evidence directories remained untracked:
  - `artifacts/validation/m2-pr39/h/recovery-v1/`
  - `artifacts/validation/m2-pr39/replacement-v1/final-cohort-v1/`.

Do not treat this local green result as proof of the corrected claims; attack them independently.

## Frozen experiment authority — not review tuning knobs

The correction did **not** change:

- the five frozen Worlds;
- the five frozen genomes;
- World/genome assignment;
- G2 starting material;
- fourteen historical windows or coverage bounds;
- five R1-cleared envelope digests;
- EventStructure authority;
- provider `openai`;
- model `gpt-5.1-2025-11-13`;
- frozen runtime parameters;
- Pass-B horizons `[4,6,8,10,12,14]`;
- formation modes `L L T L L T`;
- treated ordinals `[3,6]`;
- primary horizons `[8,14]`;
- D3 rule: both treated ordinals at least 4/5 correct core edges and at least one 5/5;
- one candidate attempt only;
- no quality-driven regeneration;
- publication as a later separate authority.

Do not recommend changing those because of anticipated output quality.

# Seven corrected claims to attack

## C1 / prior B1 — execution source witness identifies the bytes that execute

Prior defect: pinned source verification used `git rev-parse HEAD:<path>`, so an uncommitted edit could execute while the binding still attested to committed bytes.

Correction:

- source blob verification uses `git hash-object -- <path>` against working-tree content;
- execution drift uses `git diff --name-only <reviewCandidateHead> -- <execution roots>` against the working tree.

Required attacks:

1. append or alter one **bound** execution file without committing;
2. stage a mutation without committing;
3. mutate a bound source and restore only the Git index, not the worktree;
4. mutate an execution-root source after the candidate even if it is not in `sourceBlobs`.

Preflight/authority must refuse before cognition. A byte-changing mutation to executing source must not leave the same CLEAR preflight.

If executable bytes can differ from the reviewed candidate while authority remains green, **HOLD**.

## C2 / prior B2 — sparse-history semantics have one canonical executable authority

Prior defect: the prompt interpolated a replacement-local sparse-history constant and then checked for that same constant.

Correction: replacement Pass B aliases canonical `GENESIS_SPARSE_HISTORY_NOTICE` from `genesis-historical-envelope-v1.mjs`.

Attack semantic inversion or replacement of the notice. Confirm the executing prompt cannot silently claim a different sampling meaning from the frozen protocol while preflight stays green.

Both initial Pass B and mechanical genome-copy retry must carry the same canonical rule.

## C3 / prior B3 — treatment schedule is independently tied to protocol authority

Prior defect: runtime horizons/modes were effectively compared to themselves.

Correction: R2 preflight compares executing horizons/modes against `redesign-v2.json` and ties treated ordinals/horizons to diagnostic authority.

Required mutations:

- make four of six calls `life_plus_genome`;
- move treatment off ordinals 3/6;
- change any horizon;
- create disagreement between treated ordinals and diagnostic primary horizons.

Each must fail closed before cognition.

If genome exposure can move while the frozen experiment remains supposedly authorized, **HOLD**.

## C4 / prior B4 — Pass-A place/instant authority is load-bearing, not prompt prose

Prior defect: cognition saw all World places while Fibre later stamped the frozen envelope place.

Correction: candidate construction uses `constrainPassAContextToHistoricalEnvelope()` before `buildRichLifePassAInput()`.

For each slot/window verify cognition sees:

- exactly the frozen envelope place;
- the frozen instant/developmental window;
- the selected opportunity consistent with the envelope;
- no alternate World place from which the model could narrate a second incompatible location.

Try to create a realization whose prose location conflicts with the canonical place. The admitted history must not permit prose and situated-life authority to describe different lives.

## C5 / prior N2 — compiler `ordinal` is absent from Pass-A cognition

Verify `ordinal` is absent both from the developmental-window projection and `frozenEnvelope` cognition object. It may remain compiler/protocol metadata outside cognition.

A model-visible ordinal is a treatment/order leakage surface and should **HOLD** if it survives.

## C6 / prior N3 — malformed form repair cannot consume the record-retry budget

Prior defect: malformed form-repair output became a pending schema error and was later charged to record retry.

Attack with malformed repair responses after an interiority/bounds failure.

The independent preregistered budget must remain:

- one initial version;
- up to two form repairs;
- up to two record retries;
- maximum five generated versions.

Malformed form-repair bodies must consume form-repair opportunity, not silently debit record retry or reset either budget.

Also inspect exhaustion behavior; no retry path may become quality-driven regeneration.

## C7 / prior N6, promoted by Fibre — deleting candidate output cannot resurrect a first attempt

The scientific one-shot claim is now stored outside `final-cohort-v1/` in `replacement-r2-attempt-guard-v1.json`.

The guard and candidate-root boundary are inspected **before adapter construction** after R2 authority succeeds.

Required attacks with a fixture/forged valid CLEAR only; make zero provider calls:

1. no guard + no output root → fresh attempt boundary is possible;
2. output root exists without guard → refuse;
3. guard exists but output root deleted → refuse before adapter factory;
4. guard exists but start witness deleted → refuse before adapter factory;
5. guard/start binding digest mismatch → refuse;
6. guard/start reviewed-candidate mismatch → refuse;
7. terminal failure exists → no regeneration;
8. completed result exists → return/resume same attempt, not generate a second cohort;
9. delete only `final-cohort-v1/` after claiming an attempt → must **not** create a new first attempt.

This is a Fibre experimental-truth boundary, not a cyber-hardening requirement. If filesystem deletion can reset scientific standing, **HOLD**.

# Residual disclosed items — try to promote only if load-bearing

The prior review left these as nonblocking. Revisit them, but do not turn defense-in-depth preferences into blockers unless you can demonstrate a path that changes the #39 scientific/person-history claim while authority remains green.

- **N1** shallow versus recursive freeze of admitted historical episode;
- **N4** deterministic compiler drift potentially consuming model retry budget;
- **N5** lack of a Pass-B prose-level genome substring defense-in-depth scan;
- **N7** narrow crash/write windows around terminal failure artifact completeness;
- **N8** replay-vs-fresh status not copied into candidate call provenance;
- **N9** adapter identity not separately asserted after construction;
- **N10** coarse text-based preflight guards;
- **N11** `sourceBlobs` coverage floor without a separately enumerated required-path set.

For any promoted item, demonstrate the concrete Fibre consequence. Otherwise keep it disclosed/nonblocking.

# Regression checks from the already-reviewed R2 surface

Do not rerun the entire prior hostile battery mechanically unless the correction could affect it. Do confirm the following invariants remain intact:

- no adapter construction with no/invalid CLEAR witness;
- forged witness cannot authorize publication;
- Pass A and Pass C remain genome-blind;
- genome appears only in treated Pass-B calls;
- candidate runner has no publication path;
- D3 threshold and primary horizons remain frozen;
- canonical situated-life publication remains the only durable continuity authority;
- atomic birth rollback semantics were not weakened;
- replacement-v1/H-v2 generated life remains unread;
- durable replay cannot spend a second provider call for a committed invocation.

If a correction regressed one of these, **HOLD**.

# Required report

Start with exactly one verdict line.

Then provide:

1. **Range/binding verification** — candidate→binding and binding→review docs ranges.
2. **C1–C7 disposition** — for each, VERIFIED CLOSED / STILL OPEN / HARNESS ERROR, with the exact mutation or inspection used.
3. **Residual N1/N4/N5/N7/N8/N9/N10/N11 disposition** — state whether any is promoted and why.
4. **Regression boundary** — concise confirmation of any previously-cleared surfaces retested because the correction touched them.
5. **Scientific standing** — explicitly state whether one fresh candidate-generation attempt may now be authorized.
6. **Publication standing** — explicitly state that publication remains unauthorized even if R2 is CLEAR.
7. **Assumptions to freeze into a future CLEAR witness**, if and only if verdict is CLEAR.

A CLEAR re-review authorizes **only the next act of recording a digest-bound R2 CLEAR witness**. It does not itself run cognition, expose publication, authorize diagnostics, or create a second attempt.
