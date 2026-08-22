---
id: m2-pr39-replacement-cohort-reset-plan
status: r0_clear_r1_r4_frozen_pre_implementation
last-reviewed: 2026-08-22
canonical: false
---

# Milestone #39 — replacement cohort reset plan

## Authority

Gate H returned CLEAR only for preparing a separately preregistered replacement cohort. This plan authorizes no cohort provider calls.

The replacement attempt is not a continuation of H-v2. H-v2 remains frozen at `8ccbb7a7e5b85217327abb1cf0e70207b8782604` and may not be resumed, repaired or selectively reused.

## Anti-adaptation rule

All replacement decisions must be supportable without reading accepted semantic content from H-v2.

Permitted evidence:

```text
failed gate names
client request IDs
UTF-8 byte lengths
counts
timestamps
digests
code structure
```

Forbidden design inputs:

```text
remembered content
Pass-C meaning
reinterpretation yield
G5 metrics
matched-vs-swapped results
per-Thread quality judgments
semantic comparisons among H-v2 lives
```

The frozen permitted evidence is `artifacts/validation/m2-pr39/h/protocol/h2-mechanical-forensics-v1.json`.

## Phase R0 — evidence layer — CLEAR

R0 is verified in `docs/validation/m2-pr39-r0-evidence-layer-verification.md` at maintainer head `954e2b5d4e77b45e6ef0f832814351247aa94f3a`:

```text
648/648 tests
build PASS
repository/world-seed validation PASS
H-v2 preflight: ATTEMPT FROZEN — EXECUTION BLOCKED
zero provider calls
```

The verified evidence layer:

1. records both OpenAI prompt digest conventions in model events;
2. keeps H-v2 inspection usable after the attempt root exists while preserving execution refusal;
3. provides a rich future failure serializer retaining cause gate, calls, repairs, record retries, rejected-content evidence and terminal record;
4. tests those repairs.

## Phase R1 — G4-v3 mechanical reliability amendment — FROZEN PRE-IMPLEMENTATION

Canonical freeze:

```text
artifacts/validation/m2-pr39/g/protocol/g4-pass-a-reliability-amendment-v3.json
```

The amendment is limited to the Pass-A retry ladder.

### Frozen budgets

```text
initial generated version          1
max form repairs                   2
max referential record retries     2
hard total generated versions      5
```

Form-repair and record-retry budgets are independent. Neither resets the other. Every provider-generated initial, repair or retry output counts against the five-version hard termination bound.

### Frozen initial form control

The authoritative admission limit remains exactly:

```text
observableAction <= 1200 UTF-8 bytes
```

G4-v3 adds only a non-admission generation target:

```text
initial / record-retry target <= 800 UTF-8 bytes and <= 100 words
```

Missing the 800/100 target by itself may never reject a record. Existing repair targets remain 600 bytes/80 words, then 300 bytes/40 words.

### Frozen non-changes

G4-v3 may not change:

```text
Pass-A semantic admission rules
World/genome authority boundary
Pass-A genome blindness
EventStructure gate classifications
Pass-B not_remembered legality
Pass-B genome-copy exclusion
Pass-B treatment rule
Pass-C authority or memory scope
publication semantics
provider/model
G5/G6 authority
```

Implementation must match the frozen v3 artifact exactly and pass local verification before any calibration provider call.

## Phase R2 — fresh material

The replacement cohort must have new:

```text
Thread IDs
Genesis IDs
Worlds
World authorship witnesses
genome material
genome IDs
World↔genome assignment
treatment schedule instance
generation/offer seeds
cohort output root
```

No H-v2 generation, accepted episode, World↔genome pairing or genome ring may be reused.

### Blind-authoring disclosure

Each new World and genome artifact must carry a disclosure that its authoring process had no access to H-v2 semantic generations, G5 diagnostics or outcome comparisons. Where possible, material authoring should be delegated or compartmentalized so this claim is operationally true rather than merely aspirational.

## Phase R3 — inherited authority manifest

The replacement preregistration must pin, byte-identically where applicable:

```text
G3 treatment rule: L L T L L T
G5 evaluation surfaces
G5 normalizer/rater identities
G5 transformations and metric bands
G6 D1-D5 thresholds
G6 verdict precedence
OpenAI provider/model: gpt-5.1-2025-11-13
Pass-B genome-copy gate
publication rules
```

The treatment **instance** is fresh; the treatment **rule** is inherited.

The analysis plan must not be re-derived from H-v2.

## Phase R4 — off-cohort calibration — FROZEN PRE-EXECUTION

Canonical freeze:

```text
artifacts/validation/m2-pr39/g/protocol/g4-v3-off-cohort-calibration-freeze-v1.json
```

Before any replacement cohort cognition, run exactly 225 predetermined non-cohort Pass-A trials using 15 synthetic calibration Worlds × 15 deterministic trial variants. Inputs must be fully constructed before the first provider call and may contain no H-v1/H-v2 World, genome, Thread/genesis identity, semantic life output, or any replacement-cohort material.

### Frozen acceptance

All conditions are required:

```text
mechanically admitted records                 225 / 225
terminal mechanical exhaustions                0 / 225
initial drafts <= authoritative 1200 bytes   >=203 / 225 (>=90%)
Laplace episode survival estimate              (successes + 1) / (225 + 2)
estimated 50-episode completion                 estimate^50 >= 0.80
```

For 225/225 mechanical survival, the predeclared Laplace estimate is `226/227 = 0.9955947136563876`, giving `0.8019164044061948` estimated probability for fifty consecutive episode survivals.

Calibration may measure only form/reference mechanics, gate census, byte lengths, repair/retry counts and provenance. It may not score semantic quality, memory, meaning, genome propagation or reinterpretation.

If calibration fails any frozen threshold, HOLD before life and version any amendment explicitly. Never lower a threshold after seeing calibration output.

## Phase R5 — Gate-G(2)

Request a second blocking Gate-G review only after R0–R4 are complete.

Gate-G(2) must verify:

1. H-v1 and H-v2 remain immutable;
2. R0 evidence repairs are tested and non-semantic;
3. G4-v3 implementation exactly matches the frozen mechanical amendment;
4. fresh material has no H-v2 reuse;
5. blind-authoring disclosures are present;
6. G5/G6 and provider/model authority are inherited rather than retuned;
7. calibration passed its predeclared threshold;
8. no replacement cohort cognition exists yet; and
9. the replacement output root is absent.

Only `VERDICT: CLEAR` from Gate-G(2) may authorize replacement final-life generation.

## #40 parallel boundary

#40 architecture may proceed in parallel against #38-era Threads and synthetic fixtures. It must not depend on, cite or validate against H-v2 or any replacement-cohort material before #39 publishes a valid cohort.

#41 remains blocked until #39 produces the required published individuals.
