---
id: validation-m1-persistent-thread-round-trip
status: accepted
last-reviewed: 2026-08-05
canonical: true
issue: 1
---

# M1 — Persistent Thread Round Trip

## Purpose

Milestone 1 proves the central Fibre lifecycle claim:

> A Thread persists independently of any LLM execution, privately appraises and authorizes externally initiated participation, thaws into temporary cognition, acts through replaceable workers, and freezes validated life changes back into durable, auditable state.

M1 is intentionally deterministic. It validates persistence, event integrity, authorization boundaries, lifecycle control, and human inspectability before production model providers or broader social and economic behavior.

## Accepted amendment — 2026-08-04

The original M1 contract predated the accepted dignity and interior–exterior boundaries. Externally initiated thaw now requires a bounded private appraisal and request-bound authorization before lease acquisition and full task cognition.

This amendment prevents M1 from demonstrating automatic compliance or treating a public message as consent.

## Required artifacts

A completed M1 produces human-inspectable evidence for:

1. independently running local world-kernel service;
2. persistent local database surviving restart;
3. current Thread state and version;
4. append-only event timeline;
5. command preview and accepted result;
6. bounded Request Appraisal Capsule showing requester, SHA-256 request digest, included/excluded Thread-owned context, terms, obligations, alternatives, evidence, and policy version;
7. private participation stance showing dignity factors, evidence, feelings, uncertainty, relationship effects, alternatives, and desired action under restricted visibility;
8. Participation Authorization bound to Thread ID, current snapshot, exact request content, requester, policy, appraisal, stance, and causation chain;
9. separate restricted disclosure strategy and audience-visible external response carrying only safe references;
10. execution context capsule compiled only after accepted authorization;
11. deterministic Actor and Goal Guardian output;
12. freeze report with accepted and rejected changes, including unresolved-intention updates;
13. replay report and matching state hash;
14. restart-survival end-to-end test.

Artifacts 1–8 and 10–11 now have executable M1 evidence. Artifact 9 and artifacts 12–14 remain active work.

## M1 non-goals

M1 does not implement production LLM routing, semantic-memory infrastructure, production cloud deployment, high availability, marketplace behavior, full ledgers, real external messaging, multi-tenant security, learned disclosure strategies, production private-state access control, cryptographic authorization signatures, distributed leases, or a production worker sandbox.

The local private-route token is not production authentication, consent, Participation Authorization, or execution permission.

The deterministic Goal Guardian is a declaration and consistency auditor. It does not observe capabilities independently and must not be treated as a sandbox. A future tool-capable worker requires an isolated worker/tool gateway that supplies independently observed tool-call and command-attempt traces.

## Lifecycle invariants

1. The Thread persists before and after every worker execution.
2. Live Thread state is world data, not Git content.
3. Workers propose changes but cannot directly mutate authoritative state.
4. Accepted changes create append-only events.
5. Commands and authorizations carry an expected Thread version; stale records fail visibly.
6. Full execution requires accepted authorization bound to the same Thread, current state hash, request fingerprint, requester, policy, appraisal, stance, and causation chain.
7. Private stance, authorization, disclosure strategy, external expression, and performed action remain distinguishable.
8. Appraisal and runtime context may include only Thread-owned records and must record included/excluded refs.
9. A private stance remains a historical opinion about its immutable appraisal; live authorization separately revalidates current state.
10. For M1, one request ID identifies one immutable appraisal attempt. After Thread advancement, recovery uses a new request-attempt ID under the same correlation ID.
11. Authorization that overrides private desire requires a non-empty reference resolving to a currently recorded Thread obligation.
12. A Thread has at most one authoritative active thaw lease, enforced by the database.
13. Runtime time is kernel-owned. Caller timestamps cannot acquire, extend, reclaim, or complete a lease.
14. Actor output contains proposals only and cannot directly write authoritative state.
15. Goal Guardian can persist either pass or reject and each check is independently falsifiable.
16. Freeze validates proposed mutations, consumes authorization once, completes the runtime, and releases the lease.
17. Retries do not duplicate commands, requests, appraisals, stances, authorizations, leases, worker runs, audits, consumption, memories, messages, or economic effects.
18. Interrupted and expired sessions remain diagnosable; aborted or expired sessions cannot continue work.
19. Ordered events reconstruct the same Thread state and version.
20. Human inspection distinguishes current state, private records, authorization, runtime context, proposed cognition, audit, and accepted history.
21. Narrow implementation choices preserve Fibre's larger social, relational, economic, familial, cultural, institutional, and developmental ambition.

