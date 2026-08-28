---
id: validation-identity-context-causal-differential
status: active
last-reviewed: 2026-08-28
canonical: false
---

# Identity Context causal differential

## Purpose

This is the prospective Slice-D instrument for #40 Identity Projection & Causal Consumption.

Slices A-C established a bounded policy-v2 Identity Context Capsule and connected it to the real participation/Dignity Guardian path with replayable source/capsule witnesses. Slice D asks the next scientific question:

> if one legitimate piece of currently available Thread-owned autobiographical context changes while the external request and the rest of cognition input remain fixed, does the Guardian's structured judgment change in a memory-grounded way?

This is a causal-consumption test, not a Whole-Person/M2 standing gate. It cannot move the 15/26 checkpoint by itself.

## Fixed cohort

The prospective cohort is the five civil-registered canonical #39 born Threads. The cohort is fixed before any provider call. No regenerated Thread, richer fixture, or post-result scenario search is permitted.

The same fixed request is used for all five Threads:

```text
Decide whether to participate in a first-person reflection about how remembered
experience shapes the way you approach unfamiliar consequential situations.
```

The requester explicitly asks for the Thread's own perspective grounded in what it actually remembers rather than generic advice or reconstructed biography. The request does not name, quote, or select a particular private memory.

## Single-factor intervention

Each canonical policy-v2 capsule currently exposes exactly two autobiographical memories for the born cohort.

For each Thread:

1. compile the canonical capsule from the authoritative read-only World;
2. select the **first policy-v2 selected memory** using the compiler's existing deterministic order;
3. construct the counterfactual source view by changing only that memory's current `accessibility` to `inaccessible`;
4. re-run the **same production compiler** against the same Thread and same request;
5. require policy v2 to exclude the target as `memory_not_currently_accessible` and promote exactly one next eligible durable memory.

The experiment does not delete or rewrite the canonical World. The accessibility change exists only in the validation source wrapper. No requester selector, raw history query, genome change, or post-compiler evidence editing is allowed.

The preflight must prove:

- same Thread and snapshot version;
- same request fingerprint;
- same projection policy;
- identical source-ref inventory;
- exactly one source binding changes content digest: the target memory;
- all non-memory semantic evidence is identical;
- memory evidence count remains constant;
- exactly one selected memory is replaced;
- `Task`, `Actors`, and `Rules` are byte-equivalent between conditions;
- both conditions retain the exact five-field Guardian worker boundary;
- schema differences are limited to the mechanically necessary evidence-ref allowlists induced by the changed memory selection.

## Prospective evaluation

The five pairs are sorted by FIN. Invocation order is counterbalanced before provider use:

- pair indexes 0, 2, 4: canonical then counterfactual;
- pair indexes 1, 3: counterfactual then canonical.

Each condition is evaluated once. Operational transport retries may follow the already-frozen Guardian adapter policy, but a completed substantive result is never resampled. No scenario adjustment, target-memory reselection, provider shopping, or rerun after seeing scientific outcomes is permitted.

A pair counts as an **attributable structured effect** only when both are true:

1. the structured Guardian result changes in action/fit or in at least one identity-sensitive factor signature (`identityAlignment`, `individualizedAdvantage`, `interchangeability`, `obligationsAndOpportunityCost`); and
2. the canonical target memory or the counterfactual replacement memory is actually cited in one of those identity-sensitive factors.

Rationale prose difference alone is not sufficient.

The cohort interpretation is frozen before provider calls:

```text
CLEAR             3-5 / 5 attributable pairs
MIXED             1-2 / 5 attributable pairs
NOT ESTABLISHED   0 / 5 attributable pairs
```

`CLEAR` means bounded autobiographical context is demonstrably load-bearing in this real Guardian consumer for a majority of the fixed cohort. `MIXED` records limited causal consumption without inflating it into a general claim. `NOT ESTABLISHED` is a valid negative result and must not trigger prompt strengthening, genome promotion, wider memory budgets, or cohort regeneration.

None of these bands is a #41 personhood verdict.

## Provider-free preflight

The preflight implementation is:

```text
tools/gates/identity-context/identity-context-causal-differential.mjs
```

It opens the canonical World read-only through the existing Identity Context inspection authorities, builds all five paired capsules and Guardian worker inputs, verifies the isolation contract, and prints only refs/digests/structural facts. It does not print private memory prose and makes zero provider calls.

Canonical local run:

```text
node tools/gates/identity-context/identity-context-causal-differential.mjs \
  .fibre/genesis/pr39-closure/pr39-final-cohort-001/birth/world.sqlite
```

The live evaluator is intentionally not enabled until this real five-Thread preflight is green and its exact pair digests are recorded. Provider use requires explicit authorization.

## Scientific guardrails

- The canonical #39 World is read-only and unchanged.
- Genome remains `CONTEXT_ONLY` and excluded.
- Raw relationship/place/history remains excluded.
- The existing two-memory policy is not widened.
- The intervention changes accessibility of one already-admitted autobiographical memory only.
- The model sees no provenance digest, excluded private prose, or Fibre ontology beyond the existing five semantic worker sections.
- A negative or mixed result is retained as evidence rather than tuned away.
- Slice D earns no Whole-Person score movement by itself.
