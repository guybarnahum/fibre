---
id: validation-m1-persistent-thread-round-trip
status: accepted
last-reviewed: 2026-08-06
canonical: true
issue: 1
---

# M1 — Persistent Thread Round Trip

## Completion

**M1 Persistent Thread Round Trip is fully closed.**

Run its consolidated acceptance proof with:

```bash
npm run demo:m1
```

The proof launches independent world-kernel and credentialed Thread Editor processes, generates fresh local credentials, communicates through HTTP for the demonstrated lifecycle, restarts repeatedly against the same SQLite world, and emits a redacted JSON report. A reviewed proof layer then reopens the completed database and pins historical-obligation, authorization-consumption, expression, integrity, and zero-active-runtime mechanisms through the shipped service/store paths.

## Purpose

Milestone 1 proves the central Fibre lifecycle claim:

> A Thread persists independently of temporary cognition, privately appraises externally initiated participation, records its own stance, receives bounded current-state authority, chooses what to disclose, records an audience-visible participation response, thaws into temporary cognition when execution is authorized, and freezes validated life changes back into durable, auditable state.

M1 is intentionally deterministic. It validates persistence, event integrity, dignity and authorization boundaries, the interior-to-exterior expression boundary, temporary-cognition lifecycle control, replay, and human inspectability before production model providers or broader social and economic behavior.

## Accepted amendments and closure decisions

- 2026-08-04: dignity and the interior–exterior boundary became part of M1. Public wording is not consent.
- 2026-08-05: M1 selected single-use obligation discharge and explicit non-consuming closure for Guardian-rejected runtimes.
- 2026-08-06: the first deterministic lifecycle proof was accepted with persistent disclosure/response temporarily deferred.
- 2026-08-06: the owner then chose to close that remaining gap before M2. The closure contract supersedes the earlier deferral for final M1 scope.
- Outward posture may not contradict participation authority. Accepted authorization communicates `accept`; non-accept authority may communicate the same action or `noncommittal`.
- Obligation-mediated `refuse -> accept` remains identifiable as compulsion rather than consent. Willing and compelled acceptance use distinguishable deterministic wording.
- Disclosure mode is private strategy intent, not a kernel honesty classifier.
- The M1 audience-safety claim is narrow: the audience-response payload does not newly copy private rationale, dignity details, withheld reasons, or governing obligation references. Current public `unresolvedIntentions` remain provisional and are not a permanent privacy model.
- One disclosure strategy and one audience response are immutable per request attempt; future revision must use superseding append-only records rather than in-place mutation.
- Consequential authority, consent, obligation, identity, ledger, and lifecycle evidence must pin both behavior and the live path or transaction boundary that makes the guard load-bearing.

## Completed executable artifacts

M1 has automated and human-inspectable evidence for:

1. independently running loopback world-kernel process;
2. persistent SQLite Thread state surviving repeated process restart;
3. current projection, version, lifecycle status, and deterministic state hash;
4. append-only public event timeline and command witnesses;
5. deterministic command preview and admin-authorized accepted command result;
6. bounded Request Appraisal Capsule with requester, SHA-256 request digest, included/excluded Thread-owned context, terms, obligations, alternatives, evidence, and policy version;
7. restricted private participation stance with dignity factors, evidence, feelings, uncertainty, relationship effects, alternatives, and desired action;
8. Participation Authorization bound to Thread ID, current state, exact request, requester, policy, appraisal, stance, and causation/correlation chain;
9. standalone durable non-execution authority for `clarify`, `negotiate`, `delegate`, and `refuse`, while execution-capable `accept` remains exclusive to the thaw/runtime boundary;
10. append-only restricted disclosure strategy bound to the same request/stance/authorization chain;
11. append-only audience-visible participation response bound to that disclosure strategy;
12. execution-context capsule compiled only after accepted execution authorization;
13. deterministic Actor output and Goal Guardian pass/reject audit;
14. atomic freeze report with accepted/rejected changes, accepted memory, authorization consumption, and obligation discharge;
15. explicit restricted abandonment record for a Guardian-rejected runtime, proving no authorization or obligation consumption;
16. unattended rejected-runtime timeout observed from kernel-owned time before lazy reclamation;
17. replay report, matching final state hash, and freeze-created-memory cross-check;
18. credentialed API-backed editor inspection of public state, private request/runtime records, and the expression boundary;
19. read-only database inspection with schema enforcement, snapshot verification, and expression-chain counts;
20. final restart with completed/aborted runtime history, three complete expression chains, and no active runtime;
21. live acquire-path proof distinguishing historical obligation discharge from current absence;
22. lifecycle-service proof that consumed authorization rejection precedes lease expiry and storage;
23. direct freeze-store proof that consumed authorization rejection precedes the SQLite uniqueness constraint;
24. independently pinned redundant guards preventing non-execution `accept` authority, two-writer authorization collisions, contradictory outward posture, and loss of compelled-versus-willing wording.

