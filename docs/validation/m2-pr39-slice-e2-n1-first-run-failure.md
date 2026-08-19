---
id: validation-m2-pr39-slice-e2-n1-first-run-failure
status: candidate
last-reviewed: 2026-08-19
canonical: false
---

# Milestone #39 — Slice E2 N1 first-run mechanical failure

## Event

The first model execution of the frozen N1 downstream-fertility protocol began on 2026-08-19 with:

```text
source: fibre-m2-pr39-slice-e2-a2b-v3.json
provider: openai
model: gpt-5.1-2025-11-13
trials: 18
horizons: 6, 8, 10
```

Trial 1 started at:

```text
E2-D1
pair 1
horizon 6
```

The Pass-B model call completed and was checkpointed, but canonical Pass-B normalization rejected the generated record before Pass C or the blind rater ran:

```text
MemoryFormation.rememberedContent exceeds 2048 UTF-8 bytes
```

The CLI wrote the failed checkpoint artifact:

```text
fibre-m2-pr39-slice-e2-n1-v1.json
```

No N1 trial completed. No rater answer or correct/incorrect outcome exists. No N1 score was observed.

## Diagnosis

The failure is mechanical form, not a Rich-Life result.

Canonical Pass B already freezes:

```text
maxRememberedContentBytes: 2048
```

The N1 Pass-B response schema permits an unconstrained string for `rememberedContent`, and the N1 Pass-B prompt did not separately restate the byte ceiling. The model therefore produced a raw remembered-memory record whose content exceeded a mechanical bound that the canonical normalizer correctly enforces.

This does not authorize widening the canonical memory limit.

It also does not justify regenerating trial 1's memory-selection decision. The raw Pass-B output was already generated and checkpointed and is burned development evidence.

## Mechanical correction

The Genesis compiler contract already defines this class of failure: one generated record failing a mechanical output/publication shape uses record-level form repair rather than whole-candidate semantic rerolling.

N1 therefore adds an execution-only repair driver with the following discipline:

```text
repairable gate:
  rememberedContent > canonical 2048 UTF-8-byte limit

frozen across repair:
  outcome
  episodeRefs
  uncertainty

repairable field:
  rememberedContent only

repair input:
  the same canonical life_only Pass-B cognition input
  the already-generated raw Pass-B output
  the mechanical byte bound

repair prohibition:
  no new facts
  no new cited episodes
  no durable meaning
  no personality/lesson/future policy
  no quality or distinctiveness target

cap:
  original + at most two form repairs
```

A repaired record must pass the unchanged canonical `normalizePassBModelOutput` validator. A repair that changes the frozen memory selection or still violates the canonical form does not count as admitted output. Exhausting both allowed repair calls produces `record_repair_exhausted` rather than silently rerunning the trial.

## Evidence preservation

The repair path retains a witness containing, at minimum:

- trial ordinal and gate;
- original rejected output and digest;
- original provenance;
- original/repaired remembered-content byte counts;
- repair input digest;
- repair prompt/schema hashes;
- repair provenance;
- repaired output digest;
- whether the frozen selection was preserved;
- whether the repaired form passed canonical normalization.

The original rejected Pass-B output is therefore not overwritten out of the evidence chain.

## Resume rule

The failed artifact must be resumed, not restarted.

The repaired execution consumes the already-checkpointed trial-1 Pass-B decision. It does not make another ordinary Pass-B selection call for trial 1. Once form repair succeeds, Pass C and the rater continue normally, and all later trials retain the same frozen N1 scientific design.

The following remain unchanged:

```text
A2b v3 source artifact
18-trial plan
6/8/10 horizons
source-life assignment
9/9 truth balance
9/9 candidate-order balance
life_only / genome-unexposed Pass-B boundary
Pass-C boundary
blind-rater task
13/18 positive threshold
non-feedback rule
```

This correction occurred before any N1 trial result or aggregate score was observed. It is not a response to weak downstream-fertility evidence.

## Repository implementation

The execution correction is isolated in:

```text
tools/genesis-rich-life-e2-n1-repair-driver.mjs
tools/genesis-rich-life-e2-n1-repair-driver.test.mjs
```

`npm run genesis:e2-n1` routes through the repair-capable driver. The original N1 protocol implementation and canonical Pass-B validator remain unchanged.

No admission verdict is earned by this mechanical failure or its repair.
