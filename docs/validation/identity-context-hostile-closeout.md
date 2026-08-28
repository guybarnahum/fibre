---
id: validation-identity-context-hostile-closeout
status: active
last-reviewed: 2026-08-28
canonical: false
---

# Identity Context hostile closeout

## Purpose

Slice E closes #40 without generating any new cognition. It attacks the sealed Slice-D `5/5 CLEAR` result as a persisted scientific artifact and verifies that the canonical born World still reproduces the pre-live frozen instrument.

No provider call is part of Slice E.

## Inputs

Canonical born World:

```text
.fibre/genesis/pr39-closure/pr39-final-cohort-001/birth/world.sqlite
```

Sealed local D ledger:

```text
.fibre/validation/identity-context-causal-differential-v1/live-result.json
```

Frozen prospective instrument:

```text
tools/gates/identity-context/frozen-causal-differential-v1.mjs
```

Frozen observed result summary:

```text
tools/gates/identity-context/frozen-causal-differential-result-v1.mjs
```

## Hostile checks

The closeout tool is:

```text
tools/gates/identity-context/identity-context-hostile-closeout.mjs
```

It intentionally constructs the frozen plan with an empty provider environment. It does not construct a model adapter or invoke a provider.

A clear closeout requires all of the following:

- the canonical World re-runs the original provider-free preflight and reproduces the exact frozen five-pair instrument;
- the World is opened through the existing query-only Identity Context inspection path;
- the ledger contains exactly ten completed conditions and no duplicate, omitted, started or failed condition;
- ledger condition order exactly matches the prospectively counterbalanced order;
- FIN, Thread, condition, client request id, capsule digest, model-input digest and response-schema hash match the recomputed frozen plan for every condition;
- prompt digest, provider and model match the prospective freeze;
- the observed response-schema hash matches the expected condition schema;
- compact persisted output contains structured decision/factor refs and a rationale digest only;
- full cognition input, Identity Context capsule, memory prose, remembered meaning, system prompt and rationale prose are absent from the ledger;
- offline recomputation of the scientific evaluator from the ledger reproduces exactly `10/10`, `5/5`, `CLEAR` and the five frozen pair summaries;
- Whole-Person score movement remains forbidden.

The regression test also proves rejection of condition reordering, model-input digest substitution, provider substitution and private-prose injection.

## Maintainer run

Run the focused provider-free regression first:

```text
node --test tools/gates/identity-context/identity-context-hostile-closeout.test.mjs
```

Then run the actual hostile closeout with provider keys deliberately blanked:

```text
OPENAI_API_KEY= FIBRE_GUARDIAN_OPENAI_API_KEY= \
npm run identity-context:hostile-closeout -- \
  .fibre/genesis/pr39-closure/pr39-final-cohort-001/birth/world.sqlite
```

Expected witness:

```text
Identity Context Hostile Closeout: CLEAR

Provider calls: 0
Offline completed conditions: 10/10
Sealed result: 5/5 CLEAR
Frozen instrument reproduced: true
Condition order/digests exact: true
Provider/model exact: true
Compact privacy surface: true
Canonical World query-only: true
```

Then run normal repository validation:

```text
npm test
npm run validate
npm run test:audit -- --check
git diff --check
git status --short
git rev-parse HEAD
```

## Closure rule

If the focused hostile tests, real-ledger closeout and repository validation are all green, Slice E closes and #40 can be marked **CLOSED / CLEAR**.

The resulting #40 standing claim remains narrow:

> bounded provenance-bearing identity/autobiographical context is demonstrably load-bearing in one real cognition consumer and survives sealed replay/privacy/source-substitution closeout.

This does not itself establish M2 or move the Whole-Person score. #41 remains the M2 Standing Gate.