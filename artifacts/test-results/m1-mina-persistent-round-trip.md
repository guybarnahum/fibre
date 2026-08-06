# Mina consolidated M1 persistent round trip

Date: 2026-08-06  
Milestone: M1 Persistent Thread Round Trip  
Thread: Mina Park (`thr_mina_001`)

## Result

The deterministic M1 lifecycle is complete within its defined persistent-participation scope.

The consolidated process proof launches an independent world-kernel child process and a separate credentialed Thread Editor child process. It generates fresh private, administrative, and editor credentials for each run, drives the scenario through HTTP, restarts the kernel repeatedly against one SQLite database, and emits a redacted JSON report that contains no credential values.

A reviewed proof layer then reopens the completed database without changing Mina's durable history. It pins the mechanisms that the process story alone could otherwise conflate: historical obligation enforcement versus current absence, service-level authorization-consumption rejection versus lease expiry and storage, abandonment non-consumption, and final zero-active-runtime state. A separate focused test pins the freeze store's own consumed-authorization guard before the SQLite uniqueness constraint.

Run the reviewed proof with:

```bash
npm run demo:m1
```

Retain the temporary database for manual inspection with:

```bash
npm run demo:m1 -- --keep-database
```

## Process topology

```text
Reviewed M1 proof
  ├─ consolidated process scenario
  │    ├─ world-kernel child process
  │    │    ├─ SQLite world database
  │    │    ├─ public loopback routes
  │    │    ├─ private-token routes
  │    │    └─ admin-token command acceptance
  │    └─ Thread Editor child process
  │         ├─ per-run editor credential
  │         ├─ server-side private token
  │         └─ allowlisted same-origin inspection API
  └─ post-scenario proof-layer inspection
       ├─ direct row counts, read-only
       ├─ live lifecycle acquire-path discharge assertion
       └─ lifecycle freeze precheck with storage write replaced by a sentinel

Focused store guard test
  └─ active runtime + pre-existing consumption row
       └─ direct FreezeStore.freezeRuntime rejection before uniqueness insertion
```

The consolidated process scenario never imports a store to mutate Mina directly. Durable scenario changes use the same HTTP command, request, runtime, Actor, Guardian, freeze, and abandonment routes used by the local process.

The reviewed layer performs no durable mutation. It reads final row counts, invokes the shipped lifecycle service's live acquire path, and substitutes a throwing storage sentinel solely to prove the consumed-authorization rejection occurs before expiry handling or persistence.

The demo-only kernel entrypoint injects two deterministic service parameters that the normal process does not take from callers:

- lease duration, used to make the unattended-timeout branch finish quickly;
- Actor mode, used to select the normal deterministic Actor or a deterministic objective-divergent Actor that causes Guardian rejection.

The entrypoint is explicitly marked demonstration-only. The normal `npm run world-kernel` process does not read `FIBRE_DEMO_*` settings or accept those service-option overrides.

## Consolidated scenario evidence

| Step | Executable proof |
|---|---|
| Seed and restart | Mina seeds at version 1; after independent process restart, editor inspection returns the same version and state hash. |
| Administrative command boundary | A deterministic self-model preview is created. Acceptance without `x-fibre-admin-token` returns `ADMIN_TOKEN_REQUIRED`; acceptance with the generated admin token advances Mina to version 2. |
| Stale attempt | A request/appraisal/stance created before the command cannot authorize the changed Thread. Runtime acquisition returns `PARTICIPATION_AUTHORIZATION_REJECTED` and instructs the caller to use a new request ID under the same correlation ID. |
| Correlated recovery | A fresh attempt under the original correlation ID acquires the exclusive runtime. Actor runs, Guardian persists `pass`, and freeze advances Mina to version 3 with one accepted memory. |
| Explicit rejected closure | The kernel restarts with a deterministic divergent Actor. Guardian persists `reject`; the editor reads that rejection; explicit abandonment aborts the session and releases the lease without consuming authorization or obligation. |
| Unattended rejection | Another divergent episode receives Guardian `reject` and is left unattended. Fresh editor/kernel time displays `Timed out — not yet reclaimed` while the persisted lease remains active. |
| Lazy reclaim | A later acquisition reclaims the timed-out lease as `expired` and its prior session as `aborted` before creating the replacement runtime. |
| Obligation-mediated participation | Mina's private stance is `refuse` with low dignity. Authorization cites the exact currently owned unresolved intention, Actor and Guardian pass, and freeze advances Mina to version 4 while discharging that exact obligation. |
| Permanent discharge | A later attempt to reuse the discharged exact prose reference is rejected. The reviewed layer invokes the live lifecycle acquire path and requires the historical-discharge ledger message, rather than accepting generic current absence. |
| Replay protection | A different freeze operation against the consumed authorization returns `AUTHORIZATION_CONSUMED`. The reviewed layer sets the clock beyond lease expiry, replaces the storage write with a sentinel, and requires consumed rejection before expiry or storage. |
| Store-level replay protection | A focused test presents the freeze store with an active runtime and an existing consumption row, requiring `AuthorizationConsumedError` before the uniqueness constraint can fire. |
| Final restart and inspection | After another kernel restart, editor inspection returns the same final state hash, two freeze-created memories, the complete public timeline, and no active runtime. Direct database counts independently require zero active session rows and zero active lease rows. |
| Abandonment non-consumption | Direct database inspection requires zero authorization-consumption rows for the explicitly abandoned session. The emitted outcome is derived from that count. |

