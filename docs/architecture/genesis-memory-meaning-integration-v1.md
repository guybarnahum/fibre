---
id: architecture-genesis-memory-meaning-integration-v1
status: accepted
last-reviewed: 2026-08-18
canonical: false
---

# Genesis memory + meaning integration v1

## Purpose

Slice D must make the compiler distinction

```text
what happened
    !=
what was remembered
    !=
what it came to mean
```

real in the existing Fibre authorities.

This note resolves the integration seam between the #39 Pass-B/Pass-C contract and the #38 autobiographical-memory authority. It does not create a second memory model and does not change the Gate-D experimental design.

## Governing decisions

### 1. #38 remains the autobiographical-memory authority

Genesis may keep Pass-B and Pass-C candidate outputs in provisional `GenerationAttempt` evidence while compiling, but an admitted memory publishes into the existing autobiographical-memory ledger.

There is no `genesis_memories`, `genesis_biography`, or equivalent live authority.

### 2. Pass-B remembered content is not `rememberedMeaning`

The existing #38 record predates the three-pass Genesis split and has one expressive field named `rememberedMeaning`. Slice D must not put Pass-B remembered content into that field merely to avoid a schema change. Doing so would collapse the distinction the milestone is trying to test and would make a `no_durable_meaning` outcome impossible to represent honestly.

The autobiographical-memory record therefore gains an explicit versioned Genesis-capable shape in which:

```text
rememberedContent   Pass-B recollection; required for a remembered outcome
rememberedMeaning   Pass-C durable interpretation; nullable
meaningParts        independently citable Pass-C semantic parts; possibly empty
meaningOutcome      durable_meaning | no_durable_meaning
```

Historical #38 records remain readable under their admitted record shape. New Genesis-capable records use an explicit format/version witness rather than silently reinterpreting old JSON under a new meaning.

`no_durable_meaning` means:

```text
rememberedContent != null
rememberedMeaning = null
meaningParts      = []
```

It is a real memory, not a rejected record.

### 3. Meaning-part identity extends memory authority

`MeaningPart` is the one genuinely new durable identity extension permitted by the Genesis compiler contract. It belongs to the autobiographical-memory authority and is keyed to a stable memory lineage; it is not a Genesis-owned biography table.

A `meaningPartId` is Fibre-derived, never authored by model cognition. Initial parts receive deterministic stable identities. Reinterpretation may revise the semantic content associated with an existing part or add a new independently identified part under the frozen v1 rules; it may not silently recycle one part ID for a different tension.

Exact reinterpretation persistence mechanics are implemented in the Slice-D meaning sub-slice and tested before Gate D.

### 4. Pass B can exist without Pass C

`remembered` is decided before Pass C. A remembered result remains admissible even if Pass C returns `no_durable_meaning`.

`not_remembered` creates no autobiographical-memory record and never invokes Pass C for that episode/memory candidate.

No quota requires any minimum forgetting or minimum meaning.

### 5. Publication time is not remembered time

A compiled prior-life memory may concern childhood and may have a historical `asOf`/formation chronology before Thread publication. The immutable #38 `AUTOBIOGRAPHICAL_MEMORY_RECORDED` anchor continues to mean **Fibre recorded this memory revision**, not **the Thread recalled it at this wall-clock instant**.

For Genesis atomic publication:

- subject/event refs retain lived historical timestamps;
- Pass-B/Pass-C formation chronology remains explicit Genesis provenance;
- the canonical memory record is written at birth publication time;
- its #38 Thread-history anchor is a publication/recording act, not a fabricated childhood event.

This preserves the #38 refusal to mint unwitnessed recall timestamps.

### 6. Genesis publication reuses the #38 anchor semantics

Slice D extends atomic birth so admitted memories and meaning state are committed in the same birth transaction as the Thread/history/manifest.

The existing `AUTOBIOGRAPHICAL_MEMORY_RECORDED` event semantics are retained: its anchor records only memory identity/revision/digest, not remembered content or meaning truth. Genesis publication may deterministically author the corresponding recording command/witness as an institutional publication action; it must not turn the historical memory itself into a commanded life event.

If reuse of the current helper requires refactoring, the shared low-level memory append operation must remain inside the existing memory authority and must be callable transactionally by both ordinary #38 recording and Genesis birth publication.

### 7. Pass-C reinterpretation changes memory state only when state changes

Genesis audit evidence records every mechanically eligible/run reinterpretation and its outcome.

Canonical memory revision behavior:

```text
revised    append a memory/meaning revision
unchanged  no semantic-state rewrite; audit the run/outcome
none       no semantic-state rewrite; audit the run/outcome
```

This avoids manufacturing ledger revisions merely because cognition was invoked.

### 8. Pass boundaries remain structural

This integration decision does not relax the compiler contract:

- Pass B has no meaning field.
- `life_only` receives no genome.
- `life_plus_genome` receives only the frozen whole-genome or content-independent fixed locus projection.
- Pass C is always genome-blind.
- Pass C initial formation sees one memory only and does not resolve its underlying event content.
- conditions, condition-derived salience and Fibre-computed semantic needs are absent.

The persisted result may contain both remembered content and durable meaning because publication happens **after** the separately blinded passes. That combined storage shape does not authorize either pass to see the other's forbidden inputs.

## Consequence for implementation order

Slice D proceeds in four narrow implementation layers:

```text
D1  Pass-B / Pass-C domain contracts, allowlists, digests and negative tests
D2  Genesis-capable autobiographical-memory record + MeaningPart identity extension
D3  atomic publication into #38 memory authority + photo obligation
D4  reinterpretation eligibility/cap accounting + development characterization + Gate-D packet
```

Each layer must preserve the possibility of `not_remembered`, `no_durable_meaning`, `unchanged` and `none` without semantic resampling.

## Carry-forward outside D

The long-`threadId` / #37 claim-predicate byte-budget sensitivity observed during Gate-C closure is a Slice-G cohort preflight item. It is not a reason to change D identifiers or identity semantics.
