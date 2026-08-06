---
id: validation-m1-persistent-thread-round-trip
status: accepted
last-reviewed: 2026-08-06
canonical: true
issue: 1
---

# M1 — Persistent Thread Round Trip

## Completion

**The deterministic M1 Persistent Thread Round Trip was completed on 2026-08-06.**

Run its consolidated acceptance proof with:

```bash
npm run demo:m1
```

The proof launches independent world-kernel and credentialed Thread Editor processes, generates its own local credentials, communicates only through their HTTP APIs, drives Mina through the accepted and rejected lifecycle branches, restarts the kernel repeatedly against the same SQLite database, and emits a redacted JSON report. After the process-level scenario, the reviewed proof pins the historical-obligation and consumed-authorization mechanisms through their live service and transaction paths.

## Purpose

Milestone 1 proves the central Fibre lifecycle claim:

> A Thread persists independently of any LLM execution, privately appraises and authorizes externally initiated participation, thaws into temporary cognition, acts through replaceable workers, and freezes validated life changes back into durable, auditable state.

M1 is intentionally deterministic. It validates persistence, event integrity, dignity and authorization boundaries, temporary-cognition lifecycle control, replay, and human inspectability before production model providers or broader social and economic behavior.

## Accepted amendments

The original contract was amended on 2026-08-04 to add dignity and the interior–exterior boundary. Externally initiated thaw requires a bounded private appraisal and request-bound authorization before lease acquisition and full task cognition. Public wording is not consent.

On 2026-08-05, the owner selected single-use obligation discharge for M1 and explicit non-consuming closure for Guardian-rejected runtimes.

On 2026-08-06, the owner explicitly moved persistent live-kernel disclosure strategy and audience-visible external response out of the M1 completion criteria and into a deliberate post-M1 extension. M1 completion is therefore limited to the deterministic persistent participation, cognition, life-change, closure, and replay lifecycle; it does not claim external communication.

On 2026-08-06, the consolidated proof established kernel-owned timeout inspection, credentialed editor access, administrative command acceptance, the complete separate-process Mina round trip, and independent proof-layer checks for historical obligation enforcement and service-level authorization-consumption rejection.

On 2026-08-06, the owner selected live-path evidence before the structured-obligation refactor. For authority-, consent-, obligation-, identity-, ledger-, and lifecycle-critical guards, accepted evidence must pin both the guard's behavior and the live call path or transaction boundary that makes it load-bearing. Behavior-only proof remains acceptable for non-consequential helpers, but a removable critical wiring point is not sufficient evidence.

## Completed executable artifacts

M1 now has human-inspectable and automated evidence for:

1. independently running loopback world-kernel process;
2. persistent SQLite state surviving repeated process restart;
3. current Thread projection, version, lifecycle status, and state hash;
4. append-only public event timeline and command witnesses;
5. deterministic command preview and admin-authorized accepted result;
6. bounded Request Appraisal Capsule with requester, SHA-256 request digest, included/excluded Thread-owned context, terms, obligations, alternatives, evidence, and policy version;
7. restricted private participation stance with dignity factors, evidence, feelings, uncertainty, relationship effects, alternatives, and desired action;
8. Participation Authorization bound to Thread ID, current state, exact request, requester, policy, appraisal, stance, and causation chain;
9. execution-context capsule compiled only after accepted authorization;
10. deterministic Actor output and Goal Guardian pass/reject audit;
11. atomic freeze report with accepted/rejected changes, accepted memory, authorization consumption, and obligation discharge;
12. explicit restricted abandonment record for a Guardian-rejected runtime, proving no authorization or obligation consumption;
13. unattended rejected-runtime timeout observed from kernel-owned time before lazy reclamation;
14. replay report, matching final state hash, and freeze-created-memory cross-check;
15. credentialed API-backed editor inspection of public and restricted lifecycle state;
16. final restart with completed/aborted runtime history and no active runtime;
17. live acquire-path proof distinguishing historical obligation discharge from current absence;
18. lifecycle-service proof that consumed authorization rejection precedes lease expiry and storage;
19. direct freeze-store proof that consumed authorization rejection precedes the SQLite uniqueness constraint.

### Deliberate post-M1 extension

Persistent live-kernel **disclosure strategy and audience-visible external response are not implemented**. They remain separate future records and must not be inferred from Actor output, public event projection, authorization, or freeze.