## Non-goals

M1 does not implement production LLM routing, semantic-memory infrastructure, production cloud deployment, high availability, marketplace behavior, full ledgers, real email/chat/network delivery, generalized performed-action execution, multi-tenant security, learned disclosure strategies, production authentication, cryptographic authorization signatures, distributed leases, or a production worker sandbox.

The local private, administrative, and editor credentials are milestone controls, not production principal identity, consent, Participation Authorization, or role-based access control.

Goal Guardian is a declaration and consistency auditor. It does not independently observe capabilities and must not be treated as a sandbox. Any future tool-, network-, or model-capable Actor requires an isolated worker/tool gateway with independently observed capability traces.

Structured obligations remain post-M1 hardening. M1 uses exact UTF-8 unresolved-intention prose as provisional obligation identity; no new feature should create or edit obligations until stable structured identity and visibility classification exist.

## Proven lifecycle and expression invariants

1. The Thread exists before and after every worker execution.
2. Live Thread state is world data, not Git content.
3. Workers propose changes but cannot directly mutate authoritative state.
4. Accepted life changes create append-only events.
5. Commands and authorizations carry an expected Thread version; stale records fail visibly.
6. Execution requires accepted authorization bound to the same Thread, current state hash, request fingerprint, requester, policy, appraisal, stance, and causation chain.
7. Private stance, authorization, disclosure strategy, audience-visible response, temporary cognition, performed action, outcome, and durable life change remain distinguishable.
8. Appraisal and runtime context may include only Thread-owned records and must record included/excluded refs.
9. A private stance remains a historical opinion about its immutable appraisal; live authorization separately revalidates current state.
10. A request ID identifies one immutable appraisal attempt. After Thread advancement, recovery uses a new request-attempt ID under the same correlation ID.
11. Authorization that overrides private desire requires an exact currently owned obligation reference that has never been discharged.
12. Non-execution authorization cannot mint `accept`; accepted execution authority remains exclusive to thaw/runtime acquisition.
13. A request attempt cannot receive two participation authorizations. Both writer orderings fail as stable domain conflicts rather than raw SQLite errors.
14. Disclosure and response cannot create, enlarge, repair, contradict, or silently negate participation authority.
15. For `accept`, communicated posture must be `accept`. For non-accept authority, posture may match the authorized action or be `noncommittal`.
16. Obligation-mediated `refuse -> accept` preserves both values and the governing obligation in the private chain and remains `obligation_override` rather than consent.
17. Willing acceptance and compelled acceptance remain outwardly distinguishable without requiring disclosure of the private obligation reference.
18. Audience-response records contain only intentionally visible response fields and explicit status witnesses. Private rationale, dignity details, withheld reasons, and governing obligation references are not newly copied into the response payload.
19. Creating an audience response is not delivery, performed action, task completion, consent, or durable life change.
20. Disclosure strategy and audience response are append-only, exact-idempotent, restart-stable, and independently integrity-checked.
21. One active thaw lease per Thread is enforced by SQLite, including across separate connections.
22. Authorization, lease, Actor, Guardian, freeze, abandonment, preview, expression IDs/timestamps, and displayed timeout time are kernel-owned.
23. Actor output contains proposals only and cannot write authoritative state or communicate externally.
24. Goal Guardian persists either pass or reject and each check is falsifiable.
25. Freeze requires a persisted Guardian pass, no declared tool calls or direct commands, and one explicit decision for every proposal.
26. Successful freeze atomically appends history, advances the projection, records accepted memories, consumes authorization once, discharges any override obligation, completes runtime, and releases the lease.
27. Failed freeze, Guardian rejection, state race, lease expiry, and explicit reject abandonment consume neither authorization nor obligation.
28. A Guardian-rejected active runtime may close through append-only abandonment that aborts the session and releases the lease without changing Thread life state.
29. Unattended expiry remains a distinct diagnosable timeout and is not rewritten as a Thread-authored abandonment.
30. Successful obligation-mediated freeze permanently spends the exact M1 prose reference, even if identical text is later reintroduced; live authorization paths consult historical discharge before issuing authority.
31. Freeze reports, accepted-memory rows, and projection memory references describe the same generated-memory set.
32. Exact retries do not duplicate commands, requests, appraisals, stances, authorizations, leases, expression records, worker runs, audits, abandonment, consumption, memories, or events.
33. Completed, abandoned, expired, and aborted sessions cannot continue work.
34. Ordered events reconstruct the same Thread state and version after restart.
35. Human inspection distinguishes current state, private stance, authority, disclosure intent, audience response, temporary cognition, audit, freeze decisions, abandonment, timeout, consumption, and accepted history.
36. Narrow implementation choices preserve Fibre's larger social, relational, economic, familial, cultural, institutional, embodied, and developmental ambition.

