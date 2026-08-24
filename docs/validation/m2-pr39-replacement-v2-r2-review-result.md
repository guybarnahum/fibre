---
id: m2-pr39-replacement-v2-r2-review-result
status: hold_correction_implemented_pending_local_verification
reviewed-head: c5f545fed02db16439d02b8edc19f643ecfda607
reviewed-execution-candidate: 2d58d4d21b11f0e506d86315728a314de5832a04
reviewed-binding-digest: sha256:d16f6d4651ede59b442cb83939f7c3e13b3354432c0a1a4cb8a2fe1ba42c3149
verdict: HOLD
correction-candidate: ad7044d57ef6360295d6e26bca4338684eb394d3
refrozen-binding-head: a0441bd3d56c789b0a50e9e3377229ab9165d7e0
refrozen-binding-digest: sha256:2482f9a9e7d83d23ff3bf7241c6bea83feff02c6c3f50c6726e2d479962e6159
provider-calls: 0
publication-authorized: false
last-reviewed: 2026-08-23
---

# PR #39 replacement-v2 — R2 hostile execution review result

## Verdict

```text
VERDICT: HOLD
```

The hostile R2 review did **not** find a reason to redesign the R1-cleared experiment. It found local execution/integrity defects that can be corrected without changing the Worlds, genomes, World/genome assignment, historical envelopes, coverage bounds, treatment question, provider/model, or diagnostic threshold.

The review made zero provider/model calls and created zero replacement-v2 life artifacts.

## Fibre meaning of hostile review

Under [`../../AGENTS.md`](../../AGENTS.md), hostile review means adversarial review against the Fibre vision unless a review is explicitly scoped as security/red-team work.

For this R2 boundary the central question is therefore not whether an operator can be treated as a malicious cyber attacker. It is whether Fibre can truthfully claim that the frozen protocol, execution machinery, and resulting candidate evidence identify the particular lived past that would later belong to a Thread.

That makes several apparently mechanical findings vision-relevant:

- source provenance must identify the code that actually authored the experimental past;
- the genome intervention may occur only where the frozen protocol says it occurs;
- sparse history must carry the exact preregistered semantic warning to cognition;
- admitted prose and canonical situated-life place authority may not describe different lives;
- the one-shot rule must be an enforced scientific boundary rather than a convention that disappears with the candidate directory.

## What the review verified as sound

The review independently reproduced the original R2 range claims and zero-call boundary at `c5f545f`:

- `2d58d4d..73ce064` contained only the binding artifact plus the permanent situated-continuity test correction;
- `73ce064..c5f545f` was documentation-only;
- 714/714 tests passed at the reviewed head;
- repository and World-seed validation passed;
- all five R1-cleared envelope digests reproduced exactly;
- cognition and publication were both unauthorized;
- no replacement-v2 life artifact existed.

The adversarial battery also found the following boundaries holding:

- fifteen forged CLEAR-witness variants refused while a well-formed control authorized;
- adapter construction remained unreachable before execution authority;
- all tested N1 threshold mutations refused;
- situated role/fact/place/participant tampering refused, including a self-consistent recomputed forged continuity bundle;
- atomic birth rollback leaked no birth-side rows in the tested failure positions;
- durable replay did not re-spend committed provider calls;
- replacement-v1/H-v2 generated life was not read;
- candidate generation remained structurally separate from publication.

These findings remain part of the R2 evidence. HOLD does not erase them.

## Blocking findings from the review

### B1 — source binding checked `HEAD`, not executable working-tree bytes

`gitBlobSha()` used `git rev-parse HEAD:<path>`. An uncommitted edit to a pinned execution file could therefore execute while the preflight still attested to the committed blob and printed CLEAR.

This is not counted as personhood progress. It is blocking because the scientific witness would claim provenance for code different from the code that actually generated a Thread's past.

### B2 — executing sparse-history meaning was self-referential

The Pass-B prompt interpolated `GENESIS_REPLACEMENT_SPARSE_HISTORY_NOTICE`, and its runtime guard merely checked for that same constant. The canonical historical-envelope notice and the prompt notice were not mechanically tied together. The executing sentence could therefore be inverted while the protocol continued to claim the original sparse-history semantics.

This directly threatens interpretation of remembered life: a sparse coverage sample must not become evidence of frequency or dominance merely because an execution constant drifted.

### B3 — executing Pass-B treatment schedule was compared against itself

The current Pass-B assertion defaulted to the runtime's own horizon and formation-mode constants. The protocol artifact was checked separately, but the code constants were not compared to it. A mutation exposing genome in four of six calls could therefore pass the old checks.

This is a direct experimental-causality defect: the genome intervention must occur only at the preregistered treated ordinals 3 and 6.

### B4 — Pass-A place authority was asserted but not made load-bearing

The Pass-A prompt said the frozen place was factual authority, but cognition still received all World places and the existing `constrainPassAContextToHistoricalEnvelope()` helper was not on the production path. A realization could narrate a market while Fibre stamped and later published the episode as school.

That is a Fibre historical-integrity defect, not a cosmetic prompt problem. One admitted episode may not become two incompatible lives: prose saying one place and canonical situated-life authority recording another.

## Maintainer correction scope

The correction deliberately keeps the R1 experimental question frozen. It closes B1-B4 and also closes three review nonblockers because they are part of the same scientific boundary:

