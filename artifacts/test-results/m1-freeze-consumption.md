# M1 freeze and authorization-consumption evidence

Date: 2026-08-05  
Scope: PR #20, Guardian-gated freeze, single-use authorization, obligation discharge, runtime completion, lease release, and replay

## Capability demonstrated

The world kernel now completes the deterministic temporary-cognition lifecycle:

```text
request attempt
  -> Thread-owned appraisal
  -> private stance
  -> current-state Participation Authorization
  -> exclusive kernel-timed thaw lease
  -> deterministic Actor proposal
  -> Goal Guardian audit
  -> explicit freeze decisions
  -> append-only THREAD_FROZEN event
  -> accepted memory records and obligation discharge
  -> authorization consumption
  -> completed runtime and released lease
  -> restart and replay equality
```

A worker still cannot write authoritative world state directly. Freeze is the sole M1 boundary that accepts or rejects proposed life changes and commits them to the Thread.

## Atomic freeze transaction

One immediate SQLite transaction rereads and verifies the current Thread, authorization, lease, runtime session, execution context, Actor output, and Guardian audit before writing anything.

A successful commit atomically:

1. appends one replayable `THREAD_FROZEN` event;
2. inserts the command/idempotency witness;
3. advances the Thread version, state hash, and last-event witness;
4. records accepted memory changes;
5. preserves rejected-change rationale in the restricted freeze report;
6. consumes the Participation Authorization exactly once;
7. discharges every obligation used to override private stance;
8. marks the runtime session completed; and
9. releases the thaw lease.

No intermediate state is externally durable. A failure cannot consume authority without changing the world, change the world without its event, or release the runtime without its freeze report.

## Freeze validation

Freeze requires:

- the Thread still matches the runtime snapshot version and state hash;
- the session and lease are active and not expired under kernel time;
- authorization is `accept` and has not already been consumed;
- a persisted Actor run exists;
- a persisted Goal Guardian audit exists with decision `pass`;
- the Actor declares no tool calls and no direct authoritative commands;
- every proposed life change is a supported bounded memory proposal;
- every proposal cites selected Thread-owned memory or relationship evidence;
- the freeze request supplies exactly one explicit `accept` or `reject` decision for every proposal.

The caller cannot supply the freeze completion timestamp. The service stamps it from the same injectable kernel clock used by the runtime lease.

## Single-use obligation override

An obligation used to authorize participation against the Thread's private stance is single-use by default in M1.

Successful freeze:

- records the exact obligation reference in the authorization-consumption record and freeze event;
- removes it from `currentState.unresolvedIntentions`;
- preserves the discharge in replayable history; and
- prevents the discharged reference from authorizing a later request.

Guardian rejection, lease expiry, state races, incomplete decisions, and other failed freezes consume neither the authorization nor the obligation.

## Event and replay witnesses

The private freeze event payload and command digest bind:

- request, session, authorization, freeze-report, Actor-run, and Guardian-audit IDs;
- Actor output and Guardian audit digests;
- kernel completion time;
- exact freeze operation and operation digest;
- accepted and rejected life changes;
- discharged obligations;
- prior Thread state hash; and
- resulting lifecycle status.

Replay reconstructs the freeze report digest from event content, rederives the commit digest and event ID, applies accepted memory references and obligation discharge, and verifies the resulting Thread state hash.

The public event route returns a safe projection with accepted memory references and counts while withholding concrete authorization, session, Actor, Guardian, report, causal, and private rationale fields.

## Persistent records

Schema version 4 adds:

- `authorization_consumptions` — append-only one-time consumption witnesses;
- `freeze_reports` — append-only restricted accepted/rejected change reports;
- `thread_memories` — append-only accepted memory records.

`THREAD_FROZEN` joins `THREAD_SEEDED` and `SELF_MODEL_UPDATED` in the immutable Thread event history. Existing schema version 3 databases migrate transactionally to version 4.

## Named automated evidence

The following tests prove the advertised properties:

- `atomically freezes a Guardian-approved runtime, records memory, and survives replay`
- `exact freeze retry is idempotent and a different operation cannot reuse consumed authorization`
- `obligation override is consumed once and discharged from unresolved intentions`
- `Guardian reject, missing decisions, and lease expiry consume nothing`
- `freeze requires exactly one decision per proposal and may reject all life changes`
- `Thread change before freeze fails atomically without consuming authority`
- `freeze records are append-only and coherent report tampering is detected`
- `schema version 3 migrates to unified freeze schema version 4`
- `freeze HTTP route is private, kernel-timed, idempotent, and publicly redacted`
- `freeze replay binds private witness IDs, authorization, time, and report digest`
- `full freeze survives process restart with replay equality and no active runtime`

The complete repository workflow passes **132/132 tests**, deterministic context generation, and repository validation.

## Deliberately deferred

- API-backed Thread Editor inspection and simulation;
- one consolidated Mina demonstration covering every M1 stage;
- persistent disclosure strategy and audience-visible response in the live kernel;
- structured obligation records with issuer, scope, expiry, recurrence, and satisfaction criteria;
- observed worker/tool gateway and capability traces;
- tool-, network-, or model-capable Actor;
- production authentication, encryption, remote deployment, distributed leases, and high availability.
