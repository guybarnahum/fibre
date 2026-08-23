---
id: m2-pr39-gate-g2-review-request-round2
status: ready_for_external_review
last-reviewed: 2026-08-22
canonical: false
---

# Milestone #39 — second blocking Gate-G(2) review request

## Requested verdict

Return exactly one top-level verdict:

```text
CLEAR
HOLD
REDESIGN
```

This is the **second blocking pre-life Gate-G(2) review**. The first review returned `HOLD`, not `REDESIGN`. This request asks whether the five blocking closure findings B1-B5 are now actually closed without changing the already-consumed replacement scientific evidence.

This request authorizes **zero replacement final-life provider calls**. Only a subsequently recorded Gate-G(2) `CLEAR` witness may authorize the one replacement final-life attempt.

Review the actual repository implementation and artifacts, not this summary alone.

## Exact locally verified execution candidate

The maintainer locally verified this exact execution candidate:

```text
6f4dc0f4ff306e03ff43cc89593efc424274b85c
```

Verification at that exact head:

```text
npm run genesis:replacement-gate-g2-closure
  PR39 REPLACEMENT GATE-G(2) HOLD CLOSURE: CLEAR B1-B5 — ZERO CALL
  B1 complete replacement execution packet: yes
  B2 G4-v3 explicit at replacement Pass-A call site: yes
  B3 five-edge CLEAR rule + null/error/tie closure: yes
  B4 aligned genome-authoring design/non-comparability disclosed: yes
  B5 mapping described without derangement claim; fixed points: 2,4,5
  replacement roster roles grounded to frozen Worlds: yes
  historical G4-v2 Pass-B admission source/hash: preserved exactly
  Pass-B uncertainty genome-copy hardening: not applied; residual gap disclosed
  replacement durable adapter: process-restart scope only
  D3: both >=4/5; at least one 5/5
  final-life cognition: NOT AUTHORIZED
  verifier made zero provider calls

npm run genesis:replacement-preflight
  PR39 REPLACEMENT FINAL COHORT PREFLIGHT: CLEAR_PACKET_GATE_G2_HOLD
  execution binding digest: sha256:e2a563906fab234d138df1c3bc05f7def50aef1f66b3c3e0e95153f12558b9e5
  Gate-G(2): MISSING_GATE_G2_CLEAR_WITNESS
  final-life cognition: NOT AUTHORIZED
  generation policy: pr39-g4-pass-a-reliability-amendment-v3 · form=2 · record=2 · total=5
  runtime: openai/gpt-5.1-2025-11-13
  output root: artifacts/validation/m2-pr39/replacement-v1/final-cohort-v1 [absent]
  process-restart replay enabled; host-crash fsync durability claimed: false
  preflight made zero provider calls and wrote no replacement life artifacts

npm test
  703 tests · 703 passed · 0 failed

npm run validate
  Repository validation passed.
  World seed validation passed.

git status --short
  ?? artifacts/validation/m2-pr39/h/recovery-v1/
```

The sole untracked path is the previously preserved local H-v2 recovery evidence directory. It is not replacement material and must remain outside the replacement cohort.

Any commits after `6f4dc0f` that only record this review request or synchronize documentation are not scientific/execution changes. The reviewer should nevertheless inspect current HEAD and verify that no reviewed execution/protocol path changed after the locally verified candidate.

## Prior review authority

First Gate-G(2) result:

```text
docs/validation/m2-pr39-gate-g2-review-result.md
```

Reviewed head:

```text
8c8d1c1d7208b4f31a3bea359d103563ce0d29e2
```

The first reviewer explicitly concluded that the replacement **science survived** and that the G5/G6 five-edge reconciliation was legitimate. The HOLD was for five pre-life closure findings B1-B5.

Do not reopen accepted scientific choices merely because the outcome might later be weak. Do reopen them if the correction changed the scientific question, imported outcome knowledge, or failed to close the ambiguity it claims to close.

## Invariants that must still hold

The correction must not have rewritten or regenerated:

- any of the five replacement Worlds;
- any replacement genome or synthetic parent genome;
- the World↔genome assignment;
- the fresh G2 ceiling result;
- the G2 provider/model/instrument;
- the inherited Pass-B treatment schedule `L L T L L T` at horizons `4/5/6/7/8/10`;
- the accepted replacement D3 threshold structure;
- any H-v2/recovery semantic life material into the replacement cohort.

Replacement life state must still be:

