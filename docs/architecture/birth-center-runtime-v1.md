---
id: architecture-birth-center-runtime-v1
status: accepted
last-reviewed: 2026-08-22
canonical: true
---

# Birth Center Runtime v1

## Purpose

The **Birth Center** is Fibre's distinct runtime boundary for creating and developing prospective Threads before atomic birth.

> **The Birth Center owns development. The World Kernel owns reality.**

Genesis may take many model calls, repairs, retries, checkpoints, process restarts, provider interruptions and long elapsed time. None of that is a reason to hold a live-world database transaction open or to expose provisional candidate state as Thread authority.

## Runtime ownership

The Birth Center owns:

- provisional Genesis/development workflow state;
- durable model-invocation journals;
- checkpoint/resume state;
- candidate Pass-A history, Pass-B autobiography and Pass-C meaning while unborn;
- rejected/generated candidates and machinery-failure provenance;
- mechanical admission orchestration;
- construction of a complete birth bundle.

The Birth Center does **not** own:

- authoritative Thread history;
- live identity, memory, relationship or meaning state;
- World Kernel event/version authority;
- atomic publication semantics.

The executable runtime therefore reports `authoritativeThreadStateOwned=false`.

## Publication boundary

A complete admitted birth bundle crosses one explicit boundary to the World Kernel. The World Kernel applies the current live validators and performs atomic `publishBirth()` semantics. If publication fails, no partially born Thread exists.

The Birth Center runtime must not open or mutate the live World database merely because it shares a repository with world-kernel code. Development storage and provider credentials belong to the Birth Center side; authoritative publication belongs to the World side.

V1 allows the publication boundary to be injected in-process for tests and local composition. A later deployment may replace that injection with a narrow authenticated RPC/API without changing authority ownership.

## Durability

The Birth Center uses the canonical durable-development rule from `genesis-durable-development-v1.md`:

> **Commit development as it becomes valid. On machinery failure, preserve the failure and resume from the last committed developmental state. Never regenerate accepted history.**

A successful provider invocation is committed before later machinery can depend on it. Restart replays that exact committed result locally after verifying the request witness, and contacts the provider only for the first unfinished invocation.

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

`GET /health` and `GET /v1/status` expose runtime ownership/status only. V1 intentionally does not expose an unauthenticated generation or publication endpoint.

## Relationship to #39

The frozen G4-v3 calibration remains scientific evidence for the generation mechanics that existed when it ran. Birth Center separation is an execution/resilience architecture change and must not be used to rewrite that evidence.

The burned H-v2 attempt may be continued through a separately labeled recovery workflow to demonstrate durable development and rescue the prospective lives, but such a continuation is not a substitute for the fresh replacement cohort required for #39 standing.
