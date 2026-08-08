---
id: validation-semantic-guardian-v3-cycle-v2
status: accepted
last-reviewed: 2026-08-08
canonical: true
---

# Semantic Dignity Guardian v3 — acceptance cycle v2

Acceptance cycle `semantic_guardian_v3_acceptance_v1` is historical and remains **failed/sealed**. Its first live execution reached the OpenAI API but produced **zero authoritative model judgments** because every provider attempt returned HTTP 429 billing-quota exhaustion (`no credits remaining`). The v1 artifact therefore contains only operational failures and earns no semantic evidence or score movement.

This document creates `semantic_guardian_v3_acceptance_v2`. It does not reinterpret, delete, or repair v1.

## What remains frozen and unchanged

v2 inherits the cognition boundary from [`semantic-guardian-v3-freeze.md`](semantic-guardian-v3-freeze.md) unchanged:

- Guardian policy `dignity_guardian@3`;
- model snapshot `gpt-5.1-2025-11-13`;
- system-prompt SHA-256 `sha256:fa5df59a0f1fd45d080dbad9ca380cee7dc93739ceab657a687dea8102be1c73`;
- response-schema SHA-256 `sha256:cf2ffad0721798790350b1a5a741da01d0b81ded1d02154dde12fdd2eefb0fad`;
- strict structured output, no tools, provider storage disabled;
- `temperature=0`, `top_p=1`, reasoning effort `none`, max output tokens `2000`;
- `k=5` judgments per repeated condition and stable agreement threshold `4/5`;
- every semantic acceptance family, request, Thread fixture, paraphrase, contradiction, injection probe, Semantic State case, expected action, and score rule from v1.

The semantic cases may be reused because v1 produced no model response to inspect and therefore supplied no semantic tuning signal. Any v2 model judgment, whether passing or failing, closes that privilege: changing semantic cases or expectations after a v2 judgment requires another frozen acceptance cycle.

## Operational change in v2

HTTP status alone is not sufficient to classify a provider failure. In particular, HTTP 429 can mean either a transient rate limit or a non-recoverable billing/quota condition.

The v2 adapter therefore classifies provider failures into **retryable** and **terminal** categories.

### Retryable failures

Transient failures such as ordinary rate limiting, transport errors, timeouts, incomplete responses, and retryable server failures keep the existing frozen retry envelope:

- initial provider attempt plus at most `2` retries;
- fixed `2000 ms` retry delay;
- only the eventual authoritative judgment counts toward `k`;
- every failed attempt is journaled;
- exhausting the retry cap fails and seals the cycle under the existing rule.

### Terminal failures

Failures that cannot be repaired by waiting and repeating the same request are terminal. The current terminal classes include:

- billing/quota exhaustion, including OpenAI `insufficient_quota` / `no credits remaining` responses;
- authentication failure (`401`);
- permission failure (`403`);
- invalid request/model/configuration classes (`400`, `404`, `405`, `422`).

On a terminal provider failure:

1. the adapter performs **no retry** for that request;
2. a provider circuit breaker prevents any later acceptance case from issuing another HTTP request;
3. the command reports one structured actionable failure reason;
4. if **zero authoritative model judgments** exist, the run is `blocked`, writes no sealed evidence artifact, removes the temporary journal, and v2 remains unsealed so the external billing/auth/configuration problem can be corrected;
5. if **one or more authoritative judgments** already exist, the cycle is `failed` and sealed with the partial evidence, because semantic results have already been observed.

This rule prevents a known non-recoverable billing error from being repeated across the acceptance suite while preserving the evidentiary boundary once cognition has actually occurred.

## v1 historical result

The v1 result remains:

```text
status                         failed
cycle sealed                   yes
authoritative model judgments  0
standing gate                  red
score movement                 none
cause                           terminal OpenAI API billing-quota exhaustion
```

The v1 result is infrastructure evidence only. It says nothing about whether the semantic Guardian passes or fails the standing differential gate.

## v2 score posture

v2 begins unsealed with the same pre-M2 score as before. Provider availability, successful API billing, or a clean operational run earns no Fibre personhood credit. Score movement remains conditional on the frozen semantic acceptance gate itself passing.