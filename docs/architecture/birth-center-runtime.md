---
id: architecture-birth-center-runtime
status: accepted
last-reviewed: 2026-08-27
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

The publication boundary may be injected in-process for tests and local composition. A later deployment may replace that injection with a narrow authenticated RPC/API without changing authority ownership.

Milestone #39 exercised this boundary end to end with a fixed five-Thread cohort: each admitted Thread published atomically with its FIN/civil registration, and independent hydration reconstructed the admitted life from canonical authorities. The retained result is [`../history/milestones/pr39.md`](../history/milestones/pr39.md).

## Durability

The Birth Center uses the canonical durable-development rule from [`genesis-durable-development.md`](genesis-durable-development.md):

> **Commit development as it becomes valid. On machinery failure, preserve the failure and resume from the last committed developmental state. Never regenerate accepted history.**

A successful provider invocation is committed before later machinery can depend on it. Restart replays that exact committed result locally after verifying the request witness and contacts the provider only for the first unfinished invocation.

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

## Current development boundary

The current Genesis hardening plan is [`../state/genesis-selectivity-scientific-hardening.md`](../state/genesis-selectivity-scientific-hardening.md). It may evolve memory/meaning selection and experimental instrumentation, but it does not move authoritative birth state into the Birth Center.

Production persistence remains governed separately by [`production-persistence.md`](production-persistence.md): semantic stores own Fibre meaning, while provider-neutral `InfraDriver` capabilities own production persistence guarantees. Local `.fibre` development state and direct World Kernel SQLite are not precedent for new production authorities.
