---
id: m2-pr39-h2-compatibility-review-request
status: pending_local_verification
last-reviewed: 2026-08-21
canonical: false
---

# Milestone #39 — H-v2 compatibility amendment blocking review request

## Why this review exists

Gate G previously returned CLEAR and authorized H-v1. H-v1 then failed operationally after slot 1 Pass A and before the first Pass-B cognition response because the OpenAI Responses API rejected the frozen Pass-B strict JSON schema at request validation:

```text
Invalid schema for response_format 'fibre_structured_cognition':
In context=('properties', 'episodeRefs'), 'uniqueItems' is not permitted.
```

H-v1 is permanently preserved at:

```text
commit 448bd669f742a566da289cc4117907f2d37e32e3
artifacts/validation/m2-pr39/h/cohort-v1/
```

The exact H-v1 runner blob is:

```text
b3f8dc0b382ea64431df866a80ab91804021431f
```

No Thread was published; no Pass-B response existed. G6 classifies this as an operational HOLD, not a scientific cohort result.

## Proposed H-v2 amendment

H-v2 is a separately versioned compiler/runtime compatibility correction. It does **not** rerun H-v1 and does not overwrite `cohort-v1`.

Review:

```text
docs/validation/m2-pr39-slice-h-v1-hold-result.md
artifacts/validation/m2-pr39/h/protocol/h-execution-binding-v2.json
tools/genesis/genesis-h2-openai-schema-compat.mjs
tools/genesis/genesis-h2-openai-schema-compat.test.mjs
tools/genesis/genesis-h2-final-cohort.mjs
tools/genesis/genesis-h2-final-cohort.test.mjs
tools/genesis/genesis-h-final-cohort.mjs
package.json
```

The shared H runner changed by exactly one behavioral line: its binding path now accepts an explicit `FIBRE_H_EXECUTION_BINDING_PATH` override. With no override, `genesis:h-generate` remains bound to H-v1. The H-v1 source used by the failed attempt remains reconstructable from the frozen commit/blob above.

## Canonical schema remains unchanged

Frozen G4 Pass-B schema:

```text
sha256:846f94bdeef2d874498751205dffb548ea88cf55cb30c0cf0f9bdd7e17f4bf1a
```

H-v2 provider-wire projection:

```text
sha256:9c5c75641d46306cac8df457fc4495e09b53db4a930b9f5fe3f8e75863d3556c
```

Only these already-declared canonical constraints are omitted from the OpenAI wire schema:

```text
$.properties.episodeRefs.uniqueItems             true
$.properties.rememberedContent.maxLength          600
$.properties.uncertainty.maxItems                 8
$.properties.uncertainty.items.maxLength          120
```

The exact same constraints are re-enforced locally on the returned structured output before the ordinary frozen Pass-B admission path sees it.

All other JSON-schema structure remains provider-enforced, including object shape, required fields, additionalProperties=false, types, enum and item types.

If local revalidation fails, H-v2 fails operationally and is preserved. It is not repaired into compliance and is never quality-regenerated.

## Frozen non-changes

H-v2 does not change:

```text
G1 Worlds
G2 genomes or World↔genome assignment
G3 L L T L L T schedule
G3 fixed-ordinal primary analysis
G4 provider/model
G4 prompt hashes
canonical G4 Pass-B schema/hash
Pass-A schema or behavior
Pass-C schema or behavior
Pass-B genome-copy gate/retry
EventStructurePool
rosters
chronology
retry caps
publication rules
G5 raters/diagnostics
G6 thresholds/verdict rules
```

H-v2 uses a new output root only:

```text
artifacts/validation/m2-pr39/h/cohort-v2
```

H-v1 is never consumed as candidate history for H-v2.

## Provenance

For every Pass-B provider request, the OpenAI model adapter records the transport-schema hash in its model event. H-v2 additionally writes:

```text
cohort-v2/h2-transport-compatibility-v1.json
```

on success or failure, containing:

- canonical schema hash;
- transport schema hash;
- exact omitted constraints;
- every compatibility-projection event;
- H-v1 freeze commit/blob;
- success/failure status.

## Optional operational schema probe

H-v2 exposes:

```text
npm run genesis:h2-generate -- --schema-probe
```

This makes exactly one non-life OpenAI request using the H-v2 Pass-B transport schema and instructs the model to return the fixed value:

```json
{"outcome":"not_remembered","episodeRefs":[],"rememberedContent":null,"uncertainty":[]}
```

It receives no World, genome, history, Thread identity or final-cohort input. Its only purpose is to verify provider acceptance of the projected strict schema before risking H-v2. It must not be used to tune prompts, cognition or output quality.

The probe must not run until the local zero-call verification and this blocking amendment review are CLEAR.

## Blocking questions

Review as a hostile methodological and implementation reviewer.

1. Does H-v2 preserve H-v1 as immutable HOLD evidence rather than disguising a rerun?
2. Is projecting unsupported provider-only schema constraints while locally re-enforcing them semantically equivalent to the frozen canonical Pass-B contract?
3. Are all omitted constraints mechanically revalidated correctly, including Unicode length semantics and duplicate episode refs?
4. Can the projection accidentally apply to Pass A, Pass C, repair schemas, G5 raters or another response schema?
5. Can an output violating an omitted constraint reach `generateAdmittedPassBMemory` as admitted memory?
6. Are canonical and transport hashes both inspectable after H-v2 success or failure?
7. Does the one-line shared-runner binding override leave ordinary H-v1 behavior unchanged by default?
8. Does H-v2 introduce any new provider/model/seed/treatment/quality-selection degree of freedom?
9. Is the optional one-call schema probe genuinely non-life and safe to run after this review without contaminating H-v2?
10. Is `cohort-v2` sufficiently separated so neither H-v1 output nor H-v1 generated Pass-A content can be reused selectively?

Severity:

```text
S1 = invalidates H-v2; must fix before any provider probe or final-life call
S2 = material integrity/interpretability defect
S3 = bounded limitation that can be carried transparently
observation = nonblocking
```

End with exactly one:

```text
VERDICT: CLEAR
VERDICT: HOLD
VERDICT: REDESIGN
```

If not CLEAR, give the smallest exact amendment required. Do not propose rewriting H-v1, G1-G6, or regenerating for quality.