- **N2** — remove compiler/envelope `ordinal` from Pass-A cognition;
- **N3** — keep malformed form-repair output on the independent form-repair budget instead of silently charging record retry;
- **N6** — make the whole-candidate one-shot claim durable outside the deletable candidate output root and inspect it before adapter construction.

N6 is promoted to blocking for Fibre even though the external review listed it as nonblocking. A failed or completed scientific attempt must not become a new "first" attempt merely because `final-cohort-v1/` was deleted. This is experimental truthfulness, not a claim about hostile filesystem attackers.

## Correction candidate

Execution-source correction candidate:

```text
ad7044d57ef6360295d6e26bca4338684eb394d3
```

The correction changes only the R2 execution machinery and two milestone regression tests:

- `services/world-kernel/src/genesis-replacement-pass-a.mjs`
- `services/world-kernel/src/genesis-replacement-pass-b.mjs`
- `tools/genesis/genesis-replacement-candidate.mjs`
- `tools/genesis/genesis-replacement-execution-authority.mjs`
- `tools/genesis/genesis-replacement-r2-preflight.mjs`
- `tools/genesis/genesis-replacement-runner.mjs`
- `services/world-kernel/test/genesis-replacement-pass-a.test.mjs`
- `tools/genesis/genesis-replacement-r2-preflight.test.mjs`

The important behavioral closures are:

1. reviewed source blobs are hashed from the executable working tree with `git hash-object`, and reviewed-head drift is compared directly against the working tree;
2. Pass B aliases the one canonical `GENESIS_SPARSE_HISTORY_NOTICE` instead of defining a second semantic sentence;
3. R2 preflight compares executing Pass-B horizons/modes to `redesign-v2.json` and ties treated ordinals/horizons to diagnostic authority;
4. candidate Pass A now uses `constrainPassAContextToHistoricalEnvelope()` so cognition sees exactly the frozen place and instant;
5. Pass-A frozen cognition exposes `placeRef` but no compiler `ordinal`;
6. malformed form-repair bodies continue on the form-repair budget rather than becoming record retries;
7. the runner creates a durable one-shot guard beside, not inside, `final-cohort-v1/`, and a missing output tree after that guard exists is refusal rather than permission to regenerate.

No provider/model call was made while applying these corrections.

## Re-frozen execution binding

The corrected execution candidate is re-bound at:

```text
a0441bd3d56c789b0a50e9e3377229ab9165d7e0
```

The binding's canonical digest is:

```text
sha256:2482f9a9e7d83d23ff3bf7241c6bea83feff02c6c3f50c6726e2d479962e6159
```

The following inherited experimental authorities are unchanged:

- five frozen Worlds;
- five frozen genomes;
- fixed World/genome assignment;
- five R1-cleared historical-envelope digests;
- fourteen historical windows and coverage bounds;
- World timezone mapping;
- EventStructure authority;
- Pass-B horizons `[4,6,8,10,12,14]`;
- formation modes `L L T L L T`;
- treated ordinals `[3,6]` and primary horizons `[8,14]`;
- D3 threshold: both treated ordinals at least 4/5, at least one 5/5;
- provider `openai` and model `gpt-5.1-2025-11-13` with the same frozen runtime parameters;
- one fresh candidate attempt only;
- no quality-driven regeneration;
- publication separate and unauthorized.

There is still **no R2 CLEAR witness**. Re-binding is not authorization.

## Residual review findings

The following external-review nonblockers remain disclosed rather than silently disappearing:

- N1 — admitted historical episode is shallow-frozen rather than recursively frozen;
- N4 — deterministic compiler drift may consume model retry budget rather than terminate immediately;
- N5 — Pass B lacks the same prose-level genome substring defense-in-depth scan used by Pass A/C, although the current builder structurally confines genome exposure;
- N7 — terminal failure artifact completeness has narrow crash/write windows;
- N8 — replay-vs-fresh invocation status is derivable from the journal but not copied into candidate call provenance;
- N9 — adapter identity is supplied by the frozen runtime but not separately asserted after adapter construction;
- N10 — two preflight guards remain coarse text-based checks;
- N11 — `sourceBlobs` has a coverage floor but not an independently enumerated required-path set.

These do not authorize stronger claims. The corrected hostile re-review should attack them again and may promote any of them if a load-bearing path is demonstrated.

## Required local verification before re-review

No corrected R2 CLEAR should be requested until a maintainer checkout at the re-frozen binding head reproduces the zero-call boundary:

```bash
git pull --ff-only
git rev-parse HEAD
npm test
npm run validate
npm run genesis:replacement-r2-preflight
git status --short
```

Expected scientific posture, not yet claimed here:

```text
HEAD                         a0441bd3d56c789b0a50e9e3377229ab9165d7e0
R2 preflight                 CLEAR_R2_IMPLEMENTATION_PRE_REVIEW_ZERO_CALL
binding digest               sha256:2482f9a9e7d83d23ff3bf7241c6bea83feff02c6c3f50c6726e2d479962e6159
R2 CLEAR witness             absent
provider calls               unauthorized
candidate generation         unauthorized
publication                  unauthorized
replacement-v2 life output   absent
```

If that local boundary is green, the next step is a corrected R2 hostile re-review focused on B1-B4, N2/N3/N6 closure and the remaining disclosed assumptions. It must again make zero provider/model calls and create no replacement-v2 life artifacts.
