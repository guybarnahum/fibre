---
id: m2-pr39-h2-final-cohort-hold-result
status: accepted
last-reviewed: 2026-08-21
canonical: false
---

# Milestone #39 — H-v2 final cohort operational HOLD

## Result

**HOLD — the single authorized H-v2 final-cohort attempt did not produce a complete five-Thread cohort.**

Frozen evidence commit:

```text
8ccbb7a7e5b85217327abb1cf0e70207b8782604
```

Frozen output root:

```text
artifacts/validation/m2-pr39/h/cohort-v2/
```

The attempt began at `2026-08-21T04:42:53.175Z` and failed at `2026-08-21T04:49:18.295Z` with:

```text
GenesisPassAValidationError
rich Pass-A record generation exhausted after 3 generated versions
gate: record_repair_exhausted
```

This is an explicit G6 operational-HOLD condition: a final-cohort Thread failed to reach mechanical integrity within the frozen Pass-A repair/retry cap.

## What completed before failure

Exactly three Thread generations completed:

```text
slot 1  thr_pr39_g2_04  Cần Thơ
slot 2  thr_pr39_g2_05  Łódź
slot 3  thr_pr39_g2_01  Cusco
```

For each completed Thread, H-v2 produced:

- 10 admitted Pass-A life episodes;
- all 6 frozen Pass-B memory-formation calls;
- corresponding Pass-C initial-meaning calls for remembered outcomes;
- any frozen-scheduler reinterpretation calls selected for that Thread.

The H-v2 transport witness records 18 projected Pass-B provider requests, exactly six for each of the three completed Thread generations, using:

```text
canonical Pass-B schema
sha256:846f94bdeef2d874498751205dffb548ea88cf55cb30c0cf0f9bdd7e17f4bf1a

OpenAI transport schema
sha256:9c5c75641d46306cac8df457fc4495e09b53db4a930b9f5fe3f8e75863d3556c
```

The transport compatibility correction therefore worked during real final-life cognition. The H-v2 failure is unrelated to the H-v1 Structured Outputs defect.

## Failure point

Slot 4 (`thr_pr39_g2_03`, Accra) failed during Pass A, episode 3.

The frozen runner attempted the initial record, bounded repair, and bounded record retry. After three generated versions the record still failed mechanical validation, so `generateRichPassAEpisode` raised `GenesisPassAValidationError` with gate `record_repair_exhausted`.

The cap was not increased and the record was not regenerated again.

## Publication status

**No Thread was published.**

The H runner intentionally completes generation for all five cohort members before calling `publishCohort`. Because slot 4 failed before generation completed, publication never began.

The committed `cohort-v2` root therefore contains exactly:

```text
h-attempt-start-v1.json
h-final-cohort-failure-v2.json
h2-transport-compatibility-v1.json
thread-slot-01-generation-v1.json
thread-slot-02-generation-v1.json
thread-slot-03-generation-v1.json
```

There is no `world.sqlite`, no publication record, and no five-Thread result artifact.

## G6 interpretation

The frozen G6 protocol states:

- repair exhaustion within a frozen cap is an operational HOLD;
- inability to produce the complete first integrity-valid five-Thread cohort under the frozen one-attempt rule is an operational HOLD;
- quality-driven regeneration is forbidden;
- the first attempt and every partial result must remain preserved;
- a later compiler revision, if methodologically permitted, must use a separately versioned cohort and never replace this one.

Accordingly:

```text
H-v1: operational HOLD, provider-schema request rejection before first Pass-B response
H-v2: operational HOLD, Pass-A record-repair exhaustion after three Threads completed A/B/C cognition
```

H-v2 must never be rerun.

## Diagnostic consequence

Do **not** run the frozen G5 final-cohort diagnostics on this partial three-Thread artifact as though it were the preregistered cohort. G5/G6 were frozen for the complete five-Thread cohort and their thresholds cannot be reinterpreted after observing partial H output.

The three completed generations remain evidence and may be inspected only for integrity/provenance and for explicitly non-decision-bearing characterization. Their scientific outcomes must not be used to tune a replacement cohort, retry cap, treatment assignment, genome selection, World selection, diagnostic threshold, or success criterion.

## Next decision boundary

A blocking Gate-H review is required before any new life generation or #40 work.

The review must determine:

1. whether this operational HOLD is correctly classified under frozen G6;
2. whether #39 remains open/HOLD because no final Thread was published;
3. whether a new separately preregistered cohort (for example H-v3) can be methodologically legitimate after partial A/B/C outcomes from H-v2 have already been observed;
4. if a new experiment is allowed, what authority must be reset or re-frozen before generation so it is not adaptive regeneration of H-v2;
5. whether any mechanical Pass-A reliability amendment may be justified from the failure mode alone without using the semantic content of completed H-v2 lives;
6. whether #40 must remain blocked until #39 produces a valid published cohort.

Until that review is CLEAR on a specific next protocol, there is no authorized provider call for #39.
