---
id: m2-pr39-replacement-attempt1-mechanical-failure
status: preserved-failure
last-reviewed: 2026-08-23
---

# #39 replacement attempt 1 — preserved mechanical failure

## Standing

The first and only attempt authorized by Gate-G(2) round 4 started at `2026-08-23T07:14:24.267Z` and terminated mechanically before the first Pass-B model inference completed.

This is a **terminal HOLD for the original one-shot runner**. It is not a scientific verdict about the replacement cohort and it does not authorize a second attempt, quality regeneration, provider/model substitution, or deletion/editing of the failed-attempt artifacts.

## Mechanical facts

- Gate-G(2) CLEAR witness and execution binding were valid at attempt start.
- Runtime: `openai/gpt-5.1-2025-11-13`.
- Slot 1 produced ten successful Pass-A provider responses, all durably committed under the frozen request identities.
- The durable journal contains exactly 10 committed invocation records.
- The first Pass-B request was `pr39-replacement-final-life-v1:slot-01:pass-b:call-01:initial`.
- OpenAI rejected that request before a model response with HTTP 400 / `invalid_json_schema`: `episodeRefs.uniqueItems` is not permitted by the provider Structured Outputs schema subset.
- No Pass-B response was durably committed.
- `completedThreadGenerations` is empty.
- No replacement Thread was published and no replacement final-cohort result exists.

## Frozen local evidence

The local evidence remains intentionally untracked under:

`artifacts/validation/m2-pr39/replacement-v1/final-cohort-v1/`

The mechanical recovery binding records exact SHA-256 values for the attempt-start artifact, terminal failure artifact, and all ten durable journal records:

`artifacts/validation/m2-pr39/replacement-v1/protocol/replacement-mechanical-recovery-v1.json`

The terminal failure itself remains the authority for the failed attempt. Do not delete, rename, truncate, edit, or replace it to force the old runner to resume.

## Recovery boundary

A possible same-attempt recovery is being prepared, but is **not authorized** yet.

The recovery design preserves Fibre's canonical Pass-B schema and its frozen hash. Provider-incompatible JSON-Schema keywords are projected only at the OpenAI transport boundary, while the projected canonical constraints are re-enforced locally after parsing. The OpenAI adapter configuration object remains unchanged so the durable request identity of the ten successful Pass-A calls can remain compatible.

If recovery is later independently cleared, it must:

1. preserve the original attempt-start, terminal-failure and ten journal records unchanged;
2. keep the same `attemptStartedAt` and scientific inputs;
3. replay the ten successful Pass-A invocations from the durable journal without provider calls;
4. make the previously rejected slot-1 Pass-B call-01 request the first new provider operation;
5. preserve provider/model, Worlds, genomes, assignment, treatment, thresholds and quality policy;
6. never use semantic inspection of the generated Pass-A content to justify a recovery change.

Until a separate recovery review returns CLEAR and a bound recovery witness exists, **replacement cognition is not authorized**.