## Minimum persistent model

M1 requires durable representations for:

- Thread identity, lifecycle status, version, projection, and append-only events;
- requests and SHA-256 request fingerprints;
- appraisal-context inclusion/exclusion traces;
- private participation stance;
- participation authorization and recorded-obligation references;
- disclosure strategy and audience-visible response;
- runtime session and exclusive lease state;
- deterministic Actor output and Goal Guardian audit;
- authorization consumption and command idempotency.

The local target remains SQLite. One `PRAGMA user_version` governs the complete file. Schema version 3 adds runtime tables transactionally to the version-2 world/private schema. A separate runtime-version mechanism is not used.

WorldStore and RuntimeStore use separate WAL connections. Cross-store correctness is enforced by rereading Thread and stance witnesses inside the runtime acquisition transaction. The partial unique lease index remains the final exclusivity authority.

Authorizations and worker records are append-only. Lease and session rows permit only trigger-constrained lifecycle transitions; their immutable bindings cannot change and they cannot be deleted.

## Canonical acceptance scenario

1. Seed Mina as a frozen Thread at a known version and state hash.
2. Restart and verify identical state/hash.
3. Apply a validated self-model command and visibly reject stale reuse.
4. Submit a named request attempt for a website opportunity.
5. Compile and inspect Mina's bounded appraisal capsule with included/excluded context.
6. Record Mina's private dignity stance.
7. Issue authorization bound to Mina's current version and exact request fingerprint.
8. Reject changed request, requester, Thread, state, policy, appraisal, stance, low-dignity accept, or invalid obligation override.
9. After unrelated Thread advancement, reject historical authorization and recover through a new request-attempt ID under the same correlation ID.
10. Demonstrate a non-accept decision creating no lease.
11. On the accepted branch, acquire the one exclusive kernel-timed lease and compile execution context.
12. Reject concurrent acquisition from another connection.
13. Run deterministic Actor and Goal Guardian; demonstrate one injected Actor producing a persisted Guardian reject.
14. Freeze Mina, accept/reject proposed changes, resolve or retain obligations, consume authorization, complete runtime, and release lease.
15. Restart, replay, and verify matching state, consumed authorization, and no active runtime.

Steps 4–13 now have durable evidence. The Thread projection remains unchanged until freeze.

## Required automated evidence

Tests cover:

- restart persistence, command validation, stale versions, append-only events, and replay;
- Thread-owned appraisal context and complete exclusion traces;
- request, requester, policy, appraisal, stance, score/band, and obligation binding;
- low-dignity acceptance and invalid override rejection;
- explicit stale-attempt recovery under one correlation lineage;
- kernel-owned timestamps and real lease expiry;
- one active lease across separate connections;
- aborted/expired-session work rejection;
- deterministic context and worker idempotency;
- every Goal Guardian check failing independently;
- a full service path that persists Guardian reject;
- coherent context/output rewriting detected by independent witnesses;
- private-route protection and public non-disclosure.

Evidence artifacts name the test for every advertised negative property; aggregate counts are supplementary only.

Freeze, authorization consumption, normal runtime release, final replay, disclosure, editor, and end-to-end evidence remain later M1 slices.

## Human demonstration

A reviewer can inspect Mina's state and public history, inspect the private request/appraisal/stance trace, see stale-attempt recovery preserve correlation lineage, acquire a kernel-timed runtime, observe overlap rejection, inspect authorization/context, run Actor and Guardian, observe a deliberate Guardian reject, restart the service, recover identical witnesses, and verify that public state/events remain unchanged until freeze.

## Owner validation

The project owner approved the original M1 contract on 2026-08-03 and accepted the dignity/interiority amendment on 2026-08-04. M1 remains one persistent lifecycle: appraisal, stance, authorization, temporary cognition, audit, freeze, and replay.
