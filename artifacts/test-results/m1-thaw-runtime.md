# M1 thaw-runtime evidence

Date: 2026-08-05  
Scope: PR #19, live authorization, exclusive thaw lease, deterministic Actor, and Goal Guardian

## Capability demonstrated

The local world kernel moves one frozen or dormant Thread into a durable temporary-cognition session without treating the worker as the Thread or permitting worker output to mutate authoritative state.

```text
request attempt + appraisal + private stance
  -> live-state Participation Authorization
  -> exclusive thaw lease
  -> runtime session and Thread-owned execution context
  -> deterministic Actor proposal
  -> Goal Guardian declaration audit
```

Authorization, lease acquisition, and session creation are one runtime-store transaction. The transaction rereads the current Thread and private stance witnesses before writing.

## Review decisions

### Goal Guardian

The M1 Goal Guardian is a declaration and binding auditor, not a capability sandbox. It verifies the Actor record returned to the kernel. `NO_TOOL_CALLS` and `NO_DIRECT_WORLD_MUTATION` therefore verify returned declarations in this deterministic slice.

Every Guardian check is independently falsifiable. An injected divergent Actor produces a persisted `reject` through the complete service pipeline. Future tool-capable workers require an isolated execution/tool gateway that supplies independently observed capability traces; self-report will not be sufficient.

### Time authority

The kernel clock owns authorization issuance, lease acquisition, lease expiry, Actor completion, and Guardian completion timestamps. Runtime HTTP inputs no longer accept `acquiredAt`, `expiresAt`, or `completedAt`.

The service computes `expiresAt` from its configured lease duration. Work is checked against the current kernel clock. A caller cannot steal a lease by claiming a future acquisition time or keep an expired lease alive by claiming an earlier completion time. The clock is injectable for deterministic tests only.

### Request recovery after Thread advancement

For M1, a `requestId` identifies one immutable request/appraisal attempt. A historical attempt remains attributable history but cannot authorize a later Thread snapshot. Recovery uses a new request-attempt ID under the same `correlationId`, followed by a fresh appraisal and stance. This path is directly tested and avoids fabricating an unrelated logical request.

## Authorization boundary

Runtime acquisition rejects:

- missing stance;
- stale Thread version or state hash;
- request, requester, policy, appraisal, stance, or fingerprint substitution;
- any action other than `accept`;
- low-dignity acceptance;
- blank, invented, or missing obligation references on an override;
- an obligation reference not currently present in the Thread's unresolved intentions.

Obligation mutation and discharge are deferred to PR #20 freeze work. In PR #19 the eligible obligation set comes from the current Thread projection.

## Exclusive lease

A partial unique index enforces one active lease per Thread, including across separate SQLite connections.

- Overlap before real expiry returns `THAW_LEASE_CONFLICT`.
- At real expiry, a later acquisition may reclaim the Thread.
- Reclamation marks the old lease `expired` and its active session `aborted` before creating the replacement.
- Aborted sessions and expired leases reject Actor and Guardian work.

The Thread projection remains frozen or dormant; the runtime session is the temporary-cognition witness. Freeze and normal release remain PR #20.

## Execution context and deterministic Actor

The execution context records the exact Thread version/state hash, request/requester, authorization, policy, included/excluded Thread-owned memory and relationship refs, identity, traits, self-model, needs, feelings, permissions, budgets, and audit policies.

The deterministic Actor returns a bounded plan, no declared tool calls, no direct world commands, and an optional memory proposal citing selected Thread-owned memory or relationship evidence. It cannot write world state directly.

## Integrity and schema

One `PRAGMA user_version` governs the complete SQLite file. Schema version 3 adds runtime tables transactionally to the version-2 world/private schema.

WorldStore and RuntimeStore use separate WAL connections with bounded busy timeouts. The runtime transaction rereads cross-store witnesses rather than trusting an earlier application read.

Immutable runtime records use opaque random IDs and separate SHA-256 content and operation digests. Runtime sessions also carry a session digest that independently binds context digest, lease, authorization, Thread, request, snapshot, state hash, and start time.

Reads rederive all acquisition, authorization, context, session, Actor, and Guardian witnesses. Coherent context-plus-digest and Actor-output-plus-digest rewriting are detected by independent record witnesses.

`thaw_leases` and `runtime_sessions` are intentionally mutable only for bounded lifecycle transitions. Triggers prevent changes to immutable bindings and prevent deletion. Authorizations, Actor runs, and Guardian audits remain append-only.

## Named automated evidence

| Property | Test |
|---|---|
| Kernel stamps authorization and lease time; accepted context is Thread-owned | `acquires accepted authorization and a Thread-owned context with kernel-stamped time` |
| Every authorization-to-context binding field is enforced | `execution context rejects every authorization-to-trace substitution` |
| Caller timestamp fields are rejected | `runtime timestamps are kernel-owned and caller timestamp fields are rejected` |
| Stale attempt recovery preserves logical correlation | `a stale request attempt has an explicit correlation-lineage recovery path` |
| Blank, invented, and absent override obligations fail | `recorded-obligation override rejects blank, invented, and missing references` |
| Non-high accept cannot authorize | `a non-high accept stance cannot produce participation authorization` |
| Kernel-time overlap, expiry reclamation, and aborted-session rejection hold | `exclusive leases use kernel time, reject overlap, and abort expired work before replacement` |
| Real lease expiry rejects late work | `real kernel-clock expiry rejects late Actor and Guardian work` |
| Every Guardian check can fail independently | `every Goal Guardian check is falsifiable` |
| Full service pipeline persists Guardian reject | `an injected divergent Actor produces a persisted reject through the service pipeline` |
| Actor and Guardian exact retries survive clock advancement | `Actor and Guardian retries remain idempotent after the kernel clock advances` |
| Runtime records survive restart under the unified schema | `runtime records survive restart under one unified schema version` |
| Version 2 migrates transactionally to version 3 | `world schema version 2 migrates transactionally to unified schema version 3` |
| Coherent context and Actor rewriting fail independent witnesses | `coherent context and Actor-output rewrites fail independent record witnesses` |
| Two connections still create exactly one active lease | `separate runtime connections still yield exactly one active lease` |
| Runtime HTTP remains private and public routes do not leak | `runtime routes remain private and public Thread/event routes reveal no runtime` |
| HTTP uses kernel timestamps and persists Actor/Guardian | `runtime HTTP round trip uses kernel timestamps and persists Actor and Guardian` |
| HTTP rejects timestamp injection, non-accept, wrong order, and expiry | `runtime transport rejects caller timestamps, non-accept thaw, wrong order, and real expiry` |
| Retry conflicts and state races have distinct codes | `runtime operation conflict and state-change conflict have distinct HTTP codes` |
| Independent-process restart preserves runtime witnesses | `thaw runtime survives independent world-kernel restart without public leakage` |

Run:

```bash
npm run check
```

## Deliberately deferred

- authorization consumption and replay rejection;
- freeze validation and accepted/rejected life-change report;
- normal session completion and lease release;
- obligation mutation and discharge;
- independently observed capability traces, worker sandboxing, and tool gateway;
- Thread lifecycle event/state transition for completed freeze;
- disclosure strategy and audience-visible response;
- production LLMs, tools, communication, authentication, quotas, and distributed leases;
- API-backed Thread Editor and final Mina round-trip proof.