This is an explicit owner-approved scope boundary, not hidden completion evidence. Deterministic M1 proves the persistent participation and cognition lifecycle through durable life change; it does not prove external communication.

## Non-goals

M1 does not implement production LLM routing, semantic-memory infrastructure, production cloud deployment, high availability, marketplace behavior, full ledgers, real external messaging, multi-tenant security, learned disclosure strategies, production authentication, cryptographic authorization signatures, distributed leases, or a production worker sandbox.

The local private, administrative, and editor credentials are milestone controls, not production principal identity, consent, Participation Authorization, or role-based access control.

Goal Guardian is a declaration and consistency auditor. It does not independently observe capabilities and must not be treated as a sandbox. Any future tool-, network-, or model-capable Actor requires an isolated worker/tool gateway with independently observed capability traces.

## Proven lifecycle invariants

1. The Thread exists before and after every worker execution.
2. Live Thread state is world data, not Git content.
3. Workers propose changes but cannot directly mutate authoritative state.
4. Accepted life changes create append-only events.
5. Commands and authorizations carry an expected Thread version; stale records fail visibly.
6. Execution requires accepted authorization bound to the same Thread, current state hash, request fingerprint, requester, policy, appraisal, stance, and causation chain.
7. Private stance, authorization, temporary cognition, freeze, performed action, disclosure strategy, and external expression remain distinguishable.
8. Appraisal and runtime context may include only Thread-owned records and must record included/excluded refs.
9. A private stance remains a historical opinion about its immutable appraisal; live authorization separately revalidates current state.
10. A request ID identifies one immutable appraisal attempt. After Thread advancement, recovery uses a new request-attempt ID under the same correlation ID.
11. Authorization that overrides private desire requires an exact currently owned obligation reference that has never been discharged.
12. One active thaw lease per Thread is enforced by SQLite, including across separate connections.
13. Authorization, lease, Actor, Guardian, freeze, abandonment, preview, and displayed timeout time are kernel-owned.
14. Actor output contains proposals only and cannot write authoritative state or communicate externally.
15. Goal Guardian persists either pass or reject and each check is falsifiable.
16. Freeze requires a persisted Guardian pass, no declared tool calls or direct commands, and one explicit decision for every proposal.
17. Successful freeze atomically appends history, advances the projection, records accepted memories, consumes authorization once, discharges any override obligation, completes runtime, and releases the lease.
18. Failed freeze, Guardian rejection, state race, lease expiry, and explicit reject abandonment consume neither authorization nor obligation.
19. A Guardian-rejected active runtime may close through append-only abandonment that aborts the session and releases the lease without changing Thread life state.
20. Unattended expiry remains a distinct diagnosable timeout and is not rewritten as a Thread-authored abandonment.
21. Successful obligation-mediated freeze permanently spends the exact M1 prose reference, even if identical text is later reintroduced; the live acquisition path must consult the historical discharge ledger before issuing authorization.
22. Freeze reports, accepted-memory rows, and projection memory references describe the same generated-memory set.
23. Exact retries do not duplicate commands, requests, appraisals, stances, authorizations, leases, worker runs, audits, abandonment, consumption, memories, or events.
24. Completed, abandoned, expired, and aborted sessions cannot continue work.
25. Ordered events reconstruct the same Thread state and version after restart.
26. Human inspection distinguishes current state, private records, authority, temporary cognition, audit, freeze decisions, abandonment, timeout, consumption, and accepted history.
27. Narrow implementation choices preserve Fibre's larger social, relational, economic, familial, cultural, institutional, embodied, and developmental ambition.

## Consolidated Mina acceptance scenario

The executable proof runs this sequence as one history:

1. Seed Mina at version 1 and record the state hash.
2. Restart the kernel and verify identical version and hash through the editor.
3. Create a request/appraisal/stance attempt.
4. Preview a self-model command, reject acceptance without the admin token, then accept it with administrative authority, advancing Mina to version 2.
5. Reject the historical request attempt as stale and return an explicit instruction to use a new request ID under the same correlation ID.
6. Create the fresh correlated attempt, acquire the exclusive lease, compile Thread-owned context, run Actor, persist Guardian `pass`, and atomically freeze one memory, advancing Mina to version 3.
7. Restart with an injected divergent Actor, persist Guardian `reject`, inspect it through the editor, explicitly abandon it, and prove no consumption.
8. Start another divergent episode with a short lease, persist Guardian `reject`, leave it unattended, and display `Timed out — not yet reclaimed` using fresh kernel time.
9. Restart with the normal Actor, acquire a new obligation-mediated runtime, thereby reclaiming the timed-out lease as expired and its session as aborted.
10. Persist Guardian `pass`, freeze one memory, discharge the exact unresolved intention, and advance Mina to version 4.
11. Create another refusal attempt and reject reuse of the discharged obligation.
12. Restart, verify replay equality, inspect the final Thread and every runtime through the credentialed editor, reject authorization replay as `AUTHORIZATION_CONSUMED`, verify two generated memories, and verify no active runtime.
13. Reopen the completed database and invoke the live lifecycle acquire path, proving it rejects the exact reference as historically discharged rather than merely absent.
14. Set the lifecycle service clock past the completed lease expiry, replace the freeze-store write with a sentinel, and prove consumed authorization rejection wins before expiry validation or storage.
15. Prepare an active runtime with a pre-existing consumption row and call `FreezeStore.freezeRuntime` directly, proving the store-internal consumed check wins before the SQLite uniqueness constraint.
16. Count zero authorization-consumption rows for the explicitly abandoned runtime and zero active session and lease rows for the final world.
17. Exercise the active-session and active-lease SQL counts against a fixture containing a completed session and a still-active lease, proving the two checks are independent.

The final public event sequence is:

```text
THREAD_SEEDED
SELF_MODEL_UPDATED
THREAD_FROZEN
THREAD_FROZEN
```

## Automated evidence

The consolidated reviewed test is named:

```text
Mina completes the reviewed persistent round trip with live-path guard evidence
```

It runs the full separate-process lifecycle once, then applies the live acquire-path, service-ordering, database-count, and report assertions to the completed world.

The direct store test is named:

```text
freeze store rejects consumed authorization before the uniqueness constraint
```

The reviewed proof additionally establishes:

- the live lifecycle acquire path consults the historical discharge ledger and names prior discharge;
- the lifecycle freeze service rejects consumed authorization before expiry validation and before the storage insertion path;
- the freeze store independently rejects consumed authorization before relying on the primary-key constraint;
- explicit abandonment has zero matching authorization-consumption rows;
- the completed database has zero active runtime-session rows and zero active thaw-lease rows;
- active-session and active-lease counts are independent;
- the demonstrated obligation has exactly one historical consumption row;
- the final abandonment outcome and active-runtime count emitted by `npm run demo:m1` are derived from database evidence rather than report literals.

Additional PR #22 hardening tests prove:

- wrong, prefix, suffix, and case-variant editor credentials fail before upstream access;
- unknown authenticated `/api/*` routes return prompt 404 responses;
- runtime inspection fetches fresh kernel time on every selection;
- missing kernel time yields `Expiry unknown`, not `Active`;
- preview identity omission is described honestly as derivable and admin-gated.

The complete repository suite includes the earlier adversarial evidence for request binding, context ownership, stale recovery, exclusive leases, every Guardian check, append-only records, atomic freeze, corruption detection, schema migration, privacy boundaries, and restart replay.

## Human demonstration

A reviewer may run `npm run demo:m1` to receive the machine-readable proof report. The same durable database may optionally be retained with `--keep-database` for manual editor inspection. The normal `npm run world-kernel` and `npm run editor` commands remain available for interactive use.

The report contains no generated credential values. It names the final Thread version/hash, public event sequence, memory count, unresolved intentions, evidence-derived zero-active-runtime result, stale-attempt rejection, correlated recovery, Guardian decisions, evidence-derived explicit abandonment outcome, timeout/reclaim outcome, obligation discharge/reuse rejection, replay rejection, editor-private-inspection proof, historical-discharge live-path mechanism, service consumption ordering, direct non-consumption count, and direct active-session/lease counts.

## Owner validation

The owner approved the original M1 contract on 2026-08-03, accepted the dignity/interiority amendment on 2026-08-04, selected single-use obligation discharge and explicit reject closure on 2026-08-05, explicitly deferred persistent disclosure strategy and audience-visible external response beyond deterministic M1 on 2026-08-06, selected live-path evidence for consequential guards before the structured-obligation refactor on 2026-08-06, and authorized the complete PR sequence through the consolidated and reviewed proofs on 2026-08-06.

**M1 is complete within its deterministic persistent-lifecycle scope.**
