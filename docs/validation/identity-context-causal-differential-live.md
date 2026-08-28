---
id: validation-identity-context-causal-differential-live
status: authorized-not-run
last-reviewed: 2026-08-28
canonical: false
---

# Identity Context causal differential — live execution

This record covers only the live execution phase of #40 Slice D. The scientific instrument remains the frozen `identity_context_causal_differential_v1` defined by `identity-context-causal-differential.md` and `tools/gates/identity-context/frozen-causal-differential-v1.mjs`.

## Authorization boundary

Explicit provider authorization was received on 2026-08-28 after the five-pair instrument had been frozen and independently verified provider-free at `816d909972b0666a7d9d3a008560af41badfe01d` with **813 / 813** active tests and zero provider calls.

Before the first provider call, the live model routing was prospectively pinned to the existing `dignity_guardian` configuration:

```text
provider  openai
model     gpt-5.1-2025-11-13
```

The freeze checker now refuses any provider/model routing drift as well as request/prompt/pair drift. There is no model override option in the live runner.

## Sealed runner

The authorized live runner is:

```text
tools/gates/identity-context/identity-context-causal-differential-live.mjs
```

It first reconstructs and verifies the frozen instrument against the canonical read-only born World. It then evaluates exactly ten conditions in the already-frozen counterbalanced order: one canonical and one counterfactual condition for each of the five Threads.

The runner maintains a local crash-safe ledger at:

```text
.fibre/validation/identity-context-causal-differential-v1/live-result.json
```

unless an explicit `--state` path is supplied.

Execution rules:

- a condition is written as `started` before model invocation;
- a valid Guardian result is then written as `completed`;
- completed conditions are skipped permanently on resume and never invoked again;
- a failed or ambiguous previously-started condition blocks automatic resampling;
- operational retries remain only those already internal to the frozen model adapter behavior;
- no scenario, prompt, target-memory, provider, model, cohort, genome, or memory-budget change is permitted after provider use begins;
- the local ledger stores structured decisions, factor effects/evidence refs, model provenance, schema/prompt witnesses, and a rationale digest rather than copying private memory prose.

The prospective interpretation remains unchanged:

```text
CLEAR             3-5 / 5 attributable pairs
MIXED             1-2 / 5 attributable pairs
NOT ESTABLISHED   0 / 5 attributable pairs
```

A pair counts only when a structured action/fit or identity-sensitive factor signature changes and the target or replacement memory is cited in an identity-sensitive factor. Rationale wording alone does not count.

## Authorized command

Local live tools follow the repository's existing `.env` convention using Node's native `--env-file-if-exists=.env` option. The preferred command is the npm script:

```text
npm run identity-context:causal-live -- \
  .fibre/genesis/pr39-closure/pr39-final-cohort-001/birth/world.sqlite \
  --authorized
```

Equivalent direct invocation:

```text
node --env-file-if-exists=.env --disable-warning=ExperimentalWarning \
  tools/gates/identity-context/identity-context-causal-differential-live.mjs \
  .fibre/genesis/pr39-closure/pr39-final-cohort-001/birth/world.sqlite \
  --authorized
```

The `--authorized` flag is intentionally required even though authorization is already recorded here, preventing accidental provider use from invoking the script without an explicit local action.

## Current status

At the time this record was committed, the runner and provider-free ledger regressions had been implemented, the live model had been pinned, and **no live provider call had yet been made**. The scientific result must be recorded exactly as returned by the sealed run, including a valid `MIXED`, `NOT ESTABLISHED`, incomplete, or failure outcome. Slice D itself does not move the Whole-Person score.