## Consolidated Mina acceptance scenario

The executable proof runs one coherent Mina history:

1. Seed Mina at version 1 and record the state hash.
2. Restart the kernel and verify identical version and hash through the editor.
3. Create a request/appraisal/stance attempt.
4. Preview a self-model command, reject acceptance without the admin token, then accept it with administrative authority, advancing Mina to version 2.
5. Reject the historical request attempt as stale and return an explicit instruction to use a new request ID under the same correlation ID.
6. Create the fresh high-dignity attempt and acquire accepted runtime authority.
7. Before Actor work, persist a tactful-candor willing-acceptance strategy and audience response: `I can take this on.` The response records `not_sent`, `none_recorded`, and `not_claimed` at that point in time.
8. Run Actor, persist Guardian `pass`, and atomically freeze one memory, advancing Mina to version 3.
9. While Mina is stable, create a separate generic low-dignity request, record private `refuse`, issue non-execution `refuse` authority, persist tactful refusal `I will not take this request on.`, and prove no runtime exists for that request.
10. Restart with an injected divergent Actor, persist Guardian `reject`, inspect it through the editor, explicitly abandon it, and prove no consumption.
11. Start another divergent episode with a short lease, persist Guardian `reject`, leave it unattended, and display `Timed out — not yet reclaimed` using fresh kernel time.
12. Restart with the normal Actor and acquire a new obligation-mediated runtime, thereby reclaiming the timed-out lease as expired and its session as aborted.
13. Before Actor work, persist full-candor expression for private `refuse` / authorized `accept`, preserving `participationBasis: obligation_override`; the outward response states that Mina can proceed because she has a recorded obligation, without exposing the private reference.
14. Persist Guardian `pass`, freeze one memory, discharge the exact unresolved intention, and advance Mina to version 4.
15. Create another refusal attempt and reject reuse of the discharged obligation.
16. Restart, verify replay equality, inspect the final Thread and every runtime, verify two generated memories, reject authorization replay as `AUTHORIZATION_CONSUMED`, and verify no active runtime.
17. Reopen the completed database and verify all three expression chains and their exact request/stance/authorization/strategy/response linkage across restart.
18. Invoke the live lifecycle acquire path and prove it rejects the exact reference as historically discharged rather than merely absent.
19. Set the lifecycle service clock past the completed lease expiry, replace the freeze-store write with a sentinel, and prove consumed authorization rejection wins before expiry validation or storage.
20. Prepare an active runtime with a pre-existing consumption row and call `FreezeStore.freezeRuntime` directly, proving the store-internal consumed check wins before the SQLite uniqueness constraint.
21. Count zero authorization-consumption rows for the explicitly abandoned runtime, exactly one historical obligation-consumption row, three disclosure rows, three audience-response rows, and zero active session/lease rows.

