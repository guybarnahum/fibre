---
id: architecture-birth-center-runtime
status: accepted
last-reviewed: 2026-08-24
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

## Durability

The Birth Center uses the canonical durable-development rule from [`genesis-durable-development.md`](genesis-durable-development.md):

> **Commit development as it becomes valid. On machinery failure, preserve the failure and resume from the last committed developmental state. Never regenerate accepted history.**

A successful provider invocation is committed before later machinery can depend on it. Restart replays that exact committed result locally after verifying the request witness and contacts the provider only for the first unfinished invocation.

Durable development is execution resilience. It does not make provisional candidate material authoritative Thread life or semantic evidence.

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

## Current #39 boundary

The active #39 closing authority is [`../state/pr39-closing-plan.md`](../state/pr39-closing-plan.md). The old freeze/replacement execution choreography is retired.

Before #39 closes, the supported current Birth Center path must construct the canonical birth bundle and exercise the real `publishBirth()` boundary end to end. Recovery machinery may preserve genuine unfinished development, but recovery evidence is not a substitute for the fresh closure cohort or for canonical atomic birth.
