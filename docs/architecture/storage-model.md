---
id: architecture-storage-model
status: accepted
last-reviewed: 2026-08-20
canonical: true
---

# Storage model

A Thread is a logical aggregate reconstructed from durable world state. It is not one source file, prompt, row or temporary process.

The long-term architecture may use several physical stores—relational state, append-only events, graphs, semantic indexes, object storage, secrets and double-entry ledgers—but domain authority is defined by explicit records, provenance, versions and replay contracts rather than by a particular cloud/database product.

## Current local persistence profile

The current local world kernel uses one SQLite database with one authoritative `PRAGMA user_version` for the versioned world-store schema.

```text
WORLD_STORE_SCHEMA_VERSION = 6
```

SQLite is a prototype implementation choice, not a permanent Fibre constraint. The durable contracts are the important part: identity, event order, versions, hashes, idempotency, authorization, append-only history, privacy boundaries and cross-record causal witnesses must remain portable to later adapters.

## Core Thread world authority

The main world schema contains the persistent M1/runtime/social/identity/life substrate.

### Thread projection and history

- `threads` — current Thread projection, lifecycle status, version, state hash and last-event witness;
- `thread_events` — immutable ordered life/world events with expected/resulting versions, causation/correlation, actor/provenance and state hashes;
- `commands` — accepted idempotency keys, operation digests and resulting event/version witnesses.

The current event vocabulary includes, among others:

```text
THREAD_SEEDED
THREAD_LIFE_EPISODE_RECORDED
SELF_MODEL_UPDATED
THREAD_FROZEN
COMPELLED_EPISODE_INTERRUPTED
AUTOBIOGRAPHICAL_MEMORY_RECORDED
```

Snapshots accelerate reads but do not replace history. Replay must be able to rederive the authoritative projection.

### Private participation/runtime authority

Restricted tables preserve the request-to-life chain, including:

- activation requests and request-appraisal capsules;
- private participation stances;
- request-bound participation authorizations;
- thaw leases and runtime sessions;
- Actor runs and Goal Guardian audits;
- runtime abandonment/timeout/authority-withdrawal outcomes;
- authorization consumption and freeze reports;
- audience-expression/disclosure records where applicable.

Private stance, authorization, disclosure, expression and performed action remain distinct records. Public routes expose only the appropriate safe projection.

### Structured Obligation authority

Structured Obligation v1 uses stable append-only records for:

- obligation revisions;
- Fibre-owned request-bound applicability decisions;
- legacy consumed-authority tombstones;
- one-shot discharge witnesses;
- structured authority-withdrawal closures.

A caller may nominate an obligation; only Fibre determines whether it governs the request. Successful compelled completion must leave the matching durable social consequence atomically. Historical applicability is evidence, not perpetual authority.

## M2 life authorities through #38

#37/#38 added the durable person/life substrate needed by Genesis and later causal consumption.

### Identity

`identity_assertion_records` stores append-only claim-level identity revisions with stable claim identity, provenance, authorship, visibility, temporal state, evidence/behavioral classification, canonical content and digest.

The Passport and `asOf` identity views are derived. Legacy flat identity remains a compatibility projection rather than the authoritative mutation surface.

### Lineage, place and embodiment

#38 adds dedicated durable authorities for situated life, including lineage/family relationships, temporal place/culture formation and versioned embodiment/asset provenance. These records remain distinct from identity assertions even when identity claims cite them as evidence.

### Autobiographical memory and meaning

Autobiographical memory is distinct from historical fact. Current memory records preserve stable memory identity, event evidence, subject period, uncertainty, authorship/provenance, append-only revisions and exact history anchors.

Genesis-capable memory records distinguish remembered content from durable remembered meaning. Reinterpretation appends/supersedes meaning without rewriting the underlying event or prior memory revision.

Historical reads validate durable structure and lineage without retroactively applying every future current-write content-size policy. New writes still obey current admission policy.

### Memory visual companions

Every admitted memory has a visual companion lineage. A generated reconstruction is explicitly synthetic representation and may never be relabeled captured historical evidence.

## #39 Genesis and symbolic-genome provenance

Genesis adds **provenance and compilation authority**, not a parallel biography authority.

`GenesisStore` opens the same SQLite world and first migrates the versioned world schema, then creates bounded additive Genesis tables when needed:

```text
genesis_world_specs
genesis_manifests
genesis_generation_attempts
genesis_origin_authorities
```

These records preserve:

- factual WorldSpec and authorship;
- exact compiler/model/schema/policy/publication provenance;
- record-repair and candidate-attempt failures;
- source/consent/status authority witnesses;
- first-live publication witness.

They do **not** own the admitted Thread biography, memory, identity, place, relationship or embodiment. Atomic birth publishes canonical life content into the existing Thread authorities or publishes nothing.

The symbolic-genome store similarly uses immutable additive tables:

```text
symbolic_genomes
symbolic_genome_loci
symbolic_genome_mutations
```

The genome tables preserve textual locus order, source provenance, deterministic recombination and explicit mutation witnesses. They are inherited origin authority, not developed character or a hidden numeric personality state.

## Transaction boundaries

Fibre uses separate store interfaces to preserve responsibility boundaries even when they share one SQLite consistency domain.

A consequential write transaction rereads the exact current versions, IDs, hashes, lifecycle state and authority witnesses it depends on. Cross-store invariants are not trusted from an earlier application read.

Representative atomic boundaries include:

- normal command/event/projection update;
- request/appraisal persistence;
- runtime authorization plus lease/session acquisition;
- freeze, including authorization consumption and accepted life changes;
- Structured Obligation discharge;
- interrupted compelled authority-withdrawal closure;
- Genesis birth publication across seed/identity/life-event/memory/visual/genome/provenance state.

A mid-transaction failure must not leave half a life, half a discharge or half a birth.

## Append-only and correction discipline

Meaningful historical records are immutable or append-only. Current projections may change only through validated transitions.

Fibre does not repair life history by overwriting it. Legitimate correction patterns include:

```text
append new event
append/supersede identity assertion
append memory revision/reinterpretation
append relationship/obligation revision
rebuild a damaged current projection from intact history
```

Projection repair may reconstruct current state from authoritative events; it may not rewrite the events to make the projection convenient.

## Read-only inspection

Human/operator inspection uses bounded read-only surfaces. Database inspectors open SQLite read-only and use `PRAGMA query_only` where applicable. Inspection verifies chains rather than silently repairing them.

Current inspection families include world/replay, identity, Structured Obligations, Genesis and symbolic genome. The Thread Editor remains a human-facing application over validated APIs, not a raw database mutation surface.

## Repository/world separation

Live Thread data is not committed to Git. The repository may contain:

- schemas and migrations;
- synthetic fixtures;
- deterministic examples;
- redacted or frozen experiment artifacts;
- retained proof/repro instruments;
- human-readable validation reports.

The database/object-store world contains the living Threads. Git contains the laws, machinery and retained scientific evidence used to build and audit that world.