## Final public state shape

The proof asserts Mina's final projection is version 4 with two freeze-created memories and no active runtime.

The public event sequence is exactly:

```text
THREAD_SEEDED
SELF_MODEL_UPDATED
THREAD_FROZEN
THREAD_FROZEN
```

The exact state hash and opaque private IDs intentionally vary because the scenario uses kernel-owned time and randomly generated record identifiers. Replay equality is asserted within each run across restart.

## Runtime outcome matrix

| Episode | Guardian | Final session | Final lease | Thread life event | Authority consumed |
|---|---|---|---|---|---|
| Accepted participation | `pass` | `completed` | `released` | `THREAD_FROZEN` | yes |
| Explicit rejected episode | `reject` | `aborted` | `released` | none | no; direct consumption-row count is zero |
| Unattended rejected episode | `reject` | `aborted` after reclaim | `expired` | none | no |
| Obligation-mediated participation | `pass` | `completed` | `released` | `THREAD_FROZEN` | yes, with exactly one obligation-consumption row |

## Named PR #22 evidence

The consolidated reviewed test is:

```text
Mina completes the reviewed persistent round trip with live-path guard evidence
```

It runs the complete separate-process Mina history once and then requires:

- `obligationReuseMechanism === "historical_discharge_ledger_via_acquire_path"`;
- exactly one historical consumption row for the demonstrated obligation;
- consumed-authorization rejection after the clock has passed lease expiry and before the storage sentinel is reached;
- an abandonment outcome derived from zero consumption rows;
- zero active runtime-session rows;
- zero active thaw-lease rows.

The direct store test is:

```text
freeze store rejects consumed authorization before the uniqueness constraint
```

The independent count test is:

```text
active runtime proof counts sessions and leases independently
```

PR #21 follow-up tests also prove:

1. `wrong, prefix, suffix, and case-variant editor credentials are refused`
   - exercises a wrong-but-present credential rather than only a missing header;
   - verifies no upstream kernel request occurs.

2. `an unhandled API path returns a prompt authenticated 404`
   - prevents unknown `/api/*` requests from occupying a connection until request timeout.

3. `preview identity redaction is described as derivable and admin-gated`
   - confirms the raw key is omitted;
   - explicitly states that deterministic identity remains derivable;
   - treats the admin token as the real acceptance boundary.

4. `runtime inspection refreshes kernel time and does not call missing time active`
   - fetches `/api/editor/health` on every runtime selection;
   - proves a lease that expires while the page remains open is shown as timed out;
   - proves missing kernel time yields `Expiry unknown` rather than `Active`.

## Automated validation

The final repository gate contains **163 tests**. The separate-process Mina history runs once inside the reviewed test; its database is then reused for the proof-layer assertions rather than recomputing the full scenario in a second test. The gate also runs:

- TypeScript build;
- Markdown include validation;
- deterministic context-pack generation;
- repository validation.

The exact review-head commit and its GitHub Actions run are recorded in the PR description after final consolidation. This committed artifact intentionally does not claim to self-attest its own commit SHA: adding such a SHA would change the file and therefore change the commit being named.

## Evidence convention

For authority-, consent-, obligation-, identity-, ledger-, and lifecycle-critical guards, Fibre evidence now pins both the guard's behavior and the live call path or transaction boundary that makes it load-bearing. A removable critical wiring point is not considered sufficient evidence. This rule was accepted by the owner on 2026-08-06 and recorded in `AGENTS.md` before the structured-obligation refactor.

## What M1 does not prove

M1 does not implement persistent live-kernel disclosure strategy or requester-visible external response. Actor output is not communication. Authorization, temporary cognition, freeze, public event projection, disclosure strategy, and external response remain distinct layers. The owner explicitly approved this as a post-M1 extension on 2026-08-06.

M1 also does not provide production authentication, principal/role authorization, encryption, distributed leases, production worker isolation, a model/tool gateway, cloud topology, structured obligation records, relationship services, embodiment, marketplace execution, family, or broader society.

## Completion statement

M1 now demonstrates Fibre's central deterministic lifecycle claim in executable form:

> Mina exists before cognition, privately decides whether and why to participate, receives exact current-state authority, wakes through replaceable temporary cognition, preserves or rejects proposed experience through the kernel, and remains the same replayable Thread after cognition ends.

This narrow completion preserves Fibre's larger social, relational, economic, familial, cultural, institutional, embodied, and developmental ambition.
