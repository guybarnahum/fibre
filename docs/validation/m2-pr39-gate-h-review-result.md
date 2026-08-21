---
id: m2-pr39-gate-h-review-result
status: clear_replacement_preregistration_only
last-reviewed: 2026-08-21
canonical: false
---

# Milestone #39 — Gate H review result

## Verdict

**CLEAR — only for authoring a separately preregistered replacement cohort.**

This verdict authorizes **zero provider calls on cohort material**. A new final-life attempt remains blocked until a complete replacement packet is frozen and a second blocking Gate-G review, Gate-G(2), returns CLEAR.

H-v2 remains an immutable operational HOLD at evidence commit:

```text
8ccbb7a7e5b85217327abb1cf0e70207b8782604
```

No H-v2 life, episode, genome assignment, seed, treatment instance or partial generation may be reused in the replacement cohort.

## Reviewer discipline

The reviewer declared an outcome-blind evidence basis before making the amendment recommendation. Quantitative claims were derived only from:

- failed gate names;
- client request IDs;
- UTF-8 byte lengths of `observableAction`;
- digests;
- counts;
- timestamps; and
- code structure.

The reviewer did **not** read accepted semantic content from the three completed H-v2 lives: no remembered content, durable meaning or Pass-C output was used to justify the amendment.

That evidence boundary is load-bearing. The replacement protocol may cite the mechanical forensic artifact, but not semantic observations from H-v2.

## H-v2 classification

H-v2 is correctly classified as HOLD, not REDESIGN.

Frozen G6 already states:

```text
repairExhaustion = HOLD under operationalHoldTriggers
```

The attempt hit both relevant operational HOLD conditions:

- a final-cohort Thread could not reach mechanical integrity within the frozen repair/retry cap; and
- the complete first integrity-valid five-Thread cohort could not be produced under the frozen one-attempt rule.

No frozen REDESIGN trigger was found to have fired.

## Mechanical failure diagnosis

The important mechanism is that `maxGeneratedVersionsPerRecord = 3` is a shared counter across two distinct mechanical failure classes:

1. form repair, such as `pass_a_observable_action_bounds`; and
2. referential record retry, such as `pass_a_structure_participation`.

Slot 4 episode 3 spent its versions as:

```text
v1 initial       -> observable_action_bounds
v2 form repair   -> structure_participation
v3 record retry  -> structure_participation -> exhausted
```

Thus the record received only one substantive retry for referential conformance after form repair consumed part of the shared budget.

The frozen mechanical census is recorded separately in:

```text
artifacts/validation/m2-pr39/h/protocol/h2-mechanical-forensics-v1.json
```

The primary permitted amendment is therefore structural and outcome-independent:

> Form repairs and record retries must have independent bounded budgets rather than consuming one shared generated-version counter.

This defect is visible by code reading alone and does not require semantic H-v2 outcomes to justify it.

## Replacement cohort — mandatory reset

The replacement must use fresh experimental material:

```text
new cohort/thread/genesis identities
new Worlds
new genome material
new World↔genome assignment
fresh treatment-schedule instance under the inherited treatment rule
fresh generation/offer seeds
new Gate-G(2) witness
```

The previous five-genome set is consumed for the replacement experiment because substantive output exists for three nodes in the frozen D3 ring, including two blocking core edges with both endpoints fully generated.

The three completed H-v2 generations and slot 4's accepted episodes may never be reused. Reuse would create survivorship selection on the mechanical gate being amended.

## Authority that must remain unchanged

The replacement is a fresh sample under the **same analysis authority**. These must be inherited rather than re-derived from H-v2:

```text
G5 evaluation surfaces
G5 raters and normalizers
G5 transformations and metric bands
G6 D1-D5 thresholds
G6 CLEAR/HOLD/REDESIGN precedence and rules
L L T L L T treatment rule
provider/model: openai/gpt-5.1-2025-11-13
Pass-B genome-copy gate
Pass-B not_remembered legality
Pass-C authority split
publication semantics
```

Changing a diagnostic threshold, comparison, transformation or candidate scope after H-v2 would itself be a REDESIGN violation.

## G4-v3 permitted amendment boundary

Before any replacement life cognition, Fibre may author a versioned G4-v3 reliability amendment limited to the Pass-A mechanical form/reference ladder.

Primary amendment:

- separate the form-repair and record-retry budgets;
- keep both finite;
- keep an explicit total termination bound;
- do not change semantic admission, genome visibility, Pass-B or Pass-C policy.

Any prompt form-control amendment is secondary and must be justified only from the content-invariant mechanical forensic record and validated using non-cohort calibration inputs before Gate-G(2).

## Off-cohort calibration

Calibration is permitted only before replacement cognition and only under a predeclared target.

It must use:

- no frozen G1 World;
- no frozen G2 genome;
- no cohort Thread/genesis identity;
- a separate non-cohort artifact root;
- content-invariant form/referential measurements only.

The expected replacement-cohort completion probability must be declared from this calibration before Gate-G(2), so another operational HOLD is interpretable rather than surprising.

## H-v2 diagnostic boundary

Do not run G5 on the three completed H-v2 generations, including any convenient subset such as D2.

Permitted H-v2 characterization is restricted to content-invariant provenance/integrity facts: counts, digests, gate names, timings and byte lengths. No matched-vs-swapped comparison, rater output, G5 metric or semantic per-Thread summary may be computed.

## Evidence-layer repairs before the next attempt

Gate H identified three evidence-layer repairs:

1. model events must expose both raw-text and canonical-JSON prompt digests so frozen and runtime digest conventions cannot be mistaken for prompt drift;
2. future final-cohort failures must preserve rich repair/retry evidence (`cause.gate`, calls, repairs, record retries, rejected-content evidence, terminal record) rather than only the top-level error;
3. post-attempt H-v2 inspection must report the frozen output root while execution continues to refuse rerun, rather than making the inspection helper itself permanently untestable.

These repairs are evidence/instrumentation changes. They do not authorize cohort cognition and must be included explicitly in Gate-G(2)'s reviewed source boundary.

## #39 / #40 / #41 standing

#39 remains open. No final five-Thread cohort was produced or published, so its scientific standing claim remains unmet.

A narrower implementation fact may be recorded: the three-pass Genesis compiler executed end-to-end final-life cognition for three provisional Threads before the frozen operational stop. This is implementation evidence only, not cohort evidence.

#40 architecture is **not blocked wholesale**. It may develop Identity Projection & Causal Consumption contracts, provenance selection, capsule construction, counterfactual machinery and append-only consumption semantics against #38-era Threads and synthetic fixtures. It may not use H-v2 artifacts as validation evidence or claim #39 standing.

#41 remains blocked on #39 producing the non-interchangeable published individuals required for the M2 standing gate.

## Next gate

No new final life may be generated until all of the following are complete:

1. evidence-layer repairs verified locally;
2. H-v2 mechanical forensics frozen;
3. G4-v3 mechanical reliability amendment frozen;
4. complete fresh cohort material/reset preregistered;
5. off-cohort calibration passes its predeclared target; and
6. blocking Gate-G(2) returns CLEAR.

Gate-G(2), not this Gate-H verdict, is the authority that may reopen final-life generation.
