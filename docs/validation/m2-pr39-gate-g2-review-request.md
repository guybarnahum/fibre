---
id: m2-pr39-gate-g2-review-request
status: ready_after_local_verification
last-reviewed: 2026-08-22
canonical: false
---

# Milestone #39 — blocking Gate-G(2) review request

## Requested verdict

Return exactly one top-level verdict:

```text
CLEAR
HOLD
REDESIGN
```

This is a **blocking pre-life review**. The request itself authorizes **zero replacement final-life provider calls**. Only a recorded Gate-G(2) `CLEAR` may reopen replacement childhood/life generation.

Review the actual repository evidence, not this summary alone.

## Review boundary

Scientific/reconciliation candidate head before this request document:

```text
8758b6d691f570912f36b68b22742692b678e04e
```

Fresh G2 evidence was frozen by the maintainer at:

```text
bfe89c8
```

Maintainer verification of the post-G2 reconciliation head is **pending** at request-authoring time. Before this request is sent for final external judgment, the maintainer must report:

```text
node --disable-warning=ExperimentalWarning tools/genesis/genesis-replacement-g56-reconciliation-verify.mjs --verify
npm test
npm run validate
```

all green. Do not infer that verification from this request.

## Question to answer

> Has Fibre frozen a complete, internally consistent, non-adaptive replacement #39 experiment that may now generate exactly one first mechanically integrity-valid five-Thread cohort, without reusing failed-cohort material, adapting to final-life outcomes, or laundering genome/identity information across pass boundaries?

The review should be adversarial in Fibre's normal vision-effectiveness and experimental-integrity sense, not merely a security review.

## Why Gate-G(2) exists

The first H-v2 final-cohort attempt ended in operational HOLD. The later bounded recovery also ended in recovery-only HOLD. Gate H permitted only a **fresh replacement preregistration**, not another life-generation call.

The replacement therefore reset experimental material while preserving analysis authority:

- new Thread/genesis identities;
- five new Worlds;
- fresh genome material;
- fresh World↔genome assignment;
- fresh treatment/scheduling instance under the inherited rule;
- fresh seeds and output root;
- unchanged pass boundaries, provider/model authority, publication semantics and diagnostic intent.

No H-v2 or recovery life, episode, genome assignment, seed, treatment instance or partial generation may enter the replacement cohort.

Canonical prior decision:

```text
docs/validation/m2-pr39-gate-h-review-result.md
```

## Fresh replacement material

### G1 Worlds

Five replacement Worlds were authored and frozen before replacement genomes existed:

```text
Tbilisi
Kaohsiung
Recife
Fès
Hobart
```

Cold familiarity returned CLEAR for all five. Final WorldSpecs are frozen under:

```text
artifacts/validation/m2-pr39/replacement-v1/worlds/
```

Result:

```text
artifacts/validation/m2-pr39/replacement-v1/results/rg1-world-familiarity-v1.json
```

### G2 genomes and assignment

Five fresh six-locus symbolic genomes were frozen, including the inherited `3 de_novo + 2 synthetic_lineage` composition. The World↔genome mapping was selected mechanically within origin class from digests rather than semantic pairing discretion.

Protocol:

```text
artifacts/validation/m2-pr39/replacement-v1/protocol/rg2-cohort-genome-freeze-v1.json
```

Exact frozen protocol digest:

```text
sha256:7d8f7fbf481e7a4bd404c0757fbc7c40418cd142b9b8f2a3da294820692e2f91
```

## Fresh G2 ceiling — observed pre-life result

The inherited `genesis-genome-specificity-control-v3` instrument was run once on the fresh genomes:

```text
p01  22/24
p02  24/24
p03  24/24
p04  22/24
p05  23/24
```

All five measured cycle edges are detectable; every genome is incident to detectable edges. Descriptive aggregate: `115/120 (95.8%)`.

Canonical result:

```text
artifacts/validation/m2-pr39/replacement-v1/results/rg2-cohort-genome-specificity-ceiling-v1.json
```

This is **instrument/ceiling evidence only**, not personhood evidence and not proof that genome signal will propagate through childhood/memory.

No G2 rerun, genome rewrite, provider swap or result deletion is authorized.

## The one topology-dependent reconciliation

This is the main seam the reviewer should attack.

Original G5 already measures all five cycle edges and freezes these ordinal bands:

```text
5/5   detectable_reference
4/5   suggestive
0-3/5 inconclusive
```

Original G6 excluded measured pair `3-4` from its blocking D3 propagation core because the **old cohort's** G2 pair `3-4` had a low/inconclusive ceiling. Its blocking four-edge rule required:

```text
both primary ordinals >= 3/4
and at least one primary ordinal = 4/4
```

The fresh replacement pair `3-4` is now `24/24 strong_ceiling_signal`. Applying the old exemption would therefore import an empirical property of the old genomes into new people.

The explicit pre-life amendment is:

```text
artifacts/validation/m2-pr39/replacement-v1/protocol/rg5-g6-fresh-g2-reconciliation-v1.json
```

It leaves G5 measurement unchanged, uses all five fresh detectable cycle edges, and translates the blocking D3 rule to:

```text
both primary ordinals >= 4/5
and at least one primary ordinal = 5/5
```

Rationale: preserve the already-frozen G5 five-edge bands and the old G6 structure of requiring a strong/suggestive result at both fixed ordinals plus a perfect result at least once. No replacement life outcome existed when this rule was frozen.