The final public event sequence remains:

```text
THREAD_SEEDED
SELF_MODEL_UPDATED
THREAD_FROZEN
THREAD_FROZEN
```

Expression persistence is restricted world history, not a public Thread life event.

## Expression proof matrix

| Branch | Private stance | Authorized action | Disclosure | Audience response | Runtime |
|---|---|---|---|---|---|
| willing participation | `accept` | `accept` | `tactful_candor`, posture `accept` | `I can take this on.` | yes |
| low-dignity non-participation | `refuse` | `refuse` | `tactful_candor`, posture `refuse` | `I will not take this request on.` | no |
| obligation-mediated participation | `refuse` | `accept` | `full_candor`, `obligation_override`, posture `accept` | proceeds because of a recorded obligation | yes |

All three responses are recorded before any performed work for that request and carry:

```text
deliveryStatus = not_sent
performedActionStatus = none_recorded
completionStatus = not_claimed
```

## Automated evidence

The consolidated reviewed test remains:

```text
Mina completes the reviewed persistent round trip with live-path guard evidence
```

It runs the full separate-process lifecycle once and then applies live acquire-path, service-ordering, expression-restart, database-count, and report assertions to the completed world.

Additional focused evidence pins:

- both participation-authorization writer orderings as stable conflicts;
- exact-retry idempotency despite the two legitimate authorization writers;
- domain and store layers independently preventing non-execution `accept` authority;
- runtime pre-check and SQLite UNIQUE backstop independently preventing duplicate participation authority;
- requested and stored posture compatibility;
- compelled acceptance wording remaining distinguishable from willing acceptance;
- historical-discharge ledger wiring on the non-execution path;
- append-only expression persistence and coherent tamper detection;
- private-token enforcement and public-route non-leakage;
- structural audience-response status witnesses;
- read-only database inspection of five participation-authority summaries and three complete expression chains;
- Thread Editor GET-only expression drill-down, credential enforcement, private-token containment, text-only rendering, and explicit `compelled participation, not consent` explanation;
- explicit abandonment with zero matching authorization-consumption rows;
- zero active runtime-session and thaw-lease rows at final restart.

The complete repository gate also runs TypeScript build, Markdown include validation, deterministic context-pack generation, and repository validation.

## Human demonstration

A reviewer may run `npm run demo:m1` to receive the machine-readable proof report. The same durable database may be retained with `--keep-database`, or `npm run demo:m1:editor` may be used for interactive inspection.

The Thread Editor presents readable explanations first and exact JSON as the technical authority. Its Expression Boundary view keeps the Thread's own stance, kernel authority, disclosure strategy, exact outward message, and status witnesses visibly separate.

The database inspector can independently verify the retained world:

```bash
npm run inspect:db -- "/path/to/world.sqlite"
```

It opens the source read-only, enables SQLite `query_only`, verifies schema enforcement, validates a temporary snapshot through the domain stores, and cross-checks expression records without repairing the source.

## Owner validation

The owner approved the original M1 contract on 2026-08-03, accepted dignity/interiority on 2026-08-04, selected single-use obligation discharge and explicit reject closure on 2026-08-05, accepted the first deterministic lifecycle proof on 2026-08-06, then explicitly chose to close persistent disclosure and audience response before M2 and approved the resulting authority/posture decisions and adversarial fixes.

**M1 is fully closed.**
