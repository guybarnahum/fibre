---
id: validation-m1-persistent-thread-round-trip
status: accepted
last-reviewed: 2026-08-04
canonical: true
issue: 1
---

# M1 — Persistent Thread Round Trip

## Purpose

Milestone 1 proves the central Fibre lifecycle claim:

> A Thread persists independently of any LLM execution, privately appraises and authorizes externally initiated participation, thaws into temporary cognition, acts through replaceable workers, and freezes validated life changes back into durable, auditable state.

M1 is intentionally deterministic. It validates persistence, event integrity, authorization boundaries, lifecycle control, and human inspectability before production model providers or broader social and economic behavior.

## Accepted amendment — 2026-08-04

The original M1 contract predated the accepted dignity and interior–exterior boundaries. M1 still proves the persistent round trip, but externally initiated thaw now requires a bounded private appraisal and request-bound authorization before lease acquisition and full task cognition.

This amendment does not add production social behavior. It prevents M1 from demonstrating automatic compliance or treating a public message as consent.

## Required artifacts

A completed M1 produces human-inspectable evidence for:

1. independently running local world-kernel service;
2. persistent local database surviving restart;
3. current Thread state and version;
4. append-only event timeline;
5. command preview and accepted result;
6. bounded Request Appraisal Capsule showing requester, request fingerprint, Thread-owned context, terms, obligations, and policy version;
7. private participation stance showing dignity factors, feelings, uncertainty, relationship effects, and desired action under restricted visibility;
8. Participation Authorization bound to Thread ID, snapshot version, request, requester, policy, and causation chain;
9. execution context capsule compiled only after accepted authorization;
10. deterministic Actor and Goal Guardian output;
11. freeze report with accepted and rejected changes;
12. replay report and matching state hash;
13. restart-survival end-to-end test.

## M1 non-goals

M1 does not implement production LLM routing, semantic-memory infrastructure, production cloud deployment, marketplace behavior, full ledgers, real external messaging, multi-tenant security, individualized dignity thresholds, learned disclosure strategies, production private-state access control, or cryptographic authorization capabilities.

These capabilities are deferred, not rejected. M1 preserves their domain vocabulary and extension paths.

## Lifecycle invariants

1. The Thread persists before and after every worker execution.
2. Live Thread state is world data, not Git content.
3. Workers propose changes but cannot directly mutate authoritative state.
4. Accepted changes create append-only events.
5. Commands and participation authorizations carry an expected Thread version; stale records fail visibly.
6. Externally initiated full execution requires accepted authorization bound to the same Thread, request fingerprint, requester, policy version, and causation chain.
7. Private stance, authorization, disclosure strategy, external expression, and performed action remain distinguishable; public wording is not authorization evidence.
8. Appraisal context is selected from records the Thread owns; a requester cannot suppress or inject relationship history.
9. A Thread has at most one authoritative thaw lease.
10. Freeze validates each proposed mutation and releases runtime resources.
11. Retries do not duplicate commands, authorization consumption, memories, messages, or economic effects.
12. Interrupted sessions remain diagnosable and recoverable.
13. Ordered events reconstruct the same Thread state and version.
14. Human inspection distinguishes current state, private records, authorization, public expression, runtime context, proposed cognition, and accepted history.
15. Narrow implementation choices preserve Fibre's larger social, relational, economic, familial, cultural, institutional, and developmental ambition.

## Minimum persistent model

M1 requires durable representations for:

- Thread identity, lifecycle status, and version;
- projected current state and append-only events;
- optional snapshots or checkpoints;
- autobiographical memories with provenance;
- requests and request fingerprints;
- private participation stance with restricted visibility;
- participation authorization and consumption status;
- runtime sessions and lease state;
- commands and idempotency keys.

SQLite remains the recommended local target. Storage interfaces remain infrastructure-neutral.

## Canonical acceptance scenario

1. Seed Mina as a frozen Thread at a known version and state hash.
2. Restart the world-kernel and verify identical state and hash.
3. Apply a validated self-model command, confirm the new version and event, then visibly reject the same command at the stale version.
4. Submit a named request with a stable request ID: `Evaluate whether to respond to a website project opportunity and identify what information is missing.`
5. Compile and inspect Mina's bounded appraisal capsule using Thread-owned relationship and memory context.
6. Run deterministic private appraisal and record Mina's desired participation action.
7. Issue and inspect authorization bound to Mina's current version and exact request fingerprint.
8. Reject reuse of that authorization against changed request content, another Thread, or a later snapshot.
9. Demonstrate one non-accept authorization that creates no lease and no execution capsule; show any public response separately from private stance.
10. On the accepted branch only, acquire the lease and compile the execution context capsule.
11. Run deterministic Actor and Goal Guardian workers.
12. Freeze Mina, explicitly accepting or rejecting proposed changes, and release the lease.
13. Restart, reload, replay events, and verify matching state hash, version, lifecycle status, and no active runtime.

## Required automated evidence

Tests cover persistence across restart, command validation, stale-version rejection, append-only events, Thread-owned appraisal context, deterministic private appraisal, authorization binding, rejection of altered-request/cross-Thread/stale authorization, non-accept without execution, public wording unable to create authorization, exclusive lease, deterministic execution context, Actor and Goal Guardian output, freeze validation, idempotent retry, runtime release, and replay equality.

## Human demonstration

A reviewer can inspect Mina's state and history, restart the service, submit the canonical request, inspect appraisal and private stance under appropriate access, inspect authorization and a rejected misuse attempt, verify non-accept does not thaw, run the accepted branch, inspect audits and freeze results, restart again, replay events, and verify no runtime remains.

## Owner validation

The project owner approved the original M1 contract on 2026-08-03 and accepted this dignity and interiority amendment on 2026-08-04. M1 remains the persistent round-trip milestone; the amendment makes consent and the interior–exterior boundary part of the round trip rather than a separate optional layer.