Everything else is declared unchanged: D1, D2, D4, D5, D3 score transform, negative control, exposed-propagation interpretation, normalizer, rater, randomization, deidentification, analyzability rules, verdict precedence, REDESIGN triggers, operational HOLD triggers, no-quality-regeneration rule and first-integrity-valid-cohort freeze rule.

Zero-call verifier:

```text
tools/genesis/genesis-replacement-g56-reconciliation-verify.mjs
```

## G4-v3 mechanical reliability

The replacement inherits the separately reviewed G4-v3 mechanical reliability amendment:

```text
initial versions        1
form repairs            <= 2
referential retries     <= 2
hard total versions     <= 5
```

The form and referential budgets are independent; neither resets the other. Different numeric budgets require a new pre-life version.

Off-cohort calibration admitted `225/225` episodes with zero terminal mechanical failures. The recovery outcome did not widen these budgets.

Canonical artifacts include:

```text
artifacts/validation/m2-pr39/g/protocol/g4-pass-a-reliability-amendment-v3.json
artifacts/validation/m2-pr39/g/protocol/g4-v3-durable-development-verification-v1.json
```

## Durability / Birth Center

Successful provider calls are durably journaled before admission. Restart replays committed successful responses, resumes the first unfinished invocation, preserves repair/retry budgets and rejects witness drift/corruption.

Birth Center owns provisional Genesis workflow state only. World Kernel retains live validation and atomic `publishBirth()` authority.

Canonical architecture:

```text
docs/architecture/genesis-durable-development-v1.md
docs/architecture/birth-center-runtime-v1.md
```

The failed H-v2 recovery supplied live negative evidence that a successful provider response was durably committed before the frozen mechanical policy rejected it.

## Replacement life state at this gate

Required and claimed:

```text
replacement childhood episodes generated: 0
replacement memories generated:          0
replacement meanings generated:           0
replacement published lives:              0
final-life cognition authorized:           false
```

The five replacement Threads are still unborn in the #39 sense.

## Required hostile attacks

Please explicitly answer these, even if the answer is “no defect found.”

1. **Freshness / survivorship:** Is any H-v2 or recovery semantic material, identity, World, genome, assignment, seed, treatment instance or partial life being reused directly or indirectly?
2. **World-before-genome discipline:** Were final replacement Worlds genuinely frozen before replacement genome authoring, or can the genome values be read as geographic/demographic back-fitting?
3. **G2 meaning:** Is the fresh 5/5 strong ceiling correctly treated only as direct genome distinguishability, rather than evidence that Genesis already created distinctive people?
4. **Topology reconciliation legitimacy:** Is removing the old pair-3-4 exemption logically required by the fresh G2 result, or is it an outcome-driven opportunity to strengthen/change the final test?
5. **Threshold translation:** Is `>=4/5 at both ordinals and 5/5 at least once` a defensible structural translation of the frozen `>=3/4 at both and 4/4 at least once` rule plus the already-frozen G5 five-edge bands? If not, HOLD before life and state the smallest non-adaptive correction.
6. **Hidden G5/G6 drift:** Did anything beyond topology-dependent G2 eligibility/threshold arithmetic change after the first H attempt?
7. **Pass leakage:** Can genome, parent loci, treatment-derived information, future role/benchmark, remembered meaning or Fibre-computed needs/conditions reach Pass A or another forbidden pass surface?
8. **Retry selection:** Does G4-v3 repair/retry machinery repair mechanical form/reference failures without becoming quality-driven life selection?
9. **Durable retry evidence:** Can restart or journal replay reset budgets, regenerate accepted past, or substitute a different response under the same invocation identity?
10. **Birth authority:** Can provisional Birth Center state leak into live Thread authority before atomic publication?
11. **One-shot discipline:** After Gate-G(2) CLEAR, is there any path to regenerate a weak but mechanically valid Thread, change provider/model, move treatment positions, alter thresholds, or choose a better cohort?
12. **Claim discipline:** Would a CLEAR here authorize only the one replacement final-life generation attempt, without upgrading #39 to Whole-Person or causal standing?

## Verdict meanings

### CLEAR

Use only if the complete replacement protocol is internally consistent and non-adaptive enough to authorize **exactly one** replacement final-life generation attempt under the frozen rules.

CLEAR does not mean #39 succeeded scientifically. It authorizes generation so the frozen diagnostics can find out.

### HOLD

Use when the experiment is not yet safe to run but can be corrected pre-life without invalidating the scientific question—for example an ambiguous topology translation, incomplete binding, missing zero-call verification, or unresolved freshness proof.

No replacement final-life cognition may occur while HOLD.

### REDESIGN

Use only if the replacement experiment is materially invalid—for example outcome-driven threshold selection, contamination by failed-cohort semantic material, forbidden pass leakage, or another protocol-integrity failure that cannot be repaired as a bounded pre-life clarification.

## Requested response format

Please respond in this order:

```text
VERDICT: CLEAR | HOLD | REDESIGN

Blocking findings
- ...

Nonblocking findings / required disclosures
- ...

Freshness and no-life-generation check
- ...

G5/G6 reconciliation judgment
- ...

What this verdict authorizes
- ...
```

Cite concrete files/functions for every blocking claim. Do not inspect semantic content from the three completed H-v2 lives to justify a replacement-protocol change; the allowed H-v2 evidence boundary remains content-invariant mechanical/provenance evidence.
