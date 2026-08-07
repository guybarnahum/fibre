# Mina consolidated M1 persistent round trip

Date: 2026-08-06  
Milestone: M1 Persistent Thread Round Trip  
Thread: Mina Park (`thr_mina_001`)

## Result

**M1 is fully closed.**

The deterministic proof now covers persistence, private dignity/participation, current-state authority, restricted disclosure strategy, audience-visible participation response, temporary cognition, Goal Guardian, freeze/abandon/timeout, restart/replay, and human/database inspection.

Run the reviewed proof with:

```bash
npm run demo:m1
```

Retain the temporary database for manual inspection with:

```bash
npm run demo:m1 -- --keep-database
```

Or launch the retained world directly into the Thread Editor with:

```bash
npm run demo:m1:editor
```

## Process and proof topology

```text
Reviewed M1 proof
  ├─ consolidated process scenario
  │    ├─ world-kernel child process
  │    │    ├─ SQLite world database
  │    │    ├─ public loopback routes
  │    │    ├─ private-token request/runtime/expression routes
  │    │    └─ admin-token command acceptance
  │    └─ Thread Editor child process
  │         ├─ per-run editor credential
  │         ├─ server-side private token
  │         └─ allowlisted same-origin inspection API
  └─ post-scenario proof layer
       ├─ direct read-only row counts
       ├─ expression-chain restart/integrity verification
       ├─ live historical-discharge path assertion
       └─ consumed-authorization ordering assertions
```

The demonstrated durable lifecycle changes still go through HTTP. The proof instrumentation adds expression records at the truthful participation boundary: after authorization and before Actor work for accepted episodes, and while Mina is stable for the non-execution refusal branch.

## Consolidated scenario evidence

| Step | Executable proof |
|---|---|
| Seed and restart | Mina seeds at version 1; after independent process restart, editor inspection returns the same version and state hash. |
| Administrative command boundary | A deterministic self-model preview is created. Acceptance without `x-fibre-admin-token` returns `ADMIN_TOKEN_REQUIRED`; acceptance with the generated admin token advances Mina to version 2. |
| Stale attempt | A request/appraisal/stance created before the command cannot authorize the changed Thread. Runtime acquisition returns `PARTICIPATION_AUTHORIZATION_REJECTED` and instructs the caller to use a new request ID under the same correlation ID. |
| Willing participation expression | The fresh high-dignity attempt records private `accept`, accepted runtime authority, a tactful-candor disclosure strategy, and `I can take this on.` before Actor work. Exact strategy/response retries are idempotent. |
| Accepted freeze | Actor runs, Guardian persists `pass`, and freeze advances Mina to version 3 with one accepted memory. |
| Low-dignity non-participation | A separate generic request records score 9, private `refuse`, non-execution `refuse` authority, tactful refusal `I will not take this request on.`, and no runtime for that request. |
| Explicit rejected closure | The kernel restarts with a deterministic divergent Actor. Guardian persists `reject`; the editor reads it; explicit abandonment aborts the session and releases the lease without consuming authorization or obligation. |
| Unattended rejection | Another divergent episode receives Guardian `reject` and is left unattended. Fresh kernel/editor time displays `Timed out — not yet reclaimed` while the stored lease remains active. |
| Lazy reclaim | A later acquisition reclaims the timed-out lease as `expired` and its prior session as `aborted`. |
| Obligation-mediated expression | Mina privately records `refuse`, the kernel authorizes `accept` through the exact currently owned obligation, and before Actor work a full-candor strategy persists `participationBasis: obligation_override`. The audience response says Mina can proceed because she has a recorded obligation, without carrying the private reference. |
| Obligation-mediated freeze | Actor and Guardian pass; freeze advances Mina to version 4 and discharges the exact obligation once. |
| Permanent discharge | Later reuse of the exact discharged reference is rejected. The reviewed layer invokes the live authorization path and requires the historical-discharge message rather than generic current absence. |
| Replay protection | A different freeze operation against consumed authority returns `AUTHORIZATION_CONSUMED`; service/store evidence pins rejection before later fallbacks. |
| Final restart and expression verification | The final state hash replays exactly; two freeze-created memories survive; five participation-authority summaries survive; the three completed disclosure/response chains re-read identically and pass integrity checks; no active runtime remains. |
| Database inspection | The inspector opens the source read-only with SQLite `query_only`, verifies a snapshot through the Fibre stores, and requires 3 strategies, 3 audience responses, 3 complete expression chains, 5 participation-authority summaries, postures `accept=2/refuse=1`, and disclosure modes `tactful_candor=2/full_candor=1`. |

## Expression matrix

| Branch | Desired | Authorized | Private strategy | Audience-visible response | Runtime |
|---|---|---|---|---|---|
| willing acceptance | `accept` | `accept` | `tactful_candor`, posture `accept`, aligned | `I can take this on.` | yes |
| low-dignity refusal | `refuse` | `refuse` | `tactful_candor`, posture `refuse`, aligned | `I will not take this request on.` | **no** |
| obligation-mediated participation | `refuse` | `accept` | `full_candor`, posture `accept`, `obligation_override` | says Mina proceeds because of a recorded obligation | yes |

