---
id: architecture-birth-center-runtime
status: accepted
last-reviewed: 2026-08-31
canonical: true
---

# Birth Center Runtime

## Purpose

The **Birth Center** is Fibre's distinct runtime boundary for creating and developing prospective Threads before atomic birth.

> **The Birth Center owns development. The World Kernel owns reality.**

Genesis may take many model calls, repairs, retries, checkpoints, process restarts, provider interruptions and long elapsed time. None of that is a reason to hold a live-world database transaction open or expose provisional candidate state as Thread authority.

## Runtime ownership

The Birth Center owns:

- provisional Genesis/development workflow state;
- durable model-invocation journals;
- checkpoint/resume state;
- candidate historical life, autobiography and meaning while unborn;
- rejected/generated candidates and machinery-failure provenance;
- mechanical admission orchestration; and
- construction of a complete birth bundle.

The Birth Center does **not** own:

- authoritative Thread history;
- live identity, memory, relationship or meaning state;
- World Kernel event/version authority; or
- atomic publication semantics.

The executable runtime therefore reports `authoritativeThreadStateOwned=false`.

## Publication boundary

A complete admitted birth bundle crosses one explicit boundary to the World Kernel. The World Kernel applies the current live validators and performs atomic `publishBirth()` semantics. If publication fails, no partially born Thread exists.

The Birth Center runtime must not open or mutate the live World database merely because it shares a repository with world-kernel code. Development storage and provider credentials belong to the Birth Center side; authoritative publication belongs to the World side.

The publication boundary is fetch-shaped and provider-neutral. Local composition can inject it directly; Cloudflare composition backs the same boundary with a private service binding to World. Authority ownership does not change: Birth Center may retry publication, while World alone admits the authoritative Thread.

Milestone #39 exercised this boundary end to end with a fixed five-Thread cohort: each admitted Thread published atomically with its FIN/civil registration, and independent hydration reconstructed the admitted life from canonical authorities. The retained result is [`../history/milestones/pr39.md`](../history/milestones/pr39.md).

## Durability

The Birth Center uses the canonical durable-development rule from [`genesis-durable-development.md`](genesis-durable-development.md):

> **Commit development as it becomes valid. On machinery failure, preserve the failure and resume from the last committed developmental state. Never regenerate accepted history.**

A successful provider invocation is committed through the Birth Center `InfraDriver.state` scope before later machinery can depend on it. Restart replays that exact committed result after verifying the request witness and contacts the provider only for the first unfinished invocation. Local maps the state scope to SQLite; Cloudflare maps it to SQLite-backed Durable Object state.

Durable development is execution resilience. It does not make provisional candidate material authoritative Thread life or semantic evidence.

#39 demonstrated exact zero-network replay of 151 committed generation calls after the cohort was fixed. That proof remains execution/restart evidence only; it does not support identity, memory, meaning or personhood claims.

## Runtime service

The repository exposes a distinct service process:

```text
npm run birth-center
```

Default loopback endpoint:

```text
127.0.0.1:8790
```

Configuration:

```text
FIBRE_BIRTH_CENTER_HOST
FIBRE_BIRTH_CENTER_PORT
FIBRE_BIRTH_CENTER_STATE
```

`GET /health` and `GET /v1/status` expose runtime ownership/status only. The `/v1/` route label is an HTTP compatibility surface; it is not a reason to version the architecture filename.

The Cloudflare deployment uses a private Worker plus one named SQLite-backed Durable Object scope for Birth state and alarm scheduling. A private birth request durably records provisional publication work; the Durable Object alarm resumes pending World handoff after Worker disposal/restart.

## Single-authority birth lifecycle (Slice 1 staging verified; Slice 2 source pending validation)

[ADR-0031](../decisions/ADR-0031-birth-center-single-birth-authority.md)
and [ADR-0032](../decisions/ADR-0032-place-population-parental-origins.md)
are **accepted design decisions, not a claim of completed implementation**. Today's CLI still authors World/family context and urges
outside Birth Center and reports `/preparation`; Admin uses a separate
`birth-initiation.mjs` schema and fixture genomes. These are current
limitations, not the desired authority model.

**One Birth Center request** would own the stages:

```text
requested → place_resolved → place_authored? → parents_selected
  → genome_selected → developing → publishing → admitted
  → presented → located → complete
```

`place_authored` runs only for a missing **canonical place × child's birth
decade**. One journaled model call creates a versioned Place record with
**both** civic/World context and the Place Population. No second World-context
call and no import of the CLI's `.fibre/` cache. Naming traditions are
authored lazily, one journaled call for each origin group when first drawn.
They carry parent- and child-decade given names, family names, and the
transmission, order and joiner rules. The Place Population itself has no
name lists. Every birth pins its Place/naming versions.

The existing alarm advances bounded due requests. **Authoring** uses at most
one new model call per alarm; `developing` is **one stage** that runs the
existing Genesis development service with its own durable model journal.
It is not split into per-call stages. Publication and later confirmations
use backoff. One blocked request never blocks another.

`POST /births`, `GET /births/:id`, paginated `GET /births`,
`POST /births/:id/resume` and `POST /births/:id/abandon` are the
proposed common API for the CLI and Admin. Abandon before `threadId`
reservation means **cancelled**; after reservation but before admission,
**stillborn(reason)**; after admission it stops observation only.
It cannot erase a living Thread. `genesis:birth` retains its flags/events
and adds resume/abandon; `genesis:births` lists requests.

**Implementation checkpoint (October 29):** Slice 1 ran two completed births on staging at `66da96e` (London 2m57s; Manchester 3m14s) with about 100 DO rows read and 130 written per birth, no retries. Slice 2 now has source for shared population Places, per-place `mixedParentShare`, parent-decade naming traditions, named parents and an issued-name index. It requires Birth Center schema v5 and fresh local and staging validation. The older speculative paragraphs below preserve the design contract and should not be mistaken for completed Slice 3 Admin unification or Slice 4 count waves.

**Cost:** awaiting a model in a Durable Object alarm consumes wall time.
Genesis development may make many calls within its one lifecycle stage.
Measure alarm duration and free-tier cost before increasing concurrency.
An indexed `GET /births/:id` reads one row plus bounded local evidence,
not all recent births or World presence. Initial Place creation costs one
model call per place/decade; lazy naming costs one small call per origin
group used. No model calls for deterministic parent sampling or inheritance.

**Authorized implementation slices:** (1) single Birth Center authoring path and thin CLI,
(2) versioned Place Population and parents, (3) Admin moves to the same API
with **read-only Place inspection** and old routes retire; editing is
**deferred**, (4) bounded `--count` waves. Existing born Threads and
historical records are never rewritten. World alone admits the live birth.

## Current development boundary

The completed Genesis memory/meaning selectivity and scientific-diagnostic bridge is recorded in [its outcome](../history/genesis-selectivity-scientific-hardening.md). That work did not move authoritative birth state into the Birth Center or earn a Whole-Person standing increase.

Production persistence remains governed separately by [`production-persistence.md`](production-persistence.md): semantic stores own Fibre meaning, while provider-neutral `InfraDriver` capabilities own production persistence guarantees. Authoritative World relational state and Birth Center provisional/provider-call durability now cross `InfraDriver.state`; local `.fibre` development artifacts are fixtures/validation artifacts rather than production persistence precedent.