```text
childhood episodes generated: 0
memories generated:          0
meanings generated:           0
published replacement lives: 0
final-life cognition authorized: false
```

## B1 closure — complete replacement execution packet

The first review found no concrete replacement G3 instance, G4 binding, output root, or runner.

The corrected packet now includes:

```text
artifacts/validation/m2-pr39/replacement-v1/protocol/rg3-pass-b-treatment-instance-v1.json
artifacts/validation/m2-pr39/replacement-v1/protocol/rg4-cognition-execution-binding-v1.json
artifacts/validation/m2-pr39/replacement-v1/protocol/replacement-execution-binding-v1.json
tools/genesis/genesis-replacement-final-cohort.mjs
```

The runner hard-pins the binding path, provider/model authority, G4-v3 policy, replacement seed namespaces and one-shot output root. The preflight must refuse execution while the Gate-G(2) CLEAR witness is absent.

Please verify that this packet is actually sufficient to determine, before life generation, what the one authorized attempt would do.

## B2 closure — G4-v3 selected at the actual Pass-A call site

The first review correctly found that the historical H runner omitted `generationPolicy` and therefore used the deliberate legacy shared-three default.

The replacement runner must explicitly call:

```text
generateRichPassAEpisode({
  ...,
  generationPolicy: GENESIS_PASS_A_RELIABILITY_POLICY_V3,
  ...
})
```

Effective replacement policy must be:

```text
initial version:              1
max form repairs:             2
max referential retries:      2
hard total generated versions: 5
```

The historical H/G4-v2 path must remain reproducible. In particular, the exact frozen shared Pass-B admission source/hash was restored after an optional nonblocking hardening briefly changed it during closure work.

Verify that no replacement call path can silently fall back to the legacy shared-three Pass-A policy.

## B3 closure — all-five-edge G6 semantics are complete

Replacement-effective authority:

```text
artifacts/validation/m2-pr39/replacement-v1/protocol/rg5-g6-closure-amendment-v2.json
```

The accepted replacement D3 rule remains:

```text
both primary ordinals >= 4/5
and at least one primary ordinal = 5/5
```

For every measured core edge:

```text
null           => not correct
error          => not correct
tie            => not correct
unanalyzable   => not correct
```

The old pair-3-4 four-edge/nonblocking limitation must have **no replacement CLEAR path**. Inspect the executable/verification interpretation, not just prose.

## B4 closure — genome-authoring difference is disclosed, not hidden

Authority:

```text
artifacts/validation/m2-pr39/replacement-v1/protocol/rg2-authoring-assignment-disclosure-amendment-v1.json
```

The correction explicitly acknowledges the replacement's aligned per-ordinal authoring dimensions and states that the fresh G2 numerical ceiling is **not directly comparable** to the old cohort's scores.

This disclosure must not rewrite the already-frozen genomes or weaken the fact that the fresh G2 ceiling governs edge eligibility for this replacement cohort.

Please judge whether the disclosure is sufficiently precise for eventual D3 interpretation.

## B5 closure — mapping described accurately

The realized deterministic mapping remains unchanged:

```text
1 <- 3
2 <- 2  fixed point
3 <- 1
4 <- 4  fixed point
5 <- 5  fixed point
```

Fixed-point slots are `[2,4,5]`.

The correction retires the false word `derangement`. It does **not** rerandomize after observing the mapping. The claimed controls are instead G1-before-G2 ordering, non-geographic locus authoring, and content-independent digest-ranked within-origin assignment without human semantic pairing choice.

Verify that no stronger randomization claim remains load-bearing elsewhere.

## Nonblocking findings and explicit residual disclosures

Canonical residual disclosure:

```text
artifacts/validation/m2-pr39/replacement-v1/protocol/rg4-residual-gate-g2-disclosures-v1.json
```

### Pass-A semantic blindness

Pass A is structurally genome-blind, but free-text World fields are not mechanically proven free from every possible semantic paraphrase of a genome disposition. The protection is procedural/provenance-based: G1 predates G2, geography is excluded from loci, Pass A has no genome field, and World↔genome assignment is content-independent.

### Pass-B prior-memory arm labels

Later Pass-B calls may see prior memory formation-mode/call metadata. The exposed life-only stratum remains descriptive-only/horizon-confounded. This was not changed after the first H attempt because changing model-visible input would be a scientific intervention, not mere closure.

### Pass-B `uncertainty[*]` genome-copy gap

