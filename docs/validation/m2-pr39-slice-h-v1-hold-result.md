---
id: m2-pr39-slice-h-v1-hold-result
status: hold
last-reviewed: 2026-08-21
canonical: false
---

# Milestone #39 — H-v1 operational HOLD

## Verdict

**H-v1 HOLD — permanently preserved; do not rerun.**

The first authorized H execution began on 2026-08-21 and failed after slot 1 Pass A but before the first Pass-B cognition response. No Thread was published and no complete Thread generation finished.

This is the G6 operational-HOLD case:

> the complete first integrity-valid five-Thread cohort cannot be produced under the frozen one-attempt rule.

It is not evidence that the cohort was scientifically weak, because the failure occurred at provider schema validation before Pass-B cognition.

## Frozen evidence

Maintainer freeze commit:

```text
448bd669f742a566da289cc4117907f2d37e32e3
Freeze failed H-v1 cohort attempt
```

H-v1 runner used by that attempt:

```text
commit  448bd669f742a566da289cc4117907f2d37e32e3
path    tools/genesis/genesis-h-final-cohort.mjs
blob    b3f8dc0b382ea64431df866a80ab91804021431f
```

Frozen artifacts:

```text
artifacts/validation/m2-pr39/h/cohort-v1/
  h-attempt-start-v1.json
  h-final-cohort-failure-v1.json
```

The failure artifact preserves all observed model events from the partial attempt.

## What happened

Slot 1 completed its ten Pass-A historical episodes, including bounded mechanical repair calls where required. The first Pass-B request was then rejected by the OpenAI Responses API with HTTP 400 before a model response existed:

```text
Invalid schema for response_format 'fibre_structured_cognition':
In context=('properties', 'episodeRefs'), 'uniqueItems' is not permitted.
```

The frozen canonical Pass-B schema intentionally requires:

```text
episodeRefs.uniqueItems = true
rememberedContent.maxLength = 600
uncertainty.maxItems = 8
uncertainty.items.maxLength = 120
```

The canonical G4 Pass-B schema hash remains:

```text
sha256:846f94bdeef2d874498751205dffb548ea88cf55cb30c0cf0f9bdd7e17f4bf1a
```

No G1–G6 evidence, prompt, canonical schema, provider/model, treatment schedule, World, genome, threshold or diagnostic was changed by this failure.

## H-v2 correction boundary

A later H execution is allowed only as a separately versioned compiler/runtime correction, never as an H-v1 rerun.

The bounded correction may:

- preserve the canonical Pass-B schema and hash unchanged;
- project only provider-unsupported schema constraints out of the OpenAI wire schema;
- mechanically re-enforce every omitted constraint locally before Fibre admission;
- preserve canonical and transport schema hashes separately in provenance;
- write only to a new `cohort-v2` output root;
- require a narrow blocking Gate-G amendment review before final-life cognition.

It may not change cognition semantics or regenerate H-v1 for quality.

## Boundary

```text
H-v1       HOLD / PERMANENT EVIDENCE
H-v1 rerun FORBIDDEN
H-v2       NOT AUTHORIZED YET
next       implement + verify compatibility-only amendment, then blocking review
```