All three audience-response records are created before performed work for their request and carry:

```text
deliveryStatus = not_sent
performedActionStatus = none_recorded
completionStatus = not_claimed
```

Those statuses describe the response record at creation time. They do not erase later Actor/Guardian/freeze history and they are not claims about real external delivery.

The audience response does not newly carry private dignity score/band, desired action, private rationale, withheld reason categories, or governing obligation references.

## Final public state

Mina's final projection remains version 4 with two freeze-created memories and no active runtime.

The public event sequence is exactly:

```text
THREAD_SEEDED
SELF_MODEL_UPDATED
THREAD_FROZEN
THREAD_FROZEN
```

Expression records are restricted world records, not synthetic public life events.

## Runtime outcome matrix

| Episode | Guardian | Final session | Final lease | Thread life event | Authority consumed |
|---|---|---|---|---|---|
| willing accepted participation | `pass` | `completed` | `released` | `THREAD_FROZEN` | yes |
| explicit rejected episode | `reject` | `aborted` | `released` | none | no |
| unattended rejected episode | `reject` | `aborted` after reclaim | `expired` | none | no |
| obligation-mediated participation | `pass` | `completed` | `released` | `THREAD_FROZEN` | yes, with exactly one obligation-consumption row |
| low-dignity refusal | not started | no session | no lease | none | non-execution authority only |

## Authority and adversarial evidence

The accepted M1 suite pins:

- no non-execution path can mint `accept` authority;
- the domain and expression-store accept prohibitions are independently asserted;
- a request attempt cannot acquire both non-execution and runtime authorization;
- both authorization-writer orderings return stable conflicts rather than raw SQLite failures;
- the runtime stance pre-check and UNIQUE backstop are independently asserted;
- exact retry remains idempotent despite the two legitimate authorization writers;
- requested and stored outward posture cannot contradict participation authority;
- willing and compelled `accept` wording remain distinguishable;
- obligation-mediated `refuse -> accept` remains `obligation_override`, not consent;
- the historical-discharge ledger is called through the live service path;
- append-only strategy/response records survive restart and detect coherent tampering;
- public routes do not expose restricted expression records;
- private expression routes require the private token;
- editor expression inspection requires its separate per-run credential and forwards only allowlisted private GETs;
- Thread-authored outward text remains text at the DOM boundary;
- structural audience-response reporting exposes each bounded status witness independently rather than relying on one broad safety label;
- database-source read-only status is derived from SQLite `query_only`, not a report literal.

## Human inspection

The Thread Editor now contains a dedicated **Expression boundary** view. It shows separately:

- Thread's own private response;
- kernel-authorized participation;
- dignity band;
- participation basis;
- disclosure intent;
- communicated posture;
- disclosed and withheld reason categories;
- exact outward message;
- delivery, performed-action, and completion status;
- private obligation reference in the restricted editor when present;
- exact JSON and integrity linkage.

For obligation-mediated divergence it says explicitly:

> This is compelled participation, not consent.

The editor has no expression-mutation route.

## Database inspection

For a retained proof database:

```bash
npm run inspect:db -- "/path/to/world.sqlite"
npm run --silent inspect:db -- "/path/to/world.sqlite" --json
```

The inspector checks SQLite integrity, foreign keys, source schema enforcement, Thread replay, private traces, runtime/freeze/abandonment witnesses, accepted-memory projection, participation authorizations, disclosure strategies, audience responses, and complete expression-chain integrity. It validates a temporary snapshot and does not repair the source database.

## Automated validation

At the expression-closure implementation head, the repository gate contains **204 tests** and passes:

- TypeScript build;
- full domain/kernel/tool test suite;
- Markdown include validation;
- deterministic context-pack generation;
- repository validation.

The exact final review-head SHA and GitHub Actions result belong in the PR record rather than this artifact, because embedding a commit SHA in a file changes the commit being named.

## What M1 does not prove

M1 does not send email/chat/webhooks, perform external network or tool side effects, prove message delivery, implement a general performed-action ledger, provide production authentication or principal/role authorization, isolate production workers, provide a model/tool gateway, deploy a cloud topology, implement structured obligation records, or implement M2 identity/embodiment, marketplace, family, or broader society.

The M1 audience-response record is durable communication intent/content, not transport evidence.

## Completion statement

M1 demonstrates Fibre's deterministic identity-through-lifecycle boundary in executable form:

> Mina exists before cognition, privately decides whether and why to participate, receives exact current-state authority, preserves the difference between willingness and compulsion, chooses what to disclose, records an audience-visible response without turning speech into consent or completion, wakes through replaceable temporary cognition when authorized, preserves or rejects proposed experience through the kernel, and remains the same replayable Thread after cognition ends.

This completion preserves Fibre's larger social, relational, economic, familial, cultural, institutional, embodied, and developmental ambition.
