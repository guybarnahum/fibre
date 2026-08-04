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
6. bounded Request Appraisal Capsule showing requester, SHA-256 request digest, Thread-owned context included and excluded, terms, recorded obligations, alternatives, evidence, and policy version;
7. private participation stance showing dignity factors, evidence, feelings, uncertainty, relationship effects, alternatives, and desired action under restricted visibility;
8. Participation Authorization bound to Thread ID, snapshot version, exact request content, requester, policy, and causation chain;
9. separate restricted disclosure strategy and audience-visible external response carrying only safe references;
10. execution context capsule compiled only after accepted authorization;
11. deterministic Actor and Goal Guardian output;
12. freeze report with accepted and rejected changes, including unresolved-intention updates;
13. replay report and matching state hash;
14. restart-survival end-to-end test.

## M1 non-goals

M1 does not implement production LLM routing, semantic-memory infrastructure, production cloud deployment, high-availability or multi-region operation, marketplace behavior, full ledgers, real external messaging, multi-tenant security, individualized dignity thresholds, learned disclosure strategies, production private-state access control, kernel-origin capability proofs, or cryptographic authorization signatures.

M1 does require a cryptographically wide SHA-256 request-content digest. Origin proof, one-time consumption, and distributed replay prevention are separate deferred kernel capabilities.

These capabilities are deferred, not rejected. M1 preserves their domain vocabulary and extension paths.

## Lifecycle invariants

1. The Thread persists before and after every worker execution.
2. Live Thread state is world data, not Git content.
3. Workers propose changes but cannot directly mutate authoritative state.
4. Accepted changes create append-only events.
5. Commands and participation authorizations carry an expected Thread version; stale records fail visibly.
6. Externally initiated full execution requires accepted authorization bound to the same Thread, SHA-256 digest of all material request fields, requester, policy version, and causation chain.
7. Private stance, authorization, disclosure strategy, external expression, and performed action remain distinguishable; public wording is not authorization evidence.
8. Appraisal context is selected only from records the Thread owns. Runtime narrowing records included and excluded references; requesters cannot inject or directly select private context.
9. Authorization that overrides private desire requires a non-empty reference resolving to a recorded Thread obligation or governing decision.
10. The requester-facing expression does not carry restricted disclosure mode or private rationale and cannot imply acceptance without accepted authorization.
11. A Thread has at most one authoritative thaw lease.
12. Freeze validates each proposed mutation and releases runtime resources.
13. Retries do not duplicate commands, authorization consumption, memories, messages, or economic effects.
14. Interrupted sessions remain diagnosable and recoverable.
15. Ordered events reconstruct the same Thread state and version.
16. Human inspection distinguishes current state, private records, authorization, public expression, runtime context, proposed cognition, and accepted history.
17. Narrow implementation choices preserve Fibre's larger social, relational, economic, familial, cultural, institutional, and developmental ambition.

## Minimum persistent model

M1 requires durable representations for:

- Thread identity, lifecycle status, and version;
- projected current state and append-only events;
- optional snapshots or checkpoints;
- autobiographical memories with provenance;
- requests and SHA-256 request digests;
- appraisal-context inclusion and exclusion traces;
- private participation stance with restricted visibility;
- participation authorization, recorded-obligation references, and consumption status;
- disclosure strategy with restricted visibility;
- audience-visible external response referencing the strategy by ID;
- runtime sessions and lease state;
- commands and idempotency keys.

SQLite remains the recommended local target. Storage interfaces remain infrastructure-neutral.

## Canonical acceptance scenario

1. Seed Mina as a frozen Thread at a known version and state hash.
2. Restart the world-kernel and verify identical state and hash.
3. Apply a validated self-model command, confirm the new version and event, then visibly reject the same command at the stale version.
4. Submit a named request with a stable request ID: `Evaluate whether to respond to a website project opportunity and identify what information is missing.`
5. Compile and inspect Mina's bounded appraisal capsule using Thread-owned relationship, memory, and obligation context; show included and excluded references.
6. Run deterministic private appraisal and record Mina's evidence, alternatives, relationship effects, and desired participation action.
7. Issue and inspect authorization bound to Mina's current version and exact SHA-256 request digest.
8. Reject reuse of that authorization against changed request content, another requester, another Thread, or a later snapshot.
9. Demonstrate one low-dignity acceptance proposal being rejected.
10. Demonstrate an obligation-mediated override only with a reference resolving to Mina's recorded unresolved intentions.
11. Demonstrate one non-accept authorization that creates no lease and no execution capsule; show the public response separately without exposing disclosure mode.
12. On the accepted branch only, acquire the lease and compile the execution context capsule.
13. Run deterministic Actor and Goal Guardian workers.
14. Freeze Mina, explicitly accepting or rejecting proposed changes, resolve or retain obligations, and release the lease.
15. Restart, reload, replay events, and verify matching state hash, version, lifecycle status, and no active runtime.

## Required automated evidence

Tests cover persistence across restart, command validation, stale-version rejection, append-only events, Thread-owned appraisal context and exclusion traces, deterministic private appraisal, all policy-band boundaries, low-dignity accept rejection, clarification and delegation preconditions, SHA-256 material-term binding, requester binding, cross-request/cross-Thread/stale authorization rejection, recorded-obligation override rules, non-accept without execution, disclosure-to-authorization binding, public wording unable to create authorization at both strategy and response boundaries, exclusive lease, deterministic execution context, Actor and Goal Guardian output, freeze validation, idempotent retry, runtime release, and replay equality.

The portable package supplies the domain-boundary tests now. Full persistence, lease, consumption, restart, and replay evidence is produced by the M1 implementation. Mutation-coverage automation is deferred as an evaluation improvement; the accepted M1 evidence is defined by named behavioral properties rather than a passing test count.

## Human demonstration

A reviewer can inspect Mina's state and history, restart the service, submit the canonical request, inspect appraisal and private stance under appropriate access, inspect authorization and rejected misuse attempts, verify non-accept does not thaw, inspect an audience response without restricted disclosure metadata, run the accepted branch, inspect audits and freeze results, restart again, replay events, and verify no runtime remains.

## Owner validation

The project owner approved the original M1 contract on 2026-08-03 and accepted this dignity and interiority amendment on 2026-08-04. M1 remains the persistent round-trip milestone; the amendment makes consent and the interior–exterior boundary part of the round trip rather than a separate optional layer.