The first review suggested extending the existing four-token verbatim genome-copy gate from `rememberedContent` to `uncertainty[*]`. This was nonblocking. During closure work it was briefly implemented in the shared historical admission module, but local tests correctly showed that doing so changed the exact frozen G4-v2 source/blob and retry-prompt hash.

The change was therefore **retracted before this re-review**. Current authority is explicit:

```text
artifacts/validation/m2-pr39/replacement-v1/protocol/rg4-pass-b-genome-copy-closure-amendment-v1.json
status: not_applied_preserved_review_note
historical scanned fields: rememberedContent only
uncertainty gap: disclosed
```

Please treat this as a residual nonblocking limitation unless you judge it genuinely blocking for Pass-C genome-blindness. If you do, explain why preserving the frozen historical cognition surface is insufficient and identify the smallest non-adaptive pre-life remedy.

### Durability scope

The replacement runner uses Birth Center's durable adapter for process-restart replay of committed invocations. Fibre explicitly does **not** claim host-crash/power-loss fsync durability.

### Historical recovery executable surface

The old recovery core has historical executable technical debt, but the replacement runner does not call it and the recorded recovery terminal HOLD remains binding. Do not treat it as replacement authority unless there is an actual reachable replacement path.

## One-shot and publication discipline to attack

Please inspect whether a Gate-G(2) CLEAR could be abused to:

- choose a different binding, provider/model, seed namespace or output root;
- regenerate a weak but mechanically valid Thread;
- create a second replacement cohort attempt after terminal result/failure;
- reset G4-v3 repair/retry budgets through restart;
- reuse an H-v2/recovery result under a replacement request ID;
- publish some replacement Threads while others are still provisional;
- bypass the reviewed Gate-G(2) witness after code/protocol drift.

A weak, boring, stereotyped, insufficiently distinctive or scientifically disappointing first mechanically valid cohort is evidence and must not trigger quality regeneration.

## Required hostile questions

Please explicitly answer:

1. Are B1-B5 actually closed in implementation, or only in prose/verifiers?
2. Did any correction rewrite consumed replacement evidence or adapt to a final-life outcome?
3. Does the actual replacement Pass-A call site use G4-v3 and reject the legacy policy?
4. Is the pair-3-4 carve-out unreachable under replacement-effective CLEAR semantics?
5. Are null/error/tie/unanalyzable measured edges unambiguously `not correct`?
6. Is the G2 authoring-template non-comparability disclosure sufficient and accurate?
7. Is the mapping disclosure accurate without rerandomization or hidden semantic pairing discretion?
8. Does the complete one-shot runner preserve first-valid-cohort/no-quality-regeneration discipline?
9. Can process restart replay a committed call without resetting scientific retry budgets or substituting another response?
10. Is the absence of host-crash/fsync durability accurately scoped rather than hidden?
11. Do the residual Pass-A/Pass-B leakage disclosures remain nonblocking, or does any one require HOLD?
12. Is historical G4-v2/H-v2 reproducibility preserved exactly where the frozen evidence requires it?
13. Are the five replacement Threads still genuinely pre-life/unborn at this gate?
14. Would CLEAR authorize only one replacement final-life attempt and no Whole-Person/causal standing claim?

## Verdict meanings

### CLEAR

Use only if B1-B5 are closed and the corrected packet is sufficiently complete, non-adaptive and mechanically bound to authorize **exactly one** replacement final-life attempt.

CLEAR authorizes generation only. It does not mean #39 has scientifically succeeded.

### HOLD

Use if a remaining pre-life ambiguity can be corrected without invalidating the scientific question. State the smallest necessary correction and whether it changes model-visible scientific input.

No replacement final-life cognition may occur while HOLD.

### REDESIGN

Use only for material scientific invalidity: contaminated replacement evidence, post-outcome pass-shopping, forbidden semantic reuse, adaptive thresholding, or another defect that cannot be repaired as bounded pre-life closure.

## Requested response format

```text
VERDICT: CLEAR | HOLD | REDESIGN

B1-B5 closure judgment
- B1: ...
- B2: ...
- B3: ...
- B4: ...
- B5: ...

Blocking findings
- ...

Nonblocking findings / required disclosures
- ...

Freshness and no-life-generation check
- ...

One-shot / retry / durability judgment
- ...

What this verdict authorizes
- ...
```

Cite concrete files/functions for every blocking claim. Do not inspect semantic content from the three completed H-v2 lives to justify a replacement-protocol change; their allowed evidence boundary remains content-invariant mechanical/provenance evidence.